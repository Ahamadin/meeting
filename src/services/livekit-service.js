// services/livekit.service.js
module.exports.createLiveKitToken = async ({ userId, room, name }) => {  // ← ajoute name en param
  const at = new AccessToken(
    livekitConfig.apiKey,
    livekitConfig.apiSecret,
    {
      identity: userId,
      name: name || userId.split(':')[0].slice(1),  // ← Ajoute le name ici (fallback au localpart)
      ttl: "10m",
    }
  );

  at.addGrant({
    room,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
  });

  return await at.toJwt();
};