// src/routes/Login.jsx
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Shield } from 'lucide-react';
import { useAuth } from '../features/auth/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const next = sp.get('next') || '/';
  const { signIn, loading } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [err,      setErr]      = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    if (!username.trim() || !password) { setErr('Remplissez tous les champs.'); return; }
    try {
      await signIn({ username: username.trim(), password });
      navigate(next);
    } catch (e) { setErr(e.message || 'Identifiants incorrects.'); }
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="card w-full max-w-sm p-8">
        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-primary text-center mb-1">Connexion</h1>
        <p className="text-gray-500 text-sm text-center mb-7">Accédez à votre espace</p>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-primary block mb-1.5">Identifiant</label>
            <input className="input" placeholder="nasry" value={username} onChange={e => setUsername(e.target.value)} autoComplete="username" />
          </div>
          <div>
            <label className="text-sm font-semibold text-primary block mb-1.5">Mot de passe</label>
            <div className="relative">
              <input className="input pr-11" type={showPw ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" />
              <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary transition">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          {err && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-xl">{err}</p>}
          <button type="submit" disabled={loading} className="w-full btn btn-primary justify-center py-3 text-sm">
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-5">
          Pas de compte ?{' '}
          <Link to="/register" className="text-accent font-semibold hover:underline">Créer un compte</Link>
        </p>
      </div>
    </div>
  );
}
