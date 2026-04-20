// src/routes/MatrixRegister.jsx
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMatrixAuth } from '../features/auth/MatrixAuthContext';
import { UserPlus, User, Lock, AlertCircle, CheckCircle } from 'lucide-react';

export default function MatrixRegister() {
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const next = sp.get('next') || '/';
  const { signUp, loading } = useMatrixAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [err, setErr] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr('');

    // Validation
    if (!username.trim()) {
      setErr('Le nom d\'utilisateur est requis.');
      return;
    }

    if (username.includes('@') || username.includes(':')) {
      setErr('Le nom d\'utilisateur ne doit pas contenir @ ou :');
      return;
    }

    if (password.length < 8) {
      setErr('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }

    if (password !== confirmPassword) {
      setErr('Les mots de passe ne correspondent pas.');
      return;
    }

    try {
      await signUp({ username: username.trim(), password });
      nav(next, { replace: true });
    } catch (e) {
      setErr(e.message || 'Inscription échouée');
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
          <UserPlus className="w-6 h-6" /> Créer un compte Matrix
        </h2>
        <p className="text-white/70 mt-1">
          Créez votre compte pour accéder à la plateforme de visioconférence.
        </p>

        {/* Formulaire */}
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="text-sm text-white/70">Nom d'utilisateur</label>
            <div className="relative mt-1">
              <input
                className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 pl-11 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#1dbd3a]"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ahamadi"
                autoComplete="username"
              />
              <User className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-white/60" />
            </div>
            <p className="text-xs text-white/50 mt-1">
              Votre identifiant sera : @{username || 'votre-nom'}:communication.rtn.sn
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
                autoComplete="new-password"
              />
              <Lock className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-white/60" />
            </div>
            {password && (
              <div className="mt-2 space-y-1">
                <div className={`text-xs flex items-center gap-1 ${password.length >= 8 ? 'text-green-400' : 'text-white/50'}`}>
                  {password.length >= 8 ? <CheckCircle className="w-3 h-3" /> : <span>○</span>}
                  Au moins 8 caractères
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="text-sm text-white/70">Confirmer le mot de passe</label>
            <div className="relative mt-1">
              <input
                className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 pl-11 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#1dbd3a]"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                type="password"
                placeholder="••••••••"
                autoComplete="new-password"
              />
              <Lock className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-white/60" />
            </div>
            {confirmPassword && (
              <p className={`text-xs mt-1 ${password === confirmPassword ? 'text-green-400' : 'text-red-400'}`}>
                {password === confirmPassword ? '✓ Les mots de passe correspondent' : '✗ Les mots de passe ne correspondent pas'}
              </p>
            )}
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
            {loading ? 'Création du compte...' : 'Créer mon compte'}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-white/10">
          <p className="text-center text-white/70 text-sm">
            Déjà inscrit ?{' '}
            <Link to="/matrix-login" className="text-[#1dbd3a] hover:underline font-semibold">
              Se connecter
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