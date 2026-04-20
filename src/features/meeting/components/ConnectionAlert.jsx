// src/features/meeting/components/ConnectionAlert.jsx
//
// Gestion intelligente de la connexion — JAMAIS de déconnexion forcée.
//
// Fonctionnalités :
//   • Détecte reconnecting / disconnected depuis MeetingContext
//   • Affiche un bandeau discret en haut de page (ne bloque pas l'UI)
//   • Reconnexion automatique LiveKit avec backoff exponentiel (2s → 4s → 8s → 16s → max 30s)
//   • Après 3 tentatives échouées → propose "Actualiser la page"
//   • Surveillance de la qualité réseau (navigator.onLine + Network Information API)
//   • Bandeau vert "Reconnecté !" pendant 4s puis disparaît
//   • Bouton X pour masquer pendant la reconnexion automatique
//   • NE déconnecte PAS, NE redirige PAS, NE touche PAS à la logique métier

import { useEffect, useState, useRef, useCallback } from 'react';
import { Wifi, WifiOff, RefreshCw, X, Signal, AlertTriangle } from 'lucide-react';
import { useMeeting } from '../context/MeetingContext';

// ── Couleurs du design existant (navy + blanc + signaux) ──────
// Respecte la palette du projet : pas de couleurs bizarres
const C = {
  navy:    '#0a1428',
  navyL:   '#111e42',
  white:   '#ffffff',
  // États réseau — couleurs sémantiques standard, discrètes
  ok:      { bg: 'rgba(15,40,25,0.97)',  border: 'rgba(34,197,94,0.45)',  text: '#4ade80', icon: '#4ade80'  },
  warn:    { bg: 'rgba(40,28,5,0.97)',   border: 'rgba(251,191,36,0.45)', text: '#fbbf24', icon: '#fbbf24'  },
  bad:     { bg: 'rgba(40,10,10,0.97)',  border: 'rgba(239,68,68,0.45)',  text: '#f87171', icon: '#f87171'  },
  info:    { bg: 'rgba(10,20,50,0.97)',  border: 'rgba(96,165,250,0.45)', text: '#60a5fa', icon: '#60a5fa'  },
};

// ── Qualité réseau via Network Information API ────────────────
function getNetworkQuality() {
  try {
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!conn) return 'unknown';
    const { effectiveType, downlink, rtt } = conn;
    if (rtt > 500 || downlink < 0.5) return 'poor';
    if (effectiveType === '2g' || rtt > 300) return 'weak';
    if (effectiveType === '3g' || downlink < 2)  return 'moderate';
    return 'good';
  } catch { return 'unknown'; }
}

function getNetworkLabel(q) {
  return { poor: 'Faible', weak: 'Médiocre', moderate: 'Moyenne', good: 'Bonne', unknown: '' }[q] || '';
}

// ── Hook : surveillance réseau ────────────────────────────────
function useNetworkMonitor() {
  const [online,  setOnline]  = useState(navigator.onLine);
  const [quality, setQuality] = useState(getNetworkQuality());

  useEffect(() => {
    const onOnline  = () => setOnline(true);
    const onOffline = () => setOnline(false);
    const onChange  = () => setQuality(getNetworkQuality());

    window.addEventListener('online',  onOnline);
    window.addEventListener('offline', onOffline);

    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    conn?.addEventListener('change', onChange);

    return () => {
      window.removeEventListener('online',  onOnline);
      window.removeEventListener('offline', onOffline);
      conn?.removeEventListener('change', onChange);
    };
  }, []);

  return { online, quality };
}

