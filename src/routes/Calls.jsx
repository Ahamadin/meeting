import { useEffect, useState } from 'react';
import {
  getMissedCalls,
  markAllCallsAsSeen,
  deleteCall,
} from '../services/call/missedCalls.service';
import { getRoomInfo } from '../services/matrix/matrix.roomInfo';
import { Phone, Video, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatCallTime } from '../utils/time';

export default function Calls() {
  const [calls, setCalls] = useState([]);
  const navigate = useNavigate();

  const load = async () => {
    const raw = await getMissedCalls();

    const enriched = await Promise.all(
      raw.map(async call => {
        try {
          const info = await getRoomInfo(call.roomId);
          return { ...call, displayName: info.displayName };
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
  };

  useEffect(() => {
    load();
  }, []);

  if (!calls.length) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-500">
        <Phone size={48} />
        <p className="mt-2">Aucun appel manqué</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-3">
      {calls.map(call => (
        <div
          key={call.id}
          className="flex items-center gap-4 bg-white p-4 rounded-xl shadow-soft"
        >
          {/* Avatar */}
          <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center font-bold">
            {call.displayName[0]?.toUpperCase()}
          </div>

          {/* Infos */}
          <div className="flex-1">
            <div className="font-semibold">{call.displayName}</div>

            <div className="text-sm text-red-500 flex items-center gap-2">
              {call.isVideo ? <Video size={14} /> : <Phone size={14} />}
              Appel manqué
              <span className="text-gray-400">•</span>
              <span className="text-gray-500">
                {formatCallTime(call.timestamp)}
              </span>
            </div>
          </div>

          {/* Rappeler */}
          <button
            onClick={() =>
              navigate(`/chat/${encodeURIComponent(call.roomId)}`)
            }
            className="btn btn-ghost"
          >
            {call.isVideo ? <Video /> : <Phone />}
          </button>

          {/* Supprimer */}
          <button
            onClick={() => {
              deleteCall(call.id);
              load();
            }}
            className="btn btn-ghost text-red-500"
          >
            <Trash2 />
          </button>
        </div>
      ))}
    </div>
  );
}
