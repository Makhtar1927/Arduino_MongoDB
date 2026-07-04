const mongoose = require('mongoose');

const sensorDataSchema = new mongoose.Schema({
    sensorId: { type: String, required: true, default: "ESP32_L3_Labo_01" },
    light: { type: Number, required: true }, // Valeur brute (0 à 4095 sur ESP32)
    thresholdValue: { type: Number, required: true, default: 2500 }, // Le seuil configuré
    status: { 
        type: String, 
        enum: ['NORMAL', 'ALERT', 'RETURN_TO_NORMAL'], 
        required: true,
        default: 'NORMAL'
    }
}, { 
    timestamps: true // Génère automatiquement createdAt et updatedAt
});

// Indexation pour optimiser la vitesse de calcul des historiques requis
sensorDataSchema.index({ createdAt: -1 });

module.exports = mongoose.model('SensorData', sensorDataSchema, 'sensor_data');