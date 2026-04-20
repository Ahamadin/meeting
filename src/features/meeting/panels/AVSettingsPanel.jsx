import { useMeeting } from '../context/MeetingContext'

export default function AVSettingsPanel() {
  const { participants, toggleAudio, toggleVideo } = useMeeting()
  const me = participants.find(p => p.isMe)
  return (
    <div className="grid gap-4">
      <div>
        <div className="text-sm text-white/70">Micro</div>
        <button onClick={()=>toggleAudio(me.id)} className="btn btn-ghost mt-2">
          {me.audioOn ? 'Couper' : 'Activer'} le micro
        </button>
      </div>
      <div>
        <div className="text-sm text-white/70">Caméra</div>
        <button onClick={()=>toggleVideo(me.id)} className="btn btn-ghost mt-2">
          {me.videoOn ? 'Couper' : 'Activer'} la caméra
        </button>
      </div>
      <div className="text-sm text-white/60">
        (Astuce) Branchez ici la sélection de périphériques via <code>navigator.mediaDevices.enumerateDevices()</code>.
      </div>
    </div>
  )
}
