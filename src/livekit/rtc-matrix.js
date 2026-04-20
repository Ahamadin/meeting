// src/livekit/rtc-matrix.js
import {
  Room,
  RoomEvent,
  createLocalScreenTracks,
  setLogLevel,
} from 'livekit-client';
import { getLivekitToken } from '../services/livekit-service';

setLogLevel('warn');

let room = null;

/** Récupère l'instance courante de la room */
export function getRoom() {
  return room;
}

/**
 * Connexion à LiveKit avec authentification Matrix
 * @param {Object} params
 * @param {string} params.roomName - Nom de la room
 * @param {string} params.displayName - Nom d'affichage
 * @param {string} params.matrixToken - Token Matrix
 * @param {boolean} params.micOn - Activer le micro
 * @param {boolean} params.camOn - Activer la caméra
 */
export async function connectToLivekit({ roomName, displayName, matrixToken, micOn = false, camOn = false }) {
  if (!roomName || !displayName || !matrixToken) {
    throw new Error('roomName, displayName et matrixToken sont requis');
  }

  // 1. Obtenir le token LiveKit via le backend
  const LIVEKIT_WS_URL = 'wss://livekit.ec2lt.sn';
  const { token, identity } = await getLivekitToken(matrixToken, roomName);

  // 2. Créer la room avec options optimisées pour la scalabilité
  room = new Room({
    // Adaptive streaming pour gérer la bande passante
    adaptiveStream: true,
    // Dynacast pour optimiser l'envoi de vidéo
    dynacast: true,
    // Réduction de qualité automatique si nécessaire
    videoCaptureDefaults: {
      resolution: {
        width: 1280,
        height: 720,
        frameRate: 30,
      },
    },
    // Configuration de reconnexion
    reconnectPolicy: {
      nextRetryDelayInMs: (attempt) => Math.min(5000, 250 * (attempt + 1)),
      maxAttempts: 10,
    },
    // Désactiver simulcast pour économiser de la bande passante
    publishDefaults: {
      simulcast: true, // Garder activé pour les grandes réunions
      videoSimulcastLayers: [
        { resolution: { width: 320, height: 180 }, encoding: { maxBitrate: 150_000 } },
        { resolution: { width: 640, height: 360 }, encoding: { maxBitrate: 500_000 } },
        { resolution: { width: 1280, height: 720 }, encoding: { maxBitrate: 1_500_000 } },
      ],
    },
  });

  // 3. Événements de monitoring
  room.on(RoomEvent.ConnectionStateChanged, (state) => {
    console.log('[LiveKit] État de connexion:', state);
  });

  room.on(RoomEvent.ParticipantConnected, (participant) => {
    console.log('[LiveKit] Participant connecté:', participant.identity);
  });

  room.on(RoomEvent.ParticipantDisconnected, (participant) => {
    console.log('[LiveKit] Participant déconnecté:', participant.identity);
  });

  room.on(RoomEvent.Reconnecting, () => {
    console.log('[LiveKit] Reconnexion en cours...');
  });

  room.on(RoomEvent.Reconnected, () => {
    console.log('[LiveKit] Reconnecté avec succès');
  });

  room.on(RoomEvent.Disconnected, (reason) => {
    console.log('[LiveKit] Déconnecté:', reason);
  });

  // 4. Connexion
  await room.connect(LIVEKIT_WS_URL, token);

  // 5. Définir le nom d'affichage
  try {
    await room.localParticipant.setName(displayName);
  } catch (e) {
    console.warn('Impossible de définir le nom:', e);
  }

  // 6. Activer micro/caméra si demandé
  try {
    if (micOn) {
      await room.localParticipant.setMicrophoneEnabled(true);
    }
  } catch (e) {
    console.warn('Impossible d\'activer le micro:', e);
  }

  try {
    if (camOn) {
      await room.localParticipant.setCameraEnabled(true);
    }
  } catch (e) {
    console.warn('Impossible d\'activer la caméra:', e);
  }

  return room;
}

/** Active/désactive le micro */
export async function toggleMic(on) {
  if (!room) throw new Error('Room non connectée');
  await room.localParticipant.setMicrophoneEnabled(!!on);
}

/** Active/désactive la caméra */
export async function toggleCam(on) {
  if (!room) throw new Error('Room non connectée');
  await room.localParticipant.setCameraEnabled(!!on);
}

/** Partage d'écran avec audio système */
let _screenTracks = null;

export async function shareScreen(start = true) {
  if (!room) throw new Error('Room non connectée');

  if (start) {
    // Créer et publier les pistes d'écran
    const tracks = await createLocalScreenTracks({
      audio: true,
      resolution: 'hd_30',
    });
    _screenTracks = tracks;
    for (const t of tracks) {
      await room.localParticipant.publishTrack(t);
    }
  } else {
    // Dépublier et stopper
    if (_screenTracks) {
      for (const t of _screenTracks) {
        try {
          await room.localParticipant.unpublishTrack(t);
        } catch (e) {
          console.warn('Erreur lors de la dépublication:', e);
        }
        try {
          t.stop();
        } catch (e) {
          console.warn('Erreur lors de l\'arrêt de la piste:', e);
        }
      }
      _screenTracks = null;
    }
  }
}

/** Envoi d'un message chat via DataChannel */
export async function sendChatMessage(text) {
  if (!room) return;
  const payload = new TextEncoder().encode(
    JSON.stringify({
      text: String(text || ''),
      ts: Date.now(),
    })
  );
  await room.localParticipant.publishData(payload, { reliable: true });
}

/** Quitter la réunion proprement */
export async function leaveRoom() {
  if (!room) return;
  try {
    await room.disconnect();
  } finally {
    room = null;
    _screenTracks = null;
  }
}

/** Lister les participants de manière sécurisée */
export function listParticipants() {
  if (!room) return [];
  const remote = room.participants && typeof room.participants.values === 'function'
    ? Array.from(room.participants.values())
    : [];
  return [room.localParticipant, ...remote].filter(Boolean);
}