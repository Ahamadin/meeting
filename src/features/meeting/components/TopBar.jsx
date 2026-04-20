// src/features/meeting/components/TopBar.jsx
import { useState, useEffect } from 'react';
import { Clock, Copy, Check, ShieldCheck, Crown, User } from 'lucide-react';
import { useMeeting } from '../context/MeetingContext';
import { useTimer } from '../hooks/useTimer';

function SecurityInfoModal({ onClose }) {
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.80)', backdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '16px', animation: 'tbFadeIn 0.18s ease',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#0b1530', borderRadius: 22, width: '100%', maxWidth: 460,
        border: '1px solid rgba(34,197,94,0.22)',
        boxShadow: '0 28px 80px rgba(0,0,0,0.7)',
        animation: 'tbSlideUp 0.22s cubic-bezier(0.34,1.4,0.64,1)',
        overflow: 'hidden', maxHeight: '90vh', overflowY: 'auto',
      }}>
        <div style={{
          background: 'linear-gradient(135deg, rgba(34,197,94,0.14), rgba(16,185,129,0.08))',
          borderBottom: '1px solid rgba(34,197,94,0.15)',
          padding: '20px 20px 16px',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            background: 'rgba(34,197,94,0.14)', border: '1.5px solid rgba(34,197,94,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <ShieldCheck style={{ width: 22, height: 22, color: '#4ade80' }} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
              <h2 style={{ color: '#fff', fontSize: 14, fontWeight: 800, margin: 0 }}>Communications sécurisées</h2>
              <span style={{ padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 800, background: 'rgba(34,197,94,0.2)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.35)' }}>● ACTIF</span>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: 11, margin: 0 }}>Chiffrement DTLS-SRTP natif WebRTC</p>
          </div>
        </div>
        <div style={{ padding: '18px 20px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, marginBottom: 14, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.22)' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: '#4ade80', boxShadow: '0 0 8px #4ade80', animation: 'e2eePulse 2s ease-in-out infinite' }} />
            <div>
              <p style={{ color: '#4ade80', fontSize: 12, fontWeight: 700, margin: '0 0 1px' }}>Vos communications sont chiffrées</p>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, margin: 0 }}>DTLS 1.3 + SRTP — standard WebRTC natif</p>
            </div>
          </div>
          {[
            { icon: '🔒', title: 'DTLS 1.3', desc: 'Chaque session WebRTC est protégée par DTLS — échange de clés sécurisé' },
            { icon: '🔐', title: 'SRTP', desc: 'Chaque flux audio/vidéo est chiffré — personne ne peut intercepter vos médias' },
            { icon: '⚡', title: 'Automatique', desc: "Actif dès la connexion, sans aucune action requise" },
          ].map(({ icon, title, desc }) => (
            <div key={title} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>{icon}</span>
              <div>
                <p style={{ color: 'rgba(255,255,255,0.72)', fontSize: 12, fontWeight: 600, margin: '0 0 2px' }}>{title}</p>
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, lineHeight: 1.6, margin: 0 }}>{desc}</p>
              </div>
            </div>
          ))}
          <button onClick={onClose} style={{ width: '100%', padding: '10px', borderRadius: 10, border: 'none', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginTop: '16px' }}>
            Fermer
          </button>
        </div>
      </div>
      <style>{`
        @keyframes tbFadeIn { from { opacity:0 } to { opacity:1 } }
        @keyframes tbSlideUp { from { transform:translateY(12px) scale(0.97); opacity:0 } to { transform:none; opacity:1 } }
        @keyframes e2eePulse { 0%,100% { opacity:1 } 50% { opacity:0.45 } }
      `}</style>
    </div>
  );
}

