// src/features/meeting/components/TopBar.jsx
import { Clock, Copy, Check } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useMeeting } from '../context/MeetingContext';

export default function TopBar({ meetingId }) {
  const { connectionState } = useMeeting();
  const [duration, setDuration] = useState(0);
  const [copied, setCopied] = useState(false);

  // Timer de durée d'appel
  useEffect(() => {
    if (connectionState !== 'connected' && connectionState !== 'active') {
      return;
    }

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setDuration(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [connectionState]);

  // Formater la durée (HH:MM:SS)
  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${minutes}:${String(secs).padStart(2, '0')}`;
  };

  // Copier l'ID de la réunion
  const copyMeetingId = async () => {
    try {
      await navigator.clipboard.writeText(meetingId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Erreur copie:', err);
    }
  };

  // Raccourcir l'ID pour l'affichage
  const displayId = meetingId.length > 30 
    ? `${meetingId.substring(0, 15)}...${meetingId.substring(meetingId.length - 10)}`
    : meetingId;

  return (
    <div className="bg-black/90 border-b border-white/10 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo et titre */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#1dbd3a] flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
              </svg>
            </div>
            <span className="text-white font-bold text-lg">MeetingPro</span>
          </div>

          {/* Séparateur */}
          <div className="w-px h-6 bg-white/20"></div>

          {/* ID de réunion */}
          <button
            onClick={copyMeetingId}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group"
            title="Copier l'ID de réunion"
          >
            <span className="text-sm text-white/70 group-hover:text-white/90 font-mono">
              {displayId}
            </span>
            {copied ? (
              <Check className="w-4 h-4 text-green-400" />
            ) : (
              <Copy className="w-4 h-4 text-white/50 group-hover:text-white/70" />
            )}
          </button>

          {copied && (
            <span className="text-xs text-green-400 font-medium animate-in fade-in slide-in-from-left-2">
              Copié !
            </span>
          )}
        </div>

        {/* Durée et statut */}
        <div className="flex items-center gap-4">
          {/* Statut de connexion */}
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              connectionState === 'connected' || connectionState === 'active'
                ? 'bg-green-400 animate-pulse'
                : connectionState === 'reconnecting'
                ? 'bg-yellow-400 animate-pulse'
                : 'bg-red-400'
            }`}></div>
            <span className="text-sm text-white/70">
              {connectionState === 'connected' || connectionState === 'active'
                ? 'Connecté'
                : connectionState === 'reconnecting'
                ? 'Reconnexion...'
                : 'Déconnecté'}
            </span>
          </div>

          {/* Durée */}
          {(connectionState === 'connected' || connectionState === 'active') && (
            <>
              <div className="w-px h-6 bg-white/20"></div>
              <div className="flex items-center gap-2 text-white/90">
                <Clock className="w-4 h-4" />
                <span className="text-sm font-mono font-medium">
                  {formatDuration(duration)}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}