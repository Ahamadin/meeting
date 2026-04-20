// src/features/meeting/components/JoinLeaveAnnouncer.jsx
// ── Toasts style Google Meet : texte simple, fond sombre léger, disparition rapide ──
import { useEffect, useRef, useState, useCallback } from 'react';
import { RoomEvent, Track } from 'livekit-client';
import { useMeeting } from '../context/MeetingContext';
import { Users, Coffee } from 'lucide-react';

// Durée d'affichage courte comme sur Google Meet
const TOAST_DURATION = 3000; // 3s
const TOAST_FADE     = 250;  // fade-out 250ms

// ── Toast minimaliste style Google Meet ──────────────────────
function Toast({ message, onDone }) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setLeaving(true), TOAST_DURATION - TOAST_FADE);
    const t2 = setTimeout(onDone, TOAST_DURATION);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        padding: '10px 16px',
        borderRadius: '8px',
        background: 'rgba(32,33,36,0.92)',
        color: '#fff',
        fontSize: '13px',
        fontWeight: '500',
        lineHeight: '1.4',
        pointerEvents: 'none',
        whiteSpace: 'nowrap',
        maxWidth: '320px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        transition: `opacity ${TOAST_FADE}ms ease`,
        opacity: leaving ? 0 : 1,
        animation: leaving ? 'none' : 'meetToastIn 0.2s ease',
      }}
    >
      {message}
    </div>
  );
}

