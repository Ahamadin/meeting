// src/routes/Home.jsx
// Ajout : choix du mode réunion (Privée / Publique) dans l'onglet "Créer".
// Le mode est stocké dans sessionStorage/localStorage avec la session prejoin.
// Aucune autre logique modifiée.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, Plus, CalendarDays, Shield, Users, Globe, Hash, Lock } from 'lucide-react';
import Footer from '../components/Footer';
import { useAuth } from '../features/auth/AuthContext';
import ScheduleMeetingModal from '../components/ScheduleMeetingModal';

const PRIMARY      = '#2F8F6B';
const PRIMARY_DARK = '#267a5c';
const PRIMARY_JAUNE = '#FCD116';

function generateCode() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const seg = (n) => Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${seg(3)}-${seg(4)}-${seg(3)}`;
}

function sanitizeCode(raw) {
  return raw.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 40);
}

export default function Home() {
  const navigate = useNavigate();
  const { displayName } = useAuth();

  const [tab,          setTab]          = useState('create');
  const [nameInput,    setNameInput]    = useState(displayName || '');
  const [customCode,   setCustomCode]   = useState('');
  const [joinCode,     setJoinCode]     = useState('');
  const [err,          setErr]          = useState('');
  const [showSchedule, setShowSchedule] = useState(false);

  // ── Mode réunion (seulement pour la création) ─────────────────────────────
  const [roomMode, setRoomMode] = useState('private');

  const goNew = () => {
    const name = nameInput.trim();
    if (!name) { setErr('Entrez votre nom'); return; }
    const code = sanitizeCode(customCode.trim()) || generateCode();
    sessionStorage.setItem('displayName', name);
    // Stocker le mode pour que Prejoin + Meeting puissent le récupérer
    localStorage.setItem(`room_mode_${code}`, roomMode);
    navigate(`/prejoin/${code}?role=host&name=${encodeURIComponent(name)}&mode=${roomMode}`);
  };

  const goJoin = () => {
    const name = nameInput.trim();
    const code = joinCode.trim();
    if (!name) { setErr('Entrez votre nom'); return; }
    if (!code) { setErr('Entrez un code de réunion'); return; }
    sessionStorage.setItem('displayName', name);
    navigate(`/prejoin/${code}?role=participant&name=${encodeURIComponent(name)}`);
  };

  const handleKey = (e) => { if (e.key === 'Enter') tab === 'create' ? goNew() : goJoin(); };

  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* HEADER */}
      <header className="h-16 flex items-center justify-between px-4 sm:px-8 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <img src="/senegal.jpg" alt="Logo" style={{ width: '36px', height: '36px', borderRadius: '10px', objectFit: 'contain', background: '#fff', flexShrink: 0 }} />
          <span className="font-bold text-lg" style={{ color: PRIMARY }}>JokkoMeet</span>
        </div>
        <nav className="flex items-center gap-2">
          <button onClick={() => setShowSchedule(true)} className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white"
            style={{ background: PRIMARY, border: 'none', cursor: 'pointer' }}
            onMouseEnter={e => e.currentTarget.style.background = PRIMARY_DARK}
            onMouseLeave={e => e.currentTarget.style.background = PRIMARY}>
            <CalendarDays className="w-4 h-4" />Planifier
          </button>
          <button onClick={() => setShowSchedule(true)} className="flex sm:hidden items-center justify-center w-9 h-9 rounded-xl text-white"
            style={{ background: PRIMARY, border: 'none', cursor: 'pointer' }}>
            <CalendarDays className="w-4 h-4" />
          </button>
          <button onClick={() => navigate('/about')}    className="btn btn-ghost text-sm hidden sm:flex">À propos</button>
          <button onClick={() => navigate('/security')} className="btn btn-ghost text-sm hidden sm:flex items-center gap-1">
            <Shield className="w-3.5 h-3.5" />Sécurité
          </button>
        </nav>
      </header>

      {/* HERO */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-8 py-12">
        <div className="max-w-5xl w-full grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">

          {/* GAUCHE */}
          <div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight mb-5" style={{ color: PRIMARY }}>
              Visioconférences<br />
              <span style={{ color: PRIMARY_JAUNE }}>Souveraines</span>
            </h1>
            <p className="text-gray-500 text-lg mb-8 max-w-md">
              Créez ou rejoignez une réunion instantanément. Aucun compte requis pour participer.
            </p>

            {/* FORMULAIRE */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-card p-6">

              {/* ONGLETS */}
              <div className="flex rounded-xl overflow-hidden mb-4" style={{ border: `2px solid ${PRIMARY}` }}>
                {[
                  { id: 'create', icon: Plus,  label: 'Créer' },
                  { id: 'join',   icon: LogIn, label: 'Rejoindre' },
                ].map(({ id, icon: Icon, label }) => (
                  <button key={id} onClick={() => { setTab(id); setErr(''); }} style={{
                    flex: 1, padding: '10px 0', border: 'none', cursor: 'pointer',
                    background: tab === id ? PRIMARY : '#fff',
                    color:      tab === id ? '#fff'   : PRIMARY,
                    fontWeight: 700, fontSize: '14px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    transition: 'all 0.15s',
                    borderLeft: id === 'join' ? `1px solid ${PRIMARY}` : 'none',
                  }}>
                    <Icon style={{ width: '15px', height: '15px' }} />{label}
                  </button>
                ))}
              </div>

              {/* Nom */}
              <div className="mb-4">
                <label className="text-sm font-semibold mb-1.5 block" style={{ color: PRIMARY }}>Votre nom</label>
                <input className="input" placeholder="Exemple : Ahamadi NASRY"
                  value={nameInput} onChange={e => { setNameInput(e.target.value); setErr(''); }} onKeyDown={handleKey} />
              </div>

              {/* ── CRÉER ─────────────────────────────────────────────────── */}
              {tab === 'create' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1.5">
                      <Hash className="w-3 h-3" />Code de réunion (optionnel)
                    </label>
                    <input className="input font-mono" placeholder="mon-projet-equipe  (vide = code auto)"
                      value={customCode} onChange={e => { setCustomCode(sanitizeCode(e.target.value)); setErr(''); }} onKeyDown={handleKey} />
                    <p className="text-xs text-gray-400 mt-1">Laissez vide pour générer un code automatiquement.</p>
                  </div>

                  {/* ── Choix du mode réunion ────────────────────────────── */}
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1.5">
                      Mode de la réunion
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {/* Privée */}
                      <button onClick={() => setRoomMode('private')} type="button" style={{
                        padding: '10px 8px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                        background: roomMode === 'private' ? 'rgba(47,143,107,0.1)' : '#f9fafb',
                        outline: roomMode === 'private' ? `2px solid ${PRIMARY}` : '2px solid #e5e7eb',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                        transition: 'all 0.15s',
                      }}>
                        <Lock style={{ width: '16px', height: '16px', color: roomMode === 'private' ? PRIMARY : '#9ca3af' }} />
                        <span style={{ fontSize: '12px', fontWeight: 700, color: roomMode === 'private' ? PRIMARY : '#6b7280' }}>Privée</span>
                        <span style={{ fontSize: '10px', color: '#9ca3af', textAlign: 'center', lineHeight: 1.3 }}>
                          Partage d'écran<br />avec permission
                        </span>
                      </button>
                      {/* Publique */}
                      <button onClick={() => setRoomMode('public')} type="button" style={{
                        padding: '10px 8px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                        background: roomMode === 'public' ? 'rgba(47,143,107,0.1)' : '#f9fafb',
                        outline: roomMode === 'public' ? `2px solid ${PRIMARY}` : '2px solid #e5e7eb',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                        transition: 'all 0.15s',
                      }}>
                        <Globe style={{ width: '16px', height: '16px', color: roomMode === 'public' ? PRIMARY : '#9ca3af' }} />
                        <span style={{ fontSize: '12px', fontWeight: 700, color: roomMode === 'public' ? PRIMARY : '#6b7280' }}>Publique</span>
                        <span style={{ fontSize: '10px', color: '#9ca3af', textAlign: 'center', lineHeight: 1.3 }}>
                          Partage d'écran<br />libre
                        </span>
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 mt-1.5">
                      {roomMode === 'private'
                        ? '🔒 Les participants demandent la permission à l\'hôte pour partager leur écran.'
                        : '🌐 Tout le monde peut partager son écran librement, même sans l\'hôte.'}
                    </p>
                  </div>

                  <button onClick={goNew} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: 'none', background: PRIMARY, color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    onMouseEnter={e => e.currentTarget.style.background = PRIMARY_DARK}
                    onMouseLeave={e => e.currentTarget.style.background = PRIMARY}>
                    <Plus style={{ width: '16px', height: '16px' }} />
                    {customCode ? `Créer "${customCode}"` : 'Nouvelle réunion'}
                  </button>
                </div>
              )}

              {/* ── REJOINDRE ──────────────────────────────────────────────── */}
              {tab === 'join' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Code de réunion</label>
                    <input className="input font-mono" placeholder="abc-defg-hij"
                      value={joinCode} onChange={e => { setJoinCode(e.target.value); setErr(''); }} onKeyDown={handleKey} autoFocus />
                  </div>
                  <button onClick={goJoin} disabled={!joinCode.trim()} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: 'none', background: joinCode.trim() ? PRIMARY : '#9ca3af', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: joinCode.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    onMouseEnter={e => joinCode.trim() && (e.currentTarget.style.background = PRIMARY_DARK)}
                    onMouseLeave={e => joinCode.trim() && (e.currentTarget.style.background = PRIMARY)}>
                    <LogIn style={{ width: '16px', height: '16px' }} />
                    Rejoindre maintenant
                  </button>
                </div>
              )}

              {err && <p className="text-red-500 text-sm mt-3">{err}</p>}
            </div>
          </div>

          {/* DROITE */}
          <div className="space-y-4">
            {[
              { icon: Plus,         title: 'Créer en 1 clic',             desc: 'Démarrez avec un code personnalisé ou automatique.' },
              { icon: Users,        title: "Jusqu'à 10 000 participants", desc: 'Infrastructure scalable pour des milliers de participants.' },
              { icon: Shield,       title: 'Chiffré de bout en bout',     desc: 'Vos réunions restent privées et sécurisées à tout moment.' },
              { icon: CalendarDays, title: 'Planifier',                   desc: "Organisez vos réunions à l'avance et invitez par email.", action: () => setShowSchedule(true) },
              { icon: Globe,        title: 'Partout, tout le temps',      desc: "Fonctionne sur mobile, tablette et ordinateur sans installation." },
            ].map(({ icon: Icon, title, desc, action }) => (
              <div key={title} className={`flex gap-4 p-4 rounded-2xl hover:bg-gray-50 transition group ${action ? 'cursor-pointer' : ''}`} onClick={action}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(47,143,107,0.1)' }}>
                  <Icon className="w-5 h-5" style={{ color: PRIMARY }} />
                </div>
                <div>
                  <h3 className="font-semibold text-sm" style={{ color: PRIMARY }}>{title}</h3>
                  <p className="text-gray-500 text-sm mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <Footer />

      {showSchedule && (
        <ScheduleMeetingModal onClose={() => setShowSchedule(false)} organizerName={nameInput || displayName || ''} />
      )}
    </div>
  );
}