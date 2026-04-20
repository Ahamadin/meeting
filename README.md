# JokkoMeet — Plateforme de Visioconférence WebRTC

> Application de réunion vidéo en temps réel, inspirée de Google Meet, construite sur **LiveKit** (WebRTC), **React** et **Node.js/Express**. Sans compte utilisateur requis.

---

## Table des matières

1. [Vue d'ensemble](#1-vue-densemble)
2. [Architecture globale](#2-architecture-globale)
3. [Stack technique](#3-stack-technique)
4. [Structure du projet](#4-structure-du-projet)
5. [Fonctionnalités](#5-fonctionnalités)
6. [Sécurité et chiffrement E2EE](#6-sécurité-et-chiffrement-e2ee)
7. [API Backend — Endpoints](#7-api-backend--endpoints)
8. [Installation et démarrage](#8-installation-et-démarrage)
9. [Variables d'environnement](#9-variables-denvironnement)
10. [Flux de données — Comment ça marche](#10-flux-de-données--comment-ça-marche)
11. [Déploiement](#11-déploiement)

---

## 1. Vue d'ensemble

JokkoMeet est une plateforme de visioconférence conçue pour le contexte sénégalais (*Jokko* = rencontre en wolof). Elle permet de créer ou rejoindre des réunions vidéo sans inscription, en partageant simplement un code de salle.

**Principe de fonctionnement :**
- L'utilisateur saisit son nom et crée ou rejoint une salle
- Le backend génère un **token JWT signé** par LiveKit
- Le frontend se connecte directement au serveur **LiveKit (WebRTC)** avec ce token
- Les flux vidéo/audio transitent via LiveKit — le backend n'est plus sollicité pendant la réunion

---

## 2. Architecture globale

```
┌─────────────────────────────────────────────────────────────────────┐
│                         NAVIGATEUR (Client)                         │
│                                                                      │
│   React + Vite + TailwindCSS                                        │
│   LiveKit Components React · livekit-client SDK                     │
│   Web Crypto API (E2EE AES-GCM 256)                                 │
└──────────────┬──────────────────────────────┬───────────────────────┘
               │  REST API (Token JWT)         │  WebRTC (SFU)
               ▼                              ▼
┌──────────────────────────┐    ┌──────────────────────────────────┐
│   livekit-meet-backend   │    │        LiveKit Server (SFU)      │
│   Node.js + Express      │───▶│        wss://livekit.ec2lt.sn    │
│   Port 4000              │    │  Gestion rooms, participants,     │
│                          │    │  enregistrements (Egress)        │
└──────────────────────────┘    └──────────────┬───────────────────┘
                                               │ Egress (enregistrement)
                                               ▼
                                ┌──────────────────────────────────┐
                                │   MinIO (Stockage S3-compatible) │
                                │   recordings/YYYY-MM-DD/room/    │
                                │   fichier.mp4                    │
                                └──────────────────────────────────┘
```

**Flux simplifié :**
1. `POST /api/meet/create` → backend crée la room + génère token JWT hôte
2. `POST /api/meet/join` → backend génère token JWT participant
3. Frontend se connecte à LiveKit via le token → flux WebRTC via SFU
4. `POST /api/recording/start` → LiveKit Egress enregistre la room en MP4 → MinIO

---

## 3. Stack technique

### Frontend
| Technologie | Rôle |
|---|---|
| React 19 | Framework UI |
| Vite 7 + SWC | Bundler ultra-rapide |
| TailwindCSS 3 | Styling utilitaire |
| React Router DOM 7 | Navigation SPA |
| livekit-client 2 | SDK WebRTC LiveKit |
| @livekit/components-react 2 | Composants vidéo prêts à l'emploi |
| react-window + react-virtual | Virtualisation de la grille vidéo |
| lucide-react | Icônes |
| Web Crypto API (natif) | Chiffrement E2EE AES-GCM |

### Backend
| Technologie | Rôle |
|---|---|
| Node.js 20+ | Runtime |
| Express 5 | Framework HTTP |
| livekit-server-sdk 2 | Génération tokens + gestion rooms |
| nanoid 3 | Génération codes de réunion uniques |
| cors | Contrôle CORS |
| morgan | Logging HTTP |
| dotenv | Variables d'environnement |

### Infrastructure
| Service | Rôle |
|---|---|
| LiveKit Server (auto-hébergé) | SFU WebRTC — transport vidéo/audio |
| MinIO | Stockage S3-compatible pour enregistrements MP4 |

---

## 4. Structure du projet

```
jokkomeet/
├── meeting/                          ← Frontend React
│   ├── src/
│   │   ├── App.jsx                   # Routeur principal
│   │   ├── main.jsx                  # Point d'entrée
│   │   ├── config.js                 # Config API URL
│   │   ├── routes/
│   │   │   ├── Home.jsx              # Page d'accueil (créer/rejoindre)
│   │   │   ├── Prejoin.jsx           # Écran pré-réunion (test cam/micro)
│   │   │   ├── Meeting.jsx           # Page principale de réunion
│   │   │   ├── Join.jsx              # Rejoindre via code
│   │   │   ├── Login.jsx / Register  # Auth optionnelle
│   │   │   ├── Schedule.jsx          # Planifier une réunion
│   │   │   └── Security.jsx          # Page sécurité / E2EE
│   │   ├── features/
│   │   │   ├── auth/
│   │   │   │   └── AuthContext.jsx   # Contexte authentification
│   │   │   └── meeting/
│   │   │       ├── context/
│   │   │       │   ├── MeetingContext.jsx    # État global réunion
│   │   │       │   ├── SidePanelContext.jsx  # Panneau latéral
│   │   │       │   └── ChatEventsContext.jsx # Événements chat
│   │   │       ├── components/
│   │   │       │   ├── VideoGrid.jsx         # Grille vidéo virtualisée
│   │   │       │   ├── ParticipantTile.jsx   # Tuile vidéo participant
│   │   │       │   ├── ControlsBar.jsx       # Barre de contrôles
│   │   │       │   ├── TopBar.jsx            # Barre supérieure
│   │   │       │   ├── SidePanel.jsx         # Panneau latéral
│   │   │       │   ├── WaitingRoom.jsx       # Salle d'attente
│   │   │       │   ├── WaitingRoomPanel.jsx  # Gestion salle d'attente (hôte)
│   │   │       │   ├── ScreenShareView.jsx   # Partage d'écran
│   │   │       │   ├── ReactionsOverlay.jsx  # Réactions emoji
│   │   │       │   ├── PollPanel.jsx         # Sondages
│   │   │       │   ├── FilesPanel.jsx        # Partage de fichiers
│   │   │       │   └── StatsPanel.jsx        # Stats réseau temps réel
│   │   │       ├── panels/
│   │   │       │   ├── ChatPanel.jsx         # Chat en réunion
│   │   │       │   ├── RecordingPanel.jsx    # Contrôle enregistrement
│   │   │       │   ├── ParticipantsPanel.jsx # Liste participants
│   │   │       │   ├── AVSettingsPanel.jsx   # Paramètres A/V
│   │   │       │   └── InvitePanel.jsx       # Invitation
│   │   │       ├── hooks/
│   │   │       │   └── useTimer.js           # Chronomètre réunion
│   │   │       └── utils/
│   │   │           └── e2ee.js               # Chiffrement E2EE (AES-GCM 256)
│   │   ├── components/
│   │   │   ├── chat/                         # Bulles messages (texte, image, audio, vidéo, fichier)
│   │   │   ├── IncomingCallModal.jsx          # Modal appel entrant
│   │   │   ├── ScheduleMeetingModal.jsx       # Modal planification
│   │   │   └── ui/                           # Composants UI génériques
│   │   ├── services/
│   │   │   ├── matrix/                       # Intégration Matrix (chat décentralisé)
│   │   │   ├── call/                         # Gestion appels LiveKit
│   │   │   └── livekit-service.js            # Client LiveKit frontend
│   │   ├── livekit/
│   │   │   ├── api.js                        # Appels REST vers le backend
│   │   │   ├── livekit.js                    # Connexion LiveKit
│   │   │   └── rtc.js                        # Gestion WebRTC bas niveau
│   │   └── utils/
│   │       ├── e2ee.js                       # Utilitaires E2EE
│   │       ├── time.js                       # Formatage temps
│   │       └── callState.js                  # État des appels
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── .env.local
│
└── livekit-meet-backend/             ← Backend Node.js
    ├── server.js                     # Démarrage serveur HTTPS
    ├── app.js                        # Configuration Express
    ├── config/
    │   ├── env.js                    # Chargement variables d'env
    │   └── livekit.js                # Config LiveKit (URL, clés)
    ├── controllers/
    │   ├── meet.controller.js        # Logique création/jonction réunion
    │   └── recording.controller.js   # Logique démarrage/arrêt enregistrement
    ├── middlewares/
    │   └── authMeet.js               # Validation displayName + roomName
    ├── routes/
    │   ├── meet.routes.js            # Routes /api/meet/*
    │   └── recording.routes.js       # Routes /api/recording/*
    ├── services/
    │   ├── livekit.service.js        # Token JWT + gestion rooms LiveKit
    │   └── recording.service.js      # Egress LiveKit → MinIO
    ├── package.json
    └── .env.example
```

---

## 5. Fonctionnalités

### Réunion vidéo
- Création de salle avec code auto-généré (`abc-defg-hij`) ou personnalisé
- Rejoindre via code de salle — sans inscription requise
- Écran pré-réunion : test caméra, micro, arrière-plan
- Grille vidéo virtualisée (jusqu'à 50 participants) avec `react-window`
- Partage d'écran
- Coupure/activation micro et caméra à la volée

### Gestion de réunion
- **Rôles** : Hôte (`roomAdmin: true`) vs Participant — encodés dans le JWT, impossibles à falsifier
- **Salle d'attente** : l'hôte admet ou refuse les participants avant leur entrée
- Muter / expulser des participants (hôte uniquement)
- Chronomètre de réunion
- Statistiques réseau en temps réel (débit, latence, perte de paquets)

### Communication
- Chat en temps réel via **data channel LiveKit** (sans serveur WebSocket séparé)
- Messages texte, images, fichiers, audio, vidéo
- Chat privé entre participants
- Indicateur de frappe
- Réactions emoji animées
- Sondages en réunion

### Enregistrement
- Enregistrement composite MP4 via **LiveKit Egress**
- Stockage automatique sur **MinIO** (S3-compatible)
- Organisation : `recordings/YYYY-MM-DD/roomName/timestamp.mp4`
- Contrôlé depuis le panneau d'enregistrement (hôte uniquement)

### Sécurité
- Chiffrement de bout en bout (E2EE) **AES-GCM 256 bits** via Web Crypto API
- Clé dérivée du nom de salle via **PBKDF2** (100 000 itérations, SHA-256)
- Worker inline (Blob URL) — aucun fichier externe nécessaire
- Compatible Chrome 94+, Firefox 117+, Edge 94+

---

## 6. Sécurité et chiffrement E2EE

Le chiffrement end-to-end est implémenté **côté navigateur** via `RTCRtpScriptTransform` :

```
Participant A                              Participant B
    │                                           │
    │  Media Frame                              │
    │      │                                    │
    │  [Worker E2EE]                            │
    │  encrypt(AES-GCM 256, iv aléatoire)       │
    │      │                                    │
    │  Frame chiffrée ──── LiveKit SFU ────▶ [Worker E2EE]
    │                    (ne voit pas le         │  decrypt(AES-GCM 256)
    │                     contenu clair)         │
    │                                       Media Frame déchiffrée
```

**Dérivation de la clé :**
```
roomName + sel ("jokko-meet-e2ee-salt-v1-" + roomName)
    │
    └── PBKDF2 (SHA-256, 100 000 itérations)
            │
            └── AES-GCM 256 bits
```

Le serveur LiveKit transporte des frames **déjà chiffrées** — il ne peut pas déchiffrer le contenu media.

---

## 7. API Backend — Endpoints

### Base URL : `http://localhost:4000`

#### Réunions

| Méthode | Route | Description |
|---|---|---|
| `POST` | `/api/meet/create` | Créer une réunion (hôte) |
| `POST` | `/api/meet/join` | Rejoindre une réunion |
| `GET` | `/api/meet/:roomName/info` | Infos sur une room |
| `DELETE` | `/api/meet/:roomName` | Fermer une réunion |
| `GET` | `/health` | Health check |

**Créer une réunion :**
```json
// POST /api/meet/create
{ "displayName": "Alice", "roomName": "ma-reunion" }
// roomName optionnel → code auto-généré si absent

// Réponse 201
{
  "token": "eyJ...",
  "roomName": "ma-reunion",
  "displayName": "Alice",
  "role": "host",
  "joinUrl": "/meeting/ma-reunion"
}
```

**Rejoindre une réunion :**
```json
// POST /api/meet/join
{ "displayName": "Bob", "roomName": "ma-reunion" }

// Réponse 200
{
  "token": "eyJ...",
  "roomName": "ma-reunion",
  "displayName": "Bob",
  "role": "participant",
  "participantCount": 1,
  "participants": ["Alice"]
}
```

#### Enregistrement

| Méthode | Route | Description |
|---|---|---|
| `POST` | `/api/recording/start` | Démarrer l'enregistrement |
| `POST` | `/api/recording/stop` | Arrêter l'enregistrement |
| `GET` | `/api/recording/active/:roomName` | Enregistrements actifs |

---

## 8. Installation et démarrage

### Prérequis
- Node.js 20+
- npm 10+
- Un serveur LiveKit (auto-hébergé ou cloud)
- MinIO (pour les enregistrements)

### Backend

```bash
cd livekit-meet-backend

# Installer les dépendances
npm install

# Configurer l'environnement
cp .env.example .env
# Éditez .env avec vos clés LiveKit et MinIO

# Démarrer en développement (hot-reload)
npm run dev

# Démarrer en production
npm start
```

### Frontend

```bash
cd meeting

# Installer les dépendances
npm install

# Configurer l'environnement
# Créez .env.local avec l'URL de votre backend
echo "VITE_API_URL=http://localhost:4000" > .env.local

# Démarrer en développement
npm run dev

# Build de production
npm run build

# Prévisualiser le build
npm run preview
```

---

## 9. Variables d'environnement

### Backend — `.env`

```env
# Serveur
PORT=4000
NODE_ENV=production

# LiveKit
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=votre_secret_livekit
LIVEKIT_URL=https://livekit.ec2lt.sn

# MinIO / S3 — stockage enregistrements
S3_ENDPOINT=http://votre-minio:9000
S3_BUCKET=livekit-recordings
S3_KEY_ID=votre_access_key
S3_KEY_SECRET=votre_secret_key
S3_REGION=us-east-1

# CORS — domaines autorisés (séparés par virgule)
ALLOWED_ORIGINS=http://localhost:5173,https://votre-domaine.com
```

> **Note MinIO :** `forcePathStyle: true` est obligatoire. Sans ce paramètre, LiveKit tente d'accéder à `bucket.endpoint` au lieu de `endpoint/bucket`, ce qui fait échouer l'upload des enregistrements.

### Frontend — `.env.local`

```env
VITE_API_URL=http://localhost:4000
VITE_LIVEKIT_URL=wss://livekit.ec2lt.sn
```

---

## 10. Flux de données — Comment ça marche

### Créer une réunion

```
Utilisateur         Frontend              Backend           LiveKit Server
    │                   │                    │                    │
    │── Saisit nom ────▶│                    │                    │
    │                   │── POST /create ───▶│                    │
    │                   │                    │── createRoom ─────▶│
    │                   │                    │◀─ room créée ──────│
    │                   │                    │── generateToken    │
    │                   │◀── { token, room } ─│                    │
    │                   │                    │                    │
    │                   │── connect(token) ──────────────────────▶│
    │◀── Réunion live ──│◀─────────────────── WebRTC stream ──────│
```

### Rejoindre avec salle d'attente

```
Participant         Frontend              Backend           LiveKit (Data Channel)
    │                   │                    │                    │
    │── Rejoint ────────▶│── POST /join ─────▶│                    │
    │                   │◀── { token } ──────│                    │
    │                   │── connect(token) ───────────────────────▶│
    │                   │ (canPublish: false tant que pas admis)   │
    │                   │                                          │
    │                   │◀─── data msg "admit" (depuis hôte) ─────│
    │                   │── active audio/vidéo                     │
    │◀── Accès réunion ─│                                          │
```

### Enregistrement

```
Hôte                Frontend              Backend           LiveKit Egress        MinIO
 │                     │                    │                    │                  │
 │── Clic Enregistrer ▶│── POST /start ────▶│                    │                  │
 │                     │                    │── startEgress ────▶│                  │
 │                     │                    │                    │── encode MP4 ────▶│
 │                     │◀── { egressId } ───│                    │  stream continu   │
 │── Clic Arrêter ────▶│── POST /stop ─────▶│── stopEgress ─────▶│                  │
 │                     │                    │                    │── finalize MP4 ──▶│
 │                     │                    │                    │ /recordings/date/ │
```

---

## 11. Déploiement

### Configuration SSL (HTTPS requis pour WebRTC)

WebRTC et l'API Web Crypto **requièrent HTTPS** en production. Le backend inclut un dossier `certificats/` avec les fichiers `fullchain.pem` et `privkey.pem`.

### Architecture de production

```
Internet
    │
    ▼
[Reverse Proxy — Nginx / Caddy]
    ├── https://clientcom.rtn.sn      ──▶  Frontend (React build statique)
    ├── https://api.votre-domaine.com  ──▶  Backend Node.js :4000
    └── wss://livekit.ec2lt.sn         ──▶  LiveKit Server
                                               └── Egress ──▶ MinIO :9000
```

### Commandes de production

```bash
# Backend
NODE_ENV=production npm start

# Frontend — build puis servir avec Nginx ou Caddy
npm run build
# Le dossier dist/ contient les fichiers statiques à déployer
```

---

## Points techniques notables

**Génération du code de réunion**
Le format `abc-defg-hij` est généré avec `nanoid` côté backend, garantissant l'unicité sans base de données.

**Rôle encodé dans le JWT**
Le rôle (hôte/participant) est signé dans le token JWT LiveKit via `metadata: JSON.stringify({ role })`. Le frontend ne peut pas falsifier ce rôle — il est vérifié par LiveKit Server.

**Grille vidéo virtualisée**
Pour éviter de rendre 50 flux vidéo simultanément, `react-window` ne monte dans le DOM que les tuiles visibles à l'écran, réduisant drastiquement l'utilisation mémoire.

**Chat sans serveur supplémentaire**
Le chat utilise le **data channel LiveKit** (`room.localParticipant.publishData`). Aucun serveur WebSocket séparé n'est nécessaire.

**Architecture stateless**
L'état des rooms est entièrement géré par LiveKit Server. Le backend est stateless — il génère des tokens et délègue tout à LiveKit. Aucune base de données requise.
