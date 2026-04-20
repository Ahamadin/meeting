// src/features/meeting/components/ParticipantsPanel.jsx
// Ajout : toggle vidéo/audio (activer ET désactiver) pour l'hôte
import { useState } from 'react';
import {
  Users, MicOff, VideoOff, Hand, Download,
  X, Building2, BookOpen, Clock, Calendar, UserX,
  Mic, Video,
} from 'lucide-react';
import { useMeeting } from '../context/MeetingContext';

function formatDuration(ms) {
  if (!ms || ms <= 0) return '0 min';
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}min`;
  return `${m} minute${m !== 1 ? 's' : ''}`;
}

function formatTime(date) {
  if (!date) return '--:--';
  return new Date(date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function generatePDF({ participants, org, title, startTime, endTime, roomCode }) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const startStr = formatTime(startTime);
  const endStr = formatTime(endTime);

  const rows = participants.map((p, i) => `
    <tr style="background:${i % 2 === 0 ? '#f8faff' : '#ffffff'}">
      <td style="padding:10px 14px;border-bottom:1px solid #e5eaf5;color:#1a2b5c;font-weight:600;">${i + 1}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #e5eaf5;color:#1a2b5c;">${p.name || p.identity}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #e5eaf5;color:#64748b;text-align:center;">
        <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#22c55e;margin-right:4px;"></span>Présent(e)
      </td>
      <td style="padding:10px 14px;border-bottom:1px solid #e5eaf5;color:#94a3b8;">____________________</td>
    </tr>
  `).join('');

  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"/>
<title>Liste de présence — ${title}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Arial,sans-serif;color:#1e293b;background:#fff}
.page{max-width:800px;margin:0 auto;padding:40px}
.header{text-align:center;margin-bottom:40px;border-bottom:3px solid #1a2b5c;padding-bottom:24px}
.org{font-size:22px;font-weight:800;color:#1a2b5c}
.meeting-title{font-size:16px;color:#2563eb;font-weight:600;margin-top:6px}
.badge{display:inline-block;background:#1a2b5c;color:#fff;font-size:11px;font-weight:700;padding:3px 10px;border-radius:99px;margin-top:8px}
.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:32px}
.info-card{background:#f0f4ff;border:1px solid #d1dbff;border-radius:10px;padding:14px}
.info-label{font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.8px;margin-bottom:4px}
.info-value{font-size:14px;font-weight:600;color:#1a2b5c}
.section-title{font-size:13px;font-weight:700;color:#1a2b5c;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px}
table{width:100%;border-collapse:collapse;border-radius:10px;overflow:hidden;box-shadow:0 1px 8px rgba(26,43,92,.1)}
thead{background:#1a2b5c}
thead th{padding:12px 14px;color:#fff;font-size:11px;text-align:left;font-weight:700;text-transform:uppercase;letter-spacing:.8px}
.footer{margin-top:40px;text-align:center;font-size:11px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:20px}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head>
<body><div class="page">
<div class="header">
  ${org ? `<div class="org">${org}</div>` : ''}
  <div class="meeting-title">${title}</div>
  <span class="badge">LISTE DE PRÉSENCE</span>
</div>
<div class="info-grid">
  <div class="info-card"><div class="info-label">Date</div><div class="info-value">${dateStr}</div></div>
  <div class="info-card"><div class="info-label">Code de réunion</div><div class="info-value" style="font-family:monospace;">${roomCode}</div></div>
  <div class="info-card"><div class="info-label">Heure de début</div><div class="info-value">${startStr}</div></div>
  <div class="info-card"><div class="info-label">Heure de fin</div><div class="info-value">${endStr}</div></div>
  <div class="info-card" style="grid-column:span 2"><div class="info-label">Durée</div><div class="info-value">${formatDuration(endTime - new Date(startTime))}</div></div>
</div>
<div class="section-title">Participants (${participants.length})</div>
<table>
  <thead><tr><th>#</th><th>Nom complet</th><th style="text-align:center;">Présence</th><th>Signature</th></tr></thead>
  <tbody>${rows}</tbody>
</table>
<div class="footer">Document généré le ${now.toLocaleString('fr-FR')} · JokkoMeet</div>
</div></body></html>`;

  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  setTimeout(() => win.print(), 500);
}