// ── Bandeau principal ─────────────────────────────────────────
export default function ConnectionAlert() {
  const { connectionState, room } = useMeeting();
  const { online, quality }       = useNetworkMonitor();

  // État interne
  const [phase,      setPhase]      = useState('idle');
  // idle | reconnecting | failed | recovered | offline
  const [attempts,   setAttempts]   = useState(0);
  const [elapsed,    setElapsed]    = useState(0);
  const [dismissed,  setDismissed]  = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showDetail, setShowDetail] = useState(false);

  // Refs
  const prevStateRef  = useRef('idle');
  const lostAtRef     = useRef(null);
  const timerRef      = useRef(null);
  const retryTimerRef = useRef(null);
  const recoveredTRef = useRef(null);
  const attemptsRef   = useRef(0);

  // ── Nettoyage ─────────────────────────────────────────────
  const clearAll = useCallback(() => {
    clearInterval(timerRef.current);
    clearTimeout(retryTimerRef.current);
    clearTimeout(recoveredTRef.current);
  }, []);

  useEffect(() => clearAll, [clearAll]);

  // ── Backoff exponentiel : 2 → 4 → 8 → 16 → 30s max ──────
  const backoffDelay = useCallback((n) =>
    Math.min(30000, 2000 * Math.pow(2, n - 1)), []);

  // ── Tentative de reconnexion LiveKit ──────────────────────
  // On demande à LiveKit de se reconnecter — on ne déconnecte PAS.
  const attemptReconnect = useCallback(async () => {
    if (!room) return;
    try {
      // LiveKit expose reconnect() depuis v1.6 — on l'appelle silencieusement
      if (typeof room.reconnect === 'function') {
        await room.reconnect();
      }
      // Sinon LiveKit gère lui-même via son ReconnectPolicy interne
    } catch {
      // Échec silencieux — l'UI gère déjà l'état via connectionState
    }
  }, [room]);

  // ── Réaction aux changements de connectionState ───────────
  useEffect(() => {
    const prev = prevStateRef.current;
    prevStateRef.current = connectionState;

    // Connexion rétablie
    if (connectionState === 'connected' &&
        (prev === 'reconnecting' || prev === 'disconnected' || phase === 'reconnecting' || phase === 'failed')) {
      clearAll();
      attemptsRef.current = 0;
      setAttempts(0);
      setElapsed(0);
      setDismissed(false);
      setPhase('recovered');
      // Masquer après 4s
      recoveredTRef.current = setTimeout(() => setPhase('idle'), 4000);
      return;
    }

    // Connexion perdue (première fois depuis 'connected')
    if ((connectionState === 'reconnecting' || connectionState === 'disconnected') &&
        prev === 'connected' && phase === 'idle') {
      clearAll();
      lostAtRef.current = Date.now();
      attemptsRef.current = 0;
      setAttempts(0);
      setElapsed(0);
      setDismissed(false);
      setPhase('reconnecting');
    }
  }, [connectionState, phase, clearAll]);

  // ── Boucle de tentatives avec backoff ─────────────────────
  useEffect(() => {
    if (phase !== 'reconnecting') return;

    // Compteur de temps écoulé
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      if (lostAtRef.current) setElapsed(Math.floor((Date.now() - lostAtRef.current) / 1000));
    }, 1000);

    // Planifier la prochaine tentative
    const n = attemptsRef.current + 1;
    const delay = backoffDelay(n);

    retryTimerRef.current = setTimeout(async () => {
      if (phase !== 'reconnecting') return; // état changé entre-temps

      attemptsRef.current = n;
      setAttempts(n);

      await attemptReconnect();

      // Si toujours pas reconnecté après 4 tentatives → phase 'failed'
      if (attemptsRef.current >= 4 && connectionState !== 'connected') {
        clearInterval(timerRef.current);
        setPhase('failed');
      }
    }, delay);

    return () => {
      clearInterval(timerRef.current);
      clearTimeout(retryTimerRef.current);
    };
  }, [phase, backoffDelay, attemptReconnect, connectionState]);

  // ── Déconnexion complète sans récupération ────────────────
  // Si LiveKit émet 'disconnected' (pas 'reconnecting'), on passe directement
  // à 'failed' après un court délai pour laisser une chance à l'auto-reconnect
  useEffect(() => {
    if (connectionState === 'disconnected' && phase === 'reconnecting') {
      const t = setTimeout(() => {
        if (connectionState !== 'connected') setPhase('failed');
      }, 8000); // 8s de grâce avant de passer à 'failed'
      return () => clearTimeout(t);
    }
  }, [connectionState, phase]);

  // ── Hors-ligne navigateur ─────────────────────────────────
  useEffect(() => {
    if (!online && phase === 'idle') {
      setPhase('offline');
      setDismissed(false);
    }
    if (online && phase === 'offline') {
      setPhase('idle');
    }
  }, [online, phase]);

  // ── Actualiser la page ────────────────────────────────────
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => window.location.reload(), 250);
  }, []);

  // ── Réessayer maintenant ───────────────────────────────────
  const handleRetryNow = useCallback(async () => {
    if (phase !== 'failed') return;
    attemptsRef.current = 0;
    setAttempts(0);
    lostAtRef.current = Date.now();
    setElapsed(0);
    setPhase('reconnecting');
    await attemptReconnect();
  }, [phase, attemptReconnect]);

  // ── Masquer si rien à afficher ────────────────────────────
  if (phase === 'idle') return null;
  if (dismissed && phase === 'reconnecting') return null;

  // ── Configuration visuelle selon la phase ─────────────────
  const cfgMap = {
    reconnecting: {
      palette:     C.warn,
      icon:        RefreshCw,
      spin:        true,
      title:       'Reconnexion en cours…',
      sub:         attempts === 0
        ? 'Tentative de reconnexion automatique…'
        : `Tentative ${attempts} — ${elapsed}s écoulées — Prochaine dans ${Math.round(backoffDelay(attempts + 1) / 1000)}s`,
      showRefresh: false,
      showRetry:   false,
      showDismiss: true,
    },
    failed: {
      palette:     C.bad,
      icon:        WifiOff,
      spin:        false,
      title:       'Connexion perdue',
      sub:         `Impossible de se reconnecter après ${attempts} tentative${attempts > 1 ? 's' : ''} (${elapsed}s). Actualisez la page pour rejoindre sans perdre votre session.`,
      showRefresh: true,
      showRetry:   true,
      showDismiss: false,
    },
    recovered: {
      palette:     C.ok,
      icon:        Wifi,
      spin:        false,
      title:       'Connexion rétablie',
      sub:         'Vous êtes de nouveau connecté à la réunion.',
      showRefresh: false,
      showRetry:   false,
      showDismiss: false,
    },
    offline: {
      palette:     C.bad,
      icon:        WifiOff,
      spin:        false,
      title:       'Pas de connexion internet',
      sub:         'Vérifiez votre réseau Wi-Fi ou mobile. La réunion reprendra automatiquement dès le retour de la connexion.',
      showRefresh: false,
      showRetry:   false,
      showDismiss: true,
    },
  };

  const cfg = cfgMap[phase];
  if (!cfg) return null;

  const { palette, icon: Icon, spin, title, sub, showRefresh, showRetry, showDismiss } = cfg;

  // Indicateur qualité réseau (seulement si pas optimal et pas en mode recovered)
  const showQuality = phase !== 'recovered' && quality === 'poor' || quality === 'weak';

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0,
      zIndex: 9999,
      display: 'flex',
      justifyContent: 'center',
      padding: '10px 16px',
      pointerEvents: 'none',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '11px 16px',
        borderRadius: '14px',
        background: palette.bg,
        border: `1px solid ${palette.border}`,
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.3)',
        maxWidth: '620px',
        width: '100%',
        pointerEvents: 'auto',
        animation: 'caIn 0.3s cubic-bezier(0.22,1,0.36,1)',
      }}>

        {/* Icône */}
        <div style={{
          width: '34px', height: '34px',
          borderRadius: '9px',
          flexShrink: 0,
          background: `${palette.icon}18`,
          border: `1px solid ${palette.icon}35`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon style={{
            width: '15px', height: '15px',
            color: palette.icon,
            animation: spin ? 'caRotate 1s linear infinite' : 'none',
          }} />
        </div>

        {/* Texte */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <p style={{
              color: C.white,
              fontSize: '13px',
              fontWeight: '700',
              margin: 0,
              fontFamily: 'DM Sans, system-ui, sans-serif',
            }}>
              {title}
            </p>
            {/* Badge qualité réseau */}
            {showQuality && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                padding: '1px 7px',
                borderRadius: '99px',
                background: 'rgba(251,191,36,0.15)',
                border: '1px solid rgba(251,191,36,0.3)',
                fontSize: '10px', fontWeight: '700',
                color: '#fbbf24',
              }}>
                <Signal style={{ width: '9px', height: '9px' }} />
                Signal {getNetworkLabel(quality)}
              </span>
            )}
          </div>
          <p style={{
            color: 'rgba(255,255,255,0.55)',
            fontSize: '11px',
            margin: '2px 0 0',
            lineHeight: '1.55',
            fontFamily: 'DM Sans, system-ui, sans-serif',
          }}>
            {sub}
          </p>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '7px', flexShrink: 0, alignItems: 'center' }}>

          {/* Réessayer maintenant */}
          {showRetry && (
            <button
              onClick={handleRetryNow}
              style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                padding: '7px 12px',
                borderRadius: '9px',
                border: `1px solid ${palette.border}`,
                background: 'rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.8)',
                fontSize: '12px', fontWeight: '600',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                fontFamily: 'DM Sans, system-ui, sans-serif',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
            >
              <RefreshCw style={{ width: '11px', height: '11px' }} />
              Réessayer
            </button>
          )}

          {/* Actualiser la page */}
          {showRefresh && (
            <button
              onClick={handleRefresh}
              style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                padding: '7px 14px',
                borderRadius: '9px',
                border: 'none',
                background: C.white,
                color: '#0a1428',
                fontSize: '12px', fontWeight: '700',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                fontFamily: 'DM Sans, system-ui, sans-serif',
                boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              <RefreshCw style={{
                width: '11px', height: '11px',
                animation: refreshing ? 'caRotate 0.5s linear infinite' : 'none',
              }} />
              Actualiser la page
            </button>
          )}

          {/* Masquer */}
          {showDismiss && (
            <button
              onClick={() => setDismissed(true)}
              title="Masquer"
              style={{
                width: '28px', height: '28px',
                borderRadius: '7px',
                border: 'none',
                background: 'rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.45)',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = 'rgba(255,255,255,0.8)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; }}
            >
              <X style={{ width: '12px', height: '12px' }} />
            </button>
          )}
        </div>
      </div>

      {/* Barre de progression pour le backoff (pendant reconnecting) */}
      {phase === 'reconnecting' && !dismissed && (
        <div style={{
          position: 'absolute',
          bottom: '0px', left: '50%',
          transform: 'translateX(-50%)',
          maxWidth: '620px', width: 'calc(100% - 32px)',
          height: '2px',
          background: 'rgba(255,255,255,0.06)',
          borderRadius: '0 0 14px 14px',
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            background: C.warn.text,
            borderRadius: '0 0 14px 14px',
            animation: `caProgress ${backoffDelay(Math.max(1, attempts + 1))}ms linear`,
            animationFillMode: 'forwards',
          }} />
        </div>
      )}

      <style>{`
        @keyframes caIn {
          from { opacity: 0; transform: translateY(-16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes caRotate {
          to { transform: rotate(360deg); }
        }
        @keyframes caProgress {
          from { width: 0%; }
          to   { width: 100%; }
        }
      `}</style>
    </div>
  );
}