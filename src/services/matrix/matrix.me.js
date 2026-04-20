import { matrixFetch } from './matrix.api';

export async function getMyProfile() {
  const token = localStorage.getItem('matrix_token');
  const userId = localStorage.getItem('matrix_user_id');

  if (!token || !userId) return null;

  const profile = await matrixFetch(
    token,
    `profile/${encodeURIComponent(userId)}`
  );

  return {
    userId,
    displayName:
      profile?.displayname ||
      userId.replace('@', '').split(':')[0],
    avatarUrl: profile?.avatar_url || null,
  };
}
