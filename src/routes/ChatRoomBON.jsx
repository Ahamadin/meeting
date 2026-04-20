import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, Video } from 'lucide-react';
import { useAuth } from '../features/auth/AuthContext';
import { matrixFetch } from '../services/matrix/matrix.api';
import { startSyncLoopWeb } from '../services/matrix/matrix.sync';
import { liveKitCallManager } from '../services/call/LiveKitCallManager';
import MessageBubble from '../components/chat/MessageBubble';

export default function ChatRoom() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { token, userId } = useAuth();

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [roomInfo, setRoomInfo] = useState({ displayName: 'Discussion' });

  const messagesEndRef = useRef(null);

  // ───────────────── ROOM INFO ─────────────────
  useEffect(() => {
    if (!token || !roomId) {
      navigate('/dashboard');
      return;
    }

    const loadRoomInfo = async () => {
      try {
        const state = await matrixFetch(
          token,
          `rooms/${encodeURIComponent(roomId)}/state`
        );

        const nameEvent = state.find(e => e.type === 'm.room.name');
        const members = state.filter(e => e.type === 'm.room.member');

        let displayName = nameEvent?.content?.name || 'Discussion';

        if (!nameEvent && members.length === 2) {
          const other = members.find(m => m.state_key !== userId);
          displayName =
            other?.content?.displayname ||
            other?.state_key?.replace('@', '').split(':')[0];
        }

        setRoomInfo({ displayName });
      } catch (e) {
        console.error('Room info error', e);
      }
    };

    loadRoomInfo();
  }, [roomId, token, userId, navigate]);

  // ───────────────── MESSAGES + SYNC ─────────────────
  useEffect(() => {
    if (!token) return;

    const loadMessages = async () => {
      try {
        const res = await matrixFetch(
          token,
          `rooms/${encodeURIComponent(roomId)}/messages`,
          { params: { dir: 'b', limit: 50 } }
        );
        setMessages((res.chunk || []).reverse());
      } catch (e) {
        console.error('Messages error', e);
      }
    };

    loadMessages();

    const stopSync = startSyncLoopWeb({
      token,
      onSync: sync => {
        const room = sync?.rooms?.join?.[roomId];
        if (!room) return;

        const events = room.timeline?.events || [];
        if (!events.length) return;

        setMessages(prev => {
          const ids = new Set(prev.map(m => m.event_id));
          return [...prev, ...events.filter(e => !ids.has(e.event_id))];
        });
      },
    });

    return () => stopSync?.();
  }, [roomId, token]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ───────────────── SEND MESSAGE ─────────────────
  const handleSend = async () => {
    if (!text.trim()) return;

    const body = text.trim();
    setText('');

    try {
      await matrixFetch(
        token,
        `rooms/${encodeURIComponent(roomId)}/send/m.room.message/${Date.now()}`,
        {
          method: 'PUT',
          body: JSON.stringify({ msgtype: 'm.text', body }),
        }
      );
    } catch {
      alert('Erreur envoi message');
    }
  };

  // ───────────────── CALLS (FIX MOBILE) ─────────────────
  const startCall = (isVideo) => {
    try {
      // ⚠️ PAS de await → essentiel mobile
      liveKitCallManager.startOutgoingCall(roomId, isVideo);
      navigate(`/meeting/${encodeURIComponent(roomId)}`);
    } catch (e) {
      console.error('startCall error', e);
      alert('Impossible de démarrer l’appel');
    }
  };

  return (
    <div className="flex flex-col h-screen bg-primary text-white">
      {/* HEADER */}
      <header className="flex items-center justify-between px-4 py-3 bg-black/40 border-b border-white/10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 rounded-full hover:bg-white/10"
          >
            <ArrowLeft size={20} />
          </button>

          <div className="w-10 h-10 rounded-full bg-[#1dbd3a] flex items-center justify-center font-bold text-black">
            {roomInfo.displayName[0]}
          </div>

          <div className="font-semibold">{roomInfo.displayName}</div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => startCall(false)}
            className="p-2 rounded-full hover:bg-white/10"
          >
            <Phone size={20} />
          </button>

          <button
            onClick={() => startCall(true)}
            className="p-2 rounded-full bg-[#1dbd3a] text-black"
          >
            <Video size={20} />
          </button>
        </div>
      </header>

      {/* MESSAGES */}
      <main className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map(msg => (
          <MessageBubble
            key={msg.event_id}
            message={msg}
            isMe={msg.sender === userId}
          />
        ))}
        <div ref={messagesEndRef} />
      </main>

      {/* INPUT */}
      <footer className="p-4 border-t border-white/10 bg-black/40">
        <div className="flex gap-2">
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Écris un message…"
            className="flex-1 bg-white/10 rounded-xl px-4 py-2"
          />
          <button
            onClick={handleSend}
            disabled={!text.trim()}
            className="p-2 rounded-full bg-[#1dbd3a] text-black"
          >
            ➤
          </button>
        </div>
      </footer>
    </div>
  );
}
