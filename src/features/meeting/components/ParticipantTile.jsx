// src/features/meeting/components/ParticipantTile.jsx
import { useEffect, useState, memo } from 'react';
import { Mic, MicOff, Video, VideoOff, Hand, Maximize2, X } from 'lucide-react';
import { Track } from 'livekit-client';
import { useMeeting } from '../context/MeetingContext';

const COLORS = [
  '#1a2b5c','#2563eb','#0284c7','#0891b2','#059669',
  '#7c3aed','#9333ea','#be185d','#b45309','#dc2626',
];

function colorFromName(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length];
}

function useTrackSetup(participant, kind, elementRef) {
  const [active, setActive] = useState(false);
  const [muted,  setMuted]  = useState(true);

  useEffect(() => {
    if (!participant || !elementRef) return;

    let current = null;

    const update = () => {
      try {
        const pubs = participant.getTrackPublications();
        let found = null;
        pubs.forEach((pub) => {
          const isRightKind = pub.kind === kind;
          const isCamera = kind !== Track.Kind.Video || pub.source !== Track.Source.ScreenShare;
          if (isRightKind && isCamera) found = pub;
        });

        if (!found?.track) {
          if (current?.track) { try { current.track.detach(elementRef); } catch {} }
          current = null;
          setActive(false);
          setMuted(true);
          return;
        }

        if (found !== current) {
          if (current?.track) { try { current.track.detach(elementRef); } catch {} }
          try { found.track.attach(elementRef); current = found; } catch (e) { console.warn(e); }
        }
        setActive(!!found.track);
        setMuted(found.isMuted || !found.isSubscribed);
      } catch {}
    };

    update();
    const t1 = setTimeout(update, 500);
    const t2 = setTimeout(update, 1500);

    const events = ['trackSubscribed','trackUnsubscribed','trackMuted','trackUnmuted','trackPublished'];
    events.forEach(e => participant.on(e, update));

    return () => {
      clearTimeout(t1); clearTimeout(t2);
      if (current?.track && elementRef) { try { current.track.detach(elementRef); } catch {} }
      events.forEach(e => participant.off(e, update));
    };
  }, [participant, kind, elementRef]);

  return { active, muted };
}

// ── Modale plein écran ────────────────────────────────────────
function FullscreenModal({ participant, onClose }) {
  // Fermer avec Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="relative w-full h-full max-w-6xl max-h-[90vh] m-4 rounded-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <ParticipantTile participant={participant} isPinned />
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 flex items-center gap-2 px-3 py-2
                     bg-black/70 hover:bg-black/90 text-white rounded-xl text-sm
                     font-semibold backdrop-blur transition"
        >
          <X className="w-4 h-4" />
          Fermer
        </button>
      </div>
    </div>
  );
}

const ParticipantTile = memo(function ParticipantTile({ participant, isPinned = false }) {
  const { activeSpeaker, isAudioEnabled, isVideoEnabled, handRaisedUsers } = useMeeting();

  const [videoEl,    setVideoEl]    = useState(null);
  const [audioEl,    setAudioEl]    = useState(null);
  const [fullscreen, setFullscreen] = useState(false);

  const isLocal    = participant?.isLocal || false;
  const isSpeaking = activeSpeaker === participant?.identity;
  const handRaised = handRaisedUsers.has(participant?.identity);

  const name     = participant?.name || participant?.identity || 'Participant';
  const initials = name.slice(0, 2).toUpperCase();
  const bg       = colorFromName(name);

  const { active: hasVideo, muted: videoMuted } = useTrackSetup(participant, Track.Kind.Video, videoEl);
  const { muted: audioMuted } = useTrackSetup(!isLocal ? participant : null, Track.Kind.Audio, audioEl);

  const showVideo = isLocal ? isVideoEnabled : (hasVideo && !videoMuted);
  const showMuted = isLocal ? !isAudioEnabled : audioMuted;

  useEffect(() => {
    if (!audioEl || isLocal) return;
    audioEl.muted  = false;
    audioEl.volume = 1.0;
    audioEl.play().catch(() => {});
  }, [audioEl, isLocal]);

  if (!participant) return null;

  return (
    <>
      <div
        className={`relative w-full h-full rounded-2xl overflow-hidden meet-tile transition-all duration-200 group
          ${isSpeaking || isPinned ? 'speaking-ring' : ''}`}
      >
        {/* VIDEO */}
        <video
          ref={setVideoEl}
          autoPlay playsInline muted={isLocal}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300
            ${showVideo ? 'opacity-100' : 'opacity-0'}
            ${isLocal ? '-scale-x-100' : ''}`}
        />

        {/* AVATAR */}
        {!showVideo && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <div
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-lg"
              style={{ backgroundColor: bg }}
            >
              {initials}
            </div>
            <span className="text-white/60 text-xs">Caméra désactivée</span>
          </div>
        )}

        {/* AUDIO (remote only) */}
        {!isLocal && <audio ref={setAudioEl} autoPlay playsInline className="hidden" />}

        {/* TOP BADGES */}
        <div className="absolute top-2 left-2 flex flex-wrap gap-1.5 z-10">
          {isLocal && (
            <span className="px-2 py-0.5 text-xs rounded-full bg-accent text-white font-semibold shadow">
              Vous
            </span>
          )}
          {isSpeaking && (
            <span className="px-2 py-0.5 text-xs rounded-full bg-green-500 text-white font-semibold shadow">
              Parle
            </span>
          )}
          {handRaised && (
            <span className="px-2 py-0.5 text-xs rounded-full bg-yellow-400 text-black font-semibold flex items-center gap-1 shadow hand-raised">
              <Hand className="w-3 h-3" />
            </span>
          )}
        </div>

        {/* TOP RIGHT — statuts cam/micro */}
        <div className="absolute top-2 right-2 flex gap-1 z-10">
          {!showVideo && (
            <div className="p-1 rounded-full bg-black/60 backdrop-blur-sm">
              <VideoOff className="w-3 h-3 text-red-400" />
            </div>
          )}
          {showMuted && (
            <div className="p-1 rounded-full bg-black/60 backdrop-blur-sm">
              <MicOff className="w-3 h-3 text-red-400" />
            </div>
          )}
        </div>

        {/* BOUTON PLEIN ÉCRAN (apparaît au survol) */}
        <button
          onClick={() => setFullscreen(true)}
          className="absolute bottom-10 right-2 z-10 p-1.5 rounded-lg
                     bg-black/60 hover:bg-accent text-white backdrop-blur
                     opacity-0 group-hover:opacity-100 transition-all duration-150"
          title="Plein écran"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>

        {/* BOTTOM BAR */}
        <div className="absolute bottom-0 inset-x-0 px-3 py-2 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-10">
          <div className="flex items-center justify-between gap-2">
            <span className="text-white text-xs sm:text-sm font-medium truncate">{name}</span>
            <div className="flex items-center gap-1.5 shrink-0">
              {showMuted
                ? <MicOff  className="w-3 h-3 text-red-400" />
                : <Mic     className="w-3 h-3 text-green-400" />}
              {!showVideo
                ? <VideoOff className="w-3 h-3 text-red-400" />
                : <Video    className="w-3 h-3 text-green-400" />}
            </div>
          </div>
        </div>
      </div>

      {/* Modale plein écran */}
      {fullscreen && (
        <FullscreenModal
          participant={participant}
          onClose={() => setFullscreen(false)}
        />
      )}
    </>
  );
});

export default ParticipantTile;