export default function TopBar() {
  const { roomName, connectionState, isHost } = useMeeting();
  const elapsed = useTimer();
  const [copied, setCopied] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 480;
  const isTablet = windowWidth >= 480 && windowWidth < 768;

  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(roomName); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  };

  const connColor = connectionState === 'connected' ? '#4ade80' : connectionState === 'reconnecting' ? '#f59e0b' : '#f87171';

  return (
    <>
      <div style={{
        flexShrink: 0, height: isMobile ? 46 : 52,
        background: '#080f2a',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: isMobile ? '0 10px' : '0 16px', gap: isMobile ? 6 : 12,
      }}>
        {/* GAUCHE */}
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 10, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <img src="/senegal.jpg" alt="Logo" style={{ width: isMobile ? 24 : 28, height: isMobile ? 24 : 28, borderRadius: 7, objectFit: 'contain', background: '#fff', flexShrink: 0 }} />
            {!isMobile && <span style={{ color: '#fff', fontWeight: 800, fontSize: isMobile ? 12 : 14 }}>JokkoMeet</span>}
          </div>
          {!isMobile && <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />}
          <button onClick={handleCopy} style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 7, padding: isMobile ? '3px 7px' : '4px 10px', cursor: 'pointer',
            color: 'rgba(255,255,255,0.7)', fontSize: isMobile ? 10 : 12,
            fontFamily: 'monospace', fontWeight: 600, whiteSpace: 'nowrap',
            maxWidth: isMobile ? '90px' : '160px', overflow: 'hidden', textOverflow: 'ellipsis',
          }} title="Copier le code">
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{roomName}</span>
            {copied ? <Check style={{ width: 10, height: 10, color: '#4ade80', flexShrink: 0 }} /> : <Copy style={{ width: 10, height: 10, flexShrink: 0 }} />}
          </button>
        </div>

        {/* CENTRE — badge sécurité */}
        <button onClick={() => setShowModal(true)} title="Voir les détails de sécurité" style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: isMobile ? '4px 8px' : '5px 12px', borderRadius: 9, cursor: 'pointer',
          border: '1px solid rgba(34,197,94,0.40)', background: 'rgba(34,197,94,0.10)',
          transition: 'all 0.2s', flexShrink: 0,
        }}>
          <ShieldCheck style={{ width: isMobile ? 11 : 13, height: isMobile ? 11 : 13, color: '#4ade80' }} />
          {!isMobile && <span style={{ fontSize: 11, fontWeight: 700, color: '#4ade80' }}>Sécurisé</span>}
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 6px #4ade80', animation: 'e2eeDot 2s ease-in-out infinite' }} />
        </button>

        {/* DROITE */}
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 10, flexShrink: 0 }}>
          {/* Statut connexion */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: connColor, boxShadow: `0 0 6px ${connColor}`, flexShrink: 0 }} />
            {!isMobile && (
              <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: 600 }}>
                {connectionState === 'connected' ? 'Connecté' : connectionState === 'reconnecting' ? 'Reconnexion…' : 'Déco.'}
              </span>
            )}
          </div>

          {/* Timer */}
          {!isMobile && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'rgba(255,255,255,0.4)' }}>
              <Clock style={{ width: 11, height: 11 }} />
              <span style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{elapsed}</span>
            </div>
          )}

          {/* Badge rôle */}
          {isHost ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: isMobile ? '2px 7px' : '3px 10px', borderRadius: 9999, background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: '#fff', fontSize: isMobile ? 10 : 11, fontWeight: 700 }}>
              <Crown style={{ width: isMobile ? 9 : 10, height: isMobile ? 9 : 10 }} />
              {!isMobile && 'Hôte'}
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: isMobile ? '2px 7px' : '3px 10px', borderRadius: 9999, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.55)', fontSize: isMobile ? 10 : 11, fontWeight: 600 }}>
              <User style={{ width: isMobile ? 9 : 10, height: isMobile ? 9 : 10 }} />
              {!isMobile && 'Participant'}
            </div>
          )}
        </div>
      </div>

      {showModal && <SecurityInfoModal onClose={() => setShowModal(false)} />}

      <style>{`
        @keyframes e2eeDot {
          0%,100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.7); }
        }
      `}</style>
    </>
  );
}