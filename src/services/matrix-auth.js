// src/services/matrix-auth.js
const MATRIX_BASE_URL = 'https://communication.rtn.sn';

/**
 * Connexion à Matrix
 * @param {string} username - ex: "ahamadi" (sans @...)
 * @param {string} password
 * @returns {Promise<{userId: string, accessToken: string, deviceId: string}>}
 */
export async function loginMatrix(username, password) {
  const res = await fetch(`${MATRIX_BASE_URL}/_matrix/client/v3/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'm.login.password',
      user: username.startsWith('@') ? username : `@${username}:communication.rtn.sn`,
      password,
    }),
  });

  const data = await res.json();
  
  if (!res.ok) {
    throw new Error(data.error || 'Authentification Matrix échouée');
  }

  return {
    userId: data.user_id,
    accessToken: data.access_token,
    deviceId: data.device_id,
    homeServer: data.home_server,
  };
}

/**
 * Inscription sur Matrix
 * @param {string} username
 * @param {string} password
 * @returns {Promise<{userId: string, accessToken: string}>}
 */
export async function registerMatrix(username, password) {
  const res = await fetch(`${MATRIX_BASE_URL}/_matrix/client/v3/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      auth: { type: 'm.login.dummy' },
      username,
      password,
      inhibit_login: false,
    }),
  });

  const data = await res.json();
  
  if (!res.ok) {
    throw new Error(data.error || 'Inscription Matrix échouée');
  }

  return {
    userId: data.user_id,
    accessToken: data.access_token,
    deviceId: data.device_id,
  };
}

/**
 * Vérifie le token Matrix
 * @param {string} accessToken
 * @returns {Promise<{userId: string, deviceId: string}>}
 */
export async function verifyMatrixToken(accessToken) {
  const res = await fetch(`${MATRIX_BASE_URL}/_matrix/client/v3/account/whoami`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error('Token Matrix invalide');
  }

  return res.json();
}

/**
 * Déconnexion Matrix
 * @param {string} accessToken
 */
export async function logoutMatrix(accessToken) {
  await fetch(`${MATRIX_BASE_URL}/_matrix/client/v3/logout`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}