import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LogOut,
  Plus,
  PhoneMissed,
  User,
  MessageCircle,
  Phone,
} from 'lucide-react';

import { useAuth } from '../features/auth/AuthContext';
import { parseRoomsFromSyncWeb } from '../services/matrix/matrix.rooms';
import { formatLastSeen } from '../services/matrix/matrix.presence';

const NAV_MAP = {
  '/dashboard': { title: 'Discussions', icon: MessageCircle },
  '/calls': { title: 'Appels', icon: Phone },
  '/profile': { title: 'Profil', icon: User },
  '/invite': { title: 'Invitations', icon: Plus },
};

export default function Dashboard() {
  const { token, userId, signOut, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const myUserId = userId;

  const current =
    NAV_MAP[
      Object.keys(NAV_MAP).find(p => location.pathname.startsWith(p))
    ] || { title: 'Discussions', icon: MessageCircle };

  const [rooms, setRooms] = useState([]);
  const [presenceMap, setPresenceMap] = useState(new Map());
  const [typingMap, setTypingMap] = useState(new Map());
  const [loading, setLoading] = useState(true);

  /* =====================================================
     🔄 MATRIX SYNC — VERSION STABLE (COMME MOBILE)
  ===================================================== */
  useEffect(() => {
    if (!token || !userId) {
      navigate('/login');
      return;
    }

    const handleSync = (e) => {
      const data = e.detail;
      if (!data) return;

      const parsed = parseRoomsFromSyncWeb(data, myUserId);

      setRooms(prev => {
        const map = new Map(prev.map(r => [r.roomId, r]));

        parsed.forEach(r => {
          const existing = map.get(r.roomId);

          map.set(r.roomId, {
            ...existing,
            ...r,

            // 🔒 NOM STABLE (ne jamais écraser un vrai nom)
            displayName:
              r.displayName &&
              !['Discussion', 'Discussion anonyme', 'D'].includes(r.displayName)
                ? r.displayName
                : existing?.displayName || r.displayName,

            lastMessage: r.lastMessage || existing?.lastMessage || '',
            lastTs: Math.max(existing?.lastTs || 0, r.lastTs || 0),
            unread: r.unread ?? existing?.unread ?? 0,
          });
        });

        return Array.from(map.values()).sort(
          (a, b) => (b.lastTs || 0) - (a.lastTs || 0)
        );
      });

      /* ===== PRÉSENCE ===== */
      if (data?.presence?.events) {
        setPresenceMap(prev => {
          const map = new Map(prev);
          data.presence.events.forEach(ev => {
            if (ev.type === 'm.presence') {
              map.set(ev.sender, ev.content);
            }
          });
          return map;
        });
      }

      setLoading(false);
    };

    const handleTyping = (e) => {
      const { roomId, users } = e.detail;
      setTypingMap(prev => {
        const map = new Map(prev);
        users?.length ? map.set(roomId, users) : map.delete(roomId);
        return map;
      });
    };

    window.addEventListener('matrix-sync', handleSync);
    window.addEventListener('matrix-typing', handleTyping);

    const safety = setTimeout(() => setLoading(false), 4000);

    return () => {
      window.removeEventListener('matrix-sync', handleSync);
      window.removeEventListener('matrix-typing', handleTyping);
      clearTimeout(safety);
    };
  }, [token, userId, navigate, myUserId]);

  /* =====================================================
     🎨 HELPERS
  ===================================================== */
  const stringToColor = (str = '') => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return `hsl(${Math.abs(hash) % 360}, 55%, 55%)`;
  };

  const TitleIcon = current.icon;

  /* =====================================================
     🧩 UI
  ===================================================== */
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* ================= TOP BAR ================= */}
      <header className="h-16 bg-white border-b border-gray-200 px-4 sm:px-6 flex items-center">
        {/* Left */}
        <div className="flex items-center gap-3 flex-1">
          <div className="h-9 w-9 rounded-xl bg-white shadow-soft flex items-center justify-center">
            <img
              src="/senegal.jpg"
              alt="JOKKO CLIENT MEET"
              className="h-6 w-6 object-contain"
            />
          </div>
          <div className="leading-tight hidden sm:block">
            <span className="font-semibold text-primary block">
              JOKKO CLIENT MEET
            </span>
            {user?.name && (
              <span className="text-xs text-gray-500">
                Connecté en tant que {user.name}
              </span>
            )}
          </div>
        </div>

        {/* Center */}
        <div className="flex items-center gap-2 font-semibold text-primary transition-all">
          <TitleIcon size={20} />
          <span>{current.title}</span>
        </div>

        {/* Right */}
        <div className="flex-1 flex justify-end items-center gap-1 sm:gap-2">
          <button
            onClick={() => navigate('/invite')}
            className="p-2 rounded-lg hover:bg-primary/10 transition"
            title="Créer une invitation"
          >
            <Plus size={20} />
          </button>
          <button
            onClick={() => navigate('/calls')}
            className="p-2 rounded-lg hover:bg-primary/10 transition"
            title="Appels"
          >
            <PhoneMissed size={20} />
          </button>
          <button
            onClick={() => navigate('/profile')}
            className="p-2 rounded-lg hover:bg-primary/10 transition"
            title="Profil"
          >
            <User size={20} />
          </button>
          <button
            onClick={signOut}
            className="p-2 rounded-lg hover:bg-red-50 text-red-600 transition"
            title="Déconnexion"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* ================= CONTENT ================= */}
      <main className="flex-1 p-4 sm:p-6">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : rooms.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-500 text-center">
            <MessageCircle size={48} className="mb-3" />
            <p className="text-lg font-medium">Aucune discussion</p>
            <p className="text-sm">Créez une invitation pour commencer</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {rooms.map(room => {
              const presence = presenceMap.get(room.otherUserId);
              const isOnline = presence?.presence === 'online';
              const isTyping = typingMap.has(room.roomId);

              return (
                <div
                  key={room.roomId}
                  onClick={() =>
                    navigate(`/chat/${encodeURIComponent(room.roomId)}`)
                  }
                  className="bg-white rounded-2xl p-4 shadow-soft cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all"
                >
                  <div className="flex items-start gap-3">
                    <div className="relative shrink-0">
                      <div
                        className="w-11 h-11 rounded-full flex items-center justify-center text-white font-semibold"
                        style={{ backgroundColor: stringToColor(room.displayName) }}
                      >
                        {room.displayName?.[0]?.toUpperCase()}
                      </div>

                      {/* 🟢 Présence */}
                      <span
                        className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                          isOnline ? 'bg-green-500' : 'bg-gray-400'
                        }`}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-primary truncate">
                          {room.displayName}
                        </p>
                        {room.lastTs && (
                          <span className="text-xs text-gray-400 whitespace-nowrap">
                            {new Date(room.lastTs).toLocaleTimeString('fr-FR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-gray-500 truncate mt-1 italic">
                        {isTyping
                          ? 'est en train d’écrire…'
                          : isOnline
                            ? 'En ligne'
                            : room.lastMessage ||
                              formatLastSeen(presence?.last_active_ago)}
                      </p>
                    </div>

                    {room.unread > 0 && (
                      <span className="ml-2 bg-primary text-white text-xs font-bold px-2 py-0.5 rounded-full">
                        {room.unread > 99 ? '99+' : room.unread}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
