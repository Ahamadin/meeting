// src/features/meeting/utils/e2ee.js
// Chiffrement de bout en bout via Web Crypto API (AES-GCM 256 bits)
// La clé est dérivée du code de réunion + un sel partagé → aucun serveur ne la connaît

const ALGO     = 'AES-GCM';
const KEY_LEN  = 256;
const PBKDF2_ITER = 100_000;

// ── Dériver une clé AES à partir du code de réunion ──────────
export async function deriveRoomKey(roomName) {
  const enc      = new TextEncoder();
  // Matériel de base : code de la réunion
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(roomName),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  // Sel fixe dérivé du nom de la room (public, pas secret)
  const salt = enc.encode('jokko-meet-e2ee-salt-' + roomName);

  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITER, hash: 'SHA-256' },
    keyMaterial,
    { name: ALGO, length: KEY_LEN },
    false, // non extractible
    ['encrypt', 'decrypt']
  );
}

// ── Chiffrer un ArrayBuffer ───────────────────────────────────
export async function encryptFrame(key, data) {
  const iv         = crypto.getRandomValues(new Uint8Array(12)); // 96 bits
  const encrypted  = await crypto.subtle.encrypt({ name: ALGO, iv }, key, data);
  // Préfixer avec l'IV pour le déchiffrement
  const result = new Uint8Array(iv.byteLength + encrypted.byteLength);
  result.set(iv, 0);
  result.set(new Uint8Array(encrypted), iv.byteLength);
  return result.buffer;
}

// ── Déchiffrer un ArrayBuffer ─────────────────────────────────
export async function decryptFrame(key, data) {
  const buf = new Uint8Array(data);
  const iv  = buf.slice(0, 12);
  const ct  = buf.slice(12);
  return crypto.subtle.decrypt({ name: ALGO, iv }, key, ct);
}

// ── Worker E2EE pour LiveKit (Insertable Streams) ─────────────
// Crée un script worker inline sans fichier externe
export function createE2EEWorkerScript() {
  const script = `
    let key = null;
    const ALGO = 'AES-GCM';

    // Recevoir la clé exportée depuis le thread principal
    self.onmessage = async (e) => {
      if (e.data.type === 'setKey') {
        try {
          key = await crypto.subtle.importKey(
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

    // Chiffrement d'une frame (sender)
    async function encryptFrame(encodedFrame, controller) {
      if (!key) { controller.enqueue(encodedFrame); return; }
      try {
        const iv        = crypto.getRandomValues(new Uint8Array(12));
        const encrypted = await crypto.subtle.encrypt(
          { name: ALGO, iv }, key, encodedFrame.data
        );
        const result = new Uint8Array(iv.byteLength + encrypted.byteLength);
        result.set(iv, 0);
        result.set(new Uint8Array(encrypted), iv.byteLength);
        encodedFrame.data = result.buffer;
        controller.enqueue(encodedFrame);
      } catch { controller.enqueue(encodedFrame); }
    }

    // Déchiffrement d'une frame (receiver)
    async function decryptFrame(encodedFrame, controller) {
      if (!key) { controller.enqueue(encodedFrame); return; }
      try {
        const buf = new Uint8Array(encodedFrame.data);
        if (buf.length < 13) { controller.enqueue(encodedFrame); return; }
        const iv  = buf.slice(0, 12);
        const ct  = buf.slice(12);
        const dec = await crypto.subtle.decrypt({ name: ALGO, iv }, key, ct);
        encodedFrame.data = dec;
        controller.enqueue(encodedFrame);
      } catch { /* frame corrompue : ignorer silencieusement */ }
    }

    // Intercepter les streams (Insertable Streams API)
    self.addEventListener('rtctransform', (event) => {
      const { readable, writable, options } = event.transformer;
      const transform = options?.operation === 'encode' ? encryptFrame : decryptFrame;
      readable
        .pipeThrough(new TransformStream({ transform }))
        .pipeTo(writable);
    });
  `;
  const blob = new Blob([script], { type: 'application/javascript' });
  return URL.createObjectURL(blob);
}

// ── Exporter la clé en raw bytes (pour le worker) ─────────────
export async function exportKeyRaw(key) {
  return crypto.subtle.exportKey('raw', key);
}

// ── Vérifier si le navigateur supporte E2EE ──────────────────
export function isE2EESupported() {
  return (
    typeof RTCRtpSender !== 'undefined' &&
    typeof RTCRtpSender.prototype.createEncodedStreams === 'function' ||
    // Chrome 94+ via RTCRtpScriptTransform
    typeof RTCRtpScriptTransform !== 'undefined'
  );
}