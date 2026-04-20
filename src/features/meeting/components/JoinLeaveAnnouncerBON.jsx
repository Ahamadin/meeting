// src/features/meeting/components/JoinLeaveAnnouncer.jsx
import { useEffect, useRef, useState, useCallback } from 'react';
import { RoomEvent, Track } from 'livekit-client';
import { useMeeting } from '../context/MeetingContext';
import { UserRound, UserRoundX, Hand, Monitor, BarChart2, Paperclip, Users, Coffee } from 'lucide-react';

// ── File d'attente vocale (évite chevauchements) ──────────────
const speakQueue = [];
let isSpeaking   = false;

function processQueue() {
  if (isSpeaking || speakQueue.length === 0) return;
  const { text, repeat } = speakQueue.shift();
  isSpeaking = true;

  const voices = window.speechSynthesis.getVoices();

  // ── VOIX MASCULINE : priorité aux voix françaises masculines ──
  // 1. Voix fr-FR explicitement masculines (Thomas, Nicolas, Pierre, Jean…)
  // 2. Sinon toute voix fr-FR qui n'est PAS féminine
  // 3. Sinon toute voix fr
  // 4. En dernier recours : voix système par défaut (pas de sélection)
  const maleVoice =
    voices.find(v => v.lang === 'fr-FR' && /thomas|nicolas|pierre|jean|laurent|google français|google french/i.test(v.name)) ||
    voices.find(v => v.lang === 'fr-FR' && !/amelie|marie|female|woman|femme|céline|celine|audrey|virginie/i.test(v.name)) ||
    voices.find(v => v.lang.startsWith('fr') && !/amelie|marie|female|woman|femme/i.test(v.name)) ||
    null; // null = on ne force pas de voix, le navigateur choisit

  let idx = 0;
  const playNext = () => {
    if (idx >= repeat) { isSpeaking = false; processQueue(); return; }
    window.speechSynthesis.cancel();
    const u    = new SpeechSynthesisUtterance(text);
    u.lang     = 'fr-FR';
    u.rate     = 0.90;
    u.pitch    = 0.65;  // pitch bas = voix plus grave/masculine
    u.volume   = 1.0;
    if (maleVoice) u.voice = maleVoice;
    u.onend   = () => { idx++; if (idx < repeat) setTimeout(playNext, 1400); else { isSpeaking = false; processQueue(); } };
    u.onerror = () => { isSpeaking = false; processQueue(); };
    window.speechSynthesis.speak(u);
    idx++;
  };
  playNext();
}

function speak(text, repeat = 1) {
  if (!window.speechSynthesis) return;
  speakQueue.push({ text, repeat });
  if (window.speechSynthesis.getVoices().length === 0) {
    window.speechSynthesis.addEventListener('voiceschanged', processQueue, { once: true });
  } else {
    processQueue();
  }
}

// ── Config toasts ─────────────────────────────────────────────
const TOAST_CONFIG = {
  join:   { Icon: UserRound,  color: '#22c55e', bg: 'rgba(34,197,94,0.15)',    border: 'rgba(34,197,94,0.32)'  },
  leave:  { Icon: UserRoundX, color: '#ef4444', bg: 'rgba(239,68,68,0.14)',    border: 'rgba(239,68,68,0.28)'  },
  hand:   { Icon: Hand,       color: '#f59e0b', bg: 'rgba(245,158,11,0.14)',   border: 'rgba(245,158,11,0.3)'  },
  screen: { Icon: Monitor,    color: '#60a5fa', bg: 'rgba(96,165,250,0.14)',   border: 'rgba(96,165,250,0.3)'  },
  poll:   { Icon: BarChart2,  color: '#a78bfa', bg: 'rgba(167,139,250,0.14)',  border: 'rgba(167,139,250,0.3)' },
  file:   { Icon: Paperclip,  color: '#34d399', bg: 'rgba(52,211,153,0.14)',   border: 'rgba(52,211,153,0.3)'  },
  alone:  { Icon: Users,      color: '#94a3b8', bg: 'rgba(148,163,184,0.13)',  border: 'rgba(148,163,184,0.25)'},
  pause:  { Icon: Coffee,     color: '#fb923c', bg: 'rgba(251,146,60,0.14)',   border: 'rgba(251,146,60,0.3)'  },
};

// ── Toast avec disparition progressive ───────────────────────
// CHANGEMENT : durée 3 000 ms au lieu de 6 000 ms
//              animation de sortie (fadeOut) avant de supprimer
const TOAST_DURATION = 3000; // ms avant disparition
const TOAST_FADEOUT  = 400;  // ms pour l'animation de sortie

