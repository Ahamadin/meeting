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

  /* ================= ROOM INFO ================= */
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

  /* ================= MESSAGES + SYNC ================= */
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

  /* ================= SEND MESSAGE ================= */
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

  /* ================= CALLS ================= */
  const startCall = (isVideo) => {
    try {
      liveKitCallManager.startOutgoingCall(roomId, isVideo);
      navigate(`/meeting/${encodeURIComponent(roomId)}`);
    } catch (e) {
      console.error('startCall error', e);
      alert('Impossible de démarrer l’appel');
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* ================= HEADER ================= */}
      <header className="h-16 bg-white border-b border-gray-200 px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 rounded-lg hover:bg-gray-100 transition"
          >
            <ArrowLeft size={20} className="text-primary" />
          </button>

          <div className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center font-semibold">
            {roomInfo.displayName?.[0]?.toUpperCase()}
          </div>

          <div className="font-semibold text-primary">
            {roomInfo.displayName}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => startCall(false)}
            className="p-2 rounded-lg hover:bg-primary/10 transition"
            title="Appel audio"
          >
            <Phone size={20} className="text-primary" />
          </button>

          <button
            onClick={() => startCall(true)}
            className="p-2 rounded-lg bg-primary text-white hover:opacity-90 transition"
            title="Appel vidéo"
          >
            <Video size={20} />
          </button>
        </div>
      </header>

      {/* ================= MESSAGES ================= */}
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

      {/* ================= INPUT ================= */}
      <footer className="p-4 border-t border-gray-200 bg-white">
        <div className="flex gap-2 items-end">
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Écrire un message…"
            className="input flex-1"
          />

          <button
            onClick={handleSend}
            disabled={!text.trim()}
            className="btn btn-solid px-4 py-3 disabled:opacity-50"
          >
            Envoyer
          </button>
        </div>
      </footer>
    </div>
  );
}
