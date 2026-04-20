// src/features/meeting/components/SidePanel.jsx
// Ajout du panneau 'privateChat' — aucune autre logique modifiée
import { useState, useRef, useEffect } from 'react';
import { X, Send, MessageSquare, Users, FileText, BarChart2, Paperclip, Download, Lock } from 'lucide-react';
import { useMeeting } from '../context/MeetingContext';
import { useSidePanel } from './SidePanelContext';
import ParticipantsPanel from './ParticipantsPanel';
import PollPanel         from './PollPanel';
import FilesPanel        from './FilesPanel';
import PrivateChatPanel  from './PrivateChatPanel';

const inputStyle = {
  width: '100%', padding: '10px 14px', borderRadius: '12px',
  background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)',
  color: '#ffffff', fontSize: '13px', outline: 'none', boxSizing: 'border-box',
  transition: 'border-color 0.15s', caretColor: '#fff',
};

// ── Chat public ───────────────────────────────────────────────
function ChatPanel() {
  const { chatMessages, sendChatMessage } = useMeeting();
  const [text, setText] = useState('');
  const bottomRef = useRef(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);
  const send = async (e) => {
    e?.preventDefault();
    if (!text.trim()) return;
    await sendChatMessage(text);
    setText('');
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {chatMessages.length === 0 && (
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.35)', marginTop: '40px' }}>
            <MessageSquare style={{ width: '32px', height: '32px', margin: '0 auto 8px', opacity: 0.3 }} />
            <p style={{ fontSize: '13px' }}>Aucun message</p>
          </div>
        )}
        {chatMessages.map(m => (
          <div key={m.id} style={{ display: 'flex', gap: '8px', flexDirection: m.isMe ? 'row-reverse' : 'row' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0, background: m.isMe ? '#2563eb' : 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', color: '#fff' }}>
              {(m.from || '?').slice(0, 2).toUpperCase()}
            </div>
            <div style={{ maxWidth: '78%', display: 'flex', flexDirection: 'column', alignItems: m.isMe ? 'flex-end' : 'flex-start' }}>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', marginBottom: '3px' }}>{m.from}</span>
              <div style={{ padding: '8px 12px', borderRadius: m.isMe ? '14px 4px 14px 14px' : '4px 14px 14px 14px', background: m.isMe ? '#2563eb' : 'rgba(255,255,255,0.1)', color: '#fff', fontSize: '13px', lineHeight: '1.5' }}>
                {m.text}
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={send} style={{ padding: '12px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: '8px' }}>
        <input style={{ ...inputStyle, flex: 1 }} placeholder="Écrire un message…" value={text}
          onChange={e => setText(e.target.value)}
          onFocus={e => e.target.style.borderColor = 'rgba(37,99,235,0.6)'}
          onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.18)'} />
        <button type="submit" style={{ width: '38px', height: '38px', borderRadius: '10px', border: 'none', background: '#2563eb', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.background = '#1d4ed8'}
          onMouseLeave={e => e.currentTarget.style.background = '#2563eb'}>
          <Send style={{ width: '16px', height: '16px', color: '#fff' }} />
        </button>
      </form>
    </div>
  );
}

// ── Notes ─────────────────────────────────────────────────────
function NotesPanel() {
  const { sharedNote, updateSharedNote, roomName } = useMeeting();
  const downloadNote = () => {
    if (!sharedNote.trim()) return;
    const blob = new Blob([sharedNote], { type: 'text/plain;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `notes-${roomName || 'reunion'}-${new Date().toLocaleDateString('fr-FR').replace(/\//g, '-')}.txt`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '12px', gap: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>Partagée en temps réel avec tous</p>
        <button onClick={downloadNote} disabled={!sharedNote.trim()} title="Télécharger les notes"
          style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 10px', borderRadius: '8px', border: 'none', background: sharedNote.trim() ? 'rgba(37,99,235,0.25)' : 'rgba(255,255,255,0.05)', color: sharedNote.trim() ? '#60a5fa' : 'rgba(255,255,255,0.25)', fontSize: '11px', fontWeight: '600', cursor: sharedNote.trim() ? 'pointer' : 'not-allowed', transition: 'all 0.15s' }}>
          <Download style={{ width: '12px', height: '12px' }} />Télécharger
        </button>
      </div>
      <textarea style={{ flex: 1, resize: 'none', borderRadius: '14px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', color: '#ffffff', fontSize: '13px', lineHeight: '1.6', padding: '14px', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s', caretColor: '#fff' }}
        placeholder="Commencez à écrire une note partagée…"
        value={sharedNote} onChange={e => updateSharedNote(e.target.value)}
        onFocus={e => e.target.style.borderColor = 'rgba(37,99,235,0.5)'}
        onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.15)'} />
      <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '11px', textAlign: 'right' }}>{sharedNote.length} caractère{sharedNote.length !== 1 ? 's' : ''}</p>
    </div>
  );
}

// ── Config panneaux (privateChat ajouté) ─────────────────────
const PANELS = {
  chat:         { label: 'Chat',           icon: MessageSquare, Component: ChatPanel         },
  participants: { label: 'Participants',   icon: Users,          Component: ParticipantsPanel },
  notes:        { label: 'Notes',          icon: FileText,       Component: NotesPanel        },
  poll:         { label: 'Sondage',        icon: BarChart2,      Component: PollPanel         },
  files:        { label: 'Fichiers',       icon: Paperclip,      Component: FilesPanel        },
  // privateChat est géré à part (composant autonome avec son propre header/close)
};

// ── Panneau principal ─────────────────────────────────────────
export default function SidePanel() {
  const { panel, close }   = useSidePanel();
  const { unreadChat, setUnreadChat, setIsChatOpen, sharedFiles, activePoll } = useMeeting();
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setIsChatOpen(panel === 'chat');
    if (panel === 'chat') setUnreadChat(0);
  }, [panel, setIsChatOpen, setUnreadChat]);

  if (!panel) return null;

  const isMobile = windowWidth < 640;
  const isTablet = windowWidth >= 640 && windowWidth < 1024;

  const panelStyle = isMobile ? {
    position: 'fixed', inset: 0, zIndex: 60,
    display: 'flex', flexDirection: 'column',
    width: '100%', height: '100%',
    background: '#111e42',
    animation: 'slideFromBottom 0.25s ease',
  } : {
    display: 'flex', flexDirection: 'column',
    width: isTablet ? '280px' : '320px',
    minWidth: isTablet ? '260px' : '280px',
    maxWidth: isTablet ? '320px' : '380px',
    height: '100%',
    background: '#111e42',
    borderLeft: '1px solid rgba(255,255,255,0.07)',
    animation: 'slideFromRight 0.2s ease',
    flexShrink: 0,
  };

  // ── Panneau chat privé (composant autonome) ───────────────
  if (panel === 'privateChat') {
    return (
      <>
        {isMobile && <div onClick={close} style={{ position: 'fixed', inset: 0, zIndex: 59, background: 'rgba(0,0,0,0.5)' }} />}
        <aside style={{ ...panelStyle, background: '#0e1836' }}>
          <style>{`
            @keyframes slideFromRight { from { transform: translateX(20px); opacity: 0; } to { transform: none; opacity: 1; } }
            @keyframes slideFromBottom { from { transform: translateY(20px); opacity: 0; } to { transform: none; opacity: 1; } }
          `}</style>
          <PrivateChatPanel onClose={close} />
        </aside>
      </>
    );
  }

  if (!PANELS[panel]) return null;
  const { label, icon: Icon, Component } = PANELS[panel];

  return (
    <>
      {isMobile && <div onClick={close} style={{ position: 'fixed', inset: 0, zIndex: 59, background: 'rgba(0,0,0,0.5)' }} />}

      <aside style={panelStyle}>
        <style>{`
          @keyframes slideFromRight { from { transform: translateX(20px); opacity: 0; } to { transform: none; opacity: 1; } }
          @keyframes slideFromBottom { from { transform: translateY(20px); opacity: 0; } to { transform: none; opacity: 1; } }
        `}</style>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Icon style={{ width: '16px', height: '16px', color: '#60a5fa' }} />
            <span style={{ color: '#fff', fontWeight: '600', fontSize: '14px' }}>{label}</span>
            {panel === 'files' && sharedFiles.length > 0 && (
              <span style={{ width: '18px', height: '18px', background: '#2563eb', color: '#fff', fontSize: '10px', fontWeight: '700', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{sharedFiles.length}</span>
            )}
            {panel === 'poll' && activePoll && (
              <span style={{ width: '8px', height: '8px', background: '#4ade80', borderRadius: '50%', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
            )}
          </div>
          <button onClick={close} style={{ padding: '6px', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}>
            <X style={{ width: '16px', height: '16px' }} />
          </button>
        </div>

        {/* Contenu */}
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <Component />
        </div>
      </aside>
    </>
  );
}