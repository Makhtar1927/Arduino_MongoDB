# Arduino MongoDB IoT Project

Système de capture et d'enregistrement en temps réel de données capteurs Arduino dans MongoDB Atlas.

## 📋 Fonctionnalités

- ✅ Lecture en temps réel du port série Arduino
- ✅ Stockage automatique des données dans MongoDB
- ✅ Enregistrement régulier toutes les 1 minute
- ✅ Support des horodatages (createdAt, updatedAt)
- ✅ Gestion d'erreurs robuste

## 🛠️ Stack Technologique

- **Node.js** v24.x
- **MongoDB** Atlas (Cloud)
- **Mongoose** v9.7.x (ODM)
- **SerialPort** v13.x (Communication Arduino)
- **Dotenv** (Gestion des variables d'environnement)

## 📦 Installation

### Prérequis
- Node.js v24+ installé
- Arduino configuré et connecté au port série
- MongoDB Atlas actif avec un cluster
- npm ou yarn

### Étapes

1. **Cloner le dépôt**
```bash
git clone https://github.com/Makhtar1927/Arduino_MongoDB.git
cd Arduino_MongoDB
```

2. **Installer les dépendances**
```bash
npm install
```

3. **Configurer les variables d'environnement**
Créer un fichier `.env` à la racine du projet :
```env
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/iot_database
```

4. **Configurer le port Arduino**
Modifier `server.js` ligne 38 :
```javascript
const ARDUINO_PORT = 'COM8'; // Windows
// ou
const ARDUINO_PORT = '/dev/ttyACM0'; // Linux/Mac
```

## 🚀 Démarrage

```bash
node server.js
```

### Sortie attendue
```
Successfully connected to iot_database on MongoDB Atlas
Script IoT démarré avec succès.
Enregistrement automatique planifié toutes les 1 minute.
```

## 📡 Format des données

Les données reçues par l'Arduino doivent être au format :
```
<valeur_numerique>\r\n
```

Exemple : `512\r\n`

### Schéma MongoDB
```javascript
{
  light: Number,        // Valeur du capteur (0-1023)
  sensorId: String,     // Identifiant du capteur
  createdAt: Date,      // Horodatage création
  updatedAt: Date       // Horodatage modification
}
```

## ⚙️ Configuration Arduino

Code exemple pour Arduino (C++) :
```cpp
void setup() {
  Serial.begin(9600);
}

void loop() {
  int sensorValue = analogRead(A0);
  Serial.println(sensorValue);
  delay(1000);
}
```

## 🐛 Troubleshooting

### Erreur : "Cannot find module 'serialport'"
```bash
npm install serialport @serialport/parser-readline
```

### Erreur : "MongoDB connection error"
- Vérifier la chaîne de connexion dans `.env`
- Vérifier que MongoDB Atlas accepte votre adresse IP
- Vérifier les identifiants de base de données

### Arduino ne se connecte pas
- Vérifier le bon port COM : `ls COM* ` (Windows) ou `ls /dev/ttyACM* ` (Linux)
- Vérifier le baud rate : 9600
- Installer les drivers CH340/PL2303 si nécessaire

## 📊 Structure du projet

```
Arduino_MongoDB/
├── server.js           # Script principal
├── package.json        # Dépendances NPM
├── .env               # Variables d'environnement (à créer)
├── .gitignore         # Fichiers ignorés par Git
└── README.md          # Ce fichier
```

## 📝 Logs

Le script affiche les opérations en console :
```
[HH:MM:SS] Données enregistrées : { Lumière: '512 / 1023' }
```

## 🔒 Sécurité

- Ne pas commiter le fichier `.env` contenant les identifiants
- Utiliser les variables d'environnement pour les secrets
- Activer l'authentification réseau sur MongoDB Atlas

## 📄 Licence

ISC

## 👤 Auteur

IoT Project - CCAK L3

## 🤝 Contribution

Les contributions sont bienvenues ! Créer une branche `feature/` pour toute amélioration.
