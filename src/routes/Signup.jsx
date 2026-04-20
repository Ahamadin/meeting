import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";
import { Eye, EyeOff, BadgeCheck } from "lucide-react";

export default function Signup() {
  const { signUp, loading } = useAuth();
  const nav = useNavigate();
  const [showPwd, setShowPwd] = useState(false);
  const [err, setErr] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: (fd.get("name") || "").trim(),
      email: (fd.get("email") || "").trim(),
      password: fd.get("password") || ""
    };
    if (!payload.name || !payload.email || !payload.password) {
      setErr("Tous les champs sont requis."); return;
    }
    try {
      await signUp(payload);
      nav("/"); // retour à l’accueil
    } catch (e) {
      setErr(e.message);
    }
  };

  return (
    <main className="min-h-screen bg-[#0f2346] text-white grid place-items-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 h-12 w-12 grid place-items-center rounded-2xl bg-white text-[#0f2346] font-black">MP</div>
          <h1 className="text-3xl font-extrabold">Créer un compte</h1>
          <p className="text-white/70 mt-1">Rejoignez des réunions en un clic.</p>
        </div>

        <form onSubmit={onSubmit} className="rounded-2xl bg-white/5 border border-white/10 p-6 space-y-4 shadow-xl backdrop-blur">
          <div>
            <label className="text-sm text-white/70">Nom complet</label>
            <input className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#1dbd3a] mt-1"
                   name="name" placeholder="Ex: Nas Ahamadi"/>
          </div>

          <div>
            <label className="text-sm text-white/70">Email</label>
            <input className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#1dbd3a] mt-1"
                   type="email" name="email" placeholder="vous@exemple.com"/>
          </div>

          <div>
            <label className="text-sm text-white/70">Mot de passe</label>
            <div className="relative mt-1">
              <input className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 pr-11 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#1dbd3a]"
                     type={showPwd ? "text" : "password"} name="password" placeholder="Au moins 8 caractères"/>
              <button type="button" onClick={() => setShowPwd(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70">{showPwd ? <EyeOff/> : <Eye/>}</button>
            </div>
          </div>

          {err && <div className="rounded-xl bg-red-500/15 border border-red-500/30 px-3 py-2 text-sm">{err}</div>}

          <button disabled={loading}
                  className="w-full inline-flex items-center text-white justify-center gap-2 rounded-xl px-5 py-3 font-semibold bg-[#1dbd3a] text-[#0f2346] hover:brightness-110 shadow-[0_10px_28px_rgba(0,0,0,.25)] active:scale-[.98]">
            <BadgeCheck className="w-5 h-5"/>
            {loading ? "Création…" : "Créer mon compte"}
          </button>

          <p className="text-center text-sm text-white/70">
            Déjà inscrit ? <Link to="/login" className="underline">Se connecter</Link>
          </p>
        </form>
      </div>
    </main>
  );
}
