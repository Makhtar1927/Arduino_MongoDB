require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const SensorData = require('./models/Sensor');

const app = express();
const PORT = process.env.PORT || 5000;

// ==========================================
// MIDDLEWARES DE L'APPLICATION
// ==========================================
app.use(cors());
app.use(express.json());

// ==========================================
// PROTECTION ET SÉCURITÉ DE L'API
// ==========================================
const API_KEY = process.env.API_KEY || "MonEsp32SecretKeyL3";

// Middleware de validation pour les requêtes POST (écriture de l'ESP32)
const requireApiKey = (req, res, next) => {
    const incomingKey = req.headers['x-api-key'];
    if (!incomingKey || incomingKey !== API_KEY) {
        return res.status(401).json({ error: "Accès refusé. Clé API invalide ou absente." });
    }
    next();
};

// ==========================================
// CONNEXION À MONGOOSE (MongoDB Atlas)
// ==========================================
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('Successfully connected to iot_database on MongoDB Atlas'))
    .catch(err => {
        console.error('Erreur critique de connexion MongoDB:', err);
        process.exit(1);
    });

// ==========================================
// ROUTES REQUISES PAR LE BRIEF DE L'ÉVALUATION
// ==========================================

/**
 * 0. ROUTE D'ACCUEIL (Évite la 404 sur l'URL principale de Render)
 */
app.get('/', (req, res) => {
    res.json({
        status: "Running",
        project: "Solution IoT avec ESP32, Node.js, MongoDB et Cloud",
        level: "Licence 3 Informatique - CCAK",
        databaseConnection: mongoose.connection.readyState === 1 ? "Connected to Atlas" : "Disconnected"
    });
});

/**
 * 1. RECEVOIR ET ENREGISTRER UNE NOUVELLE MESURE (POST)
 * Sécurisée par clé d'API. Appelée à intervalles par l'ESP32 via Wi-Fi.
 */
app.post('/api/measures', requireApiKey, async (req, res) => {
    try {
        const { light, thresholdValue, status, sensorId } = req.body;

        if (light === undefined) {
            return res.status(400).json({ error: "La valeur de luminosité (light) est requise." });
        }

        const newMeasure = new SensorData({
            light,
            thresholdValue,
            status,
            sensorId
        });

        const savedData = await newMeasure.save();
        return res.status(201).json({ message: "Mesure enregistrée avec succès", data: savedData });
    } catch (error) {
        return res.status(500).json({ error: "Erreur lors de l'enregistrement", details: error.message });
    }
});

/**
 * 2. CONSULTER LA DERNIÈRE MESURE (GET)
 * Indispensable pour l'affichage temps réel du Tableau de bord.
 */
app.get('/api/measures/latest', async (req, res) => {
    try {
        const latest = await SensorData.findOne().sort({ createdAt: -1 });
        if (!latest) return res.status(404).json({ error: "Aucune donnée disponible" });
        return res.json(latest);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

/**
 * 3. CONSULTER TOUTES LES MESURES (GET)
 */
app.get('/api/measures', async (req, res) => {
    try {
        const measures = await SensorData.find().sort({ createdAt: -1 }).limit(100);
        return res.json(measures);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

/**
 * 4. HISTORIQUE JOURNALIER PAR PÉRIODE (Matin, Soir, Nuit)
 * Calcule les moyennes et compte les alertes par tranches horaires.
 * Plages retenues : Matin (06h-18h), Soir (18h-00h), Nuit (00h-06h).
 */
app.get('/api/history/daily', async (req, res) => {
    try {
        const { date } = req.query; 
        const targetDate = date ? new Date(date) : new Date();
        
        const startOfDay = new Date(targetDate.setHours(0,0,0,0));
        const endOfDay = new Date(targetDate.setHours(23,59,59,999));

        const dailyData = await SensorData.aggregate([
            { $match: { createdAt: { $gte: startOfDay, $lte: endOfDay } } },
            {
                $project: {
                    light: 1,
                    status: 1,
                    hour: { $hour: "$createdAt" }
                }
            },
            {
                $group: {
                    _id: null,
                    morningMeasures: { $push: { $cond: [ { $and: [ { $gte: ["$hour", 6] }, { $lt: ["$hour", 18] } ] }, "$$ROOT", "$$REMOVE" ] } },
                    eveningMeasures: { $push: { $cond: [ { $gte: ["$hour", 18] }, "$$ROOT", "$$REMOVE" ] } },
                    nightMeasures: { $push: { $cond: [ { $lt: ["$hour", 6] }, "$$ROOT", "$$REMOVE" ] } }
                }
            },
            {
                $project: {
                    _id: 0,
                    morning: {
                        avgLight: { $ifNull: [{ $avg: "$morningMeasures.light" }, 0] },
                        alertsCount: { $size: { $filter: { input: "$morningMeasures", as: "m", cond: { $eq: ["$$m.status", "ALERT"] } } } }
                    },
                    evening: {
                        avgLight: { $ifNull: [{ $avg: "$eveningMeasures.light" }, 0] },
                        alertsCount: { $size: { $filter: { input: "$eveningMeasures", as: "e", cond: { $eq: ["$$e.status", "ALERT"] } } } }
                    },
                    night: {
                        avgLight: { $ifNull: [{ $avg: "$nightMeasures.light" }, 0] },
                        alertsCount: { $size: { $filter: { input: "$nightMeasures", as: "n", cond: { $eq: ["$$n.status", "ALERT"] } } } }
                    }
                }
            }
        ]);

        return res.json(dailyData[0] || { morning: { avgLight: 0, alertsCount: 0 }, evening: { avgLight: 0, alertsCount: 0 }, night: { avgLight: 0, alertsCount: 0 } });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

/**
 * 5. HISTORIQUE HEBDOMADAIRE (Sur les 7 derniers jours)
 * Calcule la moyenne journalière brute et le nombre d'alertes par jour.
 */
app.get('/api/history/weekly', async (req, res) => {
    try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const weeklyData = await SensorData.aggregate([
            { $match: { createdAt: { $gte: sevenDaysAgo } } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    avgLight: { $avg: "$light" },
                    alertsCount: { $sum: { $cond: [{ $eq: ["$status", "ALERT"] }, 1, 0] } }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        return res.json(weeklyData);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

// ==========================================
// LANCEMENT DU SERVEUR
// ==========================================
app.listen(PORT, () => {
    console.log(`API IoT active et à l'écoute sur le port ${PORT}`);
});