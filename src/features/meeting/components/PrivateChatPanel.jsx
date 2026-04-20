// src/features/meeting/components/PrivateChatPanel.jsx
// FIX : 
// 1. Le store module-level persiste entre fermetures/ouvertures du panneau
// 2. L'écoute des messages se fait via MeetingContext (room) même panneau fermé
//    → les messages arrivent toujours, peu importe si le panneau est ouvert
// 3. roomName ne peut plus être vide car on utilise roomNameRef via le context

import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, ChevronLeft, Lock, Search, MessageSquare } from 'lucide-react';
import { useMeeting } from '../context/MeetingContext';

// ── Store persistant (module-level) ──────────────────────────────────────────
// Survit aux re-renders ET aux montages/démontages du composant.
const _store = new Map();

function storeKey(roomName, identity) { return `${roomName}::${identity}`; }
function getConv(roomName, identity) { return _store.get(storeKey(roomName, identity)) || []; }
function addMsg(roomName, identity, msg) {
  const key = storeKey(roomName, identity);
  _store.set(key, [...(_store.get(key) || []), msg]);
}

// ── Badges non-lus (module-level aussi) ──────────────────────────────────────
// Survit aux fermetures du panneau pour que ControlsBar puisse les afficher
const _unreadStore = new Map(); // Map<identity, count>
const _unreadListeners = new Set(); // callbacks à appeler lors d'un changement

function getUnread(identity) { return _unreadStore.get(identity) || 0; }
function setUnread(identity, count) {
  if (count === 0) _unreadStore.delete(identity);
  else _unreadStore.set(identity, count);
  _unreadListeners.forEach(fn => fn());
}
function addUnread(identity) { setUnread(identity, getUnread(identity) + 1); }
function getTotalUnread() {
  let total = 0;
  _unreadStore.forEach(v => total += v);
  return total;
}

// Hook utilisable depuis ControlsBar pour le badge global
export function usePrivateChatUnread() {
  const [total, setTotal] = useState(getTotalUnread());
  useEffect(() => {
    const update = () => setTotal(getTotalUnread());
    _unreadListeners.add(update);
    return () => _unreadListeners.delete(update);
  }, []);
  return total;
}

// ── Couleurs avatar ────────────────────────────────────────────────────────
const COLORS = ['#2563eb','#7c3aed','#0891b2','#059669','#be185d','#b45309','#dc2626','#1a2b5c'];
function colorFromName(name = '') {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return COLORS[Math.abs(h) % COLORS.length];
}
function fmtTime(ts) {
  return new Date(ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}
function Avatar({ name, size = 32 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, background: colorFromName(name), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: Math.floor(size * 0.38) + 'px', fontWeight: 700, color: '#fff' }}>
      {(name || '?').slice(0, 2).toUpperCase()}
    </div>
  );
}