function Toast({ message, type, onDone }) {
  const cfg     = TOAST_CONFIG[type] || TOAST_CONFIG.join;
  const { Icon } = cfg;
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    // Déclencher fadeOut avant la fin
    const fadeTimer = setTimeout(() => setLeaving(true), TOAST_DURATION - TOAST_FADEOUT);
    const doneTimer = setTimeout(onDone, TOAST_DURATION);
    return () => { clearTimeout(fadeTimer); clearTimeout(doneTimer); };
  }, [onDone]);

  return (
    <div
      className="flex items-start gap-3 pointer-events-none"
      style={{
        padding: '12px 16px', borderRadius: '14px',
        background: cfg.bg, border: `1px solid ${cfg.border}`,
        backdropFilter: 'blur(16px)', boxShadow: '0 6px 28px rgba(0,0,0,0.4)',
        maxWidth: '340px', minWidth: '220px',
        // CHANGEMENT : animation entrée + sortie
        animation: leaving
          ? `toastOut ${TOAST_FADEOUT}ms ease forwards`
          : 'toastIn 0.25s cubic-bezier(0.34,1.4,0.64,1)',
      }}
    >
      <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center"
           style={{ background: cfg.color + '20', border: `1.5px solid ${cfg.color}50` }}>
        <Icon style={{ width: '16px', height: '16px', color: cfg.color }} />
      </div>
      <span className="text-white text-sm font-medium leading-relaxed pt-0.5">{message}</span>
    </div>
  );
}

// ── Overlay seul dans la réunion (inchangé) ───────────────────
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
        <div className="text-center px-9 py-7 rounded-2xl border border-white/10 animate-fade-in"
             style={{ background: 'rgba(10,20,56,0.75)', backdropFilter: 'blur(18px)', maxWidth: '360px' }}>
          <div className="w-14 h-14 rounded-full border border-white/15 bg-white/7
                          flex items-center justify-center mx-auto mb-4">
            <Users className="w-6 h-6 text-white/50" />
          </div>
          <p className="text-white font-semibold text-base mb-2">Bienvenue sur notre plateforme de communication, pour le moment Vous êtes seul(e) dans cette réunion</p>
          <p className="text-white/45 text-xs leading-relaxed">En attente des autres participants…</p>
          <div className="flex justify-center gap-1.5 mt-5">
            {[0,1,2].map(i => (
              <div key={i} className="w-2 h-2 rounded-full bg-accent"
                   style={{ animation: `dotPulse 1.4s ease-in-out ${i*0.22}s infinite` }} />
            ))}
          </div>
        </div>
      </div>
      <style>{`
        @keyframes dotPulse {
          0%,80%,100%{transform:scale(.7);opacity:.4}
          40%{transform:scale(1);opacity:1}
        }
      `}</style>
    </>
  );
}

// ── Bannière pause (inchangée) ────────────────────────────────
function PauseBanner({ onDismiss }) {
  return (
    <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-40 animate-slide-up"
         style={{ maxWidth: '460px', width: '90%' }}>
      <div className="flex items-center gap-4 px-5 py-4 rounded-2xl border border-orange-400/30"
           style={{ background: 'rgba(251,146,60,0.12)', backdropFilter: 'blur(16px)' }}>
        <div className="w-10 h-10 rounded-xl bg-orange-400/20 flex items-center justify-center flex-shrink-0">
          <Coffee className="w-5 h-5 text-orange-400" />
        </div>
        <div className="flex-1">
          <p className="text-white font-semibold text-sm">Pause recommandée</p>
          <p className="text-white/60 text-xs mt-0.5">
            Vous avez fait presque 1 heure de réunion. Prenez une pause de 15 à 30 minutes !
          </p>
        </div>
        <button onClick={onDismiss}
                className="text-white/40 hover:text-white text-lg font-bold transition-colors leading-none">
          ×
        </button>
      </div>
    </div>
  );
}

