// src/services/matrix/matrix.api.js

const MATRIX_BASE_URL = import.meta.env.VITE_MATRIX_BASE_URL || 'https://communication.rtn.sn';

/**
 * Effectue une requête fetch vers l'API Matrix avec le token fourni
 * @param {string} token - Le Bearer token Matrix
 * @param {string} endpoint - chemin après /_matrix/client/v3/ (ex: "sync", "joined_rooms")
 * @param {Object} [options={}] - options fetch
 * @returns {Promise<any>}
 */
export async function matrixFetch(token, endpoint, options = {}) {
  if (!token) {
    throw new Error('Token Matrix manquant');
  }

  const url = `${MATRIX_BASE_URL}/_matrix/client/v3/${endpoint}`;

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    ...options.headers,
  };

  let finalUrl = url;
  if (options.params) {
    const query = new URLSearchParams(options.params).toString();
    finalUrl += `?${query}`;
  }

  try {
    const res = await fetch(finalUrl, {
      ...options,
      headers,
    });

    if (!res.ok) {
      let errData;
      try {
        errData = await res.json();
      } catch {
        errData = { error: res.statusText };
      }
      throw new Error(errData.error || `Erreur ${res.status} sur ${endpoint}`);
    }

    return await res.json();
  } catch (err) {
    console.error(`matrixFetch error (${endpoint}):`, err);
    throw err;
  }
}

// Raccourcis
export const getJoinedRooms = (token) => matrixFetch(token, 'joined_rooms');
export const sync = (token, params = {}) => matrixFetch(token, 'sync', { params });