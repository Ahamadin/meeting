// src/services/matrix/matrix.typing.web.js
import { matrixFetch } from './matrix.api';

export async function setTypingWeb(token, roomId, userId, typing) {
  await matrixFetch(
    token,
    `rooms/${encodeURIComponent(roomId)}/typing/${encodeURIComponent(userId)}`,
    {
      method: 'PUT',
      body: JSON.stringify({
        typing,
        ...(typing && { timeout: 30000 }),
      }),
    }
  );
}

export function getTypingUsersFromSyncWeb(sync, roomId, myUserId) {
  const events =
    sync?.rooms?.join?.[roomId]?.ephemeral?.events || [];

  const typingEvent = events.find(e => e.type === 'm.typing');
  if (!typingEvent) return [];

  return typingEvent.content.user_ids.filter(id => id !== myUserId);
}
