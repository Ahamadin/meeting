// src/routes/About.jsx
import { useNavigate } from 'react-router-dom';
import {
  Shield, Video, MessageSquare, Phone, Calendar, Users,
  Lock, CheckCircle, ArrowRight, Server, Eye, Key, Wifi,
  ShieldCheck, Monitor, BarChart2, Hand, FileText, Smile,
} from 'lucide-react';
import Footer from '../components/Footer';

const FEATURES = [
  {
    icon: Video,
    title: 'Réunions vidéo HD',
    desc: "Lance une réunion en un clic. Partage ton écran, active ta caméra et accueille tes participants en toute simplicité.",
  },
  {
    icon: MessageSquare,
    title: 'Messagerie instantanée',
    desc: "Échange en temps réel pendant la réunion. Chat intégré, notes partagées et fichiers accessibles à tous.",
  },
  {
    icon: Phone,
    title: 'Appels audio & vidéo',
    desc: "Appelle directement depuis la plateforme. Qualité HD, faible latence — tout fonctionne comme sur mobile.",
  },
  {
    icon: Calendar,
    title: 'Planification',
    desc: "Programme tes réunions à l'avance avec une date, une heure et un lien dédié à partager.",
  },
  {
    icon: Users,
    title: 'Présence & statut',
    desc: "Vois en temps réel qui est en ligne parmi tes contacts. Statut, heure de dernière activité visible.",
  },
  {
    icon: Lock,
    title: 'Sécurité & confidentialité',
    desc: "Hébergement sécurisé, accès par token, communications chiffrées. Tes données restent sur ton infrastructure.",
  },
];

const MEET_FEATURES = [
  {
    icon: ShieldCheck,
    title: 'Salle d\'attente',
    desc: "Comme Zoom — les participants attendent avant d'entrer. L'hôte admet ou refuse chaque personne.",
  },
  {
    icon: Monitor,
    title: 'Partage d\'écran',
    desc: "Partage ton écran avec son système. Chrome, Edge — le son est inclus automatiquement.",
  },
  {
    icon: Hand,
    title: 'Lever la main',
    desc: "Les participants lèvent la main pour prendre la parole. L'hôte voit les demandes en temps réel.",
  },
  {
    icon: BarChart2,
    title: 'Sondages',
    desc: "Crée des sondages pendant la réunion. Les participants votent, les résultats sont visibles en direct.",
  },
  {
    icon: FileText,
    title: 'Notes partagées',
    desc: "Notes collaboratives synchronisées en temps réel entre tous les participants de la réunion.",
  },
  {
    icon: Smile,
    title: 'Réactions',
    desc: "Réagis avec des emojis pendant la réunion. Les réactions flottent à l'écran de tous.",
  },
];

const SECURITY_PREVIEW = [
  {
    icon: Key,
    title: 'Chiffrement bout en bout',
    desc: "Chaque session protégée par DTLS 1.3 + SRTP. Personne ne peut intercepter vos médias, même pas le serveur.",
  },
  {
    icon: Server,
    title: 'Infrastructure souveraine',
    desc: "Hébergement national. Vos données ne quittent jamais le territoire sénégalais.",
  },
  {
    icon: Eye,
    title: 'Zero-Knowledge Server',
    desc: "Le serveur stocke les enregistrements chiffrés AES-GCM 256 bits. Impossible à lire depuis le serveur.",
  },
];

const STATS = [
  { value: '100%', label: 'Hébergement sécurisé' },
  { value: 'HD',   label: 'Qualité vidéo' },
  { value: '24/7', label: 'Disponibilité' },
  { value: '0',    label: 'Paquet en clair détecté' },
];

// ── Petits composants réutilisables ─────────────────────────────────────────

function Label({ children }) {
  return (
    <p style={{ color: '#2F8F6B', opacity: 0.5 }}
      className="text-xs font-bold tracking-widest uppercase mb-3">
      {children}
    </p>
  );
}

function Rule() {
  return <div className="w-10 h-1 rounded-full mb-8" style={{ background: '#2F8F6B' }} />;
}

