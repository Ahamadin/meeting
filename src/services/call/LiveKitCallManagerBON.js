import { Room, RoomEvent, RoomState } from 'livekit-client';

const LIVEKIT_WS_URL = import.meta.env.VITE_LIVEKIT_WS_URL || 'wss://livekit.ec2lt.sn';
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 2000;
const CALL_TIMEOUT_MS = 120000; // 2 minutes

class LiveKitCallManager {
  room = null;
  roomId = null;
  callId = null;
  isVideo = false;
  listeners = new Set();
  connectionAttempts = 0;
  isConnecting = false;
  callDirection = null; // 'outgoing' ou 'incoming'
  isConnected = false;
  wasAnswered = false;
  startTime = null;
  timerInterval = null;
  callTimeoutTimer = null;

  onState(cb) {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  emit(state) {
    this.listeners.forEach(cb => {
      try {
        cb(state);
      } catch (e) {
        console.error('[LiveKitCallManager] Emit error:', e);
      }
    });
  }

  async startOutgoingCall(roomId, isVideo = false) {
    if (this.room && this.room.state !== RoomState.Disconnected) {
      console.warn('[LiveKitCallManager] ⚠️ Un appel est déjà en cours');
      return;
    }

    this.roomId = roomId;
    this.isVideo = isVideo;
    this.callId = `call_${Date.now()}`;
    this.connectionAttempts = 0;
    this.isConnecting = true;
    this.callDirection = 'outgoing';
    this.wasAnswered = false;
    this.isConnected = false;

    console.log(`[LiveKitCallManager] 🚀 Démarrage appel sortant → room: ${roomId}, vidéo: ${isVideo}`);

    this._startCallTimeout();
    
    // Envoyer l'invite Matrix
    await this._sendMatrixInvite();
    
    return this._attemptConnection();
  }

  async acceptIncomingCall({ roomId, callId, isVideo }) {
    if (this.room && this.room.state !== RoomState.Disconnected) {
      console.warn('[LiveKitCallManager] ⚠️ Un appel est déjà en cours');
      return;
    }

    this.roomId = roomId;
    this.callId = callId;
    this.isVideo = isVideo;
    this.connectionAttempts = 0;
    this.isConnecting = true;
    this.callDirection = 'incoming';
    this.wasAnswered = true;
    this.isConnected = false;

    console.log(`[LiveKitCallManager] 📞 Acceptation appel entrant → room: ${roomId}`);

    this._startCallTimeout();
    return this._attemptConnection();
  }

  async _sendMatrixInvite() {
    try {
      const matrixToken = localStorage.getItem('matrix_token');
      if (!matrixToken) {
        console.warn('[LiveKitCallManager] Pas de token Matrix pour envoyer invite');
        return;
      }

      const MATRIX_BASE_URL = import.meta.env.VITE_MATRIX_BASE_URL || 'https://communication.rtn.sn';
      
      await fetch(
        `${MATRIX_BASE_URL}/_matrix/client/v3/rooms/${encodeURIComponent(this.roomId)}/send/m.call.invite/${Date.now()}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${matrixToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            call_id: this.callId,
            version: 1,
            lifetime: 60000,
            livekit: true,
            video: this.isVideo,
          }),
        }
      );

      console.log('[LiveKitCallManager] ✅ Invite Matrix envoyée');
    } catch (err) {
      console.error('[LiveKitCallManager] ❌ Erreur envoi invite Matrix:', err);
    }
  }

  _startCallTimeout() {
    console.log('[LiveKitCallManager] Démarrage timeout appel (2 minutes)...');
    this.callTimeoutTimer = setTimeout(() => {
      console.log('[LiveKitCallManager] TIMEOUT APPEL - Raccrochage automatique');
      if (!this.isConnected) {
        this.hangup();
      }
    }, CALL_TIMEOUT_MS);
  }

  _cancelCallTimeout() {
    if (this.callTimeoutTimer) {
      console.log('[LiveKitCallManager] Annulation timeout appel');
      clearTimeout(this.callTimeoutTimer);
      this.callTimeoutTimer = null;
    }
  }

  async _attemptConnection() {
    try {
      console.log(`[LiveKitCallManager] 🔄 Tentative ${this.connectionAttempts + 1}/${MAX_RETRY_ATTEMPTS}`);

      const token = await this._fetchToken();

      this.room = new Room({
        adaptiveStream: true,
        dynacast: true,
        autoSubscribe: true,
        reconnectPolicy: {
          nextRetryDelayInMs: (context) => Math.min(1000 * Math.pow(2, context.retryCount), 10000),
          maxRetries: 5,
        },
      });

      this._setupRoomListeners();

      console.log('[LiveKitCallManager] 🔌 Connexion WebSocket...');
      await this.room.connect(LIVEKIT_WS_URL, token);
      console.log('[LiveKitCallManager] ✅ WebSocket connecté');

      if (!this.room) throw new Error('Room déconnectée pendant connexion');

      await this._waitForRoomConnected();

      if (!this.room) throw new Error('Room déconnectée après attente');

      const localParticipant = this.room.localParticipant;
      if (!localParticipant) throw new Error('localParticipant null après connexion');

      console.log('[LiveKitCallManager] ✅ localParticipant disponible:', localParticipant.identity);

      await this._publishMedia();

      this.emit({ status: 'connected', isVideo: this.isVideo });
      console.log('[LiveKitCallManager] ✅ Appel démarré avec succès');

      this.connectionAttempts = 0;
      this.isConnecting = false;
      this.isConnected = true;
      this._startTimer();

      return this.room;
    } catch (err) {
      console.error('[LiveKitCallManager] ❌ Échec connexion:', err);

      if (this.room) {
        try { await this.room.disconnect(); } catch (e) {}
        this.room = null;
      }

      this.connectionAttempts++;
      if (this.connectionAttempts < MAX_RETRY_ATTEMPTS) {
        const delay = RETRY_DELAY_MS * this.connectionAttempts;
        console.log(`[LiveKitCallManager] ⏳ Nouvelle tentative dans ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
        return this._attemptConnection();
      }

      this.isConnecting = false;
      const errorMessage = this._getErrorMessage(err);
      this.emit({ status: 'error', error: errorMessage });
      throw new Error(errorMessage);
    }
  }

  async _fetchToken() {
    const backendUrl = import.meta.env.VITE_API_BASE || 'https://backend-livekit.rtn.sn';
    const tokenPath = import.meta.env.VITE_TOKEN_PATH || '/api/livekit/token';
    const tokenUrl = `${backendUrl}${tokenPath}`;
    console.log(`[LiveKitCallManager] 🔑 Requête token → ${tokenUrl}`);

    const matrixToken = localStorage.getItem('matrix_token') || '';
    if (!matrixToken) throw new Error('Token Matrix absent');

    const tokenRes = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${matrixToken}`,
      },
      body: JSON.stringify({ room: this.roomId }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text().catch(() => 'Réponse vide');
      throw new Error(`Erreur token (${tokenRes.status}): ${errText}`);
    }

    const { token } = await tokenRes.json();
    if (!token) throw new Error('Token LiveKit vide');

    console.log(`[LiveKitCallManager] ✅ Token reçu (longueur: ${token.length})`);
    return token;
  }

  _setupRoomListeners() {
    if (!this.room) return;

    this.room.on(RoomEvent.Connected, () => {
      console.log('[LiveKitCallManager] 🔌 Room connectée');
      this.emit({ status: 'active' });
    });

    this.room.on(RoomEvent.Disconnected, (reason) => {
      console.log('[LiveKitCallManager] ⚡ Déconnexion → raison:', reason);
      if (!this.isConnecting) {
        this.emit({ status: 'disconnected', reason });
        this.room = null;
      }
    });

    this.room.on(RoomEvent.Reconnecting, () => {
      console.log('[LiveKitCallManager] 🔄 Reconnexion...');
      this.emit({ status: 'reconnecting' });
    });

    this.room.on(RoomEvent.Reconnected, () => {
      console.log('[LiveKitCallManager] ✅ Reconnecté');
      this.emit({ status: 'connected' });
    });

    this.room.on(RoomEvent.ParticipantConnected, (participant) => {
      console.log('[LiveKitCallManager] 👤 Participant connecté:', participant.identity);
      this.emit({ status: 'participantConnected', participant });
      this.wasAnswered = true;
      if (!this.startTime) {
        this._startTimer();
      }
    });

    this.room.on(RoomEvent.ParticipantDisconnected, (participant) => {
      console.log('[LiveKitCallManager] 👋 Participant déconnecté:', participant.identity);
      this.emit({ status: 'participantDisconnected', participant });
    });
  }

  async _waitForRoomConnected() {
    if (!this.room) throw new Error('Room inexistante');

    return new Promise((resolve, reject) => {
      let intervalId = null;

      const timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error('Délai dépassé - room pas connectée après 10s'));
      }, 10000);

      const cleanup = () => {
        clearTimeout(timeoutId);
        if (intervalId) clearInterval(intervalId);
        this.room?.off(RoomEvent.Connected, onConnectedHandler);
      };

      const checkConnection = () => {
        if (!this.room) {
          cleanup();
          reject(new Error('Room disparue'));
          return;
        }
        if (this.room.state === RoomState.Connected) {
          cleanup();
          console.log('[LiveKitCallManager] ✅ Room connectée (polling)');
          resolve();
        }
      };

      const onConnectedHandler = () => {
        cleanup();
        console.log('[LiveKitCallManager] ✅ Room connectée (événement)');
        resolve();
      };

      this.room.once(RoomEvent.Connected, onConnectedHandler);
      intervalId = setInterval(checkConnection, 200);
      checkConnection();
    });
  }

  async _publishMedia() {
    if (!this.room?.localParticipant) throw new Error('localParticipant indisponible');

    console.log('[LiveKitCallManager] 🎤 Demande permissions média...');
    try {
      await this.room.localParticipant.setMicrophoneEnabled(true);
      console.log('[LiveKitCallManager] ✅ Microphone activé');

      if (this.isVideo) {
        await this.room.localParticipant.setCameraEnabled(true);
        console.log('[LiveKitCallManager] ✅ Caméra activée');
      }

      console.log('[LiveKitCallManager] ✅ Médias publiés');
    } catch (err) {
      console.error('[LiveKitCallManager] ❌ Erreur médias:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        console.warn('[LiveKitCallManager] ⚠️ Permissions refusées');
      } else {
        throw err;
      }
    }
  }

  _startTimer() {
    if (this.timerInterval) return;
    this.startTime = Date.now();
    this.timerInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
      this.emit({ duration: elapsed });
    }, 1000);
    console.log('[LiveKitCallManager] ⏱ Timer démarré');
  }

  _getErrorMessage(err) {
    const msg = err.message || '';
    if (msg.includes('timeout')) return 'Délai dépassé - connexion échouée';
    if (msg.includes('token')) return 'Erreur d\'authentification LiveKit';
    if (msg.includes('pc connection')) return 'Échec connexion WebRTC (vérifiez TURN)';
    return msg || 'Erreur inconnue';
  }

  async hangup() {
    if (!this.room) return;
    console.log('[LiveKitCallManager] 📞 Raccrochage...');

    this.isConnecting = false;
    this._cancelCallTimeout();

    // Envoyer hangup Matrix
    await this._sendMatrixHangup();

    try {
      if (this.room.localParticipant) {
        await this.room.localParticipant.setMicrophoneEnabled(false);
        await this.room.localParticipant.setCameraEnabled(false);
      }
      await this.room.disconnect();
      console.log('[LiveKitCallManager] ✅ Déconnexion réussie');
    } catch (err) {
      console.warn('[LiveKitCallManager] ⚠️ Erreur déconnexion:', err);
    } finally {
      this.room = null;
      this.emit({ status: 'disconnected' });
      if (this.timerInterval) {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
      }
    }
  }

  async _sendMatrixHangup() {
    try {
      const matrixToken = localStorage.getItem('matrix_token');
      if (!matrixToken || !this.roomId || !this.callId) return;

      const MATRIX_BASE_URL = import.meta.env.VITE_MATRIX_BASE_URL || 'https://communication.rtn.sn';
      
      await fetch(
        `${MATRIX_BASE_URL}/_matrix/client/v3/rooms/${encodeURIComponent(this.roomId)}/send/m.call.hangup/${Date.now()}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${matrixToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            call_id: this.callId,
            version: 1,
          }),
        }
      );

      console.log('[LiveKitCallManager] ✅ Hangup Matrix envoyé');
    } catch (err) {
      console.error('[LiveKitCallManager] ❌ Erreur envoi hangup Matrix:', err);
    }
  }

  getRoom() {
    return this.room;
  }

  isConnected() {
    return this.room && this.room.state === RoomState.Connected;
  }

  getConnectionState() {
    return this.room?.state || RoomState.Disconnected;
  }
}

export const liveKitCallManager = new LiveKitCallManager();