// src/services/matrix/matrix.typing.js
import { matrixFetch } from './matrix.api';

export async function setTyping(token, roomId, userId, typing) {
  return matrixFetch(
    token,
    `rooms/${encodeURIComponent(roomId)}/typing/${encodeURIComponent(userId)}`,
    {
      method: 'PUT',
      body: JSON.stringify({
        typing,
        timeout: typing ? 30000 : undefined,
      }),
    }
  );
}

/**
 * Lecture depuis /sync
 */
export function extractTypingUsers(sync, roomId, myUserId) {
  const events =
    sync?.rooms?.join?.[roomId]?.ephemeral?.events || [];

  const typingEvent = events.find(e => e.type === 'm.typing');
  if (!typingEvent) return [];

  return typingEvent.content.user_ids.filter(id => id !== myUserId);
}
