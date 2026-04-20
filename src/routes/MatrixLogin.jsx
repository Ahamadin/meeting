// src/routes/MatrixLogin.jsx
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMatrixAuth } from '../features/auth/MatrixAuthContext';
import { LogIn, User, Lock, AlertCircle } from 'lucide-react';

export default function MatrixLogin() {
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const next = sp.get('next') || '/';
  const { signIn, loading } = useMatrixAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr('');

    if (!username.trim() || !password) {
      setErr('Le nom d\'utilisateur et le mot de passe sont requis.');
      return;
    }

    try {
      await signIn({ username: username.trim(), password });
      nav(next, { replace: true });
    } catch (e) {
      setErr(e.message || 'Authentification échouée');
    }
  };

  return (
    <main className="min-h-screen bg-[#0f2346] text-white grid place-items-center p-6">
      <div className="w-full max-w-md rounded-2xl bg-white/5 border border-white/10 p-6 shadow-xl backdrop-blur">
        {/* En-tête */}
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-xl bg-white text-[#0f2346] font-black grid place-items-center">
            MP
          </div>
          <h1 className="text-xl font-semibold">Meeting Pro</h1>
        </div>

        <h2 className="text-2xl font-extrabold flex items-center gap-2">
          <LogIn className="w-6 h-6" /> Connexion Matrix
        </h2>
        <p className="text-white/70 mt-1">
          Connectez-vous avec votre compte Matrix pour accéder aux réunions.
        </p>

        {/* Formulaire */}
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="text-sm text-white/70">Nom d'utilisateur Matrix</label>
            <div className="relative mt-1">
              <input
                className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 pl-11 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#1dbd3a]"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ahamadi ou @ahamadi:communication.rtn.sn"
                autoComplete="username"
              />
              <User className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-white/60" />
            </div>
            <p className="text-xs text-white/50 mt-1">
              Vous pouvez utiliser juste le nom d'utilisateur ou l'ID Matrix complet
            </p>
          </div>

          <div>
            <label className="text-sm text-white/70">Mot de passe</label>
            <div className="relative mt-1">
              <input
                className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 pl-11 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#1dbd3a]"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
              />
              <Lock className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-white/60" />
            </div>
          </div>

          {err && (
            <div className="rounded-xl bg-red-500/15 border border-red-500/30 px-3 py-2 text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{err}</span>
            </div>
          )}

          <button
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 font-semibold bg-[#1dbd3a] text-[#0f2346] hover:brightness-110 shadow-[0_10px_28px_rgba(0,0,0,.25)] active:scale-[.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-white/10">
          <p className="text-center text-white/70 text-sm">
            Pas encore de compte Matrix ?{' '}
            <Link to="/matrix-register" className="text-[#1dbd3a] hover:underline font-semibold">
              Créer un compte
            </Link>
          </p>
        </div>

        {/* Info serveur */}
        <div className="mt-4 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
          <p className="text-xs text-blue-200">
            <strong>Serveur Matrix :</strong> communication.rtn.sn
          </p>
        </div>
      </div>
    </main>
  );
}