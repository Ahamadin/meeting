// src/features/meeting/components/WaitingRoom.jsx
// Écran affiché au participant pendant qu'il attend d'être admis par l'hôte.
// Remplace l'écran de réunion tant que l'hôte n'a pas validé.
import { useEffect, useRef, useState } from 'react';
import { Users, Clock, ShieldCheck, Wifi } from 'lucide-react';

export default function WaitingRoom({ displayName, roomName, onAdmitted, onRejected }) {
  const [elapsed, setElapsed] = useState(0);
  const [dotIdx,  setDotIdx]  = useState(0);
  const startRef = useRef(Date.now());

  // Timer d'attente
  useEffect(() => {
    const t = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
      setDotIdx(p => (p + 1) % 3);
    }, 800);
    return () => clearInterval(t);
  }, []);

  const fmtElapsed = () => {
    const m = Math.floor(elapsed / 60);
    const s = elapsed % 60;
    return m > 0 ? `${m}min ${s}s` : `${s}s`;
  };

  const dots = ['', '.', '..'][dotIdx];

  const initials = (displayName || '?').slice(0, 2).toUpperCase();

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 80,
      background: 'linear-gradient(160deg, #060d20 0%, #0d1a3a 50%, #060d20 100%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '24px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>

      {/* Logo + Titre */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '48px' }}>
        <img src="/senegal.jpg" alt="Logo"
          style={{ width: '40px', height: '40px', borderRadius: '10px', objectFit: 'contain', background: '#fff' }} />
        <span style={{ color: '#fff', fontWeight: '800', fontSize: '20px' }}>JokkoMeet</span>
      </div>

      {/* Carte principale */}
      <div style={{
        background: 'rgba(13,26,58,0.9)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '24px',
        padding: '40px 36px',
        width: '100%', maxWidth: '440px',
        textAlign: 'center',
        boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
        backdropFilter: 'blur(20px)',
      }}>

        {/* Avatar animé */}
        <div style={{ position: 'relative', display: 'inline-block', marginBottom: '28px' }}>
          {/* Cercle pulsant externe */}
          <div style={{
            position: 'absolute', inset: '-14px',
            borderRadius: '50%',
            border: '2px solid rgba(37,99,235,0.25)',
            animation: 'wrPulseOuter 2.4s ease-in-out infinite',
          }} />
          {/* Cercle pulsant moyen */}
          <div style={{
            position: 'absolute', inset: '-7px',
            borderRadius: '50%',
            border: '2px solid rgba(37,99,235,0.4)',
            animation: 'wrPulseOuter 2.4s ease-in-out infinite 0.4s',
          }} />
          {/* Avatar */}
          <div style={{
            width: '80px', height: '80px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #1d4ed8, #2563eb)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '28px', fontWeight: '800', color: '#fff',
            border: '3px solid rgba(37,99,235,0.5)',
            boxShadow: '0 0 30px rgba(37,99,235,0.3)',
          }}>
            {initials}
          </div>
        </div>

        <h2 style={{ color: '#fff', fontSize: '22px', fontWeight: '700', marginBottom: '8px' }}>
          Salle d'attente
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', marginBottom: '28px', lineHeight: '1.6' }}>
          Votre demande d'accès à la réunion<br />
          <span style={{ color: '#60a5fa', fontFamily: 'monospace', fontWeight: '600' }}>{roomName}</span><br />
          a été envoyée à l'hôte.
        </p>

        {/* Statut animé */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
          padding: '14px 20px', borderRadius: '14px',
          background: 'rgba(37,99,235,0.12)',
          border: '1px solid rgba(37,99,235,0.3)',
          marginBottom: '28px',
        }}>
          <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                width: '7px', height: '7px', borderRadius: '50%',
                background: i === dotIdx ? '#60a5fa' : 'rgba(96,165,250,0.3)',
                transition: 'all 0.3s',
                transform: i === dotIdx ? 'scale(1.3)' : 'scale(1)',
              }} />
            ))}
          </div>
          <span style={{ color: '#93c5fd', fontSize: '14px', fontWeight: '500' }}>
            En attente d'admission{dots}
          </span>
        </div>

        {/* Informations */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
          {[
            { icon: Users, label: 'Votre nom', value: displayName?.split(' ')[0] || '—' },
            { icon: Clock, label: 'Attente', value: fmtElapsed() },
            { icon: ShieldCheck, label: 'Sécurisé', value: 'E2EE actif' },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} style={{
              padding: '12px 8px', borderRadius: '12px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.07)',
            }}>
              <Icon style={{ width: '14px', height: '14px', color: 'rgba(255,255,255,0.4)', margin: '0 auto 4px', display: 'block' }} />
              <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '9px', fontWeight: '700',
                textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '3px' }}>{label}</div>
              <div style={{ color: '#fff', fontSize: '11px', fontWeight: '600',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Note bas */}
        <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '11px', marginTop: '20px', lineHeight: '1.6' }}>
          L'hôte va vous admettre sous peu.<br />
          Merci de patienter.
        </p>
      </div>

      <style>{`
        @keyframes wrPulseOuter {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50%       { opacity: 0.2; transform: scale(1.05); }
        }
      `}</style>
    </div>
  );
}