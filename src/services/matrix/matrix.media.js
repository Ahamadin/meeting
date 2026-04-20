// src/services/matrix/matrix.media.js
import { matrixFetch } from './matrix.api';

const BASE_URL = import.meta.env.VITE_MATRIX_BASE_URL;

/**
 * Upload un fichier vers Matrix Media Repository
 */
export async function uploadMatrixMedia(token, file) {
  const res = await fetch(
    `${BASE_URL}/_matrix/media/v3/upload?filename=${encodeURIComponent(file.name)}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': file.type || 'application/octet-stream',
      },
      body: file,
    }
  );

  if (!res.ok) {
    throw new Error('Erreur upload média Matrix');
  }

  return await res.json(); // { content_uri }
}

/**
 * Convertit mxc:// en URL HTTP
 */
export function mxcToHttp(mxcUrl) {
  if (!mxcUrl) return null;
  return `${BASE_URL}/_matrix/media/v3/download/${mxcUrl.replace('mxc://', '')}`;
}
