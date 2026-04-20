// src/routes/HostReturn.jsx
// Page affichée quand l'hôte a quitté la réunion.
// Il peut choisir de revenir (avec ses droits hôte restaurés) ou
// de rester déconnecté.
//
// Navigation vers cette page :
//   navigate(`/host-return/${roomName}?name=${encodeURIComponent(displayName)}`)
//
// Depuis ControlsBar.jsx, remplacer la redirection après leaveCall par :
//   if (isHost) {
//     navigate(`/host-return/${roomName}?name=${encodeURIComponent(displayName)}`);
//   } else {
//     navigate('/');
//   }

import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { LogIn, Home, Shield, Users, Clock } from 'lucide-react';
import { getMeetingInfo } from '../api/meetings';

export default function HostReturn() {
  const { roomName }  = useParams();
  const [sp]          = useSearchParams();
  const navigate      = useNavigate();
  const name          = sp.get('name') || localStorage.getItem('displayName') || '';

  const [info,      setInfo]      = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [returning, setReturning] = useState(false);

  // Rafraîchir les infos de la room toutes les 5s
  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const data = await getMeetingInfo(roomName);
        if (active) setInfo(data);
      } catch {
        if (active) setInfo(null);
      } finally {
        if (active) setLoading(false);
      }
    };
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => { active = false; clearInterval(interval); };
  }, [roomName]);

  const handleReturn = async () => {
    if (!name.trim()) return;
    setReturning(true);

    // Stocker la session avec role 'host' → Meeting.jsx appellera startMeeting
    // joinMeeting côté serveur reconnaîtra l'identity et retournera role:'host'
    // Note : on stocke role='participant' intentionnellement car le serveur
    // va détecter via savedIdentity que c'est l'hôte et retourner role:'host'.
    // On laisse le serveur décider.
    const sessionKey  = `meet_session_${roomName}`;
    const mode = localStorage.getItem(`room_mode_${roomName}`) || 'private';
    const sessionData = {
      name: name.trim(),
      role: 'participant', // Le serveur le corrigera en 'host' si savedIdentity correspond
      micOn: true,
      camOn: true,
      mode,
      ts: Date.now(),
    };
    sessionStorage.setItem(sessionKey, JSON.stringify(sessionData));
    localStorage.setItem(sessionKey, JSON.stringify(sessionData));
    localStorage.setItem('displayName', name.trim());

    navigate(`/meeting/${encodeURIComponent(roomName)}`);
  };

  const handleGoHome = () => navigate('/');

  return (
    <div style={{ minHeight: '100vh', background: '#0a1428', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>

      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '48px' }}>
        <img src="/senegal.jpg" alt="Logo" style={{ width: '44px', height: '44px', borderRadius: '12px', objectFit: 'contain', background: '#fff', padding: '2px' }} />
        <span style={{ color: '#fff', fontWeight: '700', fontSize: '20px' }}>JokkoMeet</span>
      </div>

      <div style={{ width: '100%', maxWidth: '440px' }}>

        {/* Card principale */}
        <div style={{ borderRadius: '20px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', padding: '36px', textAlign: 'center' }}>

          {/* Icône */}
          <div style={{ width: '64px', height: '64px', borderRadius: '18px', background: 'rgba(37,99,235,0.15)', border: '1.5px solid rgba(37,99,235,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <Shield style={{ width: '28px', height: '28px', color: '#60a5fa' }} />
          </div>

          <h1 style={{ color: '#fff', fontSize: '22px', fontWeight: '800', marginBottom: '8px' }}>
            Vous avez quitté la réunion
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '14px', lineHeight: '1.6', marginBottom: '28px' }}>
            En tant qu'hôte, vos droits ont été temporairement transférés.<br />
            Rejoignez pour les récupérer automatiquement.
          </p>

          {/* Infos room */}
          <div style={{ borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', padding: '16px', marginBottom: '24px', textAlign: 'left' }}>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '8px' }}>
              Réunion
            </p>
            <p style={{ color: '#fff', fontFamily: 'monospace', fontWeight: '700', fontSize: '16px', letterSpacing: '1px', marginBottom: '12px' }}>
              {roomName}
            </p>

            {loading ? (
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>Chargement…</p>
            ) : info ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: info.active ? '#22c55e' : '#ef4444' }} />
                  <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px' }}>
                    {info.active ? 'Réunion en cours' : 'En attente'}
                  </span>
                </div>
                {info.active && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Users style={{ width: '13px', height: '13px', color: 'rgba(255,255,255,0.4)' }} />
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>
                      {info.participantCount} participant(s)
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>Réunion introuvable</p>
            )}
          </div>

          {/* Badge hôte */}
          <div style={{ borderRadius: '10px', background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.2)', padding: '10px 14px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield style={{ width: '16px', height: '16px', color: '#60a5fa', flexShrink: 0 }} />
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', margin: 0, textAlign: 'left' }}>
              <span style={{ color: '#60a5fa', fontWeight: '700' }}>Bonjour {name} —</span> vos droits d'hôte seront restaurés automatiquement à votre retour.
            </p>
          </div>

          {/* Boutons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              onClick={handleReturn}
              disabled={returning}
              style={{ width: '100%', padding: '14px', borderRadius: '14px', border: 'none', background: returning ? 'rgba(37,99,235,0.5)' : '#2563eb', color: '#fff', fontSize: '15px', fontWeight: '700', cursor: returning ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'background 0.15s' }}
              onMouseEnter={e => !returning && (e.currentTarget.style.background = '#1d4ed8')}
              onMouseLeave={e => !returning && (e.currentTarget.style.background = '#2563eb')}
            >
              {returning
                ? <div style={{ width: '20px', height: '20px', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                : <LogIn style={{ width: '18px', height: '18px' }} />}
              {returning ? 'Connexion…' : 'Reprendre ma place d\'hôte'}
            </button>

            <button
              onClick={() => navigate(`/prejoin/${roomName}?role=participant&name=${encodeURIComponent(name)}`)}
              style={{ width: '100%', padding: '12px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: 'rgba(255,255,255,0.6)', fontSize: '14px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}
            >
              <Users style={{ width: '16px', height: '16px' }} />
              Rejoindre en tant que participant
            </button>

            <button
              onClick={handleGoHome}
              style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px', background: 'none', border: 'none', cursor: 'pointer', padding: '8px', transition: 'color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.6)'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}
            >
              ← Retour à l'accueil
            </button>
          </div>
        </div>

        {/* Note */}
        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: '11px', marginTop: '16px' }}>
          Les participants restent connectés pendant votre absence
        </p>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}