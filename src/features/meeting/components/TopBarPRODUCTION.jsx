// src/features/meeting/components/TopBar.jsx
import { useState, useEffect } from 'react';
import { Clock, Copy, Check, Shield, Circle } from 'lucide-react';
import { useMeeting } from '../context/MeetingContext';

export default function TopBar() {
  const { connectionState, roomName, participants, isRecording, isHost } = useMeeting();
  const [duration, setDuration] = useState(0);
  const [copied,   setCopied]   = useState(false);

  useEffect(() => {
    if (connectionState !== 'connected') return;
    const start = Date.now();
    const id = setInterval(() => setDuration(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(id);
  }, [connectionState]);

  const fmt = (s) => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    return h > 0
      ? `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
      : `${m}:${String(sec).padStart(2,'0')}`;
  };

  const copyLink = async () => {
    const url = `${location.origin}/join?room=${roomName}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const stateColor = {
    connected:    'bg-green-400',
    reconnecting: 'bg-yellow-400 animate-pulse',
    error:        'bg-red-500',
    idle:         'bg-white/30',
  }[connectionState] || 'bg-white/30';

  return (
    <header className="flex-shrink-0 h-14 bg-[#0a1428] border-b border-white/8 px-3 sm:px-4 flex items-center justify-between gap-3">
      {/* GAUCHE — logo + room */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center gap-2 shrink-0">
          <img
            src="/senegal.jpg"
            alt="Logo"
            style={{ width: '36px', height: '36px', borderRadius: '10px', objectFit: 'contain', background: '#fff', flexShrink: 0 }}
          />
          <span className="hidden sm:block text-white font-bold text-sm">Visio plus</span>
        </div>

        <div className="w-px h-5 bg-white/15 hidden sm:block" />

        {/* Room ID + copie */}
        <button
          onClick={copyLink}
          className="flex items-center gap-2 px-2 sm:px-3 py-1.5 rounded-xl bg-white/8 hover:bg-white/15 transition text-white/70 hover:text-white group"
          title="Copier le lien de réunion"
        >
          <span className="font-mono text-xs sm:text-sm truncate max-w-[100px] sm:max-w-[200px]">{roomName}</span>
          {copied
            ? <Check className="w-3.5 h-3.5 text-green-400 shrink-0" />
            : <Copy  className="w-3.5 h-3.5 shrink-0 opacity-60 group-hover:opacity-100" />}
        </button>
        {copied && <span className="text-xs text-green-400 hidden sm:block">Lien copié !</span>}
      </div>

      {/* DROITE — statut + durée */}
      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        {isRecording && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-500/20 border border-red-500/30">
            <Circle className="w-2 h-2 fill-red-500 text-red-500 animate-pulse" />
            <span className="text-red-400 text-xs font-semibold hidden sm:block">Enreg.</span>
          </div>
        )}

        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${stateColor}`} />
          <span className="text-xs text-white/50 hidden sm:block">
            {connectionState === 'connected'    ? 'Connecté'
            : connectionState === 'reconnecting' ? 'Reconnexion…'
            : connectionState === 'error'        ? 'Erreur'
            : 'En attente'}
          </span>
        </div>

        {connectionState === 'connected' && (
          <div className="flex items-center gap-1.5 text-white/70">
            <Clock className="w-3.5 h-3.5" />
            <span className="text-xs font-mono font-medium">{fmt(duration)}</span>
          </div>
        )}

        {isHost && (
          <span className="hidden sm:block px-2 py-0.5 text-xs rounded-full bg-accent/20 border border-accent/40 text-white font-semibold">
            Hôte
          </span>
        )}
      </div>
    </header>
  );
}
