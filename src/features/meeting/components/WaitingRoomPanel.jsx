// src/features/meeting/components/WaitingRoomPanel.jsx
// Panneau latéral pour l'hôte : liste des participants en salle d'attente
// avec admission individuelle ou en masse, refus, et aperçu du nom.
import { useState } from 'react';
import { Users, CheckCircle, XCircle, Check, UserCheck, UserX, Clock } from 'lucide-react';
import { useMeeting } from '../context/MeetingContext';

function formatWait(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}min`;
}

export default function WaitingRoomPanel({ onAdmit, onReject, waitingList }) {
  const { isHost } = useMeeting();
  const [admitting, setAdmitting] = useState(new Set());
  const [rejecting, setRejecting] = useState(new Set());

  if (!isHost) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100%', padding: '24px', textAlign: 'center', gap: '12px' }}>
      <Users style={{ width: '40px', height: '40px', color: 'rgba(255,255,255,0.12)' }} />
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>Réservé à l'hôte</p>
    </div>
  );

  const handleAdmit = async (identity) => {
    setAdmitting(p => new Set([...p, identity]));
    await onAdmit(identity);
    setAdmitting(p => { const n = new Set(p); n.delete(identity); return n; });
  };

  const handleReject = async (identity) => {
    setRejecting(p => new Set([...p, identity]));
    await onReject(identity);
    setRejecting(p => { const n = new Set(p); n.delete(identity); return n; });
  };

  const admitAll = async () => {
    for (const w of waitingList) await handleAdmit(w.identity);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Header avec compteur */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '22px', height: '22px', borderRadius: '50%',
              background: waitingList.length > 0 ? 'rgba(251,191,36,0.2)' : 'rgba(255,255,255,0.07)',
              border: `1px solid ${waitingList.length > 0 ? 'rgba(251,191,36,0.5)' : 'rgba(255,255,255,0.12)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '11px', fontWeight: '800',
              color: waitingList.length > 0 ? '#fbbf24' : 'rgba(255,255,255,0.3)',
            }}>
              {waitingList.length}
            </div>
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', fontWeight: '600' }}>
              {waitingList.length === 0 ? 'Salle vide' :
               waitingList.length === 1 ? '1 personne en attente' :
               `${waitingList.length} personnes en attente`}
            </span>
          </div>
        </div>

        {/* Tout admettre */}
        {waitingList.length > 1 && (
          <button
            onClick={admitAll}
            style={{
              width: '100%', padding: '9px', borderRadius: '10px', border: 'none',
              background: 'rgba(34,197,94,0.18)', color: '#4ade80',
              fontSize: '12px', fontWeight: '700', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(34,197,94,0.3)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(34,197,94,0.18)'}
          >
            <UserCheck style={{ width: '14px', height: '14px' }} />
            Admettre tout le monde
          </button>
        )}
      </div>

      {/* Liste */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
        {waitingList.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', height: '100%', gap: '12px', textAlign: 'center',
            padding: '40px 20px' }}>
            <div style={{
              width: '60px', height: '60px', borderRadius: '50%',
              background: 'rgba(34,197,94,0.1)', border: '2px solid rgba(34,197,94,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Check style={{ width: '28px', height: '28px', color: '#4ade80' }} />
            </div>
            <div>
              <p style={{ color: '#4ade80', fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>
                Salle d'attente vide
              </p>
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', lineHeight: '1.6' }}>
                Les nouveaux participants apparaîtront ici avant d'être admis dans la réunion.
              </p>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {waitingList.map((w) => {
              const initials = (w.name || '?').slice(0, 2).toUpperCase();
              const isAdm = admitting.has(w.identity);
              const isRej = rejecting.has(w.identity);
              return (
                <div
                  key={w.identity}
                  style={{
                    padding: '14px',
                    borderRadius: '14px',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(251,191,36,0.2)',
                    display: 'flex', alignItems: 'center', gap: '12px',
                    animation: 'wrSlideIn 0.3s cubic-bezier(0.22,1,0.36,1)',
                  }}
                >
                  {/* Avatar */}
                  <div style={{
                    width: '42px', height: '42px', borderRadius: '50%', flexShrink: 0,
                    background: 'linear-gradient(135deg, #1d4ed8, #7c3aed)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '15px', fontWeight: '800', color: '#fff',
                    border: '2px solid rgba(255,255,255,0.15)',
                  }}>
                    {initials}
                  </div>

                  {/* Infos */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: '#fff', fontSize: '13px', fontWeight: '600',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {w.name || w.identity}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
                      <Clock style={{ width: '10px', height: '10px', color: 'rgba(255,255,255,0.3)' }} />
                      <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px' }}>
                        En attente depuis {formatWait(w.ts)}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                    {/* Refuser */}
                    <button
                      onClick={() => handleReject(w.identity)}
                      disabled={isRej || isAdm}
                      title="Refuser"
                      style={{
                        width: '34px', height: '34px', borderRadius: '10px', border: 'none',
                        background: isRej ? 'rgba(239,68,68,0.25)' : 'rgba(239,68,68,0.12)',
                        color: '#f87171', cursor: isRej || isAdm ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'background 0.15s', opacity: isAdm ? 0.5 : 1,
                      }}
                      onMouseEnter={e => !isRej && !isAdm && (e.currentTarget.style.background = 'rgba(239,68,68,0.28)')}
                      onMouseLeave={e => !isRej && !isAdm && (e.currentTarget.style.background = 'rgba(239,68,68,0.12)')}
                    >
                      {isRej
                        ? <div style={{ width: '14px', height: '14px', border: '2px solid rgba(248,113,113,0.4)', borderTopColor: '#f87171', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                        : <UserX style={{ width: '14px', height: '14px' }} />}
                    </button>

                    {/* Admettre */}
                    <button
                      onClick={() => handleAdmit(w.identity)}
                      disabled={isAdm || isRej}
                      title="Admettre"
                      style={{
                        width: '34px', height: '34px', borderRadius: '10px', border: 'none',
                        background: isAdm ? 'rgba(34,197,94,0.35)' : 'rgba(34,197,94,0.18)',
                        color: '#4ade80', cursor: isAdm || isRej ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'background 0.15s', opacity: isRej ? 0.5 : 1,
                      }}
                      onMouseEnter={e => !isAdm && !isRej && (e.currentTarget.style.background = 'rgba(34,197,94,0.32)')}
                      onMouseLeave={e => !isAdm && !isRej && (e.currentTarget.style.background = 'rgba(34,197,94,0.18)')}
                    >
                      {isAdm
                        ? <div style={{ width: '14px', height: '14px', border: '2px solid rgba(74,222,128,0.4)', borderTopColor: '#4ade80', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                        : <UserCheck style={{ width: '14px', height: '14px' }} />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Note bas */}
      {waitingList.length > 0 && (
        <div style={{ padding: '10px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
          <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '11px', textAlign: 'center' }}>
            Les participants refusés ne peuvent pas rejoindre la réunion
          </p>
        </div>
      )}

      <style>{`
        @keyframes wrSlideIn {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}