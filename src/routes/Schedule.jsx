import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { nanoid } from 'nanoid'
import Footer from '../components/Footer'

function sanitizeCode(raw) {
  return raw.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 40)
}

export default function Schedule() {
  const [title, setTitle] = useState('Réunion équipe')
  const [date, setDate] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const [time, setTime] = useState('10:00')
  const [duration, setDuration] = useState(60)
  const [description, setDescription] = useState('Ordre du jour, sujets à couvrir, documents…')
  const [customCode, setCustomCode] = useState('')
  const navigate = useNavigate()

  const onSubmit = (e) => {
    e.preventDefault()
    const id = customCode.trim() || nanoid(10)
    alert(
      `Réunion planifiée: ${title}\n${date} ${time} (${duration} min)\nDescription: ${description}\nLien: ${location.origin}/prejoin/${id}`
    )
    navigate(`/prejoin/${id}`)
  }

  return (
    <>
      <main className="min-h-screen p-6">
        <div className="max-w-2xl mx-auto card p-6">
          <h2 className="text-2xl font-bold">Planifier une réunion</h2>
          <form onSubmit={onSubmit} className="mt-6 grid gap-4">
            <label className="grid gap-2">
              <span>Titre</span>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="bg-white/10 rounded-xl p-3 outline-none"
                required
              />
            </label>
            <div className="grid sm:grid-cols-3 gap-4">
              <label className="grid gap-2">
                <span>Date</span>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="bg-white/10 rounded-xl p-3 outline-none"
                  required
                />
              </label>
              <label className="grid gap-2">
                <span>Heure</span>
                <input
                  type="time"
                  value={time}
                  onChange={e => setTime(e.target.value)}
                  className="bg-white/10 rounded-xl p-3 outline-none"
                  required
                />
              </label>
              <label className="grid gap-2">
                <span>Durée (min)</span>
                <input
                  type="number" min="15" step="15"
                  value={duration}
                  onChange={e => setDuration(+e.target.value)}
                  className="bg-white/10 rounded-xl p-3 outline-none"
                  required
                />
              </label>
            </div>
            <label className="grid gap-2">
              <span>Description</span>
              <textarea
                rows={5}
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="bg-white/10 rounded-xl p-3 outline-none resize-y"
                placeholder="Ajoutez l'ordre du jour, les liens, etc."
              />
            </label>
            <label className="grid gap-2">
              <span>Code de réunion <span style={{ opacity: 0.5, fontSize: '0.85em' }}>(optionnel)</span></span>
              <input
                value={customCode}
                onChange={e => setCustomCode(sanitizeCode(e.target.value))}
                className="bg-white/10 rounded-xl p-3 outline-none font-mono"
                placeholder="mon-projet-equipe  (vide = code auto)"
              />
            </label>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => history.back()}
                className="btn btn-ghost"
              >
                Annuler
              </button>
              <button className="btn btn-solid">Créer le lien</button>
            </div>
          </form>
        </div>
      </main>
      <Footer />
    </>
  )
}