// src/features/meeting/components/VideoGrid.jsx
import { useMemo, useRef, useLayoutEffect, useState, useCallback, useEffect, memo } from 'react';
import { Track } from 'livekit-client';
import { Maximize2, Monitor, Check, X, Users, Clock } from 'lucide-react';
import { useMeeting } from '../context/MeetingContext';
import ParticipantTile from './ParticipantTile';
import ScreenShareTile from './ScreenShareTile';

// ── Layout paysage (ratio 16/9) — style Google Meet ──────────
// Calcule le layout optimal pour afficher n participants en mode
// paysage 16/9. Objectif : maximiser la surface de chaque tuile
// en remplissant tout l'espace disponible, sans scroll.
//
// Règles de grille :
//   1 participant  → plein écran centré
//   2 participants → côte à côte (2 colonnes)
//   3-4            → 2×2
//   5-6            → 3×2 ou 2×3
//   7-9            → 3×3
//   10+            → 4 colonnes
function calcLayout(w, h, n) {
  if (n === 0) return { cols: 1, rows: 1, tileW: w, tileH: h };

  const GAP   = 8;
  // Ratio PAYSAGE 16/9 — les tuiles sont plus larges que hautes
  const RATIO = 16 / 9;

  // Nombre minimal de colonnes selon les participants
  const minCols = n === 1 ? 1
                : n === 2 ? 2
                : n <= 4  ? 2
                : n <= 6  ? 3
                : n <= 9  ? 3
                : 4;

  let best = { cols: minCols, rows: Math.ceil(n / minCols), area: 0, tileW: 0, tileH: 0 };

  for (let c = minCols; c <= Math.min(n, 8); c++) {
    const rows = Math.ceil(n / c);

    // Largeur disponible par tuile
    const tW = Math.floor((w - GAP * (c + 1)) / c);
    if (tW <= 0) continue;

    // Hauteur en mode 16/9 (9/16 de la largeur)
    const tHbyRatio = Math.floor(tW * (9 / 16));
    // Hauteur max disponible par ligne
    const tHbySpace = Math.floor((h - GAP * (rows + 1)) / rows);
    // On prend le minimum pour ne pas déborder
    const tH = Math.min(tHbyRatio, tHbySpace);
    if (tH <= 0) continue;

    // Recalcul de la largeur si la hauteur est le facteur limitant
    // (comme Meet : on maximise sans dépasser les deux contraintes)
    const tWfinal = Math.min(tW, Math.floor(tH * RATIO));

    const area = tWfinal * tH;
    if (area > best.area) best = { cols: c, rows, area, tileW: tWfinal, tileH: tH };
  }

  // Garantie : résultat valide même si aucun calcul n'a abouti
  if (best.tileW === 0) {
    const c   = minCols;
    const rows = Math.ceil(n / c);
    const tW  = Math.floor((w - GAP * (c + 1)) / c);
    const tH  = Math.floor(tW * (9 / 16));
    best = { cols: c, rows, area: tW * tH, tileW: tW, tileH: Math.max(tH, 1) };
  }

  return best;
}

