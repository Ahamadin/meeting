// src/services/matrix/matrix.presence.js
import { matrixFetch } from './matrix.api';

export async function getUserPresence(token, userId) {
  try {
    return await matrixFetch(
      token,
      `presence/${encodeURIComponent(userId)}/status`
    );
  } catch {
    return null;
  }
}

/**
 * Format last active
 */
export function formatLastSeen(ts) {
  if (!ts) return 'Hors ligne';
  const diff = Date.now() - ts;

  if (diff < 60000) return 'En ligne';
  if (diff < 3600000) return `Vu il y a ${Math.floor(diff / 60000)} min`;
  if (diff < 86400000) return `Vu il y a ${Math.floor(diff / 3600000)} h`;

  return `Vu le ${new Date(ts).toLocaleDateString('fr-FR')}`;
}
