// src/utils/unlockAudio.js
let ctx;
let unlocked = false;

export function getAudioContext() {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) ctx = new AC();
  }
  return ctx || null;
}

export async function unlockAudio() {
  if (unlocked) return true;
  const ac = getAudioContext();
  if (!ac) return true; // pas d'AudioContext -> rien à faire

  const tryResume = async () => {
    try { await ac.resume(); } catch {}
    if (ac.state === 'running') unlocked = true;
    return unlocked;
  };

  if (ac.state === 'suspended') await tryResume();
  if (unlocked) return true;

  const handler = async () => {
    await tryResume();
    if (unlocked) {
      ['pointerdown', 'touchstart', 'keydown'].forEach((ev) =>
        window.removeEventListener(ev, handler, true)
      );
    }
  };
  ['pointerdown', 'touchstart', 'keydown'].forEach((ev) =>
    window.addEventListener(ev, handler, { once: true, capture: true })
  );

  return unlocked;
}
