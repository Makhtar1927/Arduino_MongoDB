require('dotenv').config();
const mongoose = require('mongoose');
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');

// ==========================================
// 1. CONNEXION À MONGOOSE
// ==========================================
const mongoURI = process.env.MONGO_URI;

mongoose.connect(mongoURI)
    .then(() => console.log('Successfully connected to iot_database on MongoDB Atlas'))
    .catch(err => {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    });

// ==========================================
// 2. MODÈLE ET SCHÉMA (Uniquement Photorésistance)
// ==========================================
const sensorDataSchema = new mongoose.Schema({
    light: { type: Number, required: true }, // Valeur de la LDR (0 à 1023)
    sensorId: { type: String, default: "Arduino_Uno_01" }
}, { 
    timestamps: true // Génère automatiquement createdAt et updatedAt
});

const SensorData = mongoose.model('SensorData', sensorDataSchema, 'sensor_data');

// ==========================================
// 3. CONNEXION ET LECTURE RÉELLE DE L'ARDUINO
// ==========================================

// Variable globale pour stocker la dernière valeur lue depuis l'Arduino
let latestLightValue = null;

// /!\ REMPLACEZ 'COM3' (Windows) ou '/dev/ttyACM0' (Linux/Mac) par le bon port de votre Arduino
const ARDUINO_PORT = 'COM8'; 

const port = new SerialPort({
    path: ARDUINO_PORT,
    baudRate: 9600 // Doit être identique au Serial.begin(9600) de l'Arduino
});

// Utilisation d'un parser pour lire le flux ligne par ligne
const parser = port.pipe(new ReadlineParser({ delimiter: '\r\n' }));

// Écoute des données envoyées par l'Arduino
parser.on('data', (data) => {
    const parsedValue = parseInt(data.trim(), 10);
    
    // On vérifie que la donnée reçue est bien un nombre valide
    if (!isNaN(parsedValue)) {
        latestLightValue = parsedValue;
    }
});

port.on('error', (err) => {
    console.error('Erreur du Port Série Arduino:', err.message);
});

// ==========================================
// 4. SAUVEGARDE DANS LA BASE DE DONNÉES
// ==========================================
async function saveSensorData() {
    try {
        // Si aucune donnée n'a encore été reçue de l'Arduino, on attend la prochaine minute
        if (latestLightValue === null) {
            console.log(`[${new Date().toLocaleTimeString()}] En attente de données réelles de l'Arduino...`);
            return;
        }
        
        const newMeasure = new SensorData({
            light: latestLightValue
        });

        const savedData = await newMeasure.save();
        console.log(`[${new Date().toLocaleTimeString()}] Données enregistrées :`, {
            Lumière: `${savedData.light} / 1023`
        });
    } catch (error) {
        console.error('Erreur lors de l\'enregistrement des données :', error);
    }
}

// ==========================================
// 5. PLANIFICATION AUTOMATIQUE (Toutes les 1 minute)
// ==========================================

// Lance un premier enregistrement après 5 secondes pour laisser le temps à l'Arduino d'envoyer sa première valeur
setTimeout(saveSensorData, 5000);

// Configure l'intervalle régulier (1 minute = 60 000 ms)
// Correction : Les variables concordent désormais (ONE_MINUTE partout)
const ONE_MINUTE = 60 * 1000;
setInterval(saveSensorData, ONE_MINUTE);

console.log("----------------------------------------------------------------");
console.log("Script IoT démarré avec succès.");
console.log("Enregistrement automatique planifié toutes les 1 minute.");
console.log("----------------------------------------------------------------");