// ── Overlay "seul dans la réunion" ───────────────────────────
function AloneOverlay({ visible }) {
  const audioRef = useRef(null);

  useEffect(() => {
    if (!audioRef.current) return;
    if (visible) {
      audioRef.current.volume = 0.35;
      audioRef.current.play().catch(() => {});
    } else {
      const fade = setInterval(() => {
        if (!audioRef.current) { clearInterval(fade); return; }
        if (audioRef.current.volume > 0.03) {
          audioRef.current.volume = Math.max(0, audioRef.current.volume - 0.03);
        } else {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
          audioRef.current.volume = 0.35;
          clearInterval(fade);
        }
      }, 80);
      return () => clearInterval(fade);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <>
      <audio ref={audioRef} src="/sons/son.wav" loop preload="auto" />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
        <div
          className="text-center px-9 py-7 rounded-2xl border border-white/10"
          style={{ background: 'rgba(10,20,56,0.75)', backdropFilter: 'blur(18px)', maxWidth: '360px' }}
        >
          <div className="w-14 h-14 rounded-full border border-white/15 bg-white/7 flex items-center justify-center mx-auto mb-4">
            <Users className="w-6 h-6 text-white/50" />
          </div>
          <p className="text-white font-semibold text-base mb-2">
            Bienvenue sur notre plateforme de communication, pour le moment vous êtes seul(e) dans cette réunion
          </p>
          <p className="text-white/45 text-xs leading-relaxed">En attente des autres participants…</p>
          <div className="flex justify-center gap-1.5 mt-5">
            {[0, 1, 2].map(i => (
              <div key={i} className="w-2 h-2 rounded-full bg-accent"
                   style={{ animation: `dotPulse 1.4s ease-in-out ${i * 0.22}s infinite` }} />
            ))}
          </div>
        </div>
      </div>
      <style>{`
        @keyframes dotPulse {
          0%,80%,100% { transform:scale(.7); opacity:.4 }
          40%          { transform:scale(1);  opacity:1  }
        }
      `}</style>
    </>
  );
}

// ── Bannière pause ───────────────────────────────────────────
function PauseBanner({ onDismiss }) {
  return (
    <div
      className="absolute bottom-24 left-1/2 -translate-x-1/2 z-40"
      style={{ maxWidth: '460px', width: '90%', animation: 'pauseSlideUp 0.4s cubic-bezier(0.22,1,0.36,1)' }}
    >
      <div
        className="flex items-center gap-4 px-5 py-4 rounded-2xl border border-orange-400/30"
        style={{ background: 'rgba(251,146,60,0.12)', backdropFilter: 'blur(16px)' }}
      >
        <div className="w-10 h-10 rounded-xl bg-orange-400/20 flex items-center justify-center flex-shrink-0">
          <Coffee className="w-5 h-5 text-orange-400" />
        </div>
        <div className="flex-1">
          <p className="text-white font-semibold text-sm">Pause recommandée</p>
          <p className="text-white/60 text-xs mt-0.5">
            Vous avez fait presque 1 heure de réunion. Prenez une pause de 15 à 30 minutes !
          </p>
        </div>
        <button
          onClick={onDismiss}
          className="text-white/40 hover:text-white/80 text-xl font-bold transition-colors leading-none"
        >×</button>
      </div>
      <style>{`
        @keyframes pauseSlideUp {
          from { transform: translateX(-50%) translateY(14px); opacity: 0 }
          to   { transform: translateX(-50%) translateY(0);    opacity: 1 }
        }
      `}</style>
    </div>
  );
}

// ── Composant principal ──────────────────────────────────────
export default function JoinLeaveAnnouncer() {
  const { room, meetingStartTime } = useMeeting();

  const [toasts,    setToasts]    = useState([]);
  const [isAlone,   setIsAlone]   = useState(false);
  const [showPause, setShowPause] = useState(false);

  const handRaisedRef     = useRef(new Set());
  const aloneAnnouncedRef = useRef(false);
  const pauseAnnouncedRef = useRef(false);

  const addToast = useCallback((message) => {
    const id = Date.now() + Math.random();
    // Max 3 toasts simultanés (style Meet)
    setToasts(prev => [...prev.slice(-2), { id, message }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Pause après 1 heure
  useEffect(() => {
    if (!meetingStartTime || pauseAnnouncedRef.current) return;
    const delay = Math.max(0, 60 * 60 * 1000 - (Date.now() - new Date(meetingStartTime).getTime()));
    const t = setTimeout(() => {
      if (pauseAnnouncedRef.current) return;
      pauseAnnouncedRef.current = true;
      setShowPause(true);
    }, delay);
    return () => clearTimeout(t);
  }, [meetingStartTime, addToast]);

  // Seul dans la réunion
  useEffect(() => {
    if (!room) return;
    const check = () => {
      const alone = (room.remoteParticipants?.size ?? 0) === 0;
      setIsAlone(alone);
      if (alone && !aloneAnnouncedRef.current) {
        aloneAnnouncedRef.current = true;
        setTimeout(() => addToast('Vous êtes seul(e) dans la réunion'), 2000);
      } else if (!alone) {
        aloneAnnouncedRef.current = false;
      }
    };
    check();
    room.on(RoomEvent.ParticipantConnected,    check);
    room.on(RoomEvent.ParticipantDisconnected, check);
    return () => {
      room.off(RoomEvent.ParticipantConnected,    check);
      room.off(RoomEvent.ParticipantDisconnected, check);
    };
  }, [room, addToast]);

  // Événements LiveKit → toasts texte
  useEffect(() => {
    if (!room) return;

    const onJoin = (p) => {
      const name = p?.name || p?.identity || 'Un participant';
      addToast(`${name} a rejoint la réunion`);
    };

    const onLeave = (p) => {
      const name = p?.name || p?.identity || 'Un participant';
      addToast(`${name} a quitté la réunion`);
    };

    const onData = (payload, participant) => {
      try {
        const msg  = JSON.parse(new TextDecoder().decode(payload));
        const name = participant?.name || participant?.identity || 'Un participant';
        const id   = participant?.identity;

        if (msg.type === 'hand_raise') {
          if (msg.raised && id && !handRaisedRef.current.has(id)) {
            handRaisedRef.current.add(id);
            addToast(`${name} a levé la main ✋`);
          } else if (!msg.raised && id) {
            handRaisedRef.current.delete(id);
          }
        }
        if (msg.type === 'file_meta')
          addToast(`${name} a partagé un fichier`);
        if (msg.type === 'poll_create')
          addToast('Un nouveau sondage est disponible');
        if (msg.type === 'poll_show' && msg.visible)
          addToast('Le sondage est maintenant ouvert');
      } catch {}
    };

    const onTrack = (track, publication, participant) => {
      try {
        if (
          publication?.source === Track.Source.ScreenShare &&
          track?.kind   === Track.Kind.Video &&
          !participant?.isLocal
        ) {
          const name = participant?.name || participant?.identity || 'Un participant';
          addToast(`${name} partage son écran`);
        }
      } catch {}
    };

    room.on(RoomEvent.ParticipantConnected,    onJoin);
    room.on(RoomEvent.ParticipantDisconnected, onLeave);
    room.on(RoomEvent.DataReceived,            onData);
    room.on(RoomEvent.TrackSubscribed,         onTrack);

    return () => {
      room.off(RoomEvent.ParticipantConnected,    onJoin);
      room.off(RoomEvent.ParticipantDisconnected, onLeave);
      room.off(RoomEvent.DataReceived,            onData);
      room.off(RoomEvent.TrackSubscribed,         onTrack);
    };
  }, [room, addToast]);

  return (
    <>
      <AloneOverlay visible={isAlone} />
      {showPause && <PauseBanner onDismiss={() => setShowPause(false)} />}

      {/* Colonne de toasts — bas gauche comme Google Meet */}
      <div style={{
        position: 'absolute',
        bottom: '80px',
        left: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        zIndex: 50,
        pointerEvents: 'none',
        alignItems: 'flex-start',
      }}>
        {toasts.map(t => (
          <Toast key={t.id} message={t.message} onDone={() => removeToast(t.id)} />
        ))}
      </div>

      <style>{`
        @keyframes meetToastIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}