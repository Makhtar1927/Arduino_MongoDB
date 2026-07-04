require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const SensorData = require('./models/Sensor');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const API_KEY = process.env.API_KEY || "MonEsp32SecretKeyL3";
const requireApiKey = (req, res, next) => {
    const incomingKey = req.headers['x-api-key'];
    if (!incomingKey || incomingKey !== API_KEY) {
        return res.status(401).json({ error: "Accès refusé. Clé API invalide." });
    }
    next();
};

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('Connecté à MongoDB Atlas - Base de données IoT opérationnelle'))
    .catch(err => { console.error('Erreur de connexion Atlas:', err); process.exit(1); });

// ==========================================
// ROUTES COMPLÈTES (CONFORMITÉ SECTIONS 6 & 7)
// ==========================================

// 1. Recevoir et enregistrer une mesure (POST)
app.post('/api/measures', requireApiKey, async (req, res) => {
    try {
        const { light, thresholdValue, status, sensorId } = req.body;
        const newMeasure = new SensorData({ light, thresholdValue, status, sensorId });
        const savedData = await newMeasure.save();
        return res.status(201).json(savedData);
    } catch (error) {
        return res.status(400).json({ error: "Erreur d'enregistrement", details: error.message });
    }
});

// 2. Consulter la dernière mesure (GET) - Pour le Temps Réel du Dashboard
app.get('/api/measures/latest', async (req, res) => {
    try {
        const latest = await SensorData.findOne().sort({ createdAt: -1 });
        if (!latest) return res.status(404).json({ error: "Aucune donnée" });
        return res.json(latest);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

// 3. Consulter toutes les mesures avec Filtre par Date (GET) (Exigence 6.7)
// Exemple: /api/measures?startDate=2026-07-01&endDate=2026-07-04
app.get('/api/measures', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        let query = {};
        
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(endDate);
        }

        const measures = await SensorData.find(query).sort({ createdAt: -1 }).limit(200);
        return res.json(measures);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

// 4. Consulter uniquement les ALERTES (GET) (Exigence 6.5)
app.get('/api/measures/alerts', async (req, res) => {
    try {
        const alerts = await SensorData.find({ status: 'ALERT' }).sort({ createdAt: -1 });
        return res.json(alerts);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

// 5. Consulter uniquement les RETOURS À LA NORMALE (GET) (Exigence 6.6)
app.get('/api/measures/normals', async (req, res) => {
    try {
        const normals = await SensorData.find({ status: 'RETURN_TO_NORMAL' }).sort({ createdAt: -1 });
        return res.json(normals);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

// ==========================================
// ENDPOINTS AGRÉGATIONS HISTORIQUES (SECTION 8)
// ==========================================

// 6. Historique Journalier par Période (Matin, Soir, Nuit)
app.get('/api/history/daily', async (req, res) => {
    try {
        const { date } = req.query;
        const targetDate = date ? new Date(date) : new Date();
        const startOfDay = new Date(targetDate.setHours(0,0,0,0));
        const endOfDay = new Date(targetDate.setHours(23,59,59,999));

        const dailyData = await SensorData.aggregate([
            { $match: { createdAt: { $gte: startOfDay, $lte: endOfDay } } },
            { $project: { light: 1, status: 1, hour: { $hour: { date: "$createdAt", timezone: "Africa/Dakar" } } } },
            {
                $group: {
                    _id: null,
                    morningMeasures: { $push: { $cond: [{ $and: [{ $gte: ["$hour", 6] }, { $lt: ["$hour", 18] }] }, "$$ROOT", "$$REMOVE"] } },
                    eveningMeasures: { $push: { $cond: [{ $and: [{ $gte: ["$hour", 18] }, { $lt: ["$hour", 24] }] }, "$$ROOT", "$$REMOVE"] } },
                    nightMeasures: { $push: { $cond: [{ $and: [{ $gte: ["$hour", 0] }, { $lt: ["$hour", 6] }] }, "$$ROOT", "$$REMOVE"] } }
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
    } catch (error) { return res.status(500).json({ error: error.message }); }
});

// 7. Historique Hebdomadaire — sélection libre de semaine (Exigence 8.2)
// Sans params → 7 derniers jours  |  Avec params → ?startDate=2026-06-30&endDate=2026-07-06
app.get('/api/history/weekly', async (req, res) => {
    try {
        let rangeStart, rangeEnd;

        if (req.query.startDate && req.query.endDate) {
            // L'utilisateur a choisi une semaine précise depuis le dashboard
            rangeStart = new Date(req.query.startDate);
            rangeEnd   = new Date(req.query.endDate);
            rangeEnd.setHours(23, 59, 59, 999); // inclure toute la dernière journée
        } else {
            // Comportement par défaut : 7 derniers jours glissants
            rangeEnd   = new Date();
            rangeStart = new Date();
            rangeStart.setDate(rangeStart.getDate() - 7);
        }

        const weeklyData = await SensorData.aggregate([
            { $match: { createdAt: { $gte: rangeStart, $lte: rangeEnd } } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "Africa/Dakar" } },
                    avgLight: { $avg: "$light" },
                    alertsCount: { $sum: { $cond: [{ $eq: ["$status", "ALERT"] }, 1, 0] } }
                }
            },
            { $sort: { _id: 1 } }
        ]);
        return res.json(weeklyData);
    } catch (error) { return res.status(500).json({ error: error.message }); }
});

// 8. Historique Mensuel (Exigence additionnelle Section 15)
app.get('/api/history/monthly', async (req, res) => {
    try {
        const startOfYear = new Date(new Date().getFullYear(), 0, 1);
        const monthlyData = await SensorData.aggregate([
            { $match: { createdAt: { $gte: startOfYear } } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m", date: "$createdAt", timezone: "Africa/Dakar" } },
                    avgLight: { $avg: "$light" },
                    alertsCount: { $sum: { $cond: [{ $eq: ["$status", "ALERT"] }, 1, 0] } }
                }
            },
            { $sort: { _id: 1 } }
        ]);
        return res.json(monthlyData);
    } catch (error) { return res.status(500).json({ error: error.message }); }
});

app.listen(PORT, () => console.log(`Serveur validé sur le port ${PORT}`));