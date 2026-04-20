import { useMeeting } from '../context/MeetingContext'

export default function RecordingPanel() {
  const { isRecording } = useMeeting()
  return (
    <div className="grid gap-3">
      <div className="text-sm">État: {isRecording ? 'Enregistrement en cours…' : 'Inactif'}</div>
      <p className="text-white/70 text-sm">Intégrez <code>MediaRecorder</code> pour enregistrer le mix audio/vidéo.</p>
    </div>
  )
}
