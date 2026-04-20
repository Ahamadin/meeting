// src/services/matrix/matrix.sync.js
import { matrixFetch, sync } from './matrix.api';

let syncToken = null;
let isSyncing = false;
let stopRequested = false;

const MAX_CALL_AGE_MS = 120000; // 2 minutes
const processedCalls = new Set();
const activeCallIds = new Set(); // ✅ NOUVEAU : Track des appels actifs

export function startSyncLoopWeb({ token, onSync, onError, timeoutMs = 30000 } = {}) {
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

      if (onSync) onSync(data);

      if (data?.rooms?.join) {
        const myUserId = localStorage.getItem('matrix_user_id');
        
        if (!myUserId) {
          console.warn('[Sync] ⚠️ matrix_user_id absent du localStorage');
        }

        Object.entries(data.rooms.join).forEach(([roomId, roomData]) => {
          const timeline = roomData.timeline?.events || [];

          timeline.forEach(event => {
            // ═══════════════════════════════════════════════════════════
            // 📞 APPEL ENTRANT (m.call.invite)
            // ═══════════════════════════════════════════════════════════
            if (event.type === 'm.call.invite' && event.content?.livekit) {
              const callId = event.content.call_id;
              const eventTimestamp = event.origin_server_ts || Date.now();
              const ageMs = Date.now() - eventTimestamp;
              const isVideo = event.content.video || false;
              const sender = event.sender;

              // ✅ FILTRE 0 : Ignorer mes propres appels !
              if (myUserId && sender === myUserId) {
                console.log('[Sync] ⛔ Appel ignoré (je suis l\'appelant)', { callId, sender });
                processedCalls.add(callId);
                return;
              }

              // ✅ FILTRE 1 : Appel trop ancien ?
              if (ageMs > MAX_CALL_AGE_MS) {
                console.log(`[Sync] ⏰ Appel ignoré (trop ancien: ${Math.round(ageMs / 1000)}s)`);
                processedCalls.add(callId);
                return;
              }

              // ✅ FILTRE 2 : Appel déjà traité ?
              if (processedCalls.has(callId)) {
                return;
              }

              // ✅ FILTRE 3 : Hangup déjà présent dans la timeline ?
              const hasHangup = timeline.some(e => 
                e.type === 'm.call.hangup' && e.content?.call_id === callId
              );

              if (hasHangup) {
                console.log(`[Sync] 📴 Hangup déjà présent pour ${callId}`);
                processedCalls.add(callId);
                return;
              }

              // ✅ NOUVEL APPEL VALIDE
              console.log('[Sync] ✅ Nouvel appel entrant valide !', {
                roomId,
                callId,
                isVideo,
                from: sender,
              });

              processedCalls.add(callId);
              activeCallIds.add(callId); // ✅ Marquer comme actif

              // 🔔 Dispatch événement
              window.dispatchEvent(
                new CustomEvent('incoming-call', {
                  detail: { roomId, callId, isVideo, from: sender },
                })
              );
            }

            // ═══════════════════════════════════════════════════════════
            // 📴 HANGUP (m.call.hangup)
            // ═══════════════════════════════════════════════════════════
            if (event.type === 'm.call.hangup') {
              const callId = event.content?.call_id;
              
              console.log('[Sync] 📴 Hangup détecté:', { roomId, callId, from: event.sender });

              processedCalls.add(callId);
              activeCallIds.delete(callId); // ✅ Retirer des appels actifs

              // 🔔 Dispatch événement
              window.dispatchEvent(
                new CustomEvent('call-hangup', {
                  detail: { roomId, callId },
                })
              );
            }

            // ═══════════════════════════════════════════════════════════
            // 📞 ANSWER (m.call.answer)
            // ═══════════════════════════════════════════════════════════
            if (event.type === 'm.call.answer') {
              const callId = event.content?.call_id;
              
              console.log('[Sync] ✅ Answer détecté:', { roomId, callId });

              window.dispatchEvent(
                new CustomEvent('call-answered', {
                  detail: { roomId, callId },
                })
              );
            }
          });
        });
      }

    } catch (err) {
      console.warn('[Sync] ❌ Erreur synchronisation:', err);
      if (onError) onError(err);
      await new Promise(r => setTimeout(r, 2000));
    } finally {
      isSyncing = false;
      if (!stopRequested) doSync();
    }
  };

  doSync();

  return () => {
    console.log('[Sync] 🛑 Arrêt demandé');
    stopRequested = true;
  };
}

export function resetSync() {
  console.log('[Sync] 🔄 Réinitialisation sync');
  syncToken = null;
  processedCalls.clear();
  activeCallIds.clear();
  stopRequested = false;
  isSyncing = false;
}

export function cleanupProcessedCalls() {
  console.log(`[Sync] 🧹 Nettoyage (${processedCalls.size} appels traités)`);
  processedCalls.clear();
  activeCallIds.clear();
}

export function isCallActive(callId) {
  return activeCallIds.has(callId);
}

export function getSyncStats() {
  return {
    syncToken: syncToken ? 'présent' : 'absent',
    isSyncing,
    stopRequested,
    processedCallsCount: processedCalls.size,
    activeCallsCount: activeCallIds.size,
  };
}