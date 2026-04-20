// src/features/home/MissedCallsPage.jsx

import { useEffect, useState } from 'react';
import {
  getMissedCalls,
  markAllCallsAsSeen,
  deleteCall,
} from '../../services/call/missedCalls.service';
import { getRoomInfo } from '../../services/matrix/matrix.roomInfo';
import { formatCallTime } from '../../utils/time';
import { Phone, Video, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function MissedCallsPage() {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const loadCalls = async () => {
    setLoading(true);

    const rawCalls = getMissedCalls();

    const enriched = await Promise.all(
      rawCalls.map(async call => {
        try {
          const info = await getRoomInfo(call.roomId);
          return {
            ...call,
            displayName: info.displayName,
            avatarUrl: info.avatarUrl,
          };
        } catch {
          return {
            ...call,
            displayName:
              call.caller?.replace('@', '').split(':')[0] || 'Inconnu',
          };
        }
      })
    );

    setCalls(enriched);
    markAllCallsAsSeen();
    setLoading(false);
  };

  useEffect(() => {
    loadCalls();
  }, []);

  const handleCallBack = (call) => {
    navigate(`/chat/${encodeURIComponent(call.roomId)}`);
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-white/60">
        Chargement…
      </div>
    );
  }

  if (!calls.length) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-white/60">
        <Phone className="w-12 h-12 mb-3" />
        <p>Aucun appel manqué</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-2">
      {calls.map(call => {
        const initial = call.displayName?.[0]?.toUpperCase() || '?';

        return (
          <div
            key={call.id}
            className="flex items-center gap-4 p-3 rounded-xl bg-white/5 hover:bg-white/10"
          >
            {/* Avatar */}
            <div className="w-12 h-12 rounded-full bg-[#1dbd3a] flex items-center justify-center font-bold">
              {initial}
            </div>

            {/* Infos */}
            <div className="flex-1">
              <div className="font-semibold text-white">
                {call.displayName}
              </div>
              <div className="text-sm text-red-400 flex items-center gap-2">
                {call.isVideo ? (
                  <Video className="w-4 h-4" />
                ) : (
                  <Phone className="w-4 h-4" />
                )}
                Appel manqué • {formatCallTime(call.timestamp)}
              </div>
            </div>

            {/* Actions */}
            <button
              onClick={() => handleCallBack(call)}
              className="p-2 rounded-full bg-green-500/10 hover:bg-green-500/20"
            >
              {call.isVideo ? <Video /> : <Phone />}
            </button>

            <button
              onClick={() => {
                deleteCall(call.id);
                loadCalls();
              }}
              className="p-2 rounded-full hover:bg-red-500/20"
            >
              <Trash2 className="w-4 h-4 text-red-400" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
