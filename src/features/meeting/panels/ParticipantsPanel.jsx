// src/features/meeting/components/ParticipantsPanel.jsx
import { useMeeting } from '../context/MeetingContext'
import { Hand } from 'lucide-react'

export default function ParticipantsPanel() {
  const { participants } = useMeeting()

  console.log('[Panel] Rendu avec', participants.length, 'participants');
  console.log('[Panel] Noms détaillés :', participants.map(p => ({
    name: p.name,
    isMe: p.isMe,
    id: p.id,
    videoOn: p.videoOn,
    audioOn: p.audioOn
  })));

  return (
    <div className="grid gap-3 p-4">
      <div className="text-sm text-white/70 font-medium">
        {participants.length} participant{participants.length > 1 ? 's' : ''}
      </div>

      {participants.map(p => (
        <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
          <div className="font-medium flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-white/10 grid place-items-center text-sm font-bold">
              {p.name?.[0]?.toUpperCase() || 'U'}
            </div>
            {p.name} {p.isMe && <span className="text-white/60 text-xs">(Vous)</span>}
          </div>

          <div className="flex items-center gap-3 text-white/70">
            {p.handRaised && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-yellow-500/80 text-black text-xs font-semibold">
                <Hand className="w-3.5 h-3.5" /> levée
              </span>
            )}
            <span>{p.audioOn ? '🎤' : '🔇'}</span>
            <span>{p.videoOn ? '📹' : '🚫'}</span>
          </div>
        </div>
      ))}
    </div>
  )
}