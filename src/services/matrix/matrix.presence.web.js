// src/services/matrix/matrix.presence.web.js
import { matrixFetch } from './matrix.api';

export async function getUserPresenceWeb(token, userId) {
  try {
    const res = await matrixFetch(
      token,
      `presence/${encodeURIComponent(userId)}/status`
    );

    return {
      presence: res.presence || 'offline',
      last_active_ago: res.last_active_ago || null,
    };
  } catch {
    return { presence: 'offline', last_active_ago: null };
  }
}
