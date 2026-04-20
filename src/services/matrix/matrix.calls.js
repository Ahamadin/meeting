// src/services/matrix/matrix.calls.js
import { MATRIX_BASE_URL } from '../../config';
import { useAuth } from '../../features/auth/AuthContext';

// Générer un call_id unique
export function generateCallId() {
  return 'call_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Envoyer un événement d'appel entrant (invite)
export async function sendCallInvite(roomId, isVideo = false) {
  const { token } = useAuth(); // ou localStorage.getItem('matrix_token')
  if (!token) throw new Error('Non authentifié');

  const callId = generateCallId();

  const body = {
    call_id: callId,
    version: 1,
    lifetime: 60000, // 60 secondes pour répondre
    offer: {
      type: 'offer',
      sdp: '', // Pas besoin pour LiveKit (on utilise token)
    },
    video: isVideo,
    livekit: true, // Marqueur custom pour indiquer qu’on utilise LiveKit
  };

  const res = await fetch(
    `${MATRIX_BASE_URL}/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/send/m.call.invite`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Échec envoi invite appel');
  }

  console.log(`[Call] Invite envoyé dans room ${roomId} - callId: ${callId}`);
  return { callId, isVideo };
}

// Envoyer un hangup (raccrocher)
export async function sendHangup(roomId, callId) {
  const { token } = useAuth();
  const body = {
    call_id: callId,
    version: 1,
    reason: 'hangup',
  };

  await fetch(
    `${MATRIX_BASE_URL}/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/send/m.call.hangup`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );
}

// Envoyer un answer (accepté)
export async function sendCallAnswer(roomId, callId) {
  const { token } = useAuth();
  const body = {
    call_id: callId,
    version: 1,
    answer: {
      type: 'answer',
      sdp: '', // Pas nécessaire pour LiveKit
    },
  };

  await fetch(
    `${MATRIX_BASE_URL}/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/send/m.call.answer`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );
}