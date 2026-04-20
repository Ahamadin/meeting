// src/config.js
export const API_BASE = import.meta.env.VITE_API_BASE || 'https://api.reunioncrypto.rtn.sn';
export const LIVEKIT_WS_URL = import.meta.env.VITE_LIVEKIT_WS_URL || 'wss://livekit.ec2lt.sn';
export const LIVEKIT_URL = import.meta.env.VITE_LIVEKIT_URL || 'https://livekit.ec2lt.sn';
export const APP_NAME = 'JokkoMeet';

// ─── Helper URL intelligent (Dev + Prod) ───
export function getApiUrl(path) {
  const base = API_BASE;

  // En production : toujours utiliser l'URL complète du backend
  if (import.meta.env.PROD) {
    return `${base}${path.startsWith('/') ? '' : '/'}${path}`;
  }

  // En développement : utiliser le proxy Vite (/api/...)
  return `${path.startsWith('/') ? '' : '/'}${path}`;
}

export default {
  API_BASE,
  LIVEKIT_WS_URL,
  LIVEKIT_URL,
  APP_NAME,
  getApiUrl,
  getMatrixUrl,
};