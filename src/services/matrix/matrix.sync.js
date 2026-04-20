// src/services/matrix/matrix.sync.js
import { sync } from './matrix.api';

let syncToken = null;
let isSyncing = false;
let stopRequested = false;

const MAX_CALL_AGE_MS = 120000;

// États internes
const processedCalls = new Set();
const activeCallIds = new Set();

export function startSyncLoopWeb({
  token,
  timeoutMs = 30000,
} = {}) {
  if (!token) throw new Error('Token requis pour startSyncLoopWeb');

  stopRequested = false;

  const doSync = async () => {
    if (stopRequested || isSyncing) return;
    isSyncing = true;

    try {
      const params = { timeout: timeoutMs };
      if (syncToken) params.since = syncToken;

      const data = await sync(token, params);

      if (data?.next_batch) {
        syncToken = data.next_batch;
      }

      // DISPATCH GLOBAL POUR DASHBOARD / CHAT
      window.dispatchEvent(
        new CustomEvent('matrix-sync', { detail: data })
      );

      const myUserId = localStorage.getItem('matrix_user_id');

      // ───────── ROOMS ─────────
      if (data?.rooms?.join) {
        Object.entries(data.rooms.join).forEach(([roomId, roomData]) => {
          const timeline = roomData.timeline?.events ?? [];
          const ephemeral = roomData.ephemeral?.events ?? [];

          timeline.forEach(event => {
            // INVITE
            if (
              event.type === 'm.call.invite' &&
              event.content?.call_id
            ) {
              const callId = event.content.call_id;
              const sender = event.sender;
              const ts = event.origin_server_ts || Date.now();

              if (sender === myUserId) return;
              if (processedCalls.has(callId)) return;
              if (Date.now() - ts > MAX_CALL_AGE_MS) return;

              processedCalls.add(callId);
              activeCallIds.add(callId);

              window.dispatchEvent(
                new CustomEvent('incoming-call', {
                  detail: {
                    roomId,
                    callId,
                    isVideo: !!event.content.video,
                    from: sender,
                  },
                })
              );
            }

            // HANGUP
            if (event.type === 'm.call.hangup') {
              const callId = event.content?.call_id;
              if (!callId) return;

              processedCalls.add(callId);
              activeCallIds.delete(callId);

              window.dispatchEvent(
                new CustomEvent('call-hangup', {
                  detail: { roomId, callId },
                })
              );
            }

            // MESSAGE
            if (event.type === 'm.room.message') {
              window.dispatchEvent(
                new CustomEvent('matrix-message', {
                  detail: { roomId, event },
                })
              );
            }
          });

          ephemeral.forEach(event => {
            if (event.type === 'm.typing') {
              window.dispatchEvent(
                new CustomEvent('matrix-typing', {
                  detail: {
                    roomId,
                    users: event.content?.user_ids ?? [],
                  },
                })
              );
            }
          });
        });
      }
    } catch (err) {
      console.warn('[MatrixSync] erreur:', err);
      await new Promise(r => setTimeout(r, 2000));
    } finally {
      isSyncing = false;
      if (!stopRequested) doSync();
    }
  };

  doSync();

  return () => {
    stopRequested = true;
  };
}
