require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const SensorData = require('./models/Sensor');

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares obligatoires
app.use(cors());
app.use(express.json());

// Clé de protection minimale pour les requêtes POST provenant de l'ESP32
const API_KEY = process.env.API_KEY || "MonEsp32SecretKeyL3";

const requireApiKey = (req, res, next) => {
    const incomingKey = req.headers['x-api-key'];
    if (!incomingKey || incomingKey !== API_KEY) {
        return res.status(401).json({ error: "Accès refusé. Clé API invalide ou absente." });
    }
    next();
};

// Connexion à MongoDB Atlas (votre base 'iot_database')
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('Successfully connected to iot_database on MongoDB Atlas'))
    .catch(err => {
        console.error('Erreur de connexion MongoDB:', err);
        process.exit(1);
    });

// ==========================================
// ROUTES REQUISES PAR LE BRIEF
// ==========================================

/**
 * 1. RECEVOIR ET ENREGISTRER UNE NOUVELLE MESURE (POST)
 * Appelée par l'ESP32 via Wi-Fi
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
 * Pour l'affichage en temps réel sur le dashboard
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
 * 3. HISTORIQUE JOURNALIER PAR PÉRIODE (Matin, Soir, Nuit)
 * Récupère les données d'une date (ou aujourd'hui), calcule les moyennes et compte les alertes.
 * Plages définies : Matin (06h-18h), Soir (18h-00h), Nuit (00h-06h)
 */
app.get('/api/history/daily', async (req, res) => {
    try {
        const { date } = req.query; // Exemple: /api/history/daily?date=2026-06-28
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
 * 4. HISTORIQUE HEBDOMADAIRE (7 derniers jours)
 * Fournit la moyenne journalière et le nombre d'alertes par jour
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

app.listen(PORT, () => {
    console.log(`API IoT active et à l'écoute sur le port ${PORT}`);
});