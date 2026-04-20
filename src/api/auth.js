// src/api/auth.js
import { MATRIX_BASE_URL } from '../config';

export async function loginMatrix({ username, password }) {
  const res = await fetch(`${MATRIX_BASE_URL}/_matrix/client/v3/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'm.login.password',
      user: `@${username}:communication.rtn.sn`,
      password,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Identifiants incorrects');
  return { access_token: data.access_token, user_id: data.user_id };
}

export async function registerMatrix({ username, password, displayName }) {
  // Étape 1 : récupérer le session token UIAA
  const r1 = await fetch(`${MATRIX_BASE_URL}/_matrix/client/v3/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind: 'user' }),
  });
  const d1 = await r1.json();
  const session = d1.session;

  // Étape 2 : enregistrement réel avec dummy auth
  const res = await fetch(`${MATRIX_BASE_URL}/_matrix/client/v3/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username,
      password,
      auth: { type: 'm.login.dummy', session },
      initial_device_display_name: 'JokkoMeet Web',
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erreur inscription');
  return { access_token: data.access_token, user_id: data.user_id };
}
