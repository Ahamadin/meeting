// src/routes/Meeting.jsx
// Version Finale et Complète - Correction de la redirection "Quitter temporairement"

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { RoomEvent } from 'livekit-client';
import { useMeeting } from '../features/meeting/context/MeetingContext';
import TopBar from '../features/meeting/components/TopBar';
import VideoGrid from '../features/meeting/components/VideoGrid';
import ControlsBar from '../features/meeting/components/ControlsBar';
import SidePanel from '../features/meeting/components/SidePanel';
import ReactionsOverlay from '../features/meeting/components/ReactionsOverlay';
import JoinLeaveAnnouncer from '../features/meeting/components/JoinLeaveAnnouncer';
import StatsPanel from '../features/meeting/components/StatsPanel';
import WaitingRoom from '../features/meeting/components/WaitingRoom';
import ConnectionAlert from '../features/meeting/components/ConnectionAlert';
import { SidePanelProvider } from '../features/meeting/components/SidePanelContext';

function LoadingScreen({ message = 'Connexion…' }) {
  return (
    <div className="min-h-screen meet-surface flex items-center justify-center">
      <div className="text-center">
        <div className="w-14 h-14 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-5" />
        <p className="text-white/70 font-medium">{message}</p>
      </div>
    </div>
  );
}

function ErrorScreen({ error, onRetry, onLeave }) {
  return (
    <div className="min-h-screen meet-surface flex items-center justify-center p-6">
      <div className="card max-w-sm w-full p-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">⚠️</span>
        </div>
        <h2 className="text-xl font-bold text-primary mb-2">Erreur de connexion</h2>
        <p className="text-gray-500 text-sm mb-6">{error}</p>
        <div className="flex gap-3 justify-center">
          <button onClick={onRetry} className="btn btn-primary">Réessayer</button>
          <button onClick={onLeave} className="btn btn-ghost">Accueil</button>
        </div>
      </div>
    </div>
  );
}

export default function Meeting() {
  const { id: roomId } = useParams();

  const {
    startMeeting,
    joinRoom,
    connectionState,
    error,
    room,
    displayName,
    roomName,
    waitingRoomList,
    admitFromWaitingRoom,
    rejectFromWaitingRoom,
    isInWaitingRoom,
  } = useMeeting();

  const [phase, setPhase] = useState('connecting');
  const [showStats, setShowStats] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [isLeaving, setIsLeaving] = useState(false);   // ← NOUVEAU : flag pour bloquer les redirections pendant la sortie

  const initialized = useRef(false);

  // Analytics locaux
  const stats = useRef({ speakTime: {}, messages: {}, hands: {}, joinTime: {}, lastSpeak: {} });

  const trackSpeaker = useCallback((speakers) => {
    const now = Date.now();
    const s = stats.current;
    Object.keys(s.lastSpeak).forEach(id => {
      if (!speakers.find(p => p.identity === id)) {
        s.speakTime[id] = (s.speakTime[id] || 0) + (now - s.lastSpeak[id]);
        delete s.lastSpeak[id];
      }
    });
    speakers.forEach(p => {
      if (!s.lastSpeak[p.identity]) s.lastSpeak[p.identity] = now;
      if (!s.joinTime[p.identity]) s.joinTime[p.identity] = now;
    });
  }, []);

  const trackData = useCallback((payload, participant) => {
    try {
      const msg = JSON.parse(new TextDecoder().decode(payload));
      const id = participant?.identity;
      if (!id) return;
      const s = stats.current;
      if (msg.type === 'chat') s.messages[id] = (s.messages[id] || 0) + 1;
      if (msg.type === 'hand_raise' && msg.raised) s.hands[id] = (s.hands[id] || 0) + 1;
    } catch {}
  }, []);

  const trackJoin = useCallback((p) => {
    if (p?.identity && !stats.current.joinTime[p.identity])
      stats.current.joinTime[p.identity] = Date.now();
  }, []);

  // Listeners LiveKit
  useEffect(() => {
    if (!room) return;
    room.on(RoomEvent.ActiveSpeakersChanged, trackSpeaker);
    room.on(RoomEvent.DataReceived, trackData);
    room.on(RoomEvent.ParticipantConnected, trackJoin);

    return () => {
      room.off(RoomEvent.ActiveSpeakersChanged, trackSpeaker);
      room.off(RoomEvent.DataReceived, trackData);
      room.off(RoomEvent.ParticipantConnected, trackJoin);
    };
  }, [room, trackSpeaker, trackData, trackJoin]);

  useEffect(() => {
    if (room?.localParticipant) {
      const id = room.localParticipant.identity;
      if (!stats.current.joinTime[id]) stats.current.joinTime[id] = Date.now();
    }
  }, [room]);

  // Connexion principale - Protégée contre les redirections pendant la sortie
  useEffect(() => {
    if (initialized.current || isLeaving) return;

    initialized.current = true;

    const sessionKey = `meet_session_${roomId}`;
    let session = null;

    try {
      const raw = sessionStorage.getItem(sessionKey) || localStorage.getItem(sessionKey);
      if (raw) {
        session = JSON.parse(raw);
        sessionStorage.setItem(sessionKey, raw);
      }
    } catch (e) {
      console.warn('[Meeting] Erreur lecture session');
    }

    if (!session || !session.name) {
      console.warn('[Meeting] Aucune session trouvée → redirection accueil');
      window.location.href = '/';
      return;
    }

    const { name: nameVal, role, mode = 'private' } = session;

    // Nettoyage de l'URL
    window.history.replaceState({}, '', `/meeting/${roomId}`);

    (async () => {
      try {
        let isHost = role === 'host';

        if (isHost) {
          await startMeeting({ displayName: nameVal, roomName: roomId, mode });
        } else {
          await joinRoom({ displayName: nameVal, roomName: roomId, mode });
        }

        sessionStorage.removeItem(sessionKey);
        setPhase('active');
      } catch (err) {
        console.error('[Meeting] Erreur connexion:', err);
        setPhase('error');
      }
    })();
  }, [roomId, startMeeting, joinRoom, isLeaving]);

  // Nettoyage propre quand le composant est démonté (quand on quitte la réunion)
  useEffect(() => {
    return () => {
      initialized.current = false;
    };
  }, []);

  if (phase === 'connecting') return <LoadingScreen message="Connexion à la réunion…" />;
  
  if (phase === 'error' || error) return (
    <ErrorScreen
      error={error || 'Impossible de rejoindre'}
      onRetry={() => {
        initialized.current = false;
        setPhase('connecting');
        setRetryKey(k => k + 1);
      }}
      onLeave={() => window.location.href = '/'}
    />
  );

  if (isInWaitingRoom) {
    return (
      <WaitingRoom
        displayName={displayName}
        roomName={roomName}
      />
    );
  }

  return (
    <SidePanelProvider>
      <ConnectionAlert />
      <div className="flex flex-col meet-surface" style={{ height: '100vh', overflow: 'hidden' }}>
        <TopBar />
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <main className="flex-1 min-w-0 min-h-0 overflow-hidden relative">
            <VideoGrid />
            <ReactionsOverlay />
            <JoinLeaveAnnouncer />
          </main>
          <SidePanel />
        </div>
        <ControlsBar onShowStats={() => setShowStats(true)} />
        {showStats && (
          <StatsPanel stats={stats.current} onClose={() => setShowStats(false)} />
        )}
      </div>
    </SidePanelProvider>
  );
}