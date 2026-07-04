const mongoose = require('mongoose');

// ============================================================
// MODÈLE DE DONNÉES — Brief IoT L3 (Section 7)
// Champs requis : mesure, seuil, état, horodatage, équipement
// ============================================================
const sensorDataSchema = new mongoose.Schema({
    // Identifiant de l'équipement/salle (Section 5.1 & 7)
    sensorId:       { type: String,  required: true,  default: "ESP32_L3_Labo_01" },
    // Valeur brute du capteur LDR (0 à 4095 sur ESP32 ADC 12-bit)
    light:          { type: Number,  required: true },
    // Seuil configuré sur l'ESP32 : 300 (lumière faible → alerte)
    thresholdValue: { type: Number,  required: true,  default: 300 },
    // État : NORMAL | ALERT | RETURN_TO_NORMAL (Section 5.2)
    status: {
        type: String,
        enum: ['NORMAL', 'ALERT', 'RETURN_TO_NORMAL'],
        required: true,
        default: 'NORMAL'
    }
}, {
    // timestamps génère createdAt (horodatage) & updatedAt automatiquement (Section 5.1)
    timestamps: true
});

// ── Index composé : accélère les requêtes historiques (daily/weekly/monthly)
sensorDataSchema.index({ createdAt: -1 });              // Tri chronologique inverse
sensorDataSchema.index({ status: 1, createdAt: -1 });   // Filtre alertes + tri
sensorDataSchema.index({ sensorId: 1, createdAt: -1 }); // Filtre par équipement

module.exports = mongoose.model('SensorData', sensorDataSchema, 'sensor_data');