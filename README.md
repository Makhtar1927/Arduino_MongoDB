# 🌡️ Surveillance Environnementale IoT — Dashboard Temps Réel

> **Projet Évalué — Module Cloud Computing & Internet des Objets**
> Licence 3 Informatique · CCAK · 2025

[![Node.js](https://img.shields.io/badge/Node.js-v24.x-green?logo=node.js)](https://nodejs.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-brightgreen?logo=mongodb)](https://mongodb.com/atlas)
[![Express](https://img.shields.io/badge/Express-4.x-black?logo=express)](https://expressjs.com)
[![Render](https://img.shields.io/badge/Déployé-Render.com-46E3B7?logo=render)](https://api-iot-l3-it-ucak.onrender.com)
[![ESP32](https://img.shields.io/badge/ESP32-GPIO%2034%20%7C%2018-blue?logo=espressif)](https://espressif.com)

---

## 🔗 Liens en ligne

| Ressource | URL |
|-----------|-----|
| 🖥️ **Tableau de bord (Dashboard)** | **[https://api-iot-l3-it-ucak.onrender.com/](https://api-iot-l3-it-ucak.onrender.com/)** |
| 📊 **Page Historiques** | [https://api-iot-l3-it-ucak.onrender.com/history](https://api-iot-l3-it-ucak.onrender.com/history) |
| ⚡ **API REST** | [https://api-iot-l3-it-ucak.onrender.com/api/measures/latest](https://api-iot-l3-it-ucak.onrender.com/api/measures/latest) |
| 💻 **Dépôt GitHub** | [https://github.com/Makhtar1927/Arduino_MongoDB](https://github.com/Makhtar1927/Arduino_MongoDB) |

> ⚠️ **Cold Start Render** : Le service Render en plan gratuit se met en veille après 15 min d'inactivité. La première requête peut prendre 30–60 secondes.

---

## 📋 Table des matières

1. [Contexte et Problématique](#-contexte-et-problématique)
2. [Architecture du Système](#-architecture-du-système)
3. [Stack Technologique](#-stack-technologique)
4. [Structure du Projet](#-structure-du-projet)
5. [Schéma de Données (MongoDB)](#-schéma-de-données-mongodb)
6. [API REST — Documentation Complète](#-api-rest--documentation-complète)
7. [Dashboard Web](#-dashboard-web)
8. [Configuration ESP32](#-configuration-esp32)
9. [Installation & Déploiement Local](#-installation--déploiement-local)
10. [Déploiement Cloud (Render)](#-déploiement-cloud-render)
11. [Sécurité](#-sécurité)
12. [Fonctionnalités Temps Réel](#-fonctionnalités-temps-réel)
13. [Troubleshooting](#-troubleshooting)

---

## 🎯 Contexte et Problématique

### Contexte du module
Dans le cadre du module **Cloud Computing & Internet des Objets**, ce projet vise à concevoir et déployer une solution IoT complète permettant de **surveiller les conditions de luminosité** d'un espace (salle de cours, laboratoire ou atelier) en temps réel.

### Problématique
> *Comment concevoir et déployer une solution IoT capable de surveiller en continu les conditions environnementales d'un espace, de déclencher des alertes automatiques, et de rendre ces données accessibles depuis n'importe quel appareil via le Cloud ?*

### Solution implémentée
Un capteur **LDR (Light Dependent Resistor)** connecté à une carte **ESP32** mesure la luminosité ambiante. Ces données sont envoyées via WiFi à une **API REST Node.js** hébergée sur **Render.com**, stockées dans **MongoDB Atlas**, et visualisées sur un **dashboard web en temps réel** accessible depuis n'importe quel navigateur.

---

## 🏗️ Architecture du Système

```
┌─────────────────────────────────────────────────────────────────┐
│                        COUCHE TERRAIN (IoT)                     │
│                                                                  │
│   [Capteur LDR]                                                  │
│        │ Signal analogique (0-4095)                              │
│        ▼                                                         │
│   [ESP32 — GPIO 34]   ──── WiFi ───▶  POST /api/measures        │
│        │                              + X-API-KEY header         │
│   [Buzzer — GPIO 18]                                             │
│     (alerte sonore si seuil dépassé)                            │
└──────────────────────────────┬──────────────────────────────────┘
                               │ HTTPS (Internet)
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                     COUCHE CLOUD (Render.com)                   │
│                                                                  │
│   [API Node.js + Express]                                        │
│        ├─ POST  /api/measures          ← Ingestion ESP32         │
│        ├─ GET   /api/measures/latest   ← Dernière mesure         │
│        ├─ GET   /api/measures          ← Toutes + filtres date   │
│        ├─ GET   /api/measures/alerts   ← Alertes uniquement      │
│        ├─ GET   /api/measures/normals  ← Retours à la normale    │
│        ├─ GET   /api/history/daily     ← Agrégation journalière  │
│        ├─ GET   /api/history/weekly    ← Agrégation hebdomadaire │
│        ├─ GET   /api/history/monthly   ← Agrégation mensuelle    │
│        ├─ GET   /                      ← Dashboard (index.html)  │
│        └─ GET   /history              ← Historiques (history.html)
│                                                                  │
│        ▼                                                         │
│   [MongoDB Atlas — Base iot_database]                            │
│        └─ Collection : sensordatas                               │
└──────────────────────────────┬──────────────────────────────────┘
                               │ Fetch API (JavaScript)
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                  COUCHE PRÉSENTATION (Navigateur)               │
│                                                                  │
│   index.html — Tableau de bord principal                         │
│        ├─ KPI temps réel (luminosité, état, seuil)              │
│        ├─ Flux en direct (5 s) avec animation                   │
│        ├─ Historique journalier (Matin/Soir/Nuit)               │
│        ├─ Graphique hebdomadaire interactif                      │
│        └─ Graphique mensuel annuel                               │
│                                                                  │
│   history.html — Page historiques détaillée                      │
│        ├─ Flux live avec filtres (Toutes/Alertes/Retours)        │
│        ├─ Détail par journée + accordéons période               │
│        ├─ Graphique hebdomadaire + mensuel                       │
│        └─ Détection "Aucun signal" automatique                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Stack Technologique

### Backend (API)
| Technologie | Version | Rôle |
|-------------|---------|------|
| **Node.js** | v24.x | Runtime JavaScript serveur |
| **Express.js** | 4.x | Framework API REST |
| **Mongoose** | 9.x | ODM MongoDB, validation schéma |
| **dotenv** | latest | Gestion variables d'environnement |
| **cors** | latest | Cross-Origin Resource Sharing |

### Base de données
| Technologie | Rôle |
|-------------|------|
| **MongoDB Atlas** | Base de données NoSQL cloud (cluster M0 gratuit) |
| Timezone **Africa/Dakar** | Utilisé dans les agrégations pour le regroupement local |

### Matériel (IoT)
| Composant | Rôle | Broche ESP32 |
|-----------|------|-------------|
| **ESP32** | Microcontrôleur WiFi + BT | — |
| **Capteur LDR** | Luminosité (0–4095 ADC 12 bits) | GPIO **34** (analogique) |
| **Buzzer** | Alerte sonore si seuil dépassé | GPIO **18** (numérique) |

### Frontend (Dashboard)
| Technologie | Rôle |
|-------------|------|
| **HTML5 + CSS3** | Structure + design ultra-moderne responsive |
| **JavaScript** (Vanilla) | Fetch API, polling temps réel, animations |
| **Chart.js 4.4.4** | Graphiques hebdomadaires et mensuels |
| **Lucide Icons** | Iconographie cohérente via CDN |
| **Inter (Google Fonts)** | Typographie premium |

### Hébergement
| Service | Rôle |
|---------|------|
| **Render.com** | Hébergement API Node.js + fichiers dashboard (plan gratuit) |
| **MongoDB Atlas** | Base de données cloud (cluster M0 gratuit) |
| **GitHub** | Dépôt source + CI/CD automatique via Render |

---

## 📁 Structure du Projet

```
Arduino_MongoDB/
│
├── server.js              # ⚡ API REST Express — point d'entrée principal
├── package.json           # Dépendances NPM et scripts
├── package-lock.json      # Versions exactes des dépendances
│
├── models/
│   └── Sensor.js          # 📋 Schéma Mongoose (SensorData)
│
├── index.html             # 🖥️ Tableau de bord principal (Dashboard)
├── history.html           # 📊 Page historiques détaillée
│
├── .env                   # 🔐 Variables d'environnement (NON commité)
├── .env.example           # 📄 Modèle de variables d'environnement
├── .gitignore             # Fichiers exclus de Git
└── README.md              # 📖 Ce fichier
```

---

## 📋 Schéma de Données (MongoDB)

### Modèle `SensorData` (`models/Sensor.js`)

```javascript
{
  light: {
    type: Number,
    required: true,
    min: 0,
    max: 4095          // ADC 12 bits ESP32
  },
  thresholdValue: {
    type: Number,
    default: 300       // Seuil critique configurable
  },
  status: {
    type: String,
    enum: ['NORMAL', 'ALERT', 'RETURN_TO_NORMAL'],
    default: 'NORMAL'
  },
  sensorId: {
    type: String,
    default: 'ESP32_L3_01'
  },
  createdAt: Date,     // Géré par timestamps: true
  updatedAt: Date
}
```

### Description des champs

| Champ | Type | Description |
|-------|------|-------------|
| `light` | Number (0–4095) | Valeur brute ADC du capteur LDR. 0 = obscurité totale, 4095 = lumière maximale |
| `thresholdValue` | Number | Seuil configuré sur l'ESP32 au moment de la mesure (défaut: 300) |
| `status` | Enum String | État calculé par l'ESP32 : `NORMAL` (light ≥ seuil), `ALERT` (light < seuil), `RETURN_TO_NORMAL` (seuil repassé) |
| `sensorId` | String | Identifiant unique du capteur/dispositif ESP32 |
| `createdAt` | Date (UTC) | Horodatage automatique d'insertion |

### Exemple de document MongoDB

```json
{
  "_id": "6686f3a2c1b4e2a8f0123456",
  "light": 2850,
  "thresholdValue": 300,
  "status": "NORMAL",
  "sensorId": "ESP32_L3_01",
  "createdAt": "2025-07-04T14:30:00.000Z",
  "updatedAt": "2025-07-04T14:30:00.000Z",
  "__v": 0
}
```

---

## 📡 API REST — Documentation Complète

**Base URL :** `https://api-iot-l3-it-ucak.onrender.com`

### Authentification

Les routes d'écriture (POST) nécessitent une clé API dans les headers :

```http
X-API-KEY: MonEsp32SecretKeyL3
```

> La clé est configurée dans la variable d'environnement `API_KEY` sur Render.

---

### `POST /api/measures` 🔐
**Enregistrer une nouvelle mesure (envoyée par l'ESP32)**

**Headers requis :**
```
Content-Type: application/json
X-API-KEY: <votre-clé-api>
```

**Corps (JSON) :**
```json
{
  "light": 2850,
  "thresholdValue": 300,
  "status": "NORMAL",
  "sensorId": "ESP32_L3_01"
}
```

**Réponse 201 Created :**
```json
{
  "_id": "6686f3a2c1b4e2a8f0123456",
  "light": 2850,
  "thresholdValue": 300,
  "status": "NORMAL",
  "sensorId": "ESP32_L3_01",
  "createdAt": "2025-07-04T14:30:00.000Z",
  "updatedAt": "2025-07-04T14:30:00.000Z"
}
```

**Erreurs possibles :**
- `401 Unauthorized` — Clé API manquante ou invalide
- `400 Bad Request` — Données manquantes ou invalides

---

### `GET /api/measures/latest`
**Récupérer la dernière mesure enregistrée** (utilisé par le dashboard temps réel)

```bash
curl https://api-iot-l3-it-ucak.onrender.com/api/measures/latest
```

**Réponse 200 :**
```json
{
  "_id": "...",
  "light": 2850,
  "thresholdValue": 300,
  "status": "NORMAL",
  "sensorId": "ESP32_L3_01",
  "createdAt": "2025-07-04T14:30:00.000Z"
}
```

---

### `GET /api/measures`
**Récupérer toutes les mesures** avec filtres optionnels par date

| Paramètre | Type | Description | Exemple |
|-----------|------|-------------|---------|
| `startDate` | ISO 8601 | Date de début (incluse) | `2025-07-01T00:00:00Z` |
| `endDate` | ISO 8601 | Date de fin (incluse) | `2025-07-04T23:59:59Z` |

```bash
# Toutes les mesures (200 max, triées par date décroissante)
curl https://api-iot-l3-it-ucak.onrender.com/api/measures

# Filtrer par plage de dates
curl "https://api-iot-l3-it-ucak.onrender.com/api/measures?startDate=2025-07-01&endDate=2025-07-04"
```

---

### `GET /api/measures/alerts`
**Récupérer uniquement les mesures en état ALERT**

```bash
curl https://api-iot-l3-it-ucak.onrender.com/api/measures/alerts
```

---

### `GET /api/measures/normals`
**Récupérer uniquement les mesures RETURN_TO_NORMAL**

```bash
curl https://api-iot-l3-it-ucak.onrender.com/api/measures/normals
```

---

### `GET /api/history/daily`
**Agrégation journalière par période** (Matin 06–18h / Soir 18–00h / Nuit 00–06h)

| Paramètre | Type | Description | Défaut |
|-----------|------|-------------|--------|
| `date` | YYYY-MM-DD | Date à analyser | Aujourd'hui |

**Réponse :**
```json
{
  "morning": { "avgLight": 2750.5, "alertsCount": 0 },
  "evening": { "avgLight": 1200.3, "alertsCount": 3 },
  "night":   { "avgLight": 45.2,   "alertsCount": 12 }
}
```

---

### `GET /api/history/weekly`
**Agrégation hebdomadaire** — luminosité moyenne et alertes par jour

| Paramètre | Type | Description | Défaut |
|-----------|------|-------------|--------|
| `startDate` | YYYY-MM-DD | Début de la semaine | 7 derniers jours |
| `endDate` | YYYY-MM-DD | Fin de la semaine | Aujourd'hui |

```bash
# 7 derniers jours
curl https://api-iot-l3-it-ucak.onrender.com/api/history/weekly

# Semaine précise
curl "https://api-iot-l3-it-ucak.onrender.com/api/history/weekly?startDate=2025-06-30&endDate=2025-07-06"
```

**Réponse :**
```json
[
  { "_id": "2025-07-01", "avgLight": 2100.4, "alertsCount": 2 },
  { "_id": "2025-07-02", "avgLight": 1950.1, "alertsCount": 5 },
  { "_id": "2025-07-03", "avgLight": 2300.8, "alertsCount": 0 }
]
```

---

### `GET /api/history/monthly`
**Agrégation mensuelle** — luminosité moyenne et alertes par mois (année en cours)

```bash
curl https://api-iot-l3-it-ucak.onrender.com/api/history/monthly
```

**Réponse :**
```json
[
  { "_id": "2025-01", "avgLight": 1800.2, "alertsCount": 45 },
  { "_id": "2025-06", "avgLight": 2200.7, "alertsCount": 12 },
  { "_id": "2025-07", "avgLight": 2050.3, "alertsCount": 8 }
]
```

---

## 🖥️ Dashboard Web

### `index.html` — Tableau de bord principal

Le dashboard est accessible à la **racine de l'URL Render** : `https://api-iot-l3-it-ucak.onrender.com/`

**Sections :**

| Section | Description | Rafraîchissement |
|---------|-------------|-----------------|
| **KPI Luminosité** | Valeur LDR actuelle + barre de progression (0–4095) | 5 s |
| **KPI État système** | NORMAL / SEUIL DÉPASSÉ / RETOUR NORMALE | 5 s |
| **KPI Seuil** | Valeur de seuil configurée sur l'ESP32 | 5 s |
| **Flux en direct** | 8 dernières mesures avec animation des nouvelles lignes | 5 s |
| **Historique journalier** | Moyennes et alertes par période (Matin/Soir/Nuit) | 10 s |
| **Graphique hebdomadaire** | Courbe + barres alertes + ligne seuil, sélecteur de semaine | À la sélection |
| **Graphique mensuel** | Barres par mois — année en cours | 60 s |

### `history.html` — Page historiques

Accessible à : `https://api-iot-l3-it-ucak.onrender.com/history`

**Sections :**

| Section | Description |
|---------|-------------|
| **Flux live filtré** | 150 dernières mesures avec filtres : Toutes / Normales / Alertes / Retours |
| **Détail journalier** | Sélecteur de date + 3 accordéons (Matin/Soir/Nuit) avec chaque mesure individuelle |
| **Graphique hebdomadaire** | Interactif — sélecteur ISO semaine |
| **Graphique mensuel** | Barres comparatives |

### Détection "Aucun signal"

Le dashboard détecte automatiquement la **déconnexion de l'ESP32** :
- Si la dernière mesure a **plus de 60 secondes**, l'interface passe en mode **"Aucun signal"**
- La carte de statut affiche `⊘ AUCUN SIGNAL` avec icône WiFi-Off
- La barre LDR revient à 0%
- Le retour au signal est **automatique** dès réception d'une nouvelle mesure fraîche

---

## ⚙️ Configuration ESP32

### Code Arduino minimal (C++)

```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// === Configuration ===
const char* WIFI_SSID     = "VotreSSID";
const char* WIFI_PASSWORD = "VotreMotDePasse";
const char* API_URL       = "https://api-iot-l3-it-ucak.onrender.com/api/measures";
const char* API_KEY       = "MonEsp32SecretKeyL3";
const char* SENSOR_ID     = "ESP32_L3_01";

// === Broches ===
const int LDR_PIN    = 34;   // Capteur LDR (ADC analogique)
const int BUZZER_PIN = 18;   // Buzzer (alerte sonore)

// === Seuil ===
int thresholdValue = 300;    // Sous ce seuil → ALERTE

// === Variables d'état ===
String lastStatus = "NORMAL";

void setup() {
  Serial.begin(115200);
  pinMode(BUZZER_PIN, OUTPUT);
  
  // Connexion WiFi
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connecté : " + WiFi.localIP().toString());
}

void loop() {
  int lightValue = analogRead(LDR_PIN);
  
  // Déterminer l'état
  String currentStatus;
  if (lightValue < thresholdValue) {
    currentStatus = "ALERT";
    digitalWrite(BUZZER_PIN, HIGH);   // Buzzer ON
  } else {
    digitalWrite(BUZZER_PIN, LOW);    // Buzzer OFF
    currentStatus = (lastStatus == "ALERT") ? "RETURN_TO_NORMAL" : "NORMAL";
  }
  lastStatus = currentStatus;

  // Envoi HTTP POST à l'API
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(API_URL);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("X-API-KEY", API_KEY);

    StaticJsonDocument<200> doc;
    doc["light"]          = lightValue;
    doc["thresholdValue"] = thresholdValue;
    doc["status"]         = currentStatus;
    doc["sensorId"]       = SENSOR_ID;

    String body;
    serializeJson(doc, body);
    int code = http.POST(body);
    
    Serial.printf("[%s] LDR: %d | Seuil: %d | État: %s | HTTP: %d\n",
      currentStatus.c_str(), lightValue, thresholdValue, currentStatus.c_str(), code);
    
    http.end();
  }

  delay(5000);   // Envoi toutes les 5 secondes
}
```

### Bibliothèques Arduino requises

| Bibliothèque | Source |
|--------------|--------|
| WiFi | Built-in ESP32 |
| HTTPClient | Built-in ESP32 |
| ArduinoJson | Bibliothèque Arduino (Benoit Blanchon) |

---

## 💻 Installation & Déploiement Local

### Prérequis

- **Node.js** v24+ ([nodejs.org](https://nodejs.org))
- **npm** v10+
- Compte **MongoDB Atlas** (cluster M0 gratuit)
- **Git**

### Étapes d'installation

**1. Cloner le dépôt**
```bash
git clone https://github.com/Makhtar1927/Arduino_MongoDB.git
cd Arduino_MongoDB
```

**2. Installer les dépendances**
```bash
npm install
```

**3. Configurer les variables d'environnement**

Copier le fichier exemple et le remplir :
```bash
cp .env.example .env
```

Contenu du `.env` :
```env
# MongoDB Atlas — Chaîne de connexion complète
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/iot_database?retryWrites=true&w=majority

# Clé API pour sécuriser les routes POST (même valeur que dans le code ESP32)
API_KEY=MonEsp32SecretKeyL3

# Port du serveur (5000 par défaut)
PORT=5000
```

**4. Démarrer le serveur**
```bash
node server.js
```

**Sortie attendue :**
```
Connecté à MongoDB Atlas - Base de données IoT opérationnelle
Serveur validé sur le port 5000
```

**5. Accéder au dashboard**

Ouvrir dans un navigateur : [http://localhost:5000](http://localhost:5000)

### Variables d'environnement — détails

| Variable | Obligatoire | Description |
|----------|-------------|-------------|
| `MONGO_URI` | ✅ Oui | URI de connexion MongoDB Atlas |
| `API_KEY` | ✅ Oui | Clé secrète pour les requêtes ESP32 |
| `PORT` | Non | Port du serveur (défaut: 5000) |

---

## ☁️ Déploiement Cloud (Render)

### Configuration automatique via GitHub

Le projet est configuré pour un **déploiement automatique** :
chaque `git push` sur la branche `main` déclenche un redéploiement Render.

### Variables d'environnement sur Render

Dans le dashboard Render → **Environment** :

| Clé | Valeur |
|-----|--------|
| `MONGO_URI` | URI complet MongoDB Atlas |
| `API_KEY` | Clé secrète API |
| `NODE_ENV` | `production` |

### Commandes de déploiement manuel

```bash
# Ajouter les modifications
git add .

# Commiter avec un message descriptif
git commit -m "feat: description des changements"

# Pousser vers GitHub (déclenche le redéploiement Render automatiquement)
git push origin main
```

### URLs de production

| Service | URL |
|---------|-----|
| Dashboard | `https://api-iot-l3-it-ucak.onrender.com/` |
| Historiques | `https://api-iot-l3-it-ucak.onrender.com/history` |
| API santé | `https://api-iot-l3-it-ucak.onrender.com/api/measures/latest` |

---

## 🔒 Sécurité

### Mesures en place

| Mesure | Description |
|--------|-------------|
| **X-API-KEY** | Toutes les routes d'écriture (POST) nécessitent une clé secrète dans le header |
| **CORS** | Configuré pour autoriser les requêtes cross-origin |
| **Variables d'environnement** | Aucun secret dans le code source |
| **.gitignore** | Le fichier `.env` n'est jamais commité |
| **MongoDB Atlas** | Authentification par utilisateur dédié + whitelist IP |

### Ce qu'il ne faut jamais commiter

```gitignore
.env               # Variables secrètes
node_modules/      # Dépendances (régénérables via npm install)
*.log              # Fichiers de logs
```

### Appel API sécurisé (exemple)

```bash
curl -X POST https://api-iot-l3-it-ucak.onrender.com/api/measures \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: MonEsp32SecretKeyL3" \
  -d '{"light": 2850, "thresholdValue": 300, "status": "NORMAL", "sensorId": "ESP32_L3_01"}'
```

---

## ⚡ Fonctionnalités Temps Réel

### Flux de données

```
ESP32 (toutes les 5s)
    │
    ▼ POST /api/measures (avec X-API-KEY)
    │
MongoDB Atlas (insertion)
    │
    ▼ GET /api/measures/latest (toutes les 5s)
    │
Dashboard → Mise à jour UI automatique
```

### Intervalles de rafraîchissement

| Donnée | Intervalle | Raison |
|--------|-----------|--------|
| Mesure actuelle (LDR, état) | **5 s** | Temps réel strict |
| Flux en direct (mini + history) | **5 s** | Synchronisé avec ESP32 |
| Historique journalier | **10 s** | Quasi temps réel |
| Graphique mensuel | **60 s** | Peu de variation |

### Détection déconnexion ESP32

- Seuil de fraîcheur : **60 secondes**
- Si `Date.now() - createdAt > 60s` → état "Aucun signal"
- Rétablissement automatique dès nouvelle mesure reçue

---

## 🐛 Troubleshooting

### `404 Not Found` sur `/api/history/monthly`
→ Le serveur Render tourne sur une ancienne version.
```bash
git add server.js
git commit -m "fix: update server"
git push origin main
# Attendre 2 min que Render redéploie
```

### `401 Unauthorized` sur POST /api/measures
→ Header `X-API-KEY` manquant ou incorrect.
```cpp
http.addHeader("X-API-KEY", "MonEsp32SecretKeyL3");
```

### Dashboard affiche "Aucun signal"
1. Vérifier que l'ESP32 est alimenté et connecté au WiFi
2. Vérifier le `WIFI_SSID` et `WIFI_PASSWORD` dans le code Arduino
3. Vérifier que l'URL de l'API dans le code ESP32 est correcte
4. Tester manuellement : `curl https://api-iot-l3-it-ucak.onrender.com/api/measures/latest`

### "Render cold start" (30–60 s de chargement)
→ Normal sur le plan gratuit Render. Le service se remet en veille après 15 min d'inactivité.
→ Solution : attendre ~60 s après le premier accès. Les requêtes suivantes sont instantanées.

### Erreur de connexion MongoDB Atlas
- Vérifier `MONGO_URI` dans les variables Render
- Vérifier que l'IP `0.0.0.0/0` est dans la whitelist Atlas (Network Access)
- Vérifier les identifiants utilisateur Atlas

---

## 📊 Résultats Attendus et Conformité au Brief

| Exigence Brief | Implémenté | Détail |
|---------------|------------|--------|
| ESP32 + capteur | ✅ | LDR GPIO 34, buzzer GPIO 18 |
| API Node.js | ✅ | Express.js sur Render |
| MongoDB Atlas | ✅ | Cluster M0 gratuit |
| Interface Web cloud | ✅ | Dashboard + Historiques sur Render |
| Sécurité X-API-KEY | ✅ | Middleware `requireApiKey` |
| Alertes temps réel | ✅ | Statut ALERT + buzzer + badge rouge |
| Historiques | ✅ | Journalier / Hebdomadaire / Mensuel |
| Filtres par date | ✅ | `?startDate=...&endDate=...` |
| Agrégations MongoDB | ✅ | `$group`, `$match`, `$avg`, `$sum` |
| Déploiement Cloud | ✅ | Render.com + MongoDB Atlas |
| Interface responsive | ✅ | Mobile / Tablette / Desktop |

---

## 👥 Équipe

Projet réalisé dans le cadre du module **Cloud Computing & IoT** — Licence 3 Informatique · CCAK · 2025

---

## 📄 Licence

ISC — Projet académique · CCAK 2025