function useSize(ref) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect;
      setSize({ w: Math.floor(width), h: Math.floor(height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}

// ── Bannière demande (hôte voit les demandes) ─────────────────
function RequestBanner({ requests, onAccept, onReject }) {
  if (!requests || requests.length === 0) return null;
  const req = requests[0];

  return (
    <div style={{
      position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
      zIndex: 40, minWidth: 300, maxWidth: 420,
      animation: 'reqSlide 0.35s cubic-bezier(0.34,1.4,0.64,1)',
    }}>
      <div style={{
        background: 'rgba(8,15,42,0.97)', backdropFilter: 'blur(20px)',
        border: `1px solid ${req.type === 'screen' ? 'rgba(139,92,246,0.45)' : 'rgba(37,99,235,0.45)'}`,
        borderRadius: 16, padding: '14px 16px',
        boxShadow: '0 16px 48px rgba(0,0,0,0.65)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 11, flexShrink: 0,
            background: req.type === 'screen' ? 'rgba(139,92,246,0.15)' : 'rgba(37,99,235,0.12)',
            border: `1.5px solid ${req.type === 'screen' ? 'rgba(139,92,246,0.4)' : 'rgba(37,99,235,0.35)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {req.type === 'screen'
              ? <Monitor style={{ width: 16, height: 16, color: '#a78bfa' }} />
              : <Users   style={{ width: 16, height: 16, color: '#60a5fa' }} />}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ color: '#fff', fontSize: 13, fontWeight: 700, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {req.name}
            </p>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, margin: 0 }}>
              {req.type === 'screen' ? 'veut partager son écran' : 'demande à rejoindre la réunion'}
            </p>
          </div>
          {requests.length > 1 && (
            <span style={{
              padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 800,
              background: 'rgba(239,68,68,0.2)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.3)',
            }}>+{requests.length - 1}</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => onReject(req)} style={{
            flex: 1, padding: '8px 0', borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.55)',
            fontSize: 12, fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
          }}>
            <X style={{ width: 11, height: 11 }} /> Refuser
          </button>
          <button onClick={() => onAccept(req)} style={{
            flex: 1, padding: '8px 0', borderRadius: 10, border: 'none',
            background: req.type === 'screen' ? '#7c3aed' : '#2563eb',
            color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
          }}>
            <Check style={{ width: 11, height: 11 }} />
            {req.type === 'screen' ? 'Autoriser' : 'Accepter'}
          </button>
        </div>
      </div>
      <style>{`
        @keyframes reqSlide {
          from { transform: translateX(-50%) translateY(-14px); opacity: 0; }
          to   { transform: translateX(-50%) translateY(0);     opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ── Overlay attente participant ───────────────────────────────
function WaitingOverlay({ type = 'join' }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 700);
    return () => clearInterval(t);
  }, []);
  const dots = '.'.repeat((tick % 3) + 1);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 60,
      background: 'rgba(8,15,42,0.97)', backdropFilter: 'blur(16px)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24,
    }}>
      <div style={{
        width: 80, height: 80, borderRadius: 24,
        background: type === 'screen' ? 'rgba(139,92,246,0.12)' : 'rgba(37,99,235,0.1)',
        border: `2px solid ${type === 'screen' ? 'rgba(139,92,246,0.45)' : 'rgba(37,99,235,0.4)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'woFloat 3s ease infinite',
      }}>
        {type === 'screen'
          ? <Monitor style={{ width: 34, height: 34, color: '#a78bfa' }} />
          : <Users   style={{ width: 34, height: 34, color: '#60a5fa' }} />}
      </div>
      <div style={{ textAlign: 'center' }}>
        <p style={{ color: '#fff', fontSize: 18, fontWeight: 700, margin: '0 0 8px' }}>
          {type === 'screen' ? 'Demande de partage d\'écran' : 'Salle d\'attente'}
        </p>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, margin: 0 }}>
          {type === 'screen' ? `En attente de l'autorisation${dots}` : `En attente d'admission${dots}`}
        </p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.3)' }}>
        <Clock style={{ width: 14, height: 14 }} />
        <span style={{ fontSize: 12 }}>L'hôte va vous admettre sous peu</span>
      </div>
      <style>{`
        @keyframes woFloat {
          0%,100% { transform: translateY(0);   }
          50%     { transform: translateY(-8px); }
        }
      `}</style>
    </div>
  );
}

// ── Tuile ronde (bande scrollable) ───────────────────────────
const RoundTile = memo(function RoundTile({ participant, muteAudio = false }) {
  const videoRef = useRef(null);
  const audioRef = useRef(null);

  useLayoutEffect(() => {
    if (!participant) return;
    const attach = () => {
      try {
        const pubs = Array.from(participant.getTrackPublications?.()?.values?.() || []);
        const camPub = pubs.find(p => p.source === Track.Source.Camera && p.track && !p.isMuted);
        if (camPub?.track && videoRef.current) camPub.track.attach(videoRef.current);
        if (!muteAudio && !participant.isLocal && audioRef.current) {
          const micPub = pubs.find(p => p.source === Track.Source.Microphone && p.track && !p.isMuted);
          if (micPub?.track) {
            micPub.track.attach(audioRef.current);
            audioRef.current.muted  = false;
            audioRef.current.volume = 1.0;
            audioRef.current.play().catch(() => {});
          }
        }
      } catch {}
    };
    attach();
    const t = setTimeout(attach, 500);
    participant.on?.('trackSubscribed', attach);
    participant.on?.('trackMuted',      attach);
    participant.on?.('trackUnmuted',    attach);
    return () => {
      clearTimeout(t);
      participant.off?.('trackSubscribed', attach);
      participant.off?.('trackMuted',      attach);
      participant.off?.('trackUnmuted',    attach);
    };
  }, [participant, muteAudio]);

  if (!participant) return null;
  const name = participant.name || participant.identity || '?';
  const initials = name.slice(0, 2).toUpperCase();
  const COLORS = ['#1a2b5c','#2563eb','#7c3aed','#0891b2','#065f46','#92400e','#be185d'];
  let ci = 0;
  for (let i = 0; i < name.length; i++) ci = (ci + name.charCodeAt(i)) % COLORS.length;
  const pubs = [];
  try { participant.getTrackPublications?.()?.forEach?.(p => pubs.push(p)); } catch {}
  const camPub   = pubs.find(p => p.source === Track.Source.Camera);
  const hasVideo = camPub && !camPub.isMuted && camPub.track;

  return (
    <div className="relative flex-shrink-0" style={{ width: 64, height: 80 }}>
      {!muteAudio && !participant.isLocal && (
        <audio ref={audioRef} autoPlay playsInline style={{ display: 'none' }} />
      )}
      <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white/20 hover:border-accent/70 transition-all shadow-lg relative"
           style={{ background: COLORS[ci] }}>
        <video ref={videoRef} autoPlay playsInline muted
          className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity: hasVideo ? 1 : 0, transform: participant.isLocal ? 'scaleX(-1)' : 'none' }}
        />
        {!hasVideo && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-white font-bold text-lg">{initials}</span>
          </div>
        )}
      </div>
      <p className="text-center text-white text-[10px] font-medium mt-1 truncate w-16 opacity-80">
        {name.split(' ')[0]}
      </p>
    </div>
  );
});

// ── Tuile agrandissable ───────────────────────────────────────
function ExpandableTile({ participant }) {
  const [fullscreen, setFullscreen] = useState(false);
  useLayoutEffect(() => {
    if (!fullscreen) return;
    const h = (e) => { if (e.key === 'Escape') setFullscreen(false); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [fullscreen]);

  return (
    <>
      <div className="relative group h-full">
        <ParticipantTile participant={participant} />
        <button
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all bg-black/60 hover:bg-accent text-white rounded-lg p-1.5 backdrop-blur z-10"
          onClick={() => setFullscreen(true)} title="Plein écran"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>
      {fullscreen && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center" onClick={() => setFullscreen(false)}>
          <div className="relative w-full h-full max-w-6xl max-h-[90vh] m-4 rounded-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <ParticipantTile participant={participant} isPinned />
            <button onClick={() => setFullscreen(false)} className="absolute top-4 right-4 z-10 flex items-center gap-2 px-3 py-2 bg-black/70 hover:bg-black/90 text-white rounded-xl text-sm font-semibold backdrop-blur">
              ✕ Fermer
            </button>
          </div>
        </div>
      )}
    </>
  );
}

const MemoTile = memo(({ p }) => <ExpandableTile participant={p} />);
MemoTile.displayName = 'MemoTile';

// ─────────────────────────────────────────────────────────────
// Composant principal
// ─────────────────────────────────────────────────────────────
export default function VideoGrid() {
  const {
    room, participants, localParticipant, isHost,
    waitingRoom, admitParticipant, publish,
    leaveCall,
  } = useMeeting();

  const containerRef = useRef(null);
  const { w, h } = useSize(containerRef);
  const navigate = useCallback(() => { window.location.href = '/'; }, []);

  // ── État salle d'attente ──────────────────────────────────
  const [requests,          setRequests]          = useState([]);
  const [waitingForJoin,    setWaitingForJoin]    = useState(false);
  const [waitingForScreen,  setWaitingForScreen]  = useState(false);
  const [screenAllowed,     setScreenAllowed]     = useState(false);
  const pendingScreenRef    = useRef(null);
  const hiddenTimerRef      = useRef(null);

  // ── Gestion des messages DataChannel ─────────────────────
  useEffect(() => {
    if (!room) return;

    const onData = (payload, participant) => {
      try {
        const msg  = JSON.parse(new TextDecoder().decode(payload));
        const from = participant?.identity || '';
        const name = participant?.name || from;

        if (msg.type === 'waiting_knock') {
          if (!isHost) return;
          setRequests(prev => {
            if (prev.find(r => r.id === msg.id)) return prev;
            return [...prev, { id: msg.id, name: msg.name, identity: from, type: 'join' }];
          });
        }

        if (msg.type === 'screen_request') {
          if (!isHost) return;
          setRequests(prev => {
            if (prev.find(r => r.id === msg.id)) return prev;
            return [...prev, { id: msg.id, name: msg.name, identity: from, type: 'screen' }];
          });
        }

        if (msg.type === 'admitted' && msg.target === room?.localParticipant?.identity) {
          setWaitingForJoin(false);
        }

        if (msg.type === 'rejected' && msg.target === room?.localParticipant?.identity) {
          setWaitingForJoin(false);
          window.location.href = '/';
        }

        if (msg.type === 'screen_allowed' && msg.target === room?.localParticipant?.identity) {
          setWaitingForScreen(false);
          setScreenAllowed(true);
          if (pendingScreenRef.current) { pendingScreenRef.current(); pendingScreenRef.current = null; }
        }

        if (msg.type === 'screen_denied' && msg.target === room?.localParticipant?.identity) {
          setWaitingForScreen(false);
          pendingScreenRef.current = null;
        }
      } catch {}
    };

    room.on('dataReceived', onData);
    return () => room.off('dataReceived', onData);
  }, [room, isHost]);

  // ── Knock à l'entrée ──────────────────────────────────────
  useEffect(() => {
    if (!room || !localParticipant || isHost) return;

    const remotes = Array.from(room.remoteParticipants?.values() || []);
    const hostPresent = remotes.some(p => {
      try { return p.permissions?.roomAdmin === true; } catch { return false; }
    });

    if (hostPresent) {
      const id = `knock_${localParticipant.identity}_${Date.now()}`;
      setWaitingForJoin(true);
      room.localParticipant.publishData(
        new TextEncoder().encode(JSON.stringify({
          type: 'waiting_knock',
          id,
          name: localParticipant.name || localParticipant.identity,
        })),
        { reliable: true }
      ).catch(() => {});
    }
  }, [room, localParticipant, isHost]);

  // ── Hôte accepte ─────────────────────────────────────────
  const handleAccept = useCallback(async (req) => {
    setRequests(prev => prev.filter(r => r.id !== req.id));
    if (!room) return;
    const type = req.type === 'screen' ? 'screen_allowed' : 'admitted';
    await room.localParticipant.publishData(
      new TextEncoder().encode(JSON.stringify({ type, target: req.identity })),
      { reliable: true }
    ).catch(() => {});
    if (req.type === 'join') admitParticipant?.(req.identity);
  }, [room, admitParticipant]);

  // ── Hôte refuse ──────────────────────────────────────────
  const handleReject = useCallback(async (req) => {
    setRequests(prev => prev.filter(r => r.id !== req.id));
    if (!room) return;
    const type = req.type === 'screen' ? 'screen_denied' : 'rejected';
    await room.localParticipant.publishData(
      new TextEncoder().encode(JSON.stringify({ type, target: req.identity })),
      { reliable: true }
    ).catch(() => {});
  }, [room]);

  // ── Onglet masqué ─────────────────────────────────────────
  useEffect(() => {
    const MIC_CAM_TIMEOUT = 15 * 60 * 1000;

    const onVisibilityChange = () => {
      if (document.hidden) {
        hiddenTimerRef.current = setTimeout(() => {
          if (room) {
            room.localParticipant?.setMicrophoneEnabled(false).catch(() => {});
            room.localParticipant?.setCameraEnabled(false).catch(() => {});
          }
        }, MIC_CAM_TIMEOUT);
      } else {
        clearTimeout(hiddenTimerRef.current);
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      clearTimeout(hiddenTimerRef.current);
    };
  }, [room]);

  // ── Tiles ────────────────────────────────────────────────
  const tiles = useMemo(() => {
    const all    = Array.from(participants.values()).filter(Boolean);
    const remote = all.filter(p => !p.isLocal);
    return localParticipant ? [localParticipant, ...remote] : remote;
  }, [participants, localParticipant]);

  // ── Détection partage d'écran ─────────────────────────────
  const screenSharer = useMemo(() => {
    for (const p of tiles) {
      try {
        const pubs = Array.from(p.getTrackPublications().values());
        const has  = pubs.some(pub =>
          pub.kind === Track.Kind.Video &&
          pub.source === Track.Source.ScreenShare &&
          pub.track
        );
        if (has) return p;
      } catch {}
    }
    return null;
  }, [tiles]);

  // ── Attente de connexion ──────────────────────────────────
  if (!room) {
    return (
      <div className="h-full flex items-center justify-center text-white/50">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm">Connexion…</p>
        </div>
      </div>
    );
  }

  // ── Participant en salle d'attente ────────────────────────
  if (waitingForJoin) return <WaitingOverlay type="join" />;

  // ── Attente autorisation partage écran ────────────────────
  if (waitingForScreen) return <WaitingOverlay type="screen" />;

  const n = tiles.length;

  // ── Mode partage d'écran ──────────────────────────────────
  if (screenSharer) {
    return (
      <div className="h-full flex flex-col gap-2 p-2 overflow-hidden relative">
        {isHost && <RequestBanner requests={requests} onAccept={handleAccept} onReject={handleReject} />}
        <div className="flex-1 min-h-0 rounded-2xl overflow-hidden">
          <ScreenShareTile participant={screenSharer} />
        </div>
        <div className="flex-shrink-0 flex items-center gap-3 overflow-x-auto pb-1 px-1" style={{ minHeight: 88 }}>
          {tiles.map(p => (
            <RoundTile key={p.identity} participant={p} muteAudio={p.identity === screenSharer.identity} />
          ))}
        </div>
      </div>
    );
  }

  // ── Mode normal : grille Google Meet ─────────────────────
  // • calcLayout trouve le nombre de colonnes et la taille de tuile
  //   optimaux pour remplir tout l'espace disponible en 16/9.
  // • Les tuiles sont centrées horizontalement ET verticalement
  //   dans le conteneur (comme Meet), sans scroll.
  // • On passe Math.min(n, 6) à calcLayout pour la taille de tuile,
  //   mais on rend TOUS les participants (comportement inchangé).
  const { cols, rows, tileW, tileH } = calcLayout(w || 800, h || 600, n);

  // Largeur totale occupée par la grille → pour centrage horizontal
  const GAP        = 8;
  const gridW      = cols * tileW + (cols - 1) * GAP;
  const gridH      = rows * tileH + (rows - 1) * GAP;

  return (
    <div
      ref={containerRef}
      className="h-full w-full relative"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: GAP,
        boxSizing: 'border-box',
        overflow: 'hidden',   // pas de scroll — les tuiles s'adaptent
      }}
    >
      {isHost && <RequestBanner requests={requests} onAccept={handleAccept} onReject={handleReject} />}

      {/* Grille centrée — style Google Meet */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, ${tileW}px)`,
          gridTemplateRows: `repeat(${rows}, ${tileH}px)`,
          gap: GAP,
          width: gridW,
          height: gridH,
        }}
      >
        {tiles.map(p => (
          <div
            key={p.identity}
            style={{
              width: tileW,
              height: tileH,
              // aspect-ratio en fallback pour les navigateurs sans grille fixe
              aspectRatio: '16 / 9',
              minWidth: 0,
              minHeight: 0,
            }}
          >
            <MemoTile p={p} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Hook exporté pour ControlsBar : intercepter le partage d'écran
// ─────────────────────────────────────────────────────────────
export function useScreenShareRequest() {
  const { room, localParticipant, isHost, toggleScreenShare } = useMeeting();
  const [waiting, setWaiting] = useState(false);

  const requestScreenShare = useCallback(async () => {
    if (!room || !localParticipant) return;

    if (isHost) { await toggleScreenShare(); return; }

    const id = `screen_${localParticipant.identity}_${Date.now()}`;
    setWaiting(true);

    await room.localParticipant.publishData(
      new TextEncoder().encode(JSON.stringify({
        type: 'screen_request',
        id,
        name: localParticipant.name || localParticipant.identity,
      })),
      { reliable: true }
    ).catch(() => {});

    const onData = (payload) => {
      try {
        const msg = JSON.parse(new TextDecoder().decode(payload));
        if (msg.type === 'screen_allowed' && msg.target === localParticipant.identity) {
          setWaiting(false);
          room.off('dataReceived', onData);
          toggleScreenShare();
        }
        if (msg.type === 'screen_denied' && msg.target === localParticipant.identity) {
          setWaiting(false);
          room.off('dataReceived', onData);
        }
      } catch {}
    };
    room.on('dataReceived', onData);

    setTimeout(() => {
      setWaiting(false);
      room.off('dataReceived', onData);
    }, 60000);
  }, [room, localParticipant, isHost, toggleScreenShare]);

  return { requestScreenShare, waitingForScreen: waiting };
}