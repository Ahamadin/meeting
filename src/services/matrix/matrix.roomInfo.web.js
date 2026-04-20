// src/services/matrix/matrix.roomInfo.web.js
import { matrixFetch } from './matrix.api';

export async function getRoomInfoWeb(token, roomId, myUserId) {
  const state = await matrixFetch(
    token,
    `rooms/${encodeURIComponent(roomId)}/state`
  );

  const nameEvent = state.find(e => e.type === 'm.room.name');
  const avatarEvent = state.find(e => e.type === 'm.room.avatar');
  const members = state.filter(e => e.type === 'm.room.member');

  let displayName = nameEvent?.content?.name || null;
  let otherUserId = null;

  if (!displayName && members.length === 2) {
    const other = members.find(m => m.state_key !== myUserId);
    otherUserId = other?.state_key;
    displayName =
      other?.content?.displayname ||
      otherUserId?.replace('@', '').split(':')[0];
  }

  const avatar = avatarEvent?.content?.url
    ? `${import.meta.env.VITE_MATRIX_BASE_URL}/_matrix/media/v3/download/${avatarEvent.content.url.replace('mxc://', '')}`
    : null;

  return { displayName, avatar, otherUserId };
}
