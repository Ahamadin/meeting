// src/services/matrix/matrix.read.js
import { matrixFetch } from './matrix.api';

export async function sendReadReceipt(token, roomId, eventId) {
  return matrixFetch(
    token,
    `rooms/${encodeURIComponent(roomId)}/receipt/m.read/${eventId}`,
    { method: 'POST' }
  );
}

/**
 * Vérifie si message lu par autre user
 */
export function isMessageRead(receipts, eventId, userId) {
  return Boolean(
    receipts?.[eventId]?.['m.read']?.[userId]
  );
}
