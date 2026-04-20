// src/features/meeting/utils/e2ee.js
// Chiffrement de bout en bout — AES-GCM 256 bits via Web Crypto API

const ALGO        = 'AES-GCM';
const KEY_LEN     = 256;
const PBKDF2_ITER = 100_000;

// ── Dériver une clé AES depuis le code de réunion ─────────────
// extractable: true obligatoire pour pouvoir l'exporter vers le Worker
export async function deriveRoomKey(roomName) {
  const enc         = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(roomName),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  const salt = enc.encode('jokko-meet-e2ee-salt-v1-' + roomName);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITER, hash: 'SHA-256' },
    keyMaterial,
    { name: ALGO, length: KEY_LEN },
    true,           // ← doit être true pour exportKeyRaw
    ['encrypt', 'decrypt']
  );
}

// ── Exporter la clé en ArrayBuffer pour le Worker ─────────────
export async function exportKeyRaw(key) {
  return crypto.subtle.exportKey('raw', key);
}

// ── Créer le Worker E2EE en Blob inline (pas de fichier externe) ──
export function createE2EEWorkerScript() {
  const script = `
    let cryptoKey = null;
    const ALGO = 'AES-GCM';

    self.onmessage = async (e) => {
      if (e.data.type === 'setKey') {
        try {
          cryptoKey = await crypto.subtle.importKey(
            'raw', e.data.keyData,
            { name: ALGO, length: 256 },
            false,
            ['encrypt', 'decrypt']
          );
          self.postMessage({ type: 'keyReady' });
        } catch (err) {
          self.postMessage({ type: 'error', msg: err.message });
        }
      }
    };

    async function encryptFrame(encodedFrame, controller) {
      if (!cryptoKey) { controller.enqueue(encodedFrame); return; }
      try {
        const iv        = crypto.getRandomValues(new Uint8Array(12));
        const encrypted = await crypto.subtle.encrypt(
          { name: ALGO, iv }, cryptoKey, encodedFrame.data
        );
        const out = new Uint8Array(12 + encrypted.byteLength);
        out.set(iv, 0);
        out.set(new Uint8Array(encrypted), 12);
        encodedFrame.data = out.buffer;
        controller.enqueue(encodedFrame);
      } catch { controller.enqueue(encodedFrame); }
    }

    async function decryptFrame(encodedFrame, controller) {
      if (!cryptoKey) { controller.enqueue(encodedFrame); return; }
      try {
        const buf = new Uint8Array(encodedFrame.data);
        if (buf.length < 13) { controller.enqueue(encodedFrame); return; }
        const iv  = buf.slice(0, 12);
        const ct  = buf.slice(12);
        const dec = await crypto.subtle.decrypt({ name: ALGO, iv }, cryptoKey, ct);
        encodedFrame.data = dec;
        controller.enqueue(encodedFrame);
      } catch { /* frame corrompue — ignorer silencieusement */ }
    }

    // RTCRtpScriptTransform (Chrome 94+, Firefox 117+, Edge 94+)
    self.addEventListener('rtctransform', (event) => {
      const { readable, writable, options } = event.transformer;
      const fn = options?.operation === 'encode' ? encryptFrame : decryptFrame;
      readable.pipeThrough(new TransformStream({ transform: fn })).pipeTo(writable);
    });
  `;
  const blob = new Blob([script], { type: 'application/javascript' });
  return URL.createObjectURL(blob);
}

// ── Vérifier la compatibilité navigateur ──────────────────────
export function isE2EESupported() {
  try {
    return (
      typeof window !== 'undefined' &&
      typeof crypto?.subtle !== 'undefined' &&
      typeof RTCRtpSender   !== 'undefined' &&
      typeof RTCRtpScriptTransform !== 'undefined'
    );
  } catch { return false; }
}
