// src/features/meeting/components/WaitingRoomAlert.jsx
import { Bell, CheckCircle, XCircle } from 'lucide-react';
import { useMeeting } from '../context/MeetingContext';

export default function WaitingRoomAlert() {
  const { waitingRoom, isHost, admitParticipant } = useMeeting();
  if (!isHost || waitingRoom.length === 0) return null;

  const newest = waitingRoom[waitingRoom.length - 1];

  return (
    <div className="animate-slide-up fixed top-16 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4">
      <div className="bg-[#0d1a3a] border border-accent/40 rounded-2xl p-4 shadow-heavy flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
          <Bell className="w-4 h-4 text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-semibold truncate">{newest.name}</p>
          <p className="text-white/50 text-xs">souhaite rejoindre la réunion</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => admitParticipant(newest.identity)}
            className="p-2 rounded-xl bg-green-500/20 hover:bg-green-500/30 text-green-400 transition"
            title="Accepter"
          >
            <CheckCircle className="w-4 h-4" />
          </button>
          <button
            className="p-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 transition"
            title="Refuser"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      </div>
      {waitingRoom.length > 1 && (
        <p className="text-center text-white/40 text-xs mt-1">
          +{waitingRoom.length - 1} autre(s) en attente
        </p>
      )}
    </div>
  );
}