export default function PrivateChatPanel({ onClose }) {
  const { participants, localParticipant, displayName, publish, room, roomName } = useMeeting();

  // version force un re-render quand le store change
  const [version, setVersion] = useState(0);
  const [activeContact, setActiveContact] = useState(null);
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');
  // Unread local (synchronisé avec _unreadStore)
  const [unreadMap, setUnreadMap] = useState(() => {
    const m = {};
    _unreadStore.forEach((v, k) => { m[k] = v; });
    return m;
  });

  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const activeContactRef = useRef(null);
  // roomName peut être vide au premier rendu → on garde une ref à jour
  const roomNameRef = useRef(roomName);
  useEffect(() => { roomNameRef.current = roomName; }, [roomName]);
  useEffect(() => { activeContactRef.current = activeContact; }, [activeContact]);

  const bump = useCallback(() => setVersion(v => v + 1), []);

  // Sync unread depuis le store module-level
  const syncUnread = useCallback(() => {
    const m = {};
    _unreadStore.forEach((v, k) => { m[k] = v; });
    setUnreadMap(m);
  }, []);

  useEffect(() => {
    _unreadListeners.add(syncUnread);
    return () => _unreadListeners.delete(syncUnread);
  }, [syncUnread]);

  // Contacts = tous sauf moi
  const contacts = Array.from(participants.values()).filter(p => p && !p.isLocal);
  const filtered = contacts.filter(p =>
    (p.name || p.identity || '').toLowerCase().includes(search.toLowerCase())
  );

  // ── Écoute des messages privés entrants ───────────────────────────────────
  useEffect(() => {
    if (!room) return;
    const onData = (payload, participant) => {
      try {
        const msg = JSON.parse(new TextDecoder().decode(payload));
        if (msg.type !== 'private_chat') return;
        if (msg.target && msg.target !== localParticipant?.identity) return;

        const fromId = participant?.identity;
        const fromName = participant?.name || fromId || 'Participant';
        const rn = roomNameRef.current;
        if (!rn || !fromId) return;

        addMsg(rn, fromId, {
          id: msg.id || Date.now(), from: fromId, fromName,
          text: msg.text, ts: Date.now(), isMe: false,
        });
        bump();

        // Badge seulement si la conversation n'est pas ouverte
        if (activeContactRef.current !== fromId) {
          addUnread(fromId);
        }
      } catch {}
    };
    room.on('dataReceived', onData);
    return () => room.off('dataReceived', onData);
  }, [room, localParticipant, bump]);

  // Scroll bas à chaque nouveau message
  useEffect(() => {
    if (activeContact) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [version, activeContact]);

  // Focus input à l'ouverture d'une conversation
  useEffect(() => {
    if (activeContact) setTimeout(() => inputRef.current?.focus(), 80);
  }, [activeContact]);

  const openConv = (identity) => {
    setActiveContact(identity);
    setUnread(identity, 0); // efface badge dans le store
    setText('');
  };

  // ── Envoi d'un message ────────────────────────────────────────────────────
  const send = useCallback(async (e) => {
    e?.preventDefault();
    const rn = roomNameRef.current;
    if (!text.trim() || !activeContact || !rn) return;
    const msg = {
      id: Date.now(), from: localParticipant?.identity,
      fromName: displayName || 'Vous', text: text.trim(), ts: Date.now(), isMe: true
    };
    addMsg(rn, activeContact, msg);
    bump();
    setText('');
    await publish({ type: 'private_chat', target: activeContact, text: msg.text, id: msg.id });
  }, [text, activeContact, localParticipant, displayName, publish, bump]);

  // Données dérivées
  const activePart = contacts.find(p => p.identity === activeContact);
  const rn = roomName || roomNameRef.current;
  const activeMessages = rn && activeContact ? getConv(rn, activeContact) : [];
  const totalUnread = Object.values(unreadMap).reduce((a, b) => a + b, 0);
  const lastMsg = (identity) => {
    if (!rn) return null;
    const c = getConv(rn, identity);
    return c.length ? c[c.length - 1] : null;
  };

  return (
    <aside style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', background: '#0e1836', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0, background: '#0a1428' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {activeContact && (
            <button onClick={() => setActiveContact(null)} style={{ width: 28, height: 28, borderRadius: 8, border: 'none', background: 'rgba(255,255,255,0.07)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.6)' }}>
              <ChevronLeft style={{ width: 16, height: 16 }} />
            </button>
          )}
          <Lock style={{ width: 14, height: 14, color: '#60a5fa' }} />
          <span style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>
            {activeContact && activePart ? (activePart.name || activePart.identity) : 'Messages privés'}
          </span>
          {!activeContact && totalUnread > 0 && (
            <span style={{ width: 18, height: 18, background: '#ef4444', color: '#fff', fontSize: 10, fontWeight: 700, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {totalUnread > 9 ? '9+' : totalUnread}
            </span>
          )}
        </div>
        <button onClick={onClose} style={{ padding: 6, borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', color: 'rgba(255,255,255,0.45)', display: 'flex' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#fff'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; }}>
          <X style={{ width: 16, height: 16 }} />
        </button>
      </div>

      {/* LISTE DES CONTACTS */}
      {!activeContact && (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: '8px 12px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <Search style={{ width: 13, height: 13, color: 'rgba(255,255,255,0.35)', flexShrink: 0 }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher…"
                style={{ background: 'none', border: 'none', outline: 'none', color: '#fff', fontSize: 12, width: '100%', caretColor: '#60a5fa' }} />
              {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', padding: 0, display: 'flex' }}><X style={{ width: 12, height: 12 }} /></button>}
            </div>
          </div>
          <div style={{ margin: '8px 12px', padding: '8px 12px', borderRadius: 10, background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.18)', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <Lock style={{ width: 11, height: 11, color: '#60a5fa', flexShrink: 0, marginTop: 1 }} />
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, lineHeight: 1.5, margin: 0 }}>Messages privés — visibles uniquement par vous et votre interlocuteur.</p>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '4px 8px' }}>
            {filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 16px', color: 'rgba(255,255,255,0.3)' }}>
                <MessageSquare style={{ width: 32, height: 32, margin: '0 auto 10px', opacity: 0.2 }} />
                <p style={{ fontSize: 13 }}>{search ? 'Aucun participant trouvé' : 'Aucun autre participant'}</p>
              </div>
            ) : filtered.map(p => {
              const name = p.name || p.identity || 'Participant';
              const lm = lastMsg(p.identity);
              const badge = unreadMap[p.identity] || 0;
              const hasNew = badge > 0;
              return (
                <button key={p.identity} onClick={() => openConv(p.identity)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px', borderRadius: 12, border: 'none', background: hasNew ? 'rgba(37,99,235,0.12)' : 'transparent', cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s', borderLeft: hasNew ? '2px solid #2563eb' : '2px solid transparent' }}
                  onMouseEnter={e => !hasNew && (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                  onMouseLeave={e => !hasNew && (e.currentTarget.style.background = 'transparent')}>
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <Avatar name={name} size={38} />
                    <span style={{ position: 'absolute', bottom: 1, right: 1, width: 8, height: 8, borderRadius: '50%', background: '#22c55e', border: '1.5px solid #0e1836' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                      <span style={{ color: '#fff', fontSize: 13, fontWeight: hasNew ? 700 : 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                      {lm && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>{fmtTime(lm.ts)}</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4, marginTop: 2 }}>
                      <span style={{ color: hasNew ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.35)', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {lm ? (lm.isMe ? `Vous : ${lm.text}` : lm.text) : 'Démarrer une conversation…'}
                      </span>
                      {badge > 0 && <span style={{ minWidth: 18, height: 18, padding: '0 4px', background: '#2563eb', color: '#fff', fontSize: 10, fontWeight: 700, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{badge > 9 ? '9+' : badge}</span>}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* CONVERSATION */}
      {activeContact && (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          {activePart && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0, background: 'rgba(255,255,255,0.02)' }}>
              <div style={{ position: 'relative' }}>
                <Avatar name={activePart.name || activePart.identity} size={32} />
                <span style={{ position: 'absolute', bottom: 0, right: 0, width: 8, height: 8, borderRadius: '50%', background: '#22c55e', border: '1.5px solid #0e1836' }} />
              </div>
              <div>
                <p style={{ color: '#fff', fontSize: 13, fontWeight: 600, margin: 0 }}>{activePart.name || activePart.identity}</p>
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, margin: 0 }}>En ligne · Message privé chiffré</p>
              </div>
            </div>
          )}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {activeMessages.length === 0 && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, textAlign: 'center', padding: '20px 16px' }}>
                <div style={{ width: 52, height: 52, borderRadius: 16, background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Lock style={{ width: 22, height: 22, color: '#60a5fa' }} />
                </div>
                <div>
                  <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 600, margin: '0 0 4px' }}>Conversation privée</p>
                  <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, lineHeight: 1.5, margin: 0 }}>
                    Ce message sera visible uniquement par<br />
                    <strong style={{ color: 'rgba(255,255,255,0.5)' }}>{activePart?.name || activePart?.identity}</strong>
                  </p>
                </div>
              </div>
            )}
            {activeMessages.map((m, i) => {
              const showAvatar = !m.isMe && (i === 0 || activeMessages[i - 1]?.isMe !== m.isMe);
              return (
                <div key={m.id} style={{ display: 'flex', gap: 8, flexDirection: m.isMe ? 'row-reverse' : 'row', alignItems: 'flex-end' }}>
                  {!m.isMe && <div style={{ width: 24, flexShrink: 0, marginBottom: 2 }}>{showAvatar && <Avatar name={m.fromName} size={24} />}</div>}
                  <div style={{ maxWidth: '75%', display: 'flex', flexDirection: 'column', alignItems: m.isMe ? 'flex-end' : 'flex-start', gap: 2 }}>
                    <div style={{ padding: '8px 12px', borderRadius: m.isMe ? '16px 4px 16px 16px' : '4px 16px 16px 16px', background: m.isMe ? 'linear-gradient(135deg,#1d4ed8,#2563eb)' : 'rgba(255,255,255,0.09)', color: '#fff', fontSize: 13, lineHeight: 1.5 }}>
                      {m.text}
                    </div>
                    <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 9 }}>{fmtTime(m.ts)}</span>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
          <form onSubmit={send} style={{ padding: '10px 12px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', gap: 8, alignItems: 'flex-end', flexShrink: 0, background: 'rgba(0,0,0,0.15)' }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: '0 12px', transition: 'border-color 0.15s' }}>
              <input ref={inputRef} value={text} onChange={e => setText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder="Message privé…"
                style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#fff', fontSize: 13, padding: '10px 0', caretColor: '#60a5fa' }}
                onFocus={e => e.target.closest('div').style.borderColor = 'rgba(37,99,235,0.5)'}
                onBlur={e => e.target.closest('div').style.borderColor = 'rgba(255,255,255,0.12)'} />
            </div>
            <button type="submit" disabled={!text.trim()} style={{ width: 38, height: 38, borderRadius: 10, border: 'none', flexShrink: 0, background: text.trim() ? '#2563eb' : 'rgba(255,255,255,0.06)', cursor: text.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
              onMouseEnter={e => text.trim() && (e.currentTarget.style.background = '#1d4ed8')}
              onMouseLeave={e => text.trim() && (e.currentTarget.style.background = '#2563eb')}>
              <Send style={{ width: 15, height: 15, color: text.trim() ? '#fff' : 'rgba(255,255,255,0.25)' }} />
            </button>
          </form>
        </div>
      )}
    </aside>
  );
}