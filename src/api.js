export async function fetchToken({ serverBase = 'http://192.168.1.75:3001', room, user }) {
  const u = new URL(`${serverBase}/token`);
  if (room) u.searchParams.set('room', room);
  if (user) u.searchParams.set('user', user);
  const r = await fetch(u.toString(), { credentials: 'omit' });
  if (!r.ok) throw new Error('token_http_error');
  return r.json(); // { token, url, identity }
}
