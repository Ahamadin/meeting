// src/services/matrix/matrix.rooms.js

/**
 * Parse les rooms à partir de la réponse /sync
 * @param {Object} syncData - réponse JSON de /sync
 * @param {string} myUserId - user_id de l'utilisateur connecté
 * @returns {Array} liste des rooms formatées
 */
export function parseRoomsFromSyncWeb(syncData, myUserId) {
  if (!syncData?.rooms?.join) return [];

  const rooms = [];

  for (const [roomId, roomData] of Object.entries(syncData.rooms.join)) {
    const stateEvents = roomData.state?.events || [];
    const timelineEvents = roomData.timeline?.events || [];

    // 1. Nom de la room
    let displayName = 'Discussion anonyme';
    const nameEvent = stateEvents.find(e => e.type === 'm.room.name');
    if (nameEvent?.content?.name) {
      displayName = nameEvent.content.name.trim();
    } else {
      // Tentative DM : nom = autre participant
      const members = stateEvents
        .filter(e => e.type === 'm.room.member' && e.state_key !== myUserId)
        .map(e => e.state_key.split(':')[0].replace('@', ''));
      if (members.length === 1) {
        displayName = members[0];
      }
    }

    // 2. Dernier message
    const lastMsgEvent = [...timelineEvents]
      .filter(e => e.type === 'm.room.message' && typeof e.content?.body === 'string')
      .sort((a, b) => b.origin_server_ts - a.origin_server_ts)[0];

    const lastMessage = lastMsgEvent?.content?.body?.trim() || '';
    const lastTs = lastMsgEvent?.origin_server_ts || 0;

    // 3. Nombre de messages non lus
    const unread = roomData.unread_notifications?.notification_count || 0;

    // 4. Avatar (MXC si présent)
    const avatarEvent = stateEvents.find(e => e.type === 'm.room.avatar');
    const avatar = avatarEvent?.content?.url || null;

    rooms.push({
      roomId,
      displayName,
      lastMessage,
      lastTs,
      unread,
      avatar,
    });
  }

  // Tri par date du dernier message (plus récent en premier)
  rooms.sort((a, b) => (b.lastTs || 0) - (a.lastTs || 0));

  return rooms;
}