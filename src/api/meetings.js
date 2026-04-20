// src/api/meetings.js
import { API_BASE } from '../config';

const BASE = `${API_BASE}/api/meet`;
const REC = `${API_BASE}/api/recording`;

// ─── CRÉER une réunion ───────────────────────────────────────────
export async function createMeeting({ displayName, roomName, mode = "private" }) {
  const body = { 
    displayName,
    mode   // 'public' ou 'private'
  };
  
  if (roomName && roomName !== "auto") {
    body.roomName = roomName;
  }

  const res = await fetch(`${BASE}/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Erreur ${res.status} lors de la création`);
  }

  return res.json(); // { token, roomName, displayName, role, mode, joinUrl, ... }
}

// ─── REJOINDRE une réunion ───────────────────────────────────────
export async function joinMeeting({ displayName, roomName }) {
  const res = await fetch(`${BASE}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ displayName, roomName }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Erreur ${res.status} lors du join`);
  }

  return res.json(); // { token, roomName, displayName, role, mode, ... }
}

// ─── INFOS d'une réunion ─────────────────────────────────────────
export async function getMeetingInfo(roomName) {
  try {
    const res = await fetch(`${BASE}/${encodeURIComponent(roomName)}/info`);
    if (!res.ok) {
      return { active: false, participantCount: 0, mode: "private", participants: [] };
    }
    return res.json();
  } catch {
    return { active: false, participantCount: 0, mode: "private", participants: [] };
  }
}

// ─── FERMER une réunion ──────────────────────────────────────────
export async function closeMeeting(roomName) {
  const res = await fetch(`${BASE}/${encodeURIComponent(roomName)}`, { 
    method: 'DELETE' 
  });
  return res.ok;
}

// ─── ENREGISTREMENT ──────────────────────────────────────────────
export async function startRecording({ displayName, roomName }) {
  const res = await fetch(`${REC}/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ displayName, roomName }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Erreur démarrage enregistrement');
  }
  return res.json();
}

export async function stopRecording({ displayName, roomName, egressId }) {
  const res = await fetch(`${REC}/stop`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ displayName, roomName, egressId }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Erreur arrêt enregistrement');
  }
  return res.json();
}

export async function getActiveRecordings(roomName) {
  const res = await fetch(`${REC}/active/${encodeURIComponent(roomName)}`);
  if (!res.ok) return { recordings: [] };
  return res.json();
}