// src/routes/Prejoin.jsx
// FIX MODE PUBLIC/PRIVÉ pour les participants :
// getMeetingInfo retourne maintenant le mode depuis le serveur.
// Priorité : param URL > API /info > localStorage > 'private' par défaut
// Ainsi même les participants sur un autre appareil voient le bon mode.

import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Mic, MicOff, Video, VideoOff } from 'lucide-react';
import { getMeetingInfo } from '../api/meetings';

export default function Prejoin() {
  const { id: roomCode } = useParams();
  const [sp]             = useSearchParams();
  const navigate         = useNavigate();
  const isHost           = sp.get('role') === 'host';
  const videoRef         = useRef(null);
  const streamRef        = useRef(null);

  const [name,    setName]    = useState(
    sp.get('name') ||
    sessionStorage.getItem('displayName') ||
    localStorage.getItem('displayName') ||
    ''
  );
  const [micOn,   setMicOn]   = useState(true);
  const [camOn,   setCamOn]   = useState(true);
  const [info,    setInfo]    = useState(null);
  const [err,     setErr]     = useState('');
  const [loading, setLoading] = useState(false);

  // ── Résolution du mode ────────────────────────────────────────────────────
  // On commence avec ce qu'on a en URL ou localStorage
  const modeFromUrl     = sp.get('mode');
  const modeFromStorage = localStorage.getItem(`room_mode_${roomCode}`);
  const [resolvedMode, setResolvedMode] = useState(modeFromUrl || modeFromStorage || 'private');

  // ── Chargement infos réunion (inclut le mode serveur) ─────────────────────
  useEffect(() => {
    getMeetingInfo(roomCode).then(data => {
      setInfo(data);
      // ✅ FIX : le mode vient du serveur — source de vérité pour les participants
      if (data?.mode) {
        setResolvedMode(data.mode);
        localStorage.setItem(`room_mode_${roomCode}`, data.mode);
      }
    }).catch(() => {});
  }, [roomCode]);

  useEffect(() => {
    let active = true;
    (async () => {
      setErr('');
      try {
        if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
        if (camOn || micOn) {
          const s = await navigator.mediaDevices.getUserMedia({ video: camOn, audio: micOn });
          if (!active) { s.getTracks().forEach(t => t.stop()); return; }
          streamRef.current = s;
          if (videoRef.current && camOn) { videoRef.current.srcObject = s; await videoRef.current.play().catch(() => {}); }
        } else {
          if (videoRef.current) videoRef.current.srcObject = null;
        }
      } catch {
        setErr('Impossible d\'accéder à la caméra/micro. Vérifiez les permissions.');
        setCamOn(false); setMicOn(false);
      }
    })();
    return () => {
      active = false;
      if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    };
  }, [camOn, micOn]);

  const enter = useCallback(async () => {
    const n = name.trim();
    if (!n) { setErr('Veuillez entrer votre nom.'); return; }
    setLoading(true);

    if (videoRef.current) videoRef.current.srcObject = null;
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    await new Promise(r => setTimeout(r, 400));

    localStorage.setItem(`room_mode_${roomCode}`, resolvedMode);

    const sessionKey  = `meet_session_${roomCode}`;
    const sessionData = {
      name: n,
      role: isHost ? 'host' : 'participant',
      micOn,
      camOn,
      mode: resolvedMode,
      ts: Date.now(),
    };
    sessionStorage.setItem(sessionKey, JSON.stringify(sessionData));
    localStorage.setItem(sessionKey, JSON.stringify(sessionData));
    sessionStorage.setItem('displayName', n);
    localStorage.setItem('displayName', n);

    navigate(`/meeting/${encodeURIComponent(roomCode)}`);
  }, [name, roomCode, isHost, micOn, camOn, navigate, resolvedMode]);

  const isPublic = resolvedMode === 'public';

  return (
    <div style={{ minHeight: '100vh', background: '#0a1428', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>

      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px' }}>
        <img src="/senegal.jpg" alt="Logo" style={{ width: '44px', height: '44px', borderRadius: '12px', objectFit: 'contain', background: '#fff', padding: '2px' }} />
        <span style={{ color: '#fff', fontWeight: '700', fontSize: '20px', letterSpacing: '-0.3px' }}>JokkoMeet</span>
      </div>

      <div style={{ width: '100%', maxWidth: '900px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', alignItems: 'stretch' }}>

        {/* Aperçu vidéo */}
        <div style={{ borderRadius: '20px', overflow: 'hidden', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, position: 'relative', minHeight: '260px', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <video ref={videoRef} playsInline muted autoPlay
              style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)', opacity: camOn ? 1 : 0, position: 'absolute', inset: 0 }} />
            {!camOn && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: '#1a2b5c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: '700', color: '#fff' }}>
                  {name?.[0]?.toUpperCase() || '?'}
                </div>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>Caméra désactivée</span>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', padding: '16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            {[
              { on: micOn, set: setMicOn, OnIcon: Mic,   OffIcon: MicOff },
              { on: camOn, set: setCamOn, OnIcon: Video, OffIcon: VideoOff },
            ].map(({ on, set, OnIcon, OffIcon }, i) => (
              <button key={i} onClick={() => set(v => !v)} style={{ width: '48px', height: '48px', borderRadius: '50%', border: 'none', cursor: 'pointer', background: on ? 'rgba(255,255,255,0.15)' : '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
                {on ? <OnIcon style={{ width: '20px', height: '20px', color: '#fff' }} /> : <OffIcon style={{ width: '20px', height: '20px', color: '#fff' }} />}
              </button>
            ))}
          </div>
        </div>

        {/* Formulaire */}
        <div style={{ borderRadius: '20px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', padding: '32px', display: 'flex', flexDirection: 'column', gap: '20px', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ color: '#fff', fontWeight: '700', fontSize: '22px', marginBottom: '4px' }}>
              {isHost ? 'Démarrer la réunion' : 'Rejoindre la réunion'}
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '13px' }}>
              {isHost ? 'Vous serez l\'hôte de cette réunion.'
                : info?.active ? `${info.participantCount} participant(s) connecté(s)` : 'En attente de l\'hôte…'}
            </p>
          </div>

          <div style={{ padding: '12px 16px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px', marginBottom: '2px' }}>Code de réunion</p>
            <p style={{ color: '#fff', fontFamily: 'monospace', fontWeight: '700', fontSize: '15px', letterSpacing: '1px' }}>{roomCode}</p>
          </div>

          <div>
            <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: '600', display: 'block', marginBottom: '6px' }}>Votre nom</label>
            <input style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s' }}
              placeholder="Entrez votre nom" value={name}
              onChange={e => { setName(e.target.value); setErr(''); }}
              onKeyDown={e => e.key === 'Enter' && enter()}
              autoFocus
              onFocus={e => e.target.style.borderColor = 'rgba(37,99,235,0.6)'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.15)'} />
            {err && <p style={{ color: '#f87171', fontSize: '12px', marginTop: '6px' }}>{err}</p>}
          </div>

          {/* Badge mode — mis à jour dynamiquement depuis l'API */}
          <div style={{ padding: '10px 14px', borderRadius: '12px', background: isPublic ? 'rgba(34,197,94,0.08)' : 'rgba(37,99,235,0.08)', border: `1px solid ${isPublic ? 'rgba(34,197,94,0.2)' : 'rgba(37,99,235,0.2)'}`, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px' }}>{isPublic ? '🌐' : '🔒'}</span>
            <div>
              <p style={{ color: isPublic ? '#4ade80' : '#60a5fa', fontSize: '12px', fontWeight: '700', margin: 0 }}>
                Réunion {isPublic ? 'publique' : 'privée'}
              </p>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px', margin: 0 }}>
                {isPublic ? 'Partage d\'écran libre pour tous' : 'Partage d\'écran avec permission de l\'hôte'}
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {[
              { on: micOn, label: micOn ? 'Micro actif' : 'Micro off', Icon: micOn ? Mic : MicOff },
              { on: camOn, label: camOn ? 'Caméra active' : 'Caméra off', Icon: camOn ? Video : VideoOff },
            ].map(({ on, label, Icon }, i) => (
              <div key={i} style={{ padding: '10px 12px', borderRadius: '12px', textAlign: 'center', background: on ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${on ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}` }}>
                <Icon style={{ width: '16px', height: '16px', color: on ? '#4ade80' : '#f87171', margin: '0 auto 4px' }} />
                <span style={{ fontSize: '11px', fontWeight: '600', color: on ? '#4ade80' : '#f87171' }}>{label}</span>
              </div>
            ))}
          </div>

          <button onClick={enter} disabled={loading} style={{ width: '100%', padding: '14px', borderRadius: '14px', border: 'none', background: loading ? 'rgba(37,99,235,0.5)' : '#2563eb', color: '#fff', fontSize: '15px', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer', transition: 'background 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            onMouseEnter={e => !loading && (e.currentTarget.style.background = '#1d4ed8')}
            onMouseLeave={e => !loading && (e.currentTarget.style.background = '#2563eb')}>
            {loading
              ? <div style={{ width: '20px', height: '20px', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              : isHost ? 'Démarrer la réunion' : 'Rejoindre maintenant'}
          </button>
          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: '11px' }}>
            En rejoignant, vous acceptez les conditions d'utilisation
          </p>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}