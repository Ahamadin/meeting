import { matrixFetch } from './matrix.api';

/**
 * Récupère les infos d'une room Matrix (WEB)
 * - displayName
 * - avatarUrl
 * - otherUserId (DM)
 *
 * @param {string} roomId
 * @returns {Promise<{displayName: string, avatarUrl: string|null, otherUserId: string|null}>}
 */
export async function getRoomInfo(roomId) {
  try {
    const token = localStorage.getItem('matrix_token');
    const myUserId = localStorage.getItem('matrix_user_id');

    if (!token || !roomId) {
      throw new Error('Token ou roomId manquant');
    }

    // 🔁 Utilisation de matrixFetch (TON API WEB)
    const events = await matrixFetch(
      token,
      `rooms/${encodeURIComponent(roomId)}/state`
    );

    let displayName = null;
    let avatarUrl = null;
    let otherUserId = null;

    /* ===============================
       1️⃣ Nom explicite de la room
    =============================== */
    const nameEvent = events.find(e => e.type === 'm.room.name');
    if (nameEvent?.content?.name) {
      displayName = nameEvent.content.name;
    }

    /* ===============================
       2️⃣ Alias canonique
    =============================== */
    if (!displayName) {
      const aliasEvent = events.find(e => e.type === 'm.room.canonical_alias');
      if (aliasEvent?.content?.alias) {
        displayName = aliasEvent.content.alias.replace('#', '');
      }
    }

    /* ===============================
       3️⃣ DM 1-to-1
    =============================== */
    if (!displayName) {
      const memberEvents = events.filter(e => e.type === 'm.room.member');

      const otherMembers = memberEvents
        .map(e => e.state_key)
        .filter(Boolean)
        .filter(uid => uid !== myUserId);

      if (otherMembers.length === 1) {
        otherUserId = otherMembers[0];

        const memberEvent = memberEvents.find(
          e =>
            e.state_key === otherUserId &&
            e.content?.membership === 'join'
        );

        if (memberEvent?.content?.displayname) {
          displayName = memberEvent.content.displayname;
        } else {
          displayName = otherUserId
            .replace('@', '')
            .split(':')[0];
        }

        if (memberEvent?.content?.avatar_url) {
          avatarUrl = convertMxcToHttp(memberEvent.content.avatar_url);
        }
      }

      // Groupe sans nom
      if (!displayName && otherMembers.length > 1) {
        displayName = otherMembers
          .slice(0, 3)
          .map(id => id.replace('@', '').split(':')[0])
          .join(', ');
      }
    }

    /* ===============================
       4️⃣ Avatar de room (fallback)
    =============================== */
    if (!avatarUrl) {
      const avatarEvent = events.find(e => e.type === 'm.room.avatar');
      if (avatarEvent?.content?.url) {
        avatarUrl = convertMxcToHttp(avatarEvent.content.url);
      }
    }

    /* ===============================
       5️⃣ Fallback final
    =============================== */
    if (!displayName) {
      displayName = 'Discussion';
    }

    return {
      displayName,
      avatarUrl,
      otherUserId,
    };
  } catch (error) {
    console.error('[matrix.roomInfo] erreur:', error);
    return {
      displayName: 'Discussion',
      avatarUrl: null,
      otherUserId: null,
    };
  }
}

/**
 * Convertit mxc:// → https://
 */
function convertMxcToHttp(mxcUrl) {
  if (!mxcUrl || !mxcUrl.startsWith('mxc://')) {
    return null;
  }

  try {
    const base =
      import.meta.env.VITE_MATRIX_BASE_URL ||
      'https://communication.rtn.sn';

    const withoutProtocol = mxcUrl.replace('mxc://', '');
    const [server, mediaId] = withoutProtocol.split('/');

    if (!server || !mediaId) return null;

    return `${base}/_matrix/media/v3/download/${server}/${mediaId}`;
  } catch {
    return null;
  }
}
