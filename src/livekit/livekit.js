import {
  Room,
  RoomEvent,
  createLocalTracks,
  setLogLevel,
  Track,
} from 'livekit-client';

// Mets 'debug' si tu veux log plus verbeux
setLogLevel('warn');

/**
 * Connexion LiveKit puis publication des pistes locales (dans cet ordre).
 * Évite les erreurs "cannot send trickle before connected" et les timeouts d'offre.
 */
export async function connectAndPublish({ wsUrl, token, enableMic, enableCam }) {
  const room = new Room({
    adaptiveStream: true,
    dynacast: true,
    reconnectPolicy: {
      nextRetryDelayInMs: (attempt) => Math.min(5000, 250 * (attempt + 1)),
    },
  });

  // 1) Connecter d'abord
  await room.connect(wsUrl, token /* { autoSubscribe:true } */);

  // 2) Créer et publier ensuite
  const wantsAudio = !!enableMic;
  const wantsVideo = !!enableCam;

  if (wantsAudio || wantsVideo) {
    const localTracks = await createLocalTracks({
      audio: wantsAudio,
      video: wantsVideo,
    });

    for (const t of localTracks) {
      await room.localParticipant.publishTrack(t);
    }
  }

  return room;
}

/** Utilitaire sécurisé pour lister les participants (évite p.values undefined). */
export function listParticipants(room) {
  if (!room) return [];
  const rest = room.participants && typeof room.participants.values === 'function'
    ? Array.from(room.participants.values())
    : [];
  return [room.localParticipant, ...rest].filter(Boolean);
}
