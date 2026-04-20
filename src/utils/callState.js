const STORAGE_KEY = 'ended_calls';

const load = () => {
  try {
    return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'));
  } catch {
    return new Set();
  }
};

const endedCalls = load();

export const isCallEnded = (callId) => {
  return endedCalls.has(callId);
};

export const markCallEnded = (callId) => {
  if (!callId) return;
  endedCalls.add(callId);
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(Array.from(endedCalls))
  );
};