function ExportModal({ onClose, onExport, roomName, meetingStartTime }) {
  const now = new Date();
  const [org, setOrg] = useState('');
  const [meetTitle, setMeetTitle] = useState(roomName || '');
  const [exporting, setExporting] = useState(false);

  const doExport = async () => {
    setExporting(true);
    await onExport({ org: org.trim(), title: meetTitle.trim() || roomName, startTime: meetingStartTime, endTime: now });
    setExporting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 p-6 shadow-2xl" style={{ background: '#0f1d3e' }}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-white font-bold text-base">Exporter la liste de présence</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-white/60 flex items-center gap-1.5 mb-1.5">
              <Building2 className="w-3.5 h-3.5" /> Organisation / établissement
            </label>
            <input className="w-full bg-[#0d1a3a] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-blue-500/50"
              placeholder="Ex: École Nationale, Entreprise ABC…" value={org} onChange={e => setOrg(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold text-white/60 flex items-center gap-1.5 mb-1.5">
              <BookOpen className="w-3.5 h-3.5" /> Titre / objet de la réunion
            </label>
            <input className="w-full bg-[#0d1a3a] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-blue-500/50"
              placeholder="Ex: Réunion d'équipe, Cours de mathématiques…" value={meetTitle} onChange={e => setMeetTitle(e.target.value)} />
          </div>
          <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-2">
            <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Informations automatiques</p>
            <div className="flex items-center gap-2 text-sm text-white/70">
              <Calendar className="w-3.5 h-3.5 text-white/40" />
              <span>{now.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-white/70">
              <Clock className="w-3.5 h-3.5 text-white/40" />
              <span>Début : {formatTime(meetingStartTime)} · Fin : {formatTime(now)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-white/70">
              <Clock className="w-3.5 h-3.5 text-white/40" />
              <span>Durée : {formatDuration(meetingStartTime ? now - new Date(meetingStartTime) : 0)}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-white/15 text-white/60 hover:text-white hover:border-white/30 text-sm transition">Annuler</button>
          <button onClick={doExport} disabled={exporting} className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition disabled:opacity-60 flex items-center justify-center gap-2">
            {exporting ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Export…</> : <><Download className="w-4 h-4" /> Exporter PDF</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Hook pour suivre l'état micro/vidéo des participants distants ─────────────
// Lit les publications de track LiveKit pour savoir si le micro/la caméra
// d'un participant distant est actif ou muet. Ne change pas la logique métier.
function useParticipantMediaState(participant) {
  const [audioMuted, setAudioMuted] = useState(true);
  const [videoMuted, setVideoMuted] = useState(true);

  if (!participant || participant.isLocal) return { audioMuted: false, videoMuted: false };

  // On retourne l'état courant en lisant les publications
  try {
    const pubs = Array.from(participant.getTrackPublications?.()?.values?.() || []);
    const audioPub = pubs.find(p => p.kind === 'audio');
    const videoPub = pubs.find(p => p.kind === 'video' && p.source !== 'screen_share');
    return {
      audioMuted: !audioPub || audioPub.isMuted || !audioPub.track,
      videoMuted: !videoPub || videoPub.isMuted || !videoPub.track,
    };
  } catch {
    return { audioMuted: true, videoMuted: true };
  }
}

// ── Ligne participant avec contrôles hôte ─────────────────────────────────────
function ParticipantRow({ p, canModerate, handRaisedUsers, safeKick, safeMuteA, safeMuteV, safeEnableA, safeEnableV, setKickConfirm, room }) {
  const name = p.name || p.identity || 'Participant';
  const hasHand = handRaisedUsers.has(p.identity);
  const isMe = p.isLocal;
  const showControls = canModerate && !isMe;

  // Lire l'état média directement depuis les publications LiveKit
  let audioMuted = false;
  let videoMuted = false;
  if (!p.isLocal) {
    try {
      const pubs = Array.from(p.getTrackPublications?.()?.values?.() || []);
      const audioPub = pubs.find(pub => pub.kind === 'audio');
      const videoPub = pubs.find(pub => pub.kind === 'video' && pub.source !== 'screen_share');
      audioMuted = !audioPub || audioPub.isMuted || !audioPub.track;
      videoMuted = !videoPub || videoPub.isMuted || !videoPub.track;
    } catch {}
  }

  return (
    <div className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-xl bg-white/5 hover:bg-white/8 transition group">
      {/* Avatar */}
      <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-blue-600 flex items-center justify-center text-xs sm:text-sm font-bold text-white shrink-0">
        {name.slice(0, 2).toUpperCase()}
      </div>

      {/* Nom */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-xs sm:text-sm font-medium text-white truncate">{name}</span>
          {isMe && (
            <span className="px-1.5 py-0.5 text-[9px] sm:text-[10px] rounded-full bg-blue-600/30 text-blue-400 font-semibold shrink-0">Vous</span>
          )}
          {hasHand && <Hand className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-yellow-400 shrink-0" />}
        </div>
        {/* Indicateurs état média (pour tout le monde) */}
        {!isMe && (
          <div className="flex items-center gap-1.5 mt-0.5">
            <span title={audioMuted ? 'Micro désactivé' : 'Micro actif'}>
              {audioMuted
                ? <MicOff className="w-2.5 h-2.5 text-red-400" />
                : <Mic className="w-2.5 h-2.5 text-green-400" />}
            </span>
            <span title={videoMuted ? 'Caméra désactivée' : 'Caméra active'}>
              {videoMuted
                ? <VideoOff className="w-2.5 h-2.5 text-red-400" />
                : <Video className="w-2.5 h-2.5 text-green-400" />}
            </span>
          </div>
        )}
      </div>

      {/* Contrôles hôte */}
      {showControls && (
        <div className="flex items-center gap-1 shrink-0">
          {/* Toggle micro : désactiver si actif, activer si muet */}
          <button
            onClick={() => audioMuted ? safeEnableA(p.identity) : safeMuteA(p.identity)}
            className={`p-1 sm:p-1.5 rounded-lg transition ${audioMuted ? 'bg-green-500/10 hover:bg-green-500/20 text-green-400 hover:text-green-300' : 'bg-white/5 hover:bg-red-500/20 text-white/40 hover:text-red-400'}`}
            title={audioMuted ? `Activer le micro de ${name}` : `Couper le micro de ${name}`}
          >
            {audioMuted
              ? <Mic className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              : <MicOff className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
          </button>

          {/* Toggle caméra : désactiver si active, activer si désactivée */}
          <button
            onClick={() => videoMuted ? safeEnableV(p.identity) : safeMuteV(p.identity)}
            className={`p-1 sm:p-1.5 rounded-lg transition ${videoMuted ? 'bg-green-500/10 hover:bg-green-500/20 text-green-400 hover:text-green-300' : 'bg-white/5 hover:bg-red-500/20 text-white/40 hover:text-red-400'}`}
            title={videoMuted ? `Activer la caméra de ${name}` : `Désactiver la caméra de ${name}`}
          >
            {videoMuted
              ? <Video className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              : <VideoOff className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
          </button>

          {/* Retirer */}
          <button
            onClick={() => setKickConfirm({ identity: p.identity, name })}
            className="p-1 sm:p-1.5 rounded-lg bg-white/5 hover:bg-red-600/25 text-white/40 hover:text-red-400 transition"
            title={`Retirer ${name} de la réunion`}
          >
            <UserX className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

export default function ParticipantsPanel() {
  const {
    participants, handRaisedUsers, waitingRoom,
    isHost, admitParticipant,
    modMuteAudio, modMuteVideo, kickParticipant,
    roomName, meetingStartTime, publish, room,
  } = useMeeting();

  const canModerate = isHost === true;

  const [showExport, setShowExport] = useState(false);
  const [kickConfirm, setKickConfirm] = useState(null);

  const list = Array.from(participants.values()).filter(Boolean);

  const handleExport = async ({ org, title, startTime, endTime }) => {
    generatePDF({ participants: list, org, title, startTime, endTime, roomCode: roomName });
  };

  // Double sécurité : fonctions bloquées si non hôte
  const safeKick = (id) => { if (!canModerate) return; kickParticipant?.(id); };
  const safeMuteA = (id) => { if (!canModerate) return; modMuteAudio?.(id); };
  const safeMuteV = (id) => { if (!canModerate) return; modMuteVideo?.(id); };

  // ── NOUVELLES FONCTIONS : activer micro/vidéo d'un participant ────────────
  // Envoie un message DataChannel au participant pour qu'il réactive son média.
  // La logique métier reste dans MeetingContext (publish est déjà exposé).
  // Le participant reçoit 'mod_enable_audio' / 'mod_enable_video' et réactive.
  const safeEnableA = async (identity) => {
    if (!canModerate) return;
    await publish?.({ type: 'mod_enable_audio', target: identity });
  };

  const safeEnableV = async (identity) => {
    if (!canModerate) return;
    await publish?.({ type: 'mod_enable_video', target: identity });
  };

  return (
    <>
      {showExport && (
        <ExportModal onClose={() => setShowExport(false)} onExport={handleExport}
          roomName={roomName} meetingStartTime={meetingStartTime} />
      )}

      {kickConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 p-5 sm:p-6 shadow-2xl" style={{ background: '#0f1d3e' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center shrink-0">
                <UserX className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-white font-bold text-sm">Retirer le participant ?</h3>
                <p className="text-white/40 text-xs mt-0.5">{kickConfirm.name}</p>
              </div>
            </div>
            <p className="text-white/50 text-sm mb-5">Ce participant sera retiré de la réunion. Il pourra rejoindre à nouveau via le lien d'invitation.</p>
            <div className="flex gap-3">
              <button onClick={() => setKickConfirm(null)} className="flex-1 px-4 py-2.5 rounded-xl border border-white/15 text-white/60 hover:text-white hover:border-white/30 text-sm transition">Annuler</button>
              <button onClick={() => { safeKick(kickConfirm.identity); setKickConfirm(null); }} className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-semibold transition flex items-center justify-center gap-2">
                <UserX className="w-4 h-4" /> Retirer
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col h-full overflow-hidden">

        {/* Salle d'attente */}
        {canModerate && waitingRoom.length > 0 && (
          <div className="flex-shrink-0 p-3 border-b border-white/8">
            <p className="text-xs font-semibold text-yellow-400 uppercase tracking-wider mb-2">En attente ({waitingRoom.length})</p>
            {waitingRoom.map(w => (
              <div key={w.identity} className="flex items-center justify-between p-2.5 rounded-xl bg-yellow-500/10 border border-yellow-500/20 mb-2">
                <span className="text-sm text-white font-medium truncate mr-2">{w.name}</span>
                <button onClick={() => admitParticipant(w.identity)} className="px-3 py-1 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-400 text-xs font-semibold transition shrink-0">Accepter</button>
              </div>
            ))}
          </div>
        )}

        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 border-b border-white/8">
          <p className="text-xs font-semibold text-white/50 uppercase tracking-wider">
            {list.length} participant{list.length !== 1 ? 's' : ''}
          </p>
          {canModerate && (
            <button onClick={() => setShowExport(true)} className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-white/8 hover:bg-white/15 border border-white/15 text-white/70 hover:text-white text-xs font-semibold transition">
              <Download className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
              <span className="hidden sm:inline">Exporter PDF</span>
              <span className="sm:hidden">PDF</span>
            </button>
          )}
        </div>

        {/* Légende contrôles pour l'hôte */}
        {canModerate && list.length > 1 && (
          <div className="flex-shrink-0 px-3 py-1.5 bg-white/3 border-b border-white/5">
            <p className="text-[10px] text-white/30 flex items-center gap-3">
              <span className="flex items-center gap-1"><Mic className="w-2.5 h-2.5 text-green-400" /> Activer</span>
              <span className="flex items-center gap-1"><MicOff className="w-2.5 h-2.5 text-red-400" /> Désactiver</span>
              <span className="flex items-center gap-1"><Video className="w-2.5 h-2.5 text-green-400" /> Activer vidéo</span>
              <span className="flex items-center gap-1"><UserX className="w-2.5 h-2.5 text-red-400" /> Retirer</span>
            </p>
          </div>
        )}

        {/* Liste */}
        <div className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-1.5 min-h-0">
          {list.map(p => {
            if (!p) return null;
            return (
              <ParticipantRow
                key={p.identity}
                p={p}
                canModerate={canModerate}
                handRaisedUsers={handRaisedUsers}
                safeKick={safeKick}
                safeMuteA={safeMuteA}
                safeMuteV={safeMuteV}
                safeEnableA={safeEnableA}
                safeEnableV={safeEnableV}
                setKickConfirm={setKickConfirm}
                room={room}
              />
            );
          })}

          {list.length === 0 && (
            <div className="text-center text-white/40 text-sm mt-8">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
              Aucun participant
            </div>
          )}
        </div>
      </div>
    </>
  );
}