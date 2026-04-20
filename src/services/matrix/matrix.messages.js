// src/services/matrix/matrix.messages.js
import { matrixFetch } from './matrix.api';

/**
 * Envoyer message texte
 */
export async function sendTextMessage(token, roomId, body) {
  const txnId = Date.now();

  return matrixFetch(
    token,
    `rooms/${encodeURIComponent(roomId)}/send/m.room.message/${txnId}`,
    {
      method: 'PUT',
      body: JSON.stringify({
        msgtype: 'm.text',
        body,
      }),
    }
  );
}

/**
 * Modifier message (Matrix officiel)
 */
export async function editMessage(token, roomId, eventId, newBody) {
  return matrixFetch(
    token,
    `rooms/${encodeURIComponent(roomId)}/send/m.room.message/${Date.now()}`,
    {
      method: 'PUT',
      body: JSON.stringify({
        msgtype: 'm.text',
        body: `* ${newBody}`,
        'm.new_content': {
          msgtype: 'm.text',
          body: newBody,
        },
        'm.relates_to': {
          rel_type: 'm.replace',
          event_id: eventId,
        },
      }),
    }
  );
}

/**
 * Répondre à un message
 */
export async function replyMessage(token, roomId, eventId, body) {
  return matrixFetch(
    token,
    `rooms/${encodeURIComponent(roomId)}/send/m.room.message/${Date.now()}`,
    {
      method: 'PUT',
      body: JSON.stringify({
        msgtype: 'm.text',
        body,
        'm.relates_to': {
          'm.in_reply_to': {
            event_id: eventId,
          },
        },
      }),
    }
  );
}
