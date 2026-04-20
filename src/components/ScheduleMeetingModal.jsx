// src/components/ScheduleMeetingModal.jsx
import { useState } from 'react';
import { X, Calendar, Clock, Users, Plus, Trash2, Globe, Lock } from 'lucide-react';

const PRIMARY = '#2F8F6B';

function generateCode() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const seg = (n) => Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${seg(3)}-${seg(4)}-${seg(3)}`;
}

function sanitizeCode(raw) {
  return raw.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 40);
}

export default function ScheduleMeetingModal({ onClose, organizerName = '' }) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState(60);
  const [description, setDescription] = useState('');
  const [emails, setEmails] = useState(['']);
  const [customCode, setCustomCode] = useState('');
  const [timezone, setTimezone] = useState('Africa/Dakar');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState('');

  // Mode réunion
  const [roomMode, setRoomMode] = useState('private');

  const addEmail = () => setEmails(p => [...p, '']);
  const removeEmail = (i) => setEmails(p => p.filter((_, x) => x !== i));
  const setEmail = (i, v) => setEmails(p => p.map((e, x) => x === i ? v : e));

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title.trim()) { setError('Le titre est obligatoire.'); return; }
    if (!date) { setError('La date est obligatoire.'); return; }
    if (!time) { setError('L\'heure est obligatoire.'); return; }

    const code = sanitizeCode(customCode.trim()) || generateCode();
    const origin = window.location.origin;
    const joinUrl = `${origin}/prejoin/${code}?role=host&mode=${roomMode}`;

    setLoading(true);
    setError('');

    try {
      const res = await fetch(getApiUrl('/api/schedule'), {   // ← Correction importante
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          date,
          time,
          timezone,
          duration,
          description: description.trim(),
          emails: emails.filter(e => e.trim() && e.includes('@')),
          roomCode: code,
          joinUrl,
          organizerName,
          mode: roomMode,
        }),
      });

      // Meilleure gestion d'erreur
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error('Réponse serveur invalide');
      }

      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors de la planification');
      }

      setSuccess({
        roomCode: code,
        joinUrl,
        message: data.message || 'Réunion planifiée avec succès'
      });

      localStorage.setItem(`room_mode_${code}`, roomMode);
    } catch (err) {
      console.error('Schedule error:', err);
      setError(err.message || 'Erreur lors de la planification.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '10px',
    background: '#f9fafb',
    border: '1.5px solid #e5e7eb',
    color: '#1e293b',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s',
    fontFamily: 'inherit'
  };

  const focusStyle = (e) => { e.target.style.borderColor = PRIMARY; };
  const blurStyle = (e) => { e.target.style.borderColor = '#e5e7eb'; };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ background: '#fff', borderRadius: '20px', width: '100%', maxWidth: '560px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 16px', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: `rgba(47,143,107,0.1)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Calendar style={{ width: 18, height: 18, color: PRIMARY }} />
            </div>
            <div>
              <h2 style={{ color: '#1e293b', fontSize: 16, fontWeight: 800, margin: 0 }}>Planifier une réunion</h2>
              <p style={{ color: '#94a3b8', fontSize: 12, margin: 0 }}>Invitez par email et choisissez le mode</p>
            </div>
          </div>
          <button onClick={onClose} style={{ padding: 8, borderRadius: 8, border: 'none', background: '#f1f5f9', cursor: 'pointer', display: 'flex', color: '#64748b' }}>
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>

        {/* Succès */}
        {success ? (
          <div style={{ padding: '24px' }}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              {/* Logo corrigé */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '30px', justifyContent: 'center' }}>
                <img 
                  src="/senegal.jpg" 
                  alt="Logo Sénégal" 
                  style={{ width: '44px', height: '44px', borderRadius: '12px', objectFit: 'contain', background: '#fff', padding: '2px' }} 
                />
                <span style={{ color: '#1e293b', fontWeight: '700', fontSize: '22px', letterSpacing: '-0.3px' }}>JokkoMeet</span>
              </div>

              <div style={{ width: 56, height: 56, borderRadius: '50%', background: `rgba(47,143,107,0.12)`, border: `2px solid ${PRIMARY}`, margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 24 }}>✅</span>
              </div>
              <h3 style={{ color: '#1e293b', fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Réunion planifiée !</h3>
              <p style={{ color: '#64748b', fontSize: 13 }}>{success.message}</p>
            </div>

            <div style={{ background: '#f8fffe', border: `2px solid ${PRIMARY}`, borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>
              <p style={{ color: '#64748b', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', margin: '0 0 6px' }}>Code de réunion</p>
              <p style={{ color: PRIMARY, fontFamily: 'monospace', fontSize: 22, fontWeight: 900, letterSpacing: 3, margin: '0 0 8px' }}>{success.roomCode}</p>
              <p style={{ color: '#64748b', fontSize: 11, wordBreak: 'break-all', margin: 0 }}>{success.joinUrl}</p>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button 
                onClick={() => navigator.clipboard.writeText(success.joinUrl).catch(() => {})} 
                style={{ flex: 1, padding: '10px', borderRadius: '10px', border: `2px solid ${PRIMARY}`, background: 'transparent', color: PRIMARY, fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
              >
                Copier le lien
              </button>
              <button 
                onClick={onClose} 
                style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', background: PRIMARY, color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
              >
                Fermer
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Titre */}
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Titre de la réunion *</label>
              <input style={inputStyle} placeholder="Ex: Réunion équipe, Point hebdo…" value={title} onChange={e => setTitle(e.target.value)} onFocus={focusStyle} onBlur={blurStyle} required />
            </div>

            {/* Date + Heure */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Date *</label>
                <input type="date" style={inputStyle} value={date} onChange={e => setDate(e.target.value)} onFocus={focusStyle} onBlur={blurStyle} required />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Heure *</label>
                <input type="time" style={inputStyle} value={time} onChange={e => setTime(e.target.value)} onFocus={focusStyle} onBlur={blurStyle} required />
              </div>
            </div>

            {/* Durée */}
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
                <Clock style={{ width: 13, height: 13, display: 'inline', marginRight: 4 }} /> Durée
              </label>
              <select style={{ ...inputStyle, cursor: 'pointer' }} value={duration} onChange={e => setDuration(+e.target.value)}>
                {[15, 30, 45, 60, 90, 120, 180, 240].map(d => (
                  <option key={d} value={d}>
                    {d < 60 ? `${d} minutes` : `${Math.floor(d / 60)}h${d % 60 ? ` ${d % 60}min` : ''}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Mode réunion */}
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 8 }}>Mode de la réunion</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <button type="button" onClick={() => setRoomMode('private')} style={{
                  padding: '12px 10px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                  background: roomMode === 'private' ? `rgba(47,143,107,0.08)` : '#f9fafb',
                  outline: roomMode === 'private' ? `2px solid ${PRIMARY}` : '2px solid #e5e7eb',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5
                }}>
                  <Lock style={{ width: 18, height: 18, color: roomMode === 'private' ? PRIMARY : '#9ca3af' }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: roomMode === 'private' ? PRIMARY : '#6b7280' }}>Privée</span>
                  <span style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center', lineHeight: 1.4 }}>Partage d'écran avec permission</span>
                </button>

                <button type="button" onClick={() => setRoomMode('public')} style={{
                  padding: '12px 10px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                  background: roomMode === 'public' ? `rgba(47,143,107,0.08)` : '#f9fafb',
                  outline: roomMode === 'public' ? `2px solid ${PRIMARY}` : '2px solid #e5e7eb',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5
                }}>
                  <Globe style={{ width: 18, height: 18, color: roomMode === 'public' ? PRIMARY : '#9ca3af' }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: roomMode === 'public' ? PRIMARY : '#6b7280' }}>Publique</span>
                  <span style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center', lineHeight: 1.4 }}>Partage d'écran libre</span>
                </button>
              </div>
              <p style={{ color: '#94a3b8', fontSize: 11, marginTop: 6 }}>
                {roomMode === 'private' 
                  ? '🔒 Les participants demandent la permission à l\'hôte pour partager leur écran.' 
                  : '🌐 Tout le monde peut partager sans permission, même si l\'hôte ne s\'est pas connecté.'}
              </p>
            </div>

            {/* Description */}
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Description / Ordre du jour</label>
              <textarea 
                style={{ ...inputStyle, resize: 'vertical', minHeight: '80px' }} 
                placeholder="Sujets à couvrir, documents à préparer…" 
                value={description} 
                onChange={e => setDescription(e.target.value)} 
                onFocus={focusStyle} 
                onBlur={blurStyle} 
                rows={3} 
              />
            </div>

            {/* Code personnalisé */}
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Code de réunion (optionnel)</label>
              <input 
                style={{ ...inputStyle, fontFamily: 'monospace' }} 
                placeholder="mon-projet (vide = code auto)" 
                value={customCode} 
                onChange={e => setCustomCode(sanitizeCode(e.target.value))} 
                onFocus={focusStyle} 
                onBlur={blurStyle} 
              />
            </div>

            {/* Emails */}
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <Users style={{ width: 14, height: 14 }} /> Inviter par email
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {emails.map((email, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8 }}>
                    <input 
                      type="email" 
                      style={{ ...inputStyle, flex: 1 }} 
                      placeholder="participant@exemple.com" 
                      value={email} 
                      onChange={e => setEmail(i, e.target.value)} 
                      onFocus={focusStyle} 
                      onBlur={blurStyle} 
                    />
                    {emails.length > 1 && (
                      <button 
                        type="button" 
                        onClick={() => removeEmail(i)} 
                        style={{ padding: '8px', borderRadius: '8px', border: 'none', background: 'rgba(239,68,68,0.08)', cursor: 'pointer', color: '#ef4444', display: 'flex' }}
                      >
                        <Trash2 style={{ width: 14, height: 14 }} />
                      </button>
                    )}
                  </div>
                ))}
                <button 
                  type="button" 
                  onClick={addEmail} 
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: '8px', border: `1.5px dashed #d1d5db`, background: 'transparent', color: '#94a3b8', fontSize: 13, cursor: 'pointer' }}
                >
                  <Plus style={{ width: 14, height: 14 }} /> Ajouter un invité
                </button>
              </div>
            </div>

            {error && (
              <p style={{ color: '#ef4444', fontSize: 13, background: 'rgba(239,68,68,0.08)', borderRadius: 8, padding: '8px 12px', margin: 0 }}>
                {error}
              </p>
            )}

            {/* Boutons */}
            <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
              <button 
                type="button" 
                onClick={onClose} 
                style={{ flex: 1, padding: '11px', borderRadius: '10px', border: '1.5px solid #e5e7eb', background: '#fff', color: '#64748b', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
              >
                Annuler
              </button>
              <button 
                type="submit" 
                disabled={loading} 
                style={{ 
                  flex: 2, 
                  padding: '11px', 
                  borderRadius: '10px', 
                  border: 'none', 
                  background: loading ? `rgba(47,143,107,0.5)` : PRIMARY, 
                  color: '#fff', 
                  fontSize: '13px', 
                  fontWeight: 700, 
                  cursor: loading ? 'not-allowed' : 'pointer', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: 8 
                }}
              >
                {loading ? (
                  <>
                    <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    Planification…
                  </>
                ) : (
                  <>
                    <Calendar style={{ width: 15, height: 15 }} /> Planifier la réunion
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}