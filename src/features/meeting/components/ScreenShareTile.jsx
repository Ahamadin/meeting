// src/features/meeting/components/ScreenShareTile.jsx
import { useEffect, useRef, useState } from 'react';
import { Monitor, Maximize2, Minimize2, Mic, MicOff } from 'lucide-react';
import { Track } from 'livekit-client';

export default function ScreenShareTile({ participant }) {
  const videoRef     = useRef(null);
  const audioRef     = useRef(null); // ← AUDIO du micro du partageur
  const containerRef = useRef(null);
  const [full, setFull]         = useState(false);
  const [isMuted, setIsMuted]   = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const name = participant?.name || participant?.identity || 'Participant';

  // ── Attacher la vidéo de partage d'écran ──────────────────
  useEffect(() => {
    if (!participant || !videoRef.current) return;
    let currentVideoPub = null;

    const updateVideo = () => {
      try {
        const pubs = participant.getTrackPublications();
        let found = null;
        pubs.forEach(pub => {
          if (
            pub.kind   === Track.Kind.Video &&
            pub.source === Track.Source.ScreenShare &&
            pub.track
          ) found = pub;
        });
        if (found && found !== currentVideoPub) {
          if (currentVideoPub?.track) {
            try { currentVideoPub.track.detach(videoRef.current); } catch {}
          }
          try { found.track.attach(videoRef.current); currentVideoPub = found; } catch {}
        } else if (!found && currentVideoPub) {
          try { currentVideoPub.track.detach(videoRef.current); } catch {}
          currentVideoPub = null;
        }
      } catch {}
    };

    updateVideo();
    const t = setTimeout(updateVideo, 500);
    const events = ['trackSubscribed', 'trackPublished', 'trackUnsubscribed'];
    events.forEach(e => participant.on(e, updateVideo));

    return () => {
      clearTimeout(t);
      if (currentVideoPub?.track && videoRef.current) {
        try { currentVideoPub.track.detach(videoRef.current); } catch {}
      }
      events.forEach(e => participant.off(e, updateVideo));
    };
  }, [participant]);

  // ── Attacher le MICRO du partageur (séparé de la vidéo) ───
  // C'est le bug principal : le micro doit rester actif pendant le partage
  useEffect(() => {
    if (!participant || participant.isLocal || !audioRef.current) return;
    let currentAudioPub = null;

    const updateAudio = () => {
      try {
        const pubs = participant.getTrackPublications();
        let found = null;
        pubs.forEach(pub => {
          if (
            pub.kind   === Track.Kind.Audio &&
            pub.source === Track.Source.Microphone &&
            pub.track  &&
            !pub.isMuted
          ) found = pub;
        });

        if (found && found !== currentAudioPub) {
          if (currentAudioPub?.track) {
            try { currentAudioPub.track.detach(audioRef.current); } catch {}
          }
          try {
            found.track.attach(audioRef.current);
            audioRef.current.muted  = false;
            audioRef.current.volume = 1.0;
            audioRef.current.play().catch(() => {});
            currentAudioPub = found;
          } catch {}
        }

        // Mettre à jour l'état muet
        setIsMuted(!found || found.isMuted);
      } catch {}
    };

    updateAudio();
    const t1 = setTimeout(updateAudio, 500);
    const t2 = setTimeout(updateAudio, 1500);

    const events = [
      'trackSubscribed', 'trackPublished',
      'trackMuted', 'trackUnmuted', 'trackUnsubscribed',
    ];
    events.forEach(e => participant.on(e, updateAudio));

    return () => {
      clearTimeout(t1); clearTimeout(t2);
      if (currentAudioPub?.track && audioRef.current) {
        try { currentAudioPub.track.detach(audioRef.current); } catch {}
      }
      events.forEach(e => participant.off(e, updateAudio));
    };
  }, [participant]);

  // S'assurer que l'audio joue bien (autoplay policy)
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.muted  = false;
    el.volume = 1.0;
    const tryPlay = () => el.play().catch(() => {});
    tryPlay();
    document.addEventListener('click', tryPlay, { once: true });
    return () => document.removeEventListener('click', tryPlay);
  }, []);

  // ── Plein écran ───────────────────────────────────────────
  const toggleFull = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  useEffect(() => {
    const handler = () => setFull(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full bg-black overflow-hidden"
      style={{ borderRadius: full ? 0 : '16px' }}
    >
      {/* Vidéo partage d'écran */}
      <video
        ref={videoRef}
        autoPlay playsInline
        className="w-full h-full object-contain"
      />

      {/* AUDIO MICRO du partageur — invisible mais actif */}
      <audio
        ref={audioRef}
        autoPlay playsInline
        style={{ display: 'none' }}
      />

      {/* Badge haut gauche */}
      <div style={{
        position: 'absolute', top: 12, left: 12,
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'rgba(0,0,0,0.72)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 10, padding: '6px 12px',
        backdropFilter: 'blur(8px)',
      }}>
        <Monitor style={{ width: 13, height: 13, color: '#60a5fa' }} />
        <span style={{ color: '#fff', fontSize: 12, fontWeight: 600 }}>
          {name} partage son écran
        </span>
        {/* Indicateur micro */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 20, height: 20, borderRadius: '50%',
          background: isMuted ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.2)',
          border: `1px solid ${isMuted ? 'rgba(239,68,68,0.4)' : 'rgba(34,197,94,0.4)'}`,
        }}>
          {isMuted
            ? <MicOff style={{ width: 10, height: 10, color: '#f87171' }} />
            : <Mic    style={{ width: 10, height: 10, color: '#4ade80' }} />}
        </div>
      </div>

      {/* Bouton plein écran */}
      <button
        onClick={toggleFull}
        style={{
          position: 'absolute', top: 12, right: 12,
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'rgba(0,0,0,0.65)',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 10, padding: '7px 12px',
          color: '#fff', fontSize: 12, fontWeight: 600,
          cursor: 'pointer', backdropFilter: 'blur(4px)',
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(37,99,235,0.7)'}
        onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.65)'}
      >
        {full
          ? <Minimize2 style={{ width: 13, height: 13 }} />
          : <Maximize2 style={{ width: 13, height: 13 }} />}
        {full ? 'Réduire' : 'Plein écran'}
      </button>
    </div>
  );
}