// src/routes/Register.jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Shield } from 'lucide-react';
import { registerMatrix } from '../api/auth';
import { useAuth } from '../features/auth/AuthContext';

export default function Register() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [name,     setName]     = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [err,      setErr]      = useState('');
  const [loading,  setLoading]  = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    if (!name.trim() || !username.trim() || !password) { setErr('Tous les champs sont requis.'); return; }
    if (password.length < 8) { setErr('Le mot de passe doit contenir au moins 8 caractères.'); return; }
    setLoading(true);
    try {
      await registerMatrix({ username: username.trim(), password, displayName: name.trim() });
      await signIn({ username: username.trim(), password });
      navigate('/');
    } catch (e) {
      setErr(e.message || 'Erreur lors de l\'inscription.');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="card w-full max-w-sm p-8">
        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-primary text-center mb-1">Créer un compte</h1>
        <p className="text-gray-500 text-sm text-center mb-7">Rejoignez la plateforme</p>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-primary block mb-1.5">Nom affiché</label>
            <input className="input" placeholder="Awa Diallo" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-semibold text-primary block mb-1.5">Identifiant</label>
            <input className="input" placeholder="awadiallo" value={username} onChange={e => setUsername(e.target.value)} autoComplete="username" />
          </div>
          <div>
            <label className="text-sm font-semibold text-primary block mb-1.5">Mot de passe</label>
            <div className="relative">
              <input className="input pr-11" type={showPw ? 'text' : 'password'} placeholder="Min. 8 caractères" value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" />
              <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary transition">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          {err && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-xl">{err}</p>}
          <button type="submit" disabled={loading} className="w-full btn btn-primary justify-center py-3 text-sm">
            {loading ? 'Création…' : 'Créer mon compte'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-5">
          Déjà un compte ?{' '}
          <Link to="/login" className="text-accent font-semibold hover:underline">Se connecter</Link>
        </p>
      </div>
    </div>
  );
}
