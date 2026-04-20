import { useState, useEffect } from 'react'
import { getRoom, sendChatMessage } from '../../../livekit/rtc'

export default function ChatPanel() {
  const [msgs, setMsgs] = useState([{ id: 1, from: 'Système', text: 'Bienvenue dans le chat' }])
  const [text, setText] = useState('')

  useEffect(() => {
    const room = getRoom()
    if (!room) return
    const onData = (payload, participant) => {
      try {
        const data = JSON.parse(new TextDecoder().decode(payload))
        setMsgs(m => [...m, { id: data.id || Date.now(), from: participant?.identity || 'Inconnu', text: data.text }])
      } catch {}
    }
    room.on('dataReceived', onData)
    return () => room.off('dataReceived', onData)
  }, [])

  const send = async () => {
    const txt = text.trim()
    if (!txt) return
    setMsgs(m => [...m, { id: Date.now(), from: 'Vous', text: txt }])
    setText('')
    await sendChatMessage(txt)
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 max-h-[60vh] overflow-y-auto">
        {msgs.map(m => (
          <div key={m.id} className="p-3 rounded-xl bg-white/5">
            <div className="text-xs text-white/60">{m.from}</div>
            <div>{m.text}</div>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input className="flex-1 p-3 rounded-xl bg-white/10 outline-none" placeholder="Écrire un message"
               value={text} onChange={e=>setText(e.target.value)} />
        <button className="btn btn-solid" onClick={send}>Envoyer</button>
      </div>
    </div>
  )
}
