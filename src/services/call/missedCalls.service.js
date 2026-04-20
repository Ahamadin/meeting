// src/services/call/missedCalls.service.js

const MISSED_CALLS_KEY = 'missed_calls';
const PROCESSED_CALLS_KEY = 'processed_call_ids';

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

/**
 * 🔒 CallIds déjà traités (anti doublons / fantômes)
 */
function getProcessedCallIds() {
  return new Set(load(PROCESSED_CALLS_KEY, []));
}

/**
 * ✅ Ajouter un appel manqué
 */
export function addMissedCall({ roomId, callId, caller, isVideo, timestamp }) {
  if (!roomId || !callId) return;

  const processed = getProcessedCallIds();
  if (processed.has(callId)) return;

  const existing = load(MISSED_CALLS_KEY, []);

  const call = {
    id: `${roomId}-${timestamp || Date.now()}`,
    roomId,
    callId,
    caller,
    isVideo,
    timestamp: timestamp || Date.now(),
    seen: false,
  };

  const updated = [call, ...existing];
  save(MISSED_CALLS_KEY, updated);

  processed.add(callId);
  save(PROCESSED_CALLS_KEY, Array.from(processed));

  return updated;
}

export function getMissedCalls() {
  return load(MISSED_CALLS_KEY, []);
}

export function markAllCallsAsSeen() {
  const updated = getMissedCalls().map(c => ({ ...c, seen: true }));
  save(MISSED_CALLS_KEY, updated);
  return updated;
}

export function deleteCall(id) {
  const updated = getMissedCalls().filter(c => c.id !== id);
  save(MISSED_CALLS_KEY, updated);
  return updated;
}

export function getUnseenCallsCount() {
  return getMissedCalls().filter(c => !c.seen).length;
}
