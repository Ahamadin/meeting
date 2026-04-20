import { API_BASE } from '../config';

export async function createMeetingSimple(payload) {
  const res = await fetch(`${API_BASE}/api/meetings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || 'create_meeting_http_error');
  return data; // { id, roomName, ... }
}

export async function joinMeetingSimple({ roomName, meetingId, inviteCode, displayName }) {
  const res = await fetch(`${API_BASE}/api/meetings/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roomName, meetingId, inviteCode, displayName }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || 'join_meeting_http_error');
  return data; // { token, url }
}
