// src/features/meeting/components/ScreenShareView.jsx
import { useEffect, useRef, useState } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import { useMeeting } from '../context/MeetingContext';

export default function ScreenShareView({ screenTrack, sharer }) {
  const videoRef   = useRef(null);
  const [full, setFull] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (screenTrack && videoRef.current) {
      screenTrack.attach(videoRef.current);
    }
    return () => { if (screenTrack && videoRef.current) screenTrack.detach(videoRef.current); };
  }, [screenTrack]);

  const toggleFull = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.();
      setFull(true);
    } else {
      document.exitFullscreen?.();
      setFull(false);
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
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: '#000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <video
        ref={videoRef}
        autoPlay playsInline muted
        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
      />

      {/* Badge partageur */}
      {sharer && (
        <div style={{
          position: 'absolute', top: '12px', left: '12px',
          background: 'rgba(0,0,0,0.7)', borderRadius: '8px',
          padding: '4px 10px', backdropFilter: 'blur(4px)',
          color: '#fff', fontSize: '12px', fontWeight: '600',
        }}>
          📺 {sharer} partage son écran
        </div>
      )}

      {/* Bouton plein écran */}
      <button
        onClick={toggleFull}
        style={{
          position: 'absolute', top: '12px', right: '12px',
          background: 'rgba(0,0,0,0.65)', border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: '10px', padding: '8px 12px',
          cursor: 'pointer', color: '#fff',
          display: 'flex', alignItems: 'center', gap: '6px',
          fontSize: '12px', fontWeight: '600',
          backdropFilter: 'blur(4px)',
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(37,99,235,0.7)'}
        onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.65)'}
        title={full ? 'Quitter le plein écran' : 'Plein écran'}
      >
        {full
          ? <Minimize2 style={{ width: '14px', height: '14px' }} />
          : <Maximize2 style={{ width: '14px', height: '14px' }} />}
        {full ? 'Réduire' : 'Plein écran'}
      </button>
    </div>
  );
}
