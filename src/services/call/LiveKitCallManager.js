// src/services/call/LiveKitCallManager.js
import { Room, RoomEvent, ConnectionState } from 'livekit-client';

const LIVEKIT_URL = import.meta.env.VITE_LIVEKIT_URL || 'https://livekit.ec2lt.sn';
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 2000;

class LiveKitCallManager {
  constructor() {
    this.room = null;
    this.roomId = null;
    this.callId = null;
    this.isVideo = false;
    this.listeners = new Set();
    this.isConnecting = false;
    this.hangupSent = false;
    this.connectionAttempts = 0;
  }

  onState(cb) {
    if (typeof cb !== 'function') {
      console.warn('[LiveKit] onState callback n\'est pas une fonction');
      return () => {};
    }
    
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  emit(state) {
    if (!this.listeners || !(this.listeners instanceof Set)) {
      console.warn('[LiveKit] listeners invalides');
      return;
    }

    if (this.listeners.size === 0) return;

    const listenersArray = Array.from(this.listeners);
    
    listenersArray.forEach(cb => {
      if (typeof cb !== 'function') return;
      
      try {
        cb(state);
      } catch (err) {
        console.error('[LiveKit] Erreur dans callback:', err);
        console.error('[LiveKit] State:', state);
      }
    });
  }

  async startOutgoingCall(roomId, isVideo = false) {
    if (this.isConnecting) {
      console.warn('[LiveKit] Connexion déjà en cours, ignoré');
      return;
    }

    if (this.room && this.room.state === ConnectionState.Connected) {
      console.warn('[LiveKit] Room déjà active');
      return;
    }

    this.roomId = roomId;
    this.isVideo = isVideo;
    this.callId = `lk-${Date.now()}`;
    this.hangupSent = false;
    this.connectionAttempts = 0;

    console.log('[LiveKit] Appel sortant', { roomId, isVideo });

    try {
      await this._sendMatrixInvite();
      await this._attemptConnection();
    } catch (err) {
      console.error('[LiveKit] Erreur startOutgoingCall:', err);
      this.isConnecting = false;
      throw err;
    }
  }

  async acceptIncomingCall({ roomId, callId, isVideo }) {
    if (this.isConnecting) {
      console.warn('[LiveKit] Connexion déjà en cours, ignoré');
      return;
    }

    if (this.room && this.room.state === ConnectionState.Connected) {
      console.warn('[LiveKit] Room déjà active');
      return;
    }

    this.roomId = roomId;
    this.callId = callId;
    this.isVideo = isVideo;
    this.hangupSent = false;
    this.connectionAttempts = 0;

    console.log('[LiveKit] Appel entrant accepté', { roomId });

    try {
      await this._attemptConnection();
    } catch (err) {
      console.error('[LiveKit] Erreur acceptIncomingCall:', err);
      this.isConnecting = false;
      throw err;
    }
  }

  async _attemptConnection() {
    this.isConnecting = true;

    try {
      console.log(`[LiveKit] Tentative ${this.connectionAttempts + 1}/${MAX_RETRY_ATTEMPTS}`);
      
      const token = await this._fetchToken();

      this.room = new Room({
        adaptiveStream: true,
        dynacast: true,
        autoSubscribe: true,
        videoCaptureDefaults: {
          resolution: {
            width: 1280,
            height: 720,
          },
        },
      });

      this._setupRoomListeners();

      const wsUrl = LIVEKIT_URL.replace(/^http/, 'ws');
      console.log('[LiveKit]  Connexion →', wsUrl);

      await this.room.connect(wsUrl, token);
      
      console.log('[LiveKit] WebSocket connecté');

      if (!this.room) {
        throw new Error('Room déconnectée pendant la connexion');
      }

      // Attendre que la room soit vraiment connectée
      await this._waitForRoomConnected();

      if (!this.room || !this.room.localParticipant) {
        throw new Error('Room ou localParticipant invalide');
      }

      console.log('[LiveKit] localParticipant disponible:', this.room.localParticipant.identity);

      // Publier les médias
      await this._publishMedia();

      console.log('[LiveKit] Émission état connecté...');
      this.emit({ status: 'connected' });
      console.log('[LiveKit]  Connexion complète !');

      this.isConnecting = false;
      this.connectionAttempts = 0;

      return this.room;

    } catch (err) {
      console.error('[LiveKit] Échec connexion:', err);
      
      if (this.room) {
        try { 
          await this.room.disconnect(); 
        } catch (e) {
          console.warn('[LiveKit] Erreur disconnect:', e);
        }
        this.room = null;
      }

      this.connectionAttempts++;
      
      if (this.connectionAttempts < MAX_RETRY_ATTEMPTS) {
        const delay = RETRY_DELAY_MS * this.connectionAttempts;
        console.log(`[LiveKit] Nouvelle tentative dans ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
        return this._attemptConnection();
      }

      this.isConnecting = false;
      const errorMessage = this._getErrorMessage(err);
      this.emit({ status: 'error', error: errorMessage });
      throw new Error(errorMessage);
    }
  }

  async _waitForRoomConnected() {
    if (!this.room) throw new Error('Room inexistante');

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error('Délai dépassé - room pas connectée après 10s'));
      }, 10000);

      const cleanup = () => {
        clearTimeout(timeoutId);
        this.room?.off(RoomEvent.Connected, onConnectedHandler);
      };

      const onConnectedHandler = () => {
        cleanup();
        console.log('[LiveKit] Room connectée (événement)');
        resolve();
      };

      // V2 utilise ConnectionState
      if (this.room.state === ConnectionState.Connected) {
        cleanup();
        console.log('[LiveKit] Room déjà connectée');
        resolve();
        return;
      }

      this.room.once(RoomEvent.Connected, onConnectedHandler);
    });
  }

  async _publishMedia() {
    if (!this.room?.localParticipant) {
      throw new Error('localParticipant indisponible');
    }

    console.log('[LiveKit] Publication médias...');

    try {
      // TOUJOURS activer le micro
      await this.room.localParticipant.setMicrophoneEnabled(true);
      console.log('[LiveKit] Microphone activé');

      // Activer la caméra si appel vidéo
      if (this.isVideo) {
        await this.room.localParticipant.setCameraEnabled(true);
        console.log('[LiveKit] Caméra activée');
      }

      console.log('[LiveKit] Médias publiés');
    } catch (err) {
      console.error('[LiveKit] Erreur médias:', err);
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        console.warn('[LiveKit] Permissions refusées - appel continue sans média');
        // Ne pas throw, continuer sans média
      } else {
        throw err;
      }
    }
  }

  async _fetchToken() {
    const base = import.meta.env.VITE_API_BASE;
    const path = import.meta.env.VITE_TOKEN_PATH;
    const matrixToken = localStorage.getItem('matrix_token');

    console.log('[LiveKit] Demande token...');

    const res = await fetch(`${base}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${matrixToken}`,
      },
      body: JSON.stringify({ room: this.roomId }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Erreur token LiveKit (${res.status}): ${text}`);
    }

    const { token } = await res.json();
    console.log('[LiveKit] Token reçu');
    return token;
  }

  _setupRoomListeners() {
    if (!this.room) return;

    this.room.on(RoomEvent.Connected, () => {
      console.log('[LiveKit]  Room connectée');
      this.emit({ status: 'active' });
    });

    this.room.on(RoomEvent.Disconnected, (reason) => {
      console.warn('[LiveKit]  Déconnecté:', reason);
      if (!this.isConnecting) {
        this.room = null;
        this.emit({ status: 'disconnected' });
      }
    });

    this.room.on(RoomEvent.Reconnecting, () => {
      console.warn('[LiveKit] Reconnexion...');
      this.emit({ status: 'reconnecting' });
    });

    this.room.on(RoomEvent.Reconnected, () => {
      console.log('[LiveKit] Reconnecté');
      this.emit({ status: 'connected' });
    });

    this.room.on(RoomEvent.ParticipantConnected, (participant) => {
      console.log('[LiveKit] Participant connecté:', participant.identity);
      this.emit({ status: 'participantConnected', participant });
    });

    this.room.on(RoomEvent.ParticipantDisconnected, (participant) => {
      console.log('[LiveKit] Participant déconnecté:', participant.identity);
      this.emit({ status: 'participantDisconnected', participant });
    });
  }

  _getErrorMessage(err) {
    const msg = err.message || '';
    if (msg.includes('timeout')) return 'Délai dépassé - connexion échouée';
    if (msg.includes('token')) return 'Erreur d\'authentification LiveKit';
    if (msg.includes('pc connection')) return 'Échec connexion WebRTC';
    return msg || 'Erreur inconnue';
  }

  async hangup() {
    console.log('[LiveKit] Hangup demandé');
    
    if (this.hangupSent) {
      console.log('[LiveKit] Hangup déjà envoyé');
      return;
    }
    
    this.hangupSent = true;
    this.isConnecting = false;
    
    try {
      // Envoyer hangup Matrix AVANT de déconnecter
      if (this.roomId && this.callId) {
        console.log('[LiveKit] Envoi hangup Matrix...');
        await this._sendMatrixHangup();
        console.log('[LiveKit] Hangup Matrix envoyé');
      }
      
      // Déconnecter la room
      if (this.room) {
        console.log('[LiveKit]  Déconnexion room...');
        
        try {
          if (this.room.localParticipant) {
            await this.room.localParticipant.setMicrophoneEnabled(false);
            await this.room.localParticipant.setCameraEnabled(false);
          }
        } catch (e) {
          console.warn('[LiveKit] Erreur désactivation médias:', e);
        }
        
        await this.room.disconnect();
        console.log('[LiveKit] Déconnexion room réussie');
      }
    } catch (err) {
      console.error('[LiveKit] Erreur hangup:', err);
    } finally {
      this.room = null;
      this.emit({ status: 'disconnected' });
    }
  }

  async _sendMatrixInvite() {
    const token = localStorage.getItem('matrix_token');
    const base = import.meta.env.VITE_MATRIX_BASE_URL;

    console.log('[LiveKit] Envoi invite Matrix...');

    const response = await fetch(
      `${base}/_matrix/client/v3/rooms/${encodeURIComponent(
        this.roomId
      )}/send/m.call.invite/${Date.now()}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          call_id: this.callId,
          version: 1,
          video: this.isVideo,
          livekit: true,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Erreur envoi invite Matrix: ${response.status}`);
    }

    console.log('[LiveKit] Invite Matrix envoyée');
  }

  async _sendMatrixHangup() {
    const token = localStorage.getItem('matrix_token');
    const base = import.meta.env.VITE_MATRIX_BASE_URL;

    try {
      const response = await fetch(
        `${base}/_matrix/client/v3/rooms/${encodeURIComponent(
          this.roomId
        )}/send/m.call.hangup/${Date.now()}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            call_id: this.callId,
            version: 1,
          }),
        }
      );

      if (response.ok) {
        console.log('[LiveKit] Hangup Matrix envoyé');
      }
    } catch (err) {
      console.warn('[LiveKit] Erreur envoi hangup Matrix:', err);
    }
  }

  getRoom() {
    return this.room;
  }

  isConnectedState() {
    return this.room && this.room.state === ConnectionState.Connected;
  }
}

export const liveKitCallManager = new LiveKitCallManager();