// ── Composant principal (logique inchangée) ───────────────────
export default function JoinLeaveAnnouncer() {
  const { room, meetingStartTime } = useMeeting();
  const [toasts, setToasts]        = useState([]);
  const [isAlone, setIsAlone]      = useState(false);
  const [showPause, setShowPause]  = useState(false);
  const handRaisedRef              = useRef(new Set());
  const aloneAnnouncedRef          = useRef(false);
  const pauseAnnouncedRef          = useRef(false);

  // Préchargement voix
  useEffect(() => {
    const load = () => window.speechSynthesis.getVoices();
    load();
    window.speechSynthesis.addEventListener('voiceschanged', load);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', load);
  }, []);

  const addToast = useCallback((message, type) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev.slice(-4), { id, message, type }]);
  }, []);
  const removeToast = useCallback((id) => setToasts(prev => prev.filter(t => t.id !== id)), []);

  // ── Pause après 1 heure ────────────────────────────────────
  useEffect(() => {
    if (!meetingStartTime || pauseAnnouncedRef.current) return;
    const ONE_HOUR = 60 * 60 * 1000;
    const already  = Date.now() - new Date(meetingStartTime).getTime();
    const delay    = Math.max(0, ONE_HOUR - already);

    const t = setTimeout(() => {
      if (pauseAnnouncedRef.current) return;
      pauseAnnouncedRef.current = true;
      setShowPause(true);
      speak(
        'Vous avez fait presque 1 heure de réunion ou de cours. ' +
        'Est-ce que vous pouvez prendre une pause de 15 à 30 minutes ? Merci.',
        3
      );
      addToast('Pause recommandée après 1 heure de réunion', 'pause');
    }, delay);

    return () => clearTimeout(t);
  }, [meetingStartTime, addToast]);

  // ── Seul dans la réunion ───────────────────────────────────
  useEffect(() => {
    if (!room) return;
    const check = () => {
      const alone = (room.remoteParticipants?.size ?? 0) === 0;
      setIsAlone(alone);
      if (alone && !aloneAnnouncedRef.current) {
        aloneAnnouncedRef.current = true;
        setTimeout(() => {
          speak(
            'Bienvenue sur notre plateforme de communication, Vous êtes présentement le seul ou la seule participante de cette réunion. ' +
            'Vous pouvez attendre que les autres membres se connectent ou se reconnectent. Merci.',
            1
          );
          addToast('Vous êtes seul(e) dans la réunion', 'alone');
        }, 2000);
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

  // ── Événements LiveKit ─────────────────────────────────────
  useEffect(() => {
    if (!room) return;

    const onJoin = (p) => {
      const name = p?.name || p?.identity || 'Un participant';
      speak(`${name} vient de rejoindre la réunion`, 1);
      addToast(`${name} a rejoint la réunion`, 'join');
    };

    const onLeave = (p) => {
      const name = p?.name || p?.identity || 'Un participant';
      speak(`${name} vient de quitter la réunion`, 1);
      addToast(`${name} a quitté la réunion`, 'leave');
    };

    const onData = (payload, participant) => {
      try {
        const msg  = JSON.parse(new TextDecoder().decode(payload));
        const name = participant?.name || participant?.identity || 'Un participant';
        const id   = participant?.identity;

        if (msg.type === 'hand_raise') {
          if (msg.raised && id && !handRaisedRef.current.has(id)) {
            handRaisedRef.current.add(id);
            speak(`${name} vient de lever la main`, 3);
            addToast(`${name} a levé la main`, 'hand');
          } else if (!msg.raised && id) {
            handRaisedRef.current.delete(id);
          }
        }
        if (msg.type === 'file_meta') {
          speak(`${name} vient de partager un fichier. Vous pouvez le vérifier et le télécharger. Merci.`, 2);
          addToast(`${name} a partagé un fichier`, 'file');
        }
        if (msg.type === 'poll_create') {
          speak('Un sondage vient d\'être créé avec succès. Vous pouvez maintenant faire votre choix. Merci.', 1);
          addToast('Un nouveau sondage est disponible', 'poll');
        }
        if (msg.type === 'poll_show' && msg.visible) {
          speak('Le sondage est maintenant ouvert. Vous pouvez faire votre choix. Merci.', 1);
          addToast('Le sondage est ouvert au vote', 'poll');
        }
      } catch {}
    };

    const onTrack = (track, publication, participant) => {
      try {
        if (
          publication?.source === Track.Source.ScreenShare &&
          track?.kind === Track.Kind.Video &&
          !participant?.isLocal
        ) {
          const name = participant?.name || participant?.identity || 'Un participant';
          speak(`${name} vient de partager son écran. Vous pouvez suivre attentivement sa présentation pour bien comprendre. Merci.`, 1);
          addToast(`${name} partage son écran`, 'screen');
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
      window.speechSynthesis?.cancel();
      speakQueue.length = 0;
      isSpeaking = false;
    };
  }, [room, addToast]);

  return (
    <>
      <AloneOverlay visible={isAlone} />
      {showPause && <PauseBanner onDismiss={() => setShowPause(false)} />}

      {/* Toasts */}
      <div className="absolute top-16 right-4 flex flex-col gap-2 z-40 pointer-events-none">
        {toasts.map(t => (
          <Toast key={t.id} message={t.message} type={t.type} onDone={() => removeToast(t.id)} />
        ))}
      </div>

      {/* Keyframes pour les toasts */}
      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateX(16px) scale(0.95); }
          to   { opacity: 1; transform: translateX(0)    scale(1);    }
        }
        @keyframes toastOut {
          from { opacity: 1; transform: translateX(0)    scale(1);    }
          to   { opacity: 0; transform: translateX(16px) scale(0.92); }
        }
      `}</style>
    </>
  );
}