// src/features/meeting/components/StatsPanel.jsx
import { useEffect, useState } from 'react';
import {
  X, Download, Mic, Users, Clock,
  MessageSquare, Hand, TrendingUp, Activity,
  Award, Percent, LogIn, LogOut,
} from 'lucide-react';
import { useMeeting } from '../context/MeetingContext';

// ─────────────────────────────────────────────────────────────
// Utilitaires
// ─────────────────────────────────────────────────────────────
const PALETTE = ['#2563eb','#0891b2','#059669','#7c3aed','#be185d','#b45309','#dc2626','#0284c7','#4f46e5','#0f766e'];
function colorFor(str = '') {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (str.charCodeAt(i) + ((h << 5) - h));
  return PALETTE[Math.abs(h) % PALETTE.length];
}
function fmt(ms) {
  if (!ms || ms <= 0) return '0s';
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}
function fmtClock(ts) {
  if (!ts) return '--:--';
  return new Date(ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}
function fmtClockSec(ts) {
  if (!ts) return '--:--';
  return new Date(ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// Calcule le temps total passé dans la réunion (toutes sessions cumulées)
function totalSessionMs(sessions = [], nowMs = Date.now()) {
  return sessions.reduce((acc, s) => acc + Math.max(0, (s.leaveTime || nowMs) - s.joinTime), 0);
}

// ─────────────────────────────────────────────────────────────
// Sous-composants
// ─────────────────────────────────────────────────────────────
function Bar({ value, max, color }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div style={{ flex: 1, height: 7, borderRadius: 9999, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 9999, transition: 'width 0.5s' }} />
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 13, padding: '13px', display: 'flex', flexDirection: 'column', gap: 7 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: color + '1a', border: `1px solid ${color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon style={{ width: 14, height: 14, color }} />
        </div>
        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px' }}>{label}</span>
      </div>
      <div style={{ color: '#fff', fontSize: 18, fontWeight: 700 }}>{value}</div>
      {sub && <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10 }}>{sub}</div>}
    </div>
  );
}

function SectionTitle({ icon: Icon, label, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
      <Icon style={{ width: 13, height: 13, color }} />
      <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>{label}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Export PDF avec historique de sessions
// ─────────────────────────────────────────────────────────────
function doExportPDF({ stats, list, chatMessages, meetingStartTime, roomName, participantSessions }) {
  const now      = new Date();
  const elapsed  = meetingStartTime ? now - new Date(meetingStartTime) : 0;
  const totalSpk = Object.values(stats.speakTime).reduce((s, v) => s + v, 0);

  const rows = list.map((p, i) => {
    const name     = p.name || p.identity || '?';
    const spk      = stats.speakTime[p.identity] || 0;
    const pct      = totalSpk > 0 ? Math.round((spk / totalSpk) * 100) : 0;
    const msgs     = stats.messages[p.identity] || 0;
    const hands    = stats.hands[p.identity] || 0;
    const sessions = participantSessions?.[p.identity] || [];
    const total    = totalSessionMs(sessions, now.getTime());
    const first    = sessions[0]?.joinTime ? fmtClock(sessions[0].joinTime) : '--';
    const bg       = i % 2 === 0 ? '#f8faff' : '#fff';
    return `<tr style="background:${bg}">
      <td style="padding:9px 12px;border-bottom:1px solid #e5eaf5;color:#1a2b5c;font-weight:600">${i + 1}</td>
      <td style="padding:9px 12px;border-bottom:1px solid #e5eaf5;color:#1a2b5c">${name}</td>
      <td style="padding:9px 12px;border-bottom:1px solid #e5eaf5;color:#2563eb;font-weight:600">${fmt(spk)} (${pct}%)</td>
      <td style="padding:9px 12px;border-bottom:1px solid #e5eaf5;color:#0891b2">${msgs}</td>
      <td style="padding:9px 12px;border-bottom:1px solid #e5eaf5;color:#059669">${hands}</td>
      <td style="padding:9px 12px;border-bottom:1px solid #e5eaf5;color:#64748b">${first}</td>
      <td style="padding:9px 12px;border-bottom:1px solid #e5eaf5;color:#7c3aed;font-weight:600">${fmt(total)}</td>
      <td style="padding:9px 12px;border-bottom:1px solid #e5eaf5;color:#94a3b8">${sessions.length}</td>
    </tr>`;
  }).join('');

  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"/><title>Rapport — ${roomName}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;color:#1e293b;background:#fff}
.page{max-width:900px;margin:0 auto;padding:36px}.header{text-align:center;margin-bottom:26px;padding-bottom:16px;border-bottom:3px solid #1a2b5c}
.brand{font-size:20px;font-weight:800;color:#1a2b5c}.sub{font-size:11px;color:#2563eb;font-weight:600;margin-top:4px}
.code{display:inline-block;background:#1a2b5c;color:#fff;font-size:10px;font-weight:700;padding:3px 10px;border-radius:99px;margin-top:6px;letter-spacing:.5px}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin-bottom:20px}
.card{background:#f0f4ff;border:1px solid #d1dbff;border-radius:9px;padding:11px}
.cl{font-size:9px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.8px;margin-bottom:3px}
.cv{font-size:14px;font-weight:700;color:#1a2b5c}
.stitle{font-size:10px;font-weight:700;color:#1a2b5c;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px}
table{width:100%;border-collapse:collapse;border-radius:7px;overflow:hidden;box-shadow:0 1px 5px rgba(26,43,92,.1)}
thead{background:#1a2b5c}thead th{padding:8px 10px;color:#fff;font-size:9px;text-align:left;font-weight:700;text-transform:uppercase;letter-spacing:.7px}
.footer{margin-top:22px;text-align:center;font-size:10px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:12px}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head>
<body><div class="page">
<div class="header"><div class="brand">Jokko Client Meet</div><div class="sub">Rapport analytique de réunion</div><span class="code">CODE : ${roomName}</span></div>
<div class="grid">
<div class="card"><div class="cl">Date</div><div class="cv" style="font-size:10px">${now.toLocaleDateString('fr-FR',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</div></div>
<div class="card"><div class="cl">Durée totale</div><div class="cv">${fmt(elapsed)}</div></div>
<div class="card"><div class="cl">Participants</div><div class="cv">${list.length}</div></div>
<div class="card"><div class="cl">Début</div><div class="cv">${fmtClock(meetingStartTime)}</div></div>
<div class="card"><div class="cl">Fin / Export</div><div class="cv">${fmtClock(now)}</div></div>
<div class="card"><div class="cl">Messages chat</div><div class="cv">${chatMessages.length}</div></div>
</div>
<div class="stitle" style="margin-bottom:9px">Détail par participant</div>
<table><thead><tr><th>#</th><th>Nom</th><th>Tps parole</th><th>Msgs</th><th>Mains</th><th>1re cnx</th><th>Tps total réunion</th><th>Sessions</th></tr></thead>
<tbody>${rows}</tbody></table>
<div class="footer">Généré le ${now.toLocaleString('fr-FR')} · Jokko Client Meet</div>
</div></body></html>`;

  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(html); win.document.close();
  setTimeout(() => win.print(), 500);
}

// ─────────────────────────────────────────────────────────────
// Panneau principal — structure fixed header + corps scrollable
// ─────────────────────────────────────────────────────────────
export default function StatsPanel({ onClose, stats }) {
  const { participants, chatMessages, meetingStartTime, roomName, participantSessions } = useMeeting();
  const [elapsed, setElapsed] = useState(0);
  const [nowMs,   setNowMs]   = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => {
      setElapsed(meetingStartTime ? Date.now() - new Date(meetingStartTime).getTime() : 0);
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(t);
  }, [meetingStartTime]);

  const list       = Array.from(participants.values()).filter(Boolean);
  const totalSpk   = Object.values(stats.speakTime).reduce((s, v) => s + v, 0);
  const maxSpk     = Math.max(...Object.values(stats.speakTime), 1);
  const totalMsgs  = chatMessages.length;
  const totalHands = Object.values(stats.hands).reduce((s, v) => s + v, 0);
  const activeCount = list.filter(p => (stats.speakTime[p.identity] || 0) > 0).length;

  let topSpeaker = null, topTime = 0;
  list.forEach(p => { const t = stats.speakTime[p.identity] || 0; if (t > topTime) { topTime = t; topSpeaker = p.name || p.identity; } });

  const engagementScore = list.length > 0
    ? Math.min(100, Math.round((totalMsgs * 5 + totalHands * 10 + (totalSpk > 0 ? 30 : 0)) / Math.max(list.length, 1)))
    : 0;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 60,
      background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
    }}>
      {/* ── Boîte principale — hauteur fixe, corps scrollable ── */}
      <div style={{
        background: '#0d1b3e', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 20, width: '100%', maxWidth: 720,
        // Hauteur max = 92% de la vue — ne déborde jamais
        height: 'min(92vh, 840px)',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 28px 70px rgba(0,0,0,0.7)',
        overflow: 'hidden', // empêche tout débordement
      }}>

        {/* ── Header FIXE ── */}
        <div style={{
          flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '15px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(37,99,235,0.18)', border: '1px solid rgba(37,99,235,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp style={{ width: 16, height: 16, color: '#2563eb' }} />
            </div>
            <div>
              <h2 style={{ color: '#fff', fontSize: 14, fontWeight: 700, margin: 0 }}>Tableau de bord</h2>
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, margin: 0 }}>Analytique en temps réel · {roomName}</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => doExportPDF({ stats, list, chatMessages, meetingStartTime, roomName, participantSessions })}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 9, border: '1px solid rgba(37,99,235,0.4)', background: 'rgba(37,99,235,0.15)', color: '#60a5fa', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
            >
              <Download style={{ width: 13, height: 13 }} /> Exporter PDF
            </button>
            <button
              onClick={onClose}
              style={{ width: 34, height: 34, borderRadius: 9, border: 'none', background: 'rgba(255,255,255,0.07)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)' }}
            >
              <X style={{ width: 15, height: 15 }} />
            </button>
          </div>
        </div>

        {/* ── Corps SCROLLABLE — toutes les sections ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 20, minHeight: 0 }}>

          {/* Métriques globales */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 9 }}>
            <MetricCard icon={Clock}         label="Durée"        value={fmt(elapsed)}            sub={`Début ${fmtClock(meetingStartTime)}`} color="#2563eb" />
            <MetricCard icon={Users}         label="Participants" value={list.length}              sub={`${activeCount} actifs`}               color="#0891b2" />
            <MetricCard icon={MessageSquare} label="Messages"     value={totalMsgs}               sub="dans le chat"                          color="#059669" />
            <MetricCard icon={Mic}           label="Tps parole"   value={fmt(totalSpk)}           sub="total cumulé"                          color="#7c3aed" />
            <MetricCard icon={Hand}          label="Mains levées" value={totalHands}              sub="total réunion"                         color="#b45309" />
            <MetricCard icon={Activity}      label="Engagement"   value={`${engagementScore}/100`} sub={engagementScore > 60 ? 'Très actif' : engagementScore > 30 ? 'Modéré' : 'Faible'} color="#be185d" />
          </div>

          {/* Temps de parole */}
          <div>
            <SectionTitle icon={Mic} label="Temps de parole par participant" color="#2563eb" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {list.length === 0
                ? <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, textAlign: 'center', padding: '12px 0' }}>Aucun participant</p>
                : list.slice().sort((a, b) => (stats.speakTime[b.identity] || 0) - (stats.speakTime[a.identity] || 0)).map((p, i) => {
                    const name  = p.name || p.identity || '?';
                    const spk   = stats.speakTime[p.identity] || 0;
                    const pct   = totalSpk > 0 ? Math.round((spk / totalSpk) * 100) : 0;
                    const color = colorFor(name);
                    return (
                      <div key={p.identity} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                        {i === 0 && topTime > 0
                          ? <Award style={{ width: 13, height: 13, color: '#f59e0b', flexShrink: 0 }} />
                          : <span style={{ width: 13, color: 'rgba(255,255,255,0.2)', fontSize: 10, flexShrink: 0, textAlign: 'center' }}>{i + 1}</span>}
                        <div style={{ width: 26, height: 26, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                          {name.slice(0, 2).toUpperCase()}
                        </div>
                        <span style={{ color: '#fff', fontSize: 11, fontWeight: 600, minWidth: 80, maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                        <Bar value={spk} max={maxSpk} color={color} />
                        <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, minWidth: 34, textAlign: 'right' }}>{fmt(spk)}</span>
                        <span style={{ color, fontSize: 10, fontWeight: 700, minWidth: 28, textAlign: 'right' }}>{pct}%</span>
                      </div>
                    );
                  })}
            </div>
          </div>

          {/* ── HISTORIQUE DE PRÉSENCE — sessions join/leave ── */}
          <div>
            <SectionTitle icon={Clock} label="Historique de présence (connexions / déconnexions)" color="#0891b2" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {list.map(p => {
                const name     = p.name || p.identity || '?';
                const color    = colorFor(name);
                const sessions = participantSessions?.[p.identity] || [];
                const isOnline = sessions.length > 0 && !sessions[sessions.length - 1].leaveTime;
                const totalMs  = totalSessionMs(sessions, nowMs);

                return (
                  <div key={p.identity} style={{
                    borderRadius: 13, padding: '11px 13px',
                    background: 'rgba(255,255,255,0.03)',
                    border: `1px solid ${isOnline ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.07)'}`,
                  }}>
                    {/* Ligne résumé */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: sessions.length > 0 ? 9 : 0 }}>
                      <div style={{ width: 26, height: 26, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                        {name.slice(0, 2).toUpperCase()}
                      </div>
                      <span style={{ color: '#fff', fontSize: 12, fontWeight: 600, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                      {/* Statut en ligne */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 99, background: isOnline ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.06)', border: `1px solid ${isOnline ? 'rgba(34,197,94,0.25)' : 'rgba(255,255,255,0.09)'}` }}>
                        <div style={{ width: 5, height: 5, borderRadius: '50%', background: isOnline ? '#4ade80' : 'rgba(255,255,255,0.25)' }} />
                        <span style={{ fontSize: 9, fontWeight: 700, color: isOnline ? '#4ade80' : 'rgba(255,255,255,0.3)' }}>{isOnline ? 'En ligne' : 'Déconnecté'}</span>
                      </div>
                      {/* Temps total dans la réunion */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'rgba(255,255,255,0.45)', fontSize: 10 }}>
                        <Clock style={{ width: 10, height: 10 }} />
                        <span style={{ fontWeight: 700 }}>{fmt(totalMs)}</span>
                      </div>
                      {/* Badge si plusieurs sessions (reconnexions) */}
                      {sessions.length > 1 && (
                        <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 99, background: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.25)' }}>
                          {sessions.length} sessions
                        </span>
                      )}
                    </div>

                    {/* Détail de chaque session (connexion → déconnexion) */}
                    {sessions.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, paddingLeft: 35 }}>
                        {sessions.map((s, idx) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 10 }}>
                            <span style={{ color: 'rgba(255,255,255,0.18)', minWidth: 14 }}>#{idx + 1}</span>
                            {/* Heure de connexion */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#4ade80' }}>
                              <LogIn style={{ width: 10, height: 10 }} />
                              <span style={{ fontWeight: 600 }}>{fmtClockSec(s.joinTime)}</span>
                            </div>
                            <span style={{ color: 'rgba(255,255,255,0.15)' }}>→</span>
                            {/* Heure de déconnexion ou en cours */}
                            {s.leaveTime
                              ? <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#f87171' }}>
                                  <LogOut style={{ width: 10, height: 10 }} />
                                  <span style={{ fontWeight: 600 }}>{fmtClockSec(s.leaveTime)}</span>
                                </div>
                              : <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#4ade80' }}>
                                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#4ade80', animation: 'statsPulse 1.5s ease-in-out infinite' }} />
                                  <span>En cours</span>
                                </div>
                            }
                            {/* Durée de la session */}
                            <span style={{ color: 'rgba(255,255,255,0.22)', marginLeft: 2 }}>
                              ({fmt((s.leaveTime || nowMs) - s.joinTime)})
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    {sessions.length === 0 && (
                      <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 10, paddingLeft: 35, marginTop: 4 }}>Aucune session enregistrée</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Engagement individuel */}
          <div>
            <SectionTitle icon={TrendingUp} label="Engagement individuel" color="#059669" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {list.map(p => {
                const name  = p.name || p.identity || '?';
                const msgs  = stats.messages[p.identity] || 0;
                const hands = stats.hands[p.identity] || 0;
                const spk   = stats.speakTime[p.identity] || 0;
                const color = colorFor(name);
                const score = Math.min(10, Math.round(msgs * 0.5 + hands + (spk > 0 ? 3 : 0)));
                return (
                  <div key={p.identity} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 12px', borderRadius: 11, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <div style={{ width: 26, height: 26, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                      {name.slice(0, 2).toUpperCase()}
                    </div>
                    <span style={{ color: '#fff', fontSize: 11, fontWeight: 600, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexShrink: 0 }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ color: '#60a5fa', fontSize: 12, fontWeight: 700 }}>{msgs}</div>
                        <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: 9 }}>msgs</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ color: '#f59e0b', fontSize: 12, fontWeight: 700 }}>{hands}</div>
                        <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: 9 }}>mains</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ color: '#4ade80', fontSize: 12, fontWeight: 700 }}>{fmt(spk)}</div>
                        <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: 9 }}>parole</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        {Array.from({ length: 10 }).map((_, i) => (
                          <div key={i} style={{ width: 4, height: 12, borderRadius: 3, background: i < score ? color : 'rgba(255,255,255,0.08)' }} />
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Performance */}
          <div>
            <SectionTitle icon={Percent} label="Performance de la réunion" color="#7c3aed" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
              {[
                { label: 'Participation vocale', value: list.length > 0 ? Math.round((activeCount / list.length) * 100) : 0, color: '#2563eb' },
                { label: 'Répartition équitable', value: (() => {
                    if (list.length < 2) return 100;
                    const times = list.map(p => stats.speakTime[p.identity] || 0);
                    const avg = times.reduce((s, v) => s + v, 0) / times.length;
                    if (avg === 0) return 0;
                    const cv = Math.sqrt(times.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / times.length) / avg;
                    return Math.max(0, Math.round((1 - Math.min(cv, 1)) * 100));
                  })(), color: '#059669' },
                { label: 'Interactivité chat', value: list.length > 0 ? Math.min(100, Math.round((totalMsgs / (list.length * 3)) * 100)) : 0, color: '#0891b2' },
                { label: 'Score global', value: engagementScore, color: '#7c3aed' },
              ].map(item => (
                <div key={item.label} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 11, padding: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>{item.label}</span>
                    <span style={{ color: item.color, fontSize: 13, fontWeight: 700 }}>{item.value}%</span>
                  </div>
                  <Bar value={item.value} max={100} color={item.color} />
                </div>
              ))}
            </div>
          </div>

          {/* Top speaker */}
          {topSpeaker && topTime > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 15px', borderRadius: 13, background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)' }}>
              <Award style={{ width: 20, height: 20, color: '#f59e0b', flexShrink: 0 }} />
              <div>
                <p style={{ color: '#f59e0b', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 2 }}>Orateur principal</p>
                <p style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>{topSpeaker}</p>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>{fmt(topTime)} de prise de parole</p>
              </div>
            </div>
          )}

        </div>{/* fin corps scrollable */}
      </div>

      <style>{`@keyframes statsPulse { 0%,100%{opacity:1} 50%{opacity:.3} }`}</style>
    </div>
  );
}