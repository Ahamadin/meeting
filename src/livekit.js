import {
  Room,
  RoomEvent,
  createLocalTracks,
  Track,
  setLogLevel,
} from 'livekit-client';

setLogLevel('warn'); // ou 'debug' si tu veux tracer

export async function connectAndPublish({ wsUrl, token, enableMic, enableCam }) {
  const room = new Room({
    adaptiveStream: true,
    dynacast: true,
    // Reconnect défensif
    reconnectPolicy: {
      nextRetryDelayInMs: (attempt) => Math.min(5000, 250 * (attempt + 1)),
    },
  });

  // 1) Connecte-toi D'ABORD
  await room.connect(wsUrl, token /* options: { autoSubscribe: true } */);

  // 2) Ensuite crée les tracks demandées
  const tracksWanted = [];
  if (enableMic) tracksWanted.push(Track.Source.Microphone);
  if (enableCam) tracksWanted.push(Track.Source.Camera);

  if (tracksWanted.length) {
    const localTracks = await createLocalTracks({ audio: enableMic, video: enableCam });
    for (const t of localTracks) {
      await room.localParticipant.publishTrack(t);
    }
  }

  return room;
}
