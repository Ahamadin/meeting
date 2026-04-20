// src/livekit/rtc.js
import {
  Room,
  RoomEvent,
  createLocalScreenTracks,
} from 'livekit-client';
import { getLiveKitToken } from '../api/meetings';

let room = null;

export function getRoom() {
  return room;
}

export async function connectToLivekit({
  roomName,
  displayName,
  micOn = false,
  camOn = false,
  token = null,
}) {
  if (!roomName || !displayName) {
    throw new Error('roomName et displayName sont requis');
  }

  let lkToken = token;

  // Si pas de token fourni, on le demande au backend
  if (!lkToken) {
    console.log('[RTC] Demande de token LiveKit pour room:', roomName);
    const tokenData = await getLiveKitToken(roomName); // ← pas besoin de passer token ici si vous gérez dans le composant
    lkToken = tokenData.token;

    if (!lkToken) {
      throw new Error('Token LiveKit non reçu');
    }
  }

  // URL LiveKit fixe (de votre .env ou hardcodée)
  const lkUrl = import.meta.env.VITE_LIVEKIT_WS_URL || 'wss://livekit.ec2lt.sn';

  console.log('[RTC] Connexion avec URL:', lkUrl);
  console.log('[RTC] Token (début):', lkToken.substring(0, 30) + '...');

  room = new Room({
    adaptiveStream: true,
    dynacast: true,
    autoSubscribe: true,
  });

  room.on(RoomEvent.ConnectionStateChanged, (state) => {
    console.log('[LK] state:', state);
  });

  room.on(RoomEvent.ParticipantConnected, (p) => {
    console.log('[LK] Participant connected:', p.identity, p.name || '(no name yet)');
  });

  room.on(RoomEvent.ParticipantDisconnected, (p) => {
    console.log('[LK] Participant disconnected:', p.identity);
  });

  try {
    await room.connect(lkUrl, lkToken);
    console.log('[LK] Connecté avec succès !');
  } catch (err) {
    console.error('[LK] Erreur connexion WebSocket:', err);
    throw err;
  }

  // Petite pause pour stabiliser
  await new Promise(resolve => setTimeout(resolve, 800));

  if (micOn) {
    try {
      await room.localParticipant.setMicrophoneEnabled(true);
      console.log('[LK] Microphone activé');
    } catch (e) {
      console.warn('[LK] Échec activation micro:', e);
    }
  }

  if (camOn) {
    try {
      await room.localParticipant.setCameraEnabled(true);
      console.log('[LK] Caméra activée');
    } catch (e) {
      console.warn('[LK] Échec activation caméra:', e);
    }
  }

  return room;
}

export async function toggleMic(on) {
  if (!room) throw new Error('Room non connectée');
  await room.localParticipant.setMicrophoneEnabled(!!on);
}

export async function toggleCam(on) {
  if (!room) throw new Error('Room non connectée');
  await room.localParticipant.setCameraEnabled(!!on);
}

let _screenTracks = null;

export async function shareScreen(start = true) {
  if (!room) throw new Error('Room non connectée');
  if (start) {
    const tracks = await createLocalScreenTracks({ audio: true, resolution: 'hd_30' });
    _screenTracks = tracks;
    for (const t of tracks) {
      await room.localParticipant.publishTrack(t);
    }
    console.log('[LK] Écran partagé');
  } else {
    if (_screenTracks) {
      for (const t of _screenTracks) {
        try { await room.localParticipant.unpublishTrack(t); } catch {}
        try { t.stop(); } catch {}
      }
      _screenTracks = null;
      console.log('[LK] Partage d’écran arrêté');
    }
  }
}

export async function sendChatMessage(text) {
  if (!room) return;
  const payload = new TextEncoder().encode(JSON.stringify({
    text: String(text || ''),
    ts: Date.now(),
  }));
  await room.localParticipant.publishData(payload, { reliable: true });
}

export async function leaveRoom() {
  if (!room) return;
  try {
    await room.disconnect();
    console.log('[LK] Déconnexion réussie');
  } finally {
    room = null;
  }
}