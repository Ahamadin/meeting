// src/routes/Meeting.jsx
import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { RoomEvent } from 'livekit-client';
import { useMeeting } from '../features/meeting/context/MeetingContext';
import TopBar              from '../features/meeting/components/TopBar';
import VideoGrid           from '../features/meeting/components/VideoGrid';
import ControlsBar         from '../features/meeting/components/ControlsBar';
import SidePanel           from '../features/meeting/components/SidePanel';
import WaitingRoomAlert    from '../features/meeting/components/WaitingRoomAlert';
import ReactionsOverlay    from '../features/meeting/components/ReactionsOverlay';
import JoinLeaveAnnouncer  from '../features/meeting/components/JoinLeaveAnnouncer';
import StatsPanel          from '../features/meeting/components/StatsPanel';
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

function PauseBanner({ onDismiss }) {
  return (
    <div style={{
      position: 'absolute', bottom: '80px', left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 30, width: '100%', maxWidth: '560px', padding: '0 16px',
      animation: 'slideUpBanner 0.4s cubic-bezier(0.34,1.56,0.64,1)',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 12, padding: '14px 18px', borderRadius: 16,
        background: '#b45309', border: '1px solid #d97706',
        boxShadow: '0 8px 28px rgba(180,83,9,0.45)', color: '#fff',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22 }}>☕</span>
          <div>
            <p style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>Pause recommandée</p>
            <p style={{ fontSize: 12, opacity: 0.85 }}>
              Vous avez fait 1 heure de réunion — pensez à prendre 15 à 30 min de pause.
            </p>
          </div>
        </div>
        <button onClick={onDismiss} style={{
          background: 'rgba(255,255,255,0.2)', border: 'none',
          color: '#fff', borderRadius: 8, padding: '5px 10px',
          cursor: 'pointer', fontSize: 11, fontWeight: 700, flexShrink: 0,
        }}>OK</button>
      </div>
      <style>{`
        @keyframes slideUpBanner {
          from { transform: translateX(-50%) translateY(20px); opacity: 0; }
          to   { transform: translateX(-50%) translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export default function Meeting() {
  const { id: roomId } = useParams();
  const navigate       = useNavigate();

  const { startMeeting, joinRoom, connectionState, error, room, meetingStartTime } = useMeeting();
  const [phase, setPhase]         = useState('connecting');
  const [showStats, setShowStats] = useState(false);
  const [showPause, setShowPause] = useState(false);
  const pauseFiredRef             = useRef(false);
  const initialized               = useRef(false);

  // ── Stats ─────────────────────────────────────────────────
  const stats = useRef({ speakTime: {}, messages: {}, hands: {}, joinTime: {}, lastSpeak: {} });

  const trackSpeaker = useCallback((speakers) => {
    const now = Date.now(); const s = stats.current;
    Object.keys(s.lastSpeak).forEach(id => {
      if (!speakers.find(p => p.identity === id)) {
        s.speakTime[id] = (s.speakTime[id] || 0) + (now - s.lastSpeak[id]);
        delete s.lastSpeak[id];
      }
    });
    speakers.forEach(p => {
      if (!s.lastSpeak[p.identity]) s.lastSpeak[p.identity] = now;
      if (!s.joinTime[p.identity])  s.joinTime[p.identity]  = now;
    });
  }, []);

  const trackData = useCallback((payload, participant) => {
    try {
      const msg = JSON.parse(new TextDecoder().decode(payload));
      const id  = participant?.identity; if (!id) return;
      const s   = stats.current;
      if (msg.type === 'chat')                     s.messages[id] = (s.messages[id] || 0) + 1;
      if (msg.type === 'hand_raise' && msg.raised) s.hands[id]    = (s.hands[id]    || 0) + 1;
    } catch {}
  }, []);

  const trackJoin = useCallback((p) => {
    if (p?.identity && !stats.current.joinTime[p.identity])
      stats.current.joinTime[p.identity] = Date.now();
  }, []);

  useEffect(() => {
    if (!room) return;
    room.on(RoomEvent.ActiveSpeakersChanged, trackSpeaker);
    room.on(RoomEvent.DataReceived,          trackData);
    room.on(RoomEvent.ParticipantConnected,  trackJoin);
    return () => {
      room.off(RoomEvent.ActiveSpeakersChanged, trackSpeaker);
      room.off(RoomEvent.DataReceived,          trackData);
      room.off(RoomEvent.ParticipantConnected,  trackJoin);
    };
  }, [room, trackSpeaker, trackData, trackJoin]);

  useEffect(() => {
    if (room?.localParticipant) {
      const id = room.localParticipant.identity;
      if (!stats.current.joinTime[id]) stats.current.joinTime[id] = Date.now();
    }
  }, [room]);

  // ── Timer pause 1h ────────────────────────────────────────
  useEffect(() => {
    if (!meetingStartTime || pauseFiredRef.current) return;
    const delay = Math.max(0, 60 * 60 * 1000 - (Date.now() - meetingStartTime));
    const t = setTimeout(() => {
      pauseFiredRef.current = true; setShowPause(true);
      const msg = 'Vous avez fait presque 1 heure de réunion. Pensez à prendre une pause. Merci.';
      let count = 0;
      const say = () => {
        if (count >= 3) return;
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(msg);
        u.lang = 'fr-FR'; u.rate = 0.90; u.pitch = 0.72; u.volume = 1.0;
        const voices = window.speechSynthesis.getVoices();
        const pref = voices.find(v => v.lang === 'fr-FR' && (v.name.toLowerCase().includes('thomas') || v.name.toLowerCase().includes('nicolas'))) || voices.find(v => v.lang === 'fr-FR');
        if (pref) u.voice = pref;
        u.onend = () => { count++; if (count < 3) setTimeout(say, 1500); };
        window.speechSynthesis.speak(u); count++;
      };
      say();
    }, delay);
    return () => clearTimeout(t);
  }, [meetingStartTime]);

  // ── CONNEXION PRINCIPALE ──────────────────────────────────
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // ── Lire la session depuis sessionStorage ──
    // Écrite par Prejoin.jsx juste avant la navigation
    let session = null;
    try {
      const raw = sessionStorage.getItem(`meet_session_${roomId}`);
      if (raw) session = JSON.parse(raw);
    } catch {}

    // ── Fallback : tenter de lire les anciens params URL (compatibilité)
    // Si pas de session → rediriger vers l'accueil
    if (!session || !session.name) {
      console.warn('[Meeting] Aucune session trouvée → redirection accueil');
      navigate('/');
      return;
    }

    const { name: nameVal, role } = session;

    // ── Nettoyer l'URL immédiatement ──
    window.history.replaceState({}, '', `/meeting/${roomId}`);

    // ── LOG DIAGNOSTIC ──
    console.log(`[Meeting] Session: nom="${nameVal}", rôle="${role}"`);

    (async () => {
      try {
        // ══════════════════════════════════════════════════════════
        // RÈGLE ABSOLUE :
        //   role === 'host'        → appelle createMeeting (token isHost=true)
        //   role === 'participant' → appelle joinMeeting   (token isHost=false)
        //
        // ON NE BASCULE JAMAIS un participant vers startMeeting,
        // même si getMeetingInfo retourne active:false.
        // Le backend gère la création de room dans joinMeeting (ensureRoom).
        // ══════════════════════════════════════════════════════════
        if (role === 'host') {
          console.log('[Meeting] → createMeeting (hôte)');
          await startMeeting({ displayName: nameVal, roomName: roomId });
        } else {
          console.log('[Meeting] → joinMeeting (participant)');
          await joinRoom({ displayName: nameVal, roomName: roomId });
        }

        // Supprimer la session après connexion réussie
        sessionStorage.removeItem(`meet_session_${roomId}`);
        setPhase('active');
      } catch (err) {
        console.error('[Meeting] Erreur connexion:', err);
        setPhase('error');
      }
    })();
  }, []);   // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (connectionState === 'disconnected' && phase === 'active') navigate('/');
  }, [connectionState, phase, navigate]);

  if (phase === 'connecting') return <LoadingScreen message="Connexion à la réunion…" />;
  if (phase === 'error' || error) return (
    <ErrorScreen
      error={error || 'Impossible de rejoindre'}
      onRetry={() => { initialized.current = false; setPhase('connecting'); }}
      onLeave={() => navigate('/')}
    />
  );

  return (
    <SidePanelProvider>
      <div className="flex flex-col meet-surface" style={{ height: '100vh', overflow: 'hidden' }}>
        <TopBar />
        <WaitingRoomAlert />
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <main className="flex-1 min-w-0 min-h-0 overflow-hidden relative">
            <VideoGrid />
            <ReactionsOverlay />
            <JoinLeaveAnnouncer />
            {showPause && <PauseBanner onDismiss={() => setShowPause(false)} />}
          </main>
          <SidePanel />
        </div>
        <ControlsBar onShowStats={() => setShowStats(true)} />
        {showStats && <StatsPanel stats={stats.current} onClose={() => setShowStats(false)} />}
      </div>
    </SidePanelProvider>
  );
}