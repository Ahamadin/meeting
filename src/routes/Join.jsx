// src/routes/Join.jsx
//
// FIX : quand un participant rejoint via le lien /join?room=CODE,
// on lit le mode depuis localStorage (room_mode_CODE) et on le passe
// à l'URL prejoin pour que l'écran de préjoin l'affiche correctement.
//
// Note : si le participant est sur un autre appareil (pas même navigateur),
// le localStorage ne contiendra pas le mode. Dans ce cas, le mode sera
// 'private' par défaut sur l'écran de préjoin, MAIS dès qu'il entre en
// réunion, l'hôte lui enverra un message room_mode_sync via DataChannel
// qui corrigera le mode automatiquement dans MeetingContext.

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { LogIn, Shield } from 'lucide-react';
import { useAuth } from '../features/auth/AuthContext';

export default function Join() {
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const { displayName: authName } = useAuth();
  const [code, setCode] = useState(sp.get('room') || '');
  const [name, setName] = useState(authName || sessionStorage.getItem('displayName') || '');
  const [err,  setErr]  = useState('');

  useEffect(() => {
    if (authName && !name) setName(authName);
  }, [authName]);

  const join = () => {
    if (!name.trim()) { setErr('Entrez votre nom'); return; }
    if (!code.trim()) { setErr('Entrez le code de réunion'); return; }

    sessionStorage.setItem('displayName', name.trim());

    // Lire le mode stocké par l'hôte pour ce code de réunion
    // (disponible si l'hôte et le participant sont sur le même navigateur/appareil,
    //  ou si un autre participant a déjà reçu room_mode_sync et l'a stocké)
    const storedMode = localStorage.getItem(`room_mode_${code.trim()}`) || 'private';

    navigate(
      `/prejoin/${code.trim()}?role=participant&name=${encodeURIComponent(name.trim())}&mode=${storedMode}`
    );
  };

  return (
    <div className="min-h-screen bg-[#0a1428] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <img
            src="/senegal.jpg"
            alt="Logo"
            style={{ width: '36px', height: '36px', borderRadius: '10px', objectFit: 'contain', background: '#fff', flexShrink: 0 }}
          />
          <span className="text-white font-bold text-xl">JokkoMeet</span>
        </div>

        <div className="rounded-2xl bg-white/5 border border-white/10 p-8 space-y-5">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">Rejoindre une réunion</h2>
            <p className="text-white/50 text-sm">Entrez le code partagé par l'hôte</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-white/80 block mb-1.5">Votre nom</label>
              <input
                className="w-full rounded-xl bg-[#0d1a3a] border border-white/10 px-4 py-3 text-white text-sm placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/50 transition"
                placeholder="Entrez votre nom"
                value={name}
                onChange={e => { setName(e.target.value); setErr(''); }}
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-white/80 block mb-1.5">Code de réunion</label>
              <input
                className="w-full rounded-xl bg-[#0d1a3a] border border-white/10 px-4 py-3 text-white font-mono text-sm placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/50 transition"
                placeholder="ex: abc-defg-hij"
                value={code}
                onChange={e => { setCode(e.target.value); setErr(''); }}
                onKeyDown={e => e.key === 'Enter' && join()}
              />
            </div>
          </div>

          {err && <p className="text-red-400 text-sm">{err}</p>}

          <button onClick={join} className="w-full btn btn-accent justify-center py-3.5 text-base font-bold rounded-2xl">
            <LogIn className="w-5 h-5" />
            Rejoindre
          </button>

          <button onClick={() => navigate('/')} className="w-full text-center text-white/40 hover:text-white/70 text-sm transition">
            ← Retour à l'accueil
          </button>
        </div>
      </div>
    </div>
  );
}