function NavBtn({ onClick, active, children }) {
  return (
    <button
      onClick={onClick}
      className="btn btn-ghost text-sm"
      style={active ? { color: '#2F8F6B', fontWeight: 700 } : {}}
    >
      {children}
    </button>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function About() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">

      {/* ── HEADER ───────────────────────────────────────────────────── */}
      <header className="h-16 flex items-center justify-between px-4 sm:px-8 border-b border-gray-100 sticky top-0 bg-white z-50">
        <button onClick={() => navigate('/')} className="flex items-center gap-3">
          <img
            src="/senegal.jpg" alt="Logo"
            style={{ width: 36, height: 36, borderRadius: 10, objectFit: 'contain', background: '#fff' }}
          />
          <span className="font-bold text-primary text-lg hidden sm:block">JokkoMeet</span>
        </button>
        <nav className="flex items-center gap-2">
          <NavBtn onClick={() => navigate('/about')}    active>À propos</NavBtn>
          <NavBtn onClick={() => navigate('/security')}       >Sécurité</NavBtn>
          <button onClick={() => navigate('/')} className="btn btn-primary text-sm">
            Démarrer
          </button>
        </nav>
      </header>

 {/* ── HERO ─────────────────────────────────────────────────────── */}
<section 
  className="text-white px-4 sm:px-8 py-20 sm:py-28 relative overflow-hidden"
  style={{
    backgroundImage: `url('/Image2026.png')`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
  }}
>
  {/* Overlay sombre pour garder le texte lisible */}
  <div className="absolute inset-0 bg-black/60" />

  {/* Contenu */}
  <div className="max-w-4xl mx-auto text-center relative z-10">
    <p 
      className="text-xs font-bold tracking-widest uppercase mb-5"
      style={{ color: 'rgba(255,255,255,0.45)' }}
    >
      À PROPOS DE LA PLATEFORME
    </p>
    
    <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight mb-6">
      Une plateforme pensée pour<br />la communication professionnelle
    </h1>
    
    <p 
      className="text-lg max-w-2xl mx-auto mb-10 leading-relaxed"
      style={{ color: 'rgba(255,255,255,0.65)' }}
    >
      JokkoMeet est une solution de visioconférence souveraine déployée sur infrastructure
      nationale sécurisée. Vidéo HD, messagerie, appels et planification — en un seul endroit.
    </p>

    <div className="flex flex-wrap items-center justify-center gap-4">
      <button 
        onClick={() => navigate('/')} 
        className="btn btn-accent px-6 py-3 text-base font-bold"
      >
        Démarrer gratuitement <ArrowRight className="w-4 h-4" />
      </button>
      
      <button
        onClick={() => navigate('/security')}
        className="flex items-center gap-2 px-6 py-3 text-base font-semibold rounded-xl transition"
        style={{ 
          border: '1px solid rgba(255,255,255,0.2)', 
          color: '#fff', 
          background: 'transparent' 
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <Shield className="w-4 h-4" /> Voir la sécurité
      </button>
    </div>
  </div>
</section>

      {/* ── STATS ────────────────────────────────────────────────────── */}
      <section className="border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-8 py-12 grid grid-cols-2 sm:grid-cols-4 gap-8">
          {STATS.map(({ value, label }) => (
            <div key={label} className="text-center">
              <div className="text-4xl font-extrabold text-primary mb-1">{value}</div>
              <div className="text-sm font-medium" style={{ color: '#64748b' }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

     {/* ── À PROPOS ─────────────────────────────────────────────────── */}
    <section className="px-4 sm:px-8 py-20 bg-white">
      <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        
        {/* Texte - reste exactement pareil */}
        <div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-primary leading-tight mb-4">
            À propos de JokkoMeet
          </h2>
          <Rule />
          <p className="text-gray-600 leading-relaxed mb-5">
            JokkoMeet est une plateforme de visioconférence sécurisée conçue pour organiser et rejoindre des réunions en ligne en toute simplicité.
            Elle permet de lancer des appels vidéo, partager son écran, échanger en temps réel et collaborer efficacement, directement depuis le navigateur, sans installation.
          </p>
          <p className="text-gray-600 leading-relaxed mb-8">
            Avec JokkoMeet, connectez vos équipes en quelques secondes : appels vidéo HD, partage d’écran, chat en direct et gestion des participants,
            le tout dans un environnement sécurisé et accessible partout.
          </p>
          <div className="space-y-3">
            {[
              "Aucune installation requise — fonctionne dans le navigateur",
              "Infrastructure nationale — données hébergées au Sénégal",
              "Conforme aux standards WebRTC et normes de sécurité internationales",
              "Accessible sans compte pour les participants invités",
            ].map(item => (
              <div key={item} className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 shrink-0 mt-0.5 text-primary" />
                <span className="text-gray-700 text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Remplacé par ton image complète */}
        <div className="relative rounded-3xl overflow-hidden border border-gray-100 shadow-card">
          <img 
            src="/Image20261.png" 
            alt="JokkoMeet - Interface de visioconférence"
            className="w-full h-auto object-cover rounded-3xl"
          />
          
          {/* Optionnel : léger overlay sombre en bas pour un effet premium (tu peux supprimer si tu veux) */}
          {/* <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/60 to-transparent" /> */}
        </div>

      </div>
    </section>

      {/* ── FONCTIONNALITÉS ─────────────────────────────────────────── */}
      <section className="px-4 sm:px-8 py-20 bg-surface">
        <div className="max-w-5xl mx-auto">
          <div className="mb-12">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-primary mb-4">
              Fonctionnalités
            </h2>
            <Rule />
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title}
                className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-card transition-shadow">
                <div className="w-11 h-11 bg-surface rounded-xl flex items-center justify-center mb-4 border border-gray-100">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-bold text-primary text-base mb-2">{title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: '#64748b' }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FONCTIONNALITÉS MEET (spécifiques à la salle de réunion) ── */}
      <section className="px-4 sm:px-8 py-20 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="mb-12">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-primary mb-4">
              Dans la réunion
            </h2>
            <Rule />
            <p className="max-w-xl" style={{ color: '#64748b' }}>
              JokkoMeet propose toutes les fonctionnalités d'une plateforme professionnelle,
              hébergée sur une infrastructure souveraine.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {MEET_FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title}
                className="bg-surface rounded-2xl border border-gray-100 p-6 hover:shadow-card transition-shadow">
                <div className="w-11 h-11 bg-white rounded-xl flex items-center justify-center mb-4 border border-gray-100">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-bold text-primary text-base mb-2">{title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: '#64748b' }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── APERÇU SÉCURITÉ ─────────────────────────────────────────── */}
      <section className="px-4 sm:px-8 py-20 bg-surface">
        <div className="max-w-5xl mx-auto">
          <div className="mb-12">
            <Label>Sécurité</Label>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-primary mb-4">
              Vos communications, protégées à chaque instant
            </h2>
            <Rule />
            <p className="max-w-xl" style={{ color: '#64748b' }}>
              Chaque réunion est chiffrée de bout en bout. Le serveur ne peut pas lire
              vos échanges — même nous.
            </p>
          </div>
          <div className="grid sm:grid-cols-3 gap-5 mb-10">
            {SECURITY_PREVIEW.map(({ icon: Icon, title, desc }) => (
              <div key={title}
                className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-card transition-shadow">
                <div className="w-11 h-11 bg-surface rounded-xl flex items-center justify-center mb-4 border border-gray-100">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-bold text-primary text-base mb-2">{title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: '#64748b' }}>{desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center">
            <button onClick={() => navigate('/security')} className="btn btn-primary px-8 py-3 text-sm font-bold">
              <Shield className="w-4 h-4" />
              Voir la page sécurité complète
            </button>
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ───────────────────────────────────────────────── */}
      <section style={{ background: '#2F8F6B' }} className="px-4 sm:px-8 py-20">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
            Prêt à démarrer une réunion ?
          </h2>
          <p className="text-lg mb-8" style={{ color: 'rgba(255,255,255,0.6)' }}>
            Aucun compte requis pour rejoindre. Créez votre réunion en un clic.
          </p>
          <button onClick={() => navigate('/')} className="btn btn-accent px-8 py-3.5 text-base font-bold">
            Créer une réunion <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </section>

      <Footer />
    </div>
  );
}