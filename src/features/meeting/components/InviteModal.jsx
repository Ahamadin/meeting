// src/features/meeting/components/InviteModal.jsx
// Couleurs alignées sur la palette de la salle de réunion (navy + bleu + blanc)
// Correction : API_BASE utilisé pour l'envoi d'email
import { useState } from 'react';
import { X, Copy, Check, Link, Hash, Share2, UserPlus, Mail, Plus, Trash2, Loader2, Send } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || '';

// Palette réunion
const NAVY    = '#0a1428';
const NAVY_L  = '#0f1d3e';
const BLUE    = '#2563eb';
const BLUE_D  = '#1d4ed8';
const WHITE   = '#ffffff';
const BORDER  = 'rgba(255,255,255,0.1)';
const BORDER_A= 'rgba(37,99,235,0.4)';

export default function InviteModal({ roomName, onClose, organizerName = '' }) {
  const joinUrl = `${window.location.origin}/join?room=${roomName}`;

  const [view,       setView]       = useState('share');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedAll,  setCopiedAll]  = useState(false);

  const [emails,  setEmails]  = useState(['']);
  const [sending, setSending] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [sendErr, setSendErr] = useState('');

  const copy = async (text, setter) => {
    try { await navigator.clipboard.writeText(text); setter(true); setTimeout(() => setter(false), 2000); } catch {}
  };

  const copyAll = () => {
    const text = `Rejoignez ma réunion JokkoMeet\n\nCode de réunion : ${roomName}\nLien direct     : ${joinUrl}`;
    copy(text, setCopiedAll);
  };

  const share = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: 'Rejoindre ma réunion JokkoMeet', text: `Code : ${roomName}`, url: joinUrl }); return; } catch {}
    }
    copyAll();
  };

  const addEmail    = () => setEmails(p => [...p, '']);
  const removeEmail = (i) => emails.length > 1 && setEmails(p => p.filter((_, x) => x !== i));
  const setEmail    = (i, v) => setEmails(p => p.map((e, x) => x === i ? v : e));
  const validEmails = emails.map(e => e.trim()).filter(e => e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));

  const sendInvites = async () => {
    if (validEmails.length === 0) { setSendErr('Entrez au moins une adresse email valide.'); return; }
    setSendErr(''); setSending(true);
    try {
      // Utilise API_BASE pour pointer vers le backend (pas le dev server Vite)
      const url = API_BASE ? `${API_BASE}/api/schedule` : '/api/schedule';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Invitation à rejoindre la réunion ${roomName}`,
          date: new Date().toISOString().slice(0, 10),
          time: `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`,
          timezone: 'Africa/Dakar',
          duration: 60,
          description: '',
          emails: validEmails,
          roomCode: roomName,
          joinUrl,
          organizerName: organizerName || 'L\'organisateur',
        }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || 'Erreur'); }
      setSent(true);
      setTimeout(() => { setSent(false); setEmails(['']); }, 3000);
    } catch (err) { setSendErr(err.message || 'Erreur lors de l\'envoi.'); }
    finally { setSending(false); }
  };

  // ── Styles réutilisables ──────────────────────────────────────────────────
  const tabActive   = { background: NAVY_L, color: '#60a5fa', borderBottom: `2px solid ${BLUE}` };
  const tabInactive = { background: 'transparent', color: 'rgba(255,255,255,0.45)', borderBottom: '2px solid transparent' };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(6px)' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: NAVY_L, border: `1px solid ${BORDER}`, borderRadius: '18px', width: '100%', maxWidth: '420px', boxShadow: '0 20px 60px rgba(0,0,0,0.6)', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: `1px solid ${BORDER}`, background: NAVY }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: `rgba(37,99,235,0.2)`, border: `1px solid rgba(37,99,235,0.35)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Share2 style={{ width: '15px', height: '15px', color: '#60a5fa' }} />
            </div>
            <h3 style={{ color: WHITE, fontSize: '15px', fontWeight: '700', margin: 0 }}>Inviter des participants</h3>
          </div>
          <button onClick={onClose} style={{ width: '28px', height: '28px', borderRadius: '7px', border: `1px solid ${BORDER}`, background: 'rgba(255,255,255,0.06)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = WHITE; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
          ><X style={{ width: '13px', height: '13px' }} /></button>
        </div>

        {/* Onglets */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${BORDER}`, background: NAVY }}>
          {[
            { id: 'share', icon: Share2,   label: 'Partager' },
            { id: 'add',   icon: UserPlus, label: 'Ajouter des participants' },
          ].map(({ id, icon: Icon, label }) => (
            <button key={id} onClick={() => { setView(id); setSendErr(''); setSent(false); }}
              style={{ flex: 1, padding: '10px 8px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', transition: 'all 0.15s', ...(view === id ? tabActive : tabInactive) }}>
              <Icon style={{ width: '13px', height: '13px' }} />{label}
            </button>
          ))}
        </div>

        <div style={{ padding: '18px 20px', background: NAVY_L }}>

          {/* ── Vue Partager ── */}
          {view === 'share' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

              {/* Lien */}
              <div>
                <label style={{ color: 'rgba(255,255,255,0.45)', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
                  <Link style={{ width: '10px', height: '10px' }} />Lien de participation
                </label>
                <div style={{ display: 'flex', gap: '7px', alignItems: 'center', padding: '9px 12px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}` }}>
                  <span style={{ color: '#60a5fa', fontSize: '11px', fontFamily: 'monospace', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: '600' }}>{joinUrl}</span>
                  <button onClick={() => copy(joinUrl, setCopiedLink)} style={{ flexShrink: 0, padding: '4px 9px', borderRadius: '7px', border: `1px solid ${copiedLink ? BLUE : BORDER_A}`, background: copiedLink ? BLUE : 'rgba(37,99,235,0.15)', color: WHITE, fontSize: '11px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px', transition: 'all 0.2s' }}>
                    {copiedLink ? <><Check style={{ width: '10px', height: '10px' }} />Copié</> : <><Copy style={{ width: '10px', height: '10px' }} />Copier</>}
                  </button>
                </div>
              </div>

              {/* Code */}
              <div>
                <label style={{ color: 'rgba(255,255,255,0.45)', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
                  <Hash style={{ width: '10px', height: '10px' }} />Code de réunion
                </label>
                <div style={{ display: 'flex', gap: '7px', alignItems: 'center', padding: '10px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}` }}>
                  <span style={{ color: WHITE, fontSize: '20px', fontFamily: 'monospace', fontWeight: '900', letterSpacing: '3px', flex: 1 }}>{roomName}</span>
                  <button onClick={() => copy(roomName, setCopiedCode)} style={{ flexShrink: 0, padding: '4px 9px', borderRadius: '7px', border: `1px solid ${copiedCode ? BLUE : BORDER_A}`, background: copiedCode ? BLUE : 'rgba(37,99,235,0.15)', color: WHITE, fontSize: '11px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px', transition: 'all 0.2s' }}>
                    {copiedCode ? <><Check style={{ width: '10px', height: '10px' }} />Copié</> : <><Copy style={{ width: '10px', height: '10px' }} />Copier</>}
                  </button>
                </div>
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px', marginTop: '4px' }}>Les participants saisissent ce code sur la plateforme.</p>
              </div>

              {/* Bouton partager tout */}
              <button onClick={share} style={{ width: '100%', padding: '11px', borderRadius: '11px', background: copiedAll ? 'rgba(37,99,235,0.15)' : BLUE, color: WHITE, fontSize: '13px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', transition: 'all 0.2s', border: copiedAll ? `1px solid ${BORDER_A}` : 'none' }}
                onMouseEnter={e => !copiedAll && (e.currentTarget.style.background = BLUE_D)}
                onMouseLeave={e => !copiedAll && (e.currentTarget.style.background = BLUE)}
              >
                {copiedAll ? <><Check style={{ width: '15px', height: '15px' }} />Informations copiées !</> : <><Share2 style={{ width: '15px', height: '15px' }} />Partager les informations</>}
              </button>
            </div>
          )}

          {/* ── Vue Ajouter participants (email) ── */}
          {view === 'add' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px', margin: 0 }}>
                Entrez les adresses email des participants — ils recevront le lien et le code de réunion.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {emails.map((email, i) => (
                  <div key={i} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', flex: 1, border: `1.5px solid ${BORDER}`, borderRadius: '9px', overflow: 'hidden', background: 'rgba(255,255,255,0.04)', transition: 'border-color 0.15s' }}>
                      <Mail style={{ width: '13px', height: '13px', color: '#60a5fa', marginLeft: '10px', flexShrink: 0 }} />
                      <input
                        type="email"
                        placeholder={`email${i+1}@exemple.com`}
                        value={email}
                        onChange={e => { setEmail(i, e.target.value); setSendErr(''); setSent(false); }}
                        onFocus={e => e.target.closest('div').style.borderColor = 'rgba(37,99,235,0.5)'}
                        onBlur={e => e.target.closest('div').style.borderColor = BORDER}
                        style={{ flex: 1, padding: '9px 10px', border: 'none', background: 'transparent', color: WHITE, fontSize: '13px', outline: 'none', caretColor: '#60a5fa' }}
                      />
                    </div>
                    {emails.length > 1 && (
                      <button onClick={() => removeEmail(i)} style={{ padding: '7px', borderRadius: '8px', border: `1px solid ${BORDER}`, background: 'rgba(255,255,255,0.04)', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', transition: 'all 0.15s', display: 'flex' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; e.currentTarget.style.color = '#f87171'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; e.currentTarget.style.borderColor = BORDER; }}
                      ><Trash2 style={{ width: '12px', height: '12px' }} /></button>
                    )}
                  </div>
                ))}
                <button onClick={addEmail} style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#60a5fa', fontSize: '12px', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0', fontWeight: '600' }}>
                  <Plus style={{ width: '13px', height: '13px' }} />Ajouter une adresse
                </button>
              </div>

              {validEmails.length > 0 && !sent && (
                <p style={{ color: '#4ade80', fontSize: '11px', fontWeight: '600' }}>✓ {validEmails.length} email(s) valide(s)</p>
              )}

              {sendErr && (
                <div style={{ padding: '8px 12px', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171', fontSize: '12px' }}>{sendErr}</div>
              )}

              {sent && (
                <div style={{ padding: '8px 12px', borderRadius: '8px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', color: '#4ade80', fontSize: '12px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Check style={{ width: '13px', height: '13px' }} />Invitations envoyées avec succès !
                </div>
              )}

              <button
                onClick={sendInvites}
                disabled={sending || validEmails.length === 0}
                style={{ width: '100%', padding: '11px', borderRadius: '11px', border: 'none', background: (sending || validEmails.length === 0) ? 'rgba(255,255,255,0.1)' : BLUE, color: (sending || validEmails.length === 0) ? 'rgba(255,255,255,0.3)' : WHITE, fontSize: '13px', fontWeight: '700', cursor: (sending || validEmails.length === 0) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', transition: 'background 0.15s' }}
                onMouseEnter={e => !(sending || validEmails.length === 0) && (e.currentTarget.style.background = BLUE_D)}
                onMouseLeave={e => !(sending || validEmails.length === 0) && (e.currentTarget.style.background = BLUE)}
              >
                {sending
                  ? <><Loader2 style={{ width: '14px', height: '14px', animation: 'spin 1s linear infinite' }} />Envoi en cours…</>
                  : <><Send style={{ width: '14px', height: '14px' }} />Envoyer les invitations</>}
              </button>
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}