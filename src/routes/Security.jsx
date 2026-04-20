// src/routes/Security.jsx
import { useNavigate } from 'react-router-dom';
import {
  Shield, Key, Server, Eye, Wifi, FileText, Lock,
  CheckCircle, ArrowRight, ShieldCheck, AlertTriangle,
} from 'lucide-react';
import Footer from '../components/Footer';

const LAYERS = [
  {
    num: '01', icon: Wifi,      color: '#2563eb',
    title: 'Couche 1 — ICE / STUN',
    subtitle: 'Connexion directe pair-à-pair',
    desc: "Les flux audio/vidéo transitent directement entre participants via WebRTC ICE (candidateType: srflx). Le serveur STUN échange uniquement des identifiants de session temporaires — aucune donnée media n'y passe.",
    points: ['Connexion P2P directe confirmée', 'Aucun relai serveur', 'ICE State: completed'],
  },
  {
    num: '02', icon: Lock,      color: '#2563eb',
    title: 'Couche 2 — DTLS 1.2',
    subtitle: 'Tunnel chiffré avec Perfect Forward Secrecy',
    desc: "Chaque session WebRTC est protégée par DTLS (Datagram TLS). Suite utilisée : TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256. Les clés éphémères ECDHE sont générées à chaque session et jamais stockées.",
    points: ['Perfect Forward Secrecy actif', 'Authentification mutuelle ECDSA', 'Clés éphémères, jamais stockées'],
  },
  {
    num: '03', icon: Shield,    color: '#2563eb',
    title: 'Couche 3 — SRTP',
    subtitle: 'Chiffrement de chaque paquet réseau',
    desc: "Chaque paquet audio/vidéo est chiffré avec SRTP (Secure Real-Time Protocol). Suite : AES_CM_128_HMAC_SHA1_80. Aucun contenu identifiable ne peut être capturé par Wireshark — le protocole RTP n'est même pas visible.",
    points: ['333 481 paquets analysés', '0 contenu audio/vidéo visible', 'Protocole RTP absent des captures'],
  },
  {
    num: '04', icon: Key,       color: '#2563eb',
    title: 'Couche 4 — E2EE Applicatif',
    subtitle: 'AES-GCM 256 bits — Zero-Knowledge Server',
    desc: "En plus du chiffrement réseau, chaque frame vidéo est chiffrée avec AES-GCM 256 bits directement dans le navigateur via les Insertable Streams WebRTC. La clé n'est jamais transmise au serveur.",
    points: ['AES-GCM 256 bits', 'Clé détenue uniquement par les participants', 'Le serveur ne peut pas lire le contenu'],
  },
];

const STANDARDS = [
  ['RFC 5764 (DTLS-SRTP)', 'Standard IETF', 'Conforme'],
  ['RFC 3711 (SRTP)', 'Chiffrement temps réel', 'Conforme'],
  ['NIST SP 800-52', 'Recommandations TLS', 'Conforme'],
  ['AES-GCM 256 bits', 'Chiffrement SECRET DÉFENSE', 'Conforme'],
  ['Perfect Forward Secrecy', 'Protection sessions passées', 'Activé'],
  ['W3C WebRTC Security', 'Standard international', 'Conforme'],
  ['RGPD', 'Aucune donnée lisible en transit', 'Conforme'],
  ['Zero-Knowledge Server', 'Serveur sans accès au contenu', 'Démontré'],
];

function SectionLabel({ children }) {
  return <p className="text-xs font-bold tracking-widest uppercase text-primary mb-3">{children}</p>;
}
function Divider() {
  return <div className="w-10 h-1 bg-primary rounded-full mb-8" />;
}

export default function Security() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">

      {/* HEADER */}
      <header className="h-16 flex items-center justify-between px-4 sm:px-8 border-b border-gray-100 sticky top-0 bg-white z-50">
        <button onClick={() => navigate('/')} className="flex items-center gap-3">
          <img src="/senegal.jpg" alt="Logo"
            style={{ width: 36, height: 36, borderRadius: 10, objectFit: 'contain', background: '#fff' }} />
          <span className="font-bold text-primary text-lg hidden sm:block">JokkoMeet</span>
        </button>
        <nav className="flex items-center gap-2">
          <button onClick={() => navigate('/about')}    className="btn btn-ghost text-sm">À propos</button>
          <button onClick={() => navigate('/security')} className="btn btn-ghost text-sm font-semibold text-primary">Sécurité</button>
          <button onClick={() => navigate('/')}         className="btn btn-primary text-sm">Démarrer</button>
        </nav>
      </header>

      {/* HERO */}
        <section 
          className="relative text-white px-4 sm:px-8 py-20 sm:py-28"
          style={{
            backgroundImage: `url('/Image20261.png')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        >
          {/* Overlay léger */}
          <div className="absolute inset-0 bg-black/55" />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="flex justify-center mb-6">
              {/* Espace vide comme dans ton code original */}
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight mb-6">
              Communications Numériques chiffrées
            </h1>

            <p className="text-lg max-w-2xl mx-auto mb-8 leading-relaxed" 
               style={{ color: 'rgba(255,255,255,0.85)' }}>
              Analyse complète par Wireshark (333 481 paquets capturés) et Chrome WebRTC-Internals
              confirme : 0 paquet en clair, chiffrement actif à 4 couches indépendantes.
            </p>
          </div>
        </section>

      {/* CHIFFRES CLÉS */}
      <section className="border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-8 py-12 grid grid-cols-2 sm:grid-cols-4 gap-8">
          {[
            { value: '4',      label: 'Couches de protection' },
            { value: '256',    label: 'Bits AES-GCM E2EE' },
            { value: '0',      label: 'Paquet en clair détecté' },
            { value: '333K+',  label: 'Paquets analysés' },
          ].map(({ value, label }) => (
            <div key={label} className="text-center">
              <div className="text-4xl font-extrabold text-primary mb-1">{value}</div>
              <div className="text-sm text-gray-500 font-medium">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 4 COUCHES */}
      <section className="px-4 sm:px-8 py-20 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="mb-12">
            <SectionLabel>Architecture</SectionLabel>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-primary mb-4">
              Quatre couches de protection indépendantes
            </h2>
            <Divider />
            <p className="text-gray-500 max-w-xl">
              Chaque couche est indépendante et complémentaire. La compromission d'une
              couche ne suffit pas à accéder au contenu.
            </p>
          </div>
          <div className="space-y-5">
            {LAYERS.map(({ num, icon: Icon, title, subtitle, desc, points }) => (
              <div key={num}
                className="border border-gray-100 rounded-2xl p-6 sm:p-8 hover:shadow-card transition-shadow"
              >
                <div className="flex flex-col sm:flex-row sm:items-start gap-5">
                  {/* Numéro + icône */}
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-4xl font-extrabold text-gray-100 sm:hidden">{num}</span>
                  </div>
                  {/* Contenu */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-4xl font-extrabold text-gray-100 hidden sm:block">{num}</span>
                      <div>
                        <h3 className="font-bold text-primary text-lg leading-tight">{title}</h3>
                        <p className="text-primary text-sm font-semibold">{subtitle}</p>
                      </div>
                    </div>
                    <p className="text-gray-600 text-sm leading-relaxed mt-3 mb-4">{desc}</p>
                    <div className="flex flex-wrap gap-2">
                      {points.map(p => (
                        <span key={p} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface border border-gray-100 text-xs font-semibold text-primary">
                          <CheckCircle className="w-3.5 h-3.5 text-primary" />
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

     {/* PREUVE MINIO */}
<section className="px-4 sm:px-8 py-20 bg-surface">
  <div className="max-w-5xl mx-auto">
    <div className="mb-12">
      <SectionLabel>Preuve concrète</SectionLabel>
      <h2 className="text-3xl sm:text-4xl font-extrabold text-primary mb-4">
        Zero-Knowledge Server démontré
      </h2>
      <Divider />
    </div>

    <div className="grid sm:grid-cols-2 gap-6 mb-10">
      {[
        {
          icon: Eye,
          title: 'Enregistrement stocké mais illisible',
          desc: "Le fichier MP4 existe sur le serveur MinIO (11,1 Mo), mais sa lecture depuis le serveur produit un écran noir ou des artefacts colorés. Aucun visage, aucun son identifiable.",
          tag: 'Prouvé par capture',
        },
        {
          icon: Key,
          title: 'Clé uniquement chez les participants',
          desc: "Le décodeur VP8 du serveur interprète des octets aléatoires chiffrés AES-GCM comme des données vidéo comprimées. Sans la clé (détenue uniquement par les participants), c'est impossible à décoder.",
          tag: 'AES-GCM 256 bits',
        },
      ].map(({ icon: Icon, title, desc, tag }) => (
        <div key={title} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-soft">
          <div className="w-11 h-11 bg-surface rounded-xl flex items-center justify-center mb-4 border border-gray-100">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          <span className="inline-block px-2.5 py-0.5 rounded-full bg-surface border border-gray-200 text-xs font-bold text-primary mb-3">
            {tag}
          </span>
          <h3 className="font-bold text-primary text-base mb-2">{title}</h3>
          <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
        </div>
      ))}
    </div>

    {/* Résultat visuel avec VIDÉO */}
    <div className="bg-primary rounded-2xl p-6 sm:p-8">
      <div className="flex items-start gap-4">
        <AlertTriangle className="w-6 h-6 text-yellow-400 shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-bold text-white text-base mb-3">
            Interprétation technique
          </h3>
          
          <p className="text-sm leading-relaxed mb-6" style={{ color: 'rgba(255,255,255,0.85)' }}>
            Le fichier MP4 contient des frames vidéo chiffrées AES-GCM 256 bits. Sans la clé
            (détenue uniquement par les participants), le décodeur VP8 du serveur interprète
            des octets aléatoires comme des données vidéo comprimées. Résultat : écran noir
            ou artefacts visuels. Aucun visage, aucun son, aucune information identifiable.
            C'est la définition même du Zero-Knowledge Server.
          </p>

          {/* Vidéo jouable */}
          <div className="rounded-xl overflow-hidden border border-white/20 shadow-inner bg-black">
            <video 
              src="/sons/video.mp4" 
              controls 
              className="w-full rounded-xl"
              poster="/Image2026.png"   // Image d'aperçu avant lecture (optionnel)
              preload="metadata"
            >
              Votre navigateur ne supporte pas la lecture vidéo.
            </video>
          </div>

          <p className="text-xs text-white/60 mt-3 text-center">
            Vidéo réelle d’un enregistrement stocké sur le serveur MinIO (lecture côté serveur)
          </p>
        </div>
      </div>
    </div>
  </div>
</section>

      {/* CONFORMITÉ */}
      <section className="px-4 sm:px-8 py-20 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="mb-12">
            <SectionLabel>Conformité</SectionLabel>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-primary mb-4">
              Standards internationaux respectés
            </h2>
            <Divider />
          </div>
          <div className="border border-gray-100 rounded-2xl overflow-hidden shadow-soft">
            <div className="grid grid-cols-3 bg-primary px-6 py-3">
              <span className="text-xs font-bold uppercase tracking-wider text-white/60">Standard</span>
              <span className="text-xs font-bold uppercase tracking-wider text-white/60">Description</span>
              <span className="text-xs font-bold uppercase tracking-wider text-white/60 text-right">Statut</span>
            </div>
            {STANDARDS.map(([std, desc, status], i) => (
              <div key={std}
                className={`grid grid-cols-3 items-center px-6 py-4 ${i % 2 === 0 ? 'bg-surface' : 'bg-white'} border-t border-gray-100`}
              >
                <span className="font-semibold text-primary text-sm">{std}</span>
                <span className="text-gray-500 text-sm">{desc}</span>
                <div className="flex justify-end">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold"
                    style={{ background: 'rgba(34,197,94,0.1)', color: '#15803d', border: '1px solid rgba(34,197,94,0.25)' }}>
                    <CheckCircle className="w-3 h-3" /> {status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary px-4 sm:px-8 py-20">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
            Démarrez en toute confiance
          </h2>
          <p className="text-lg mb-8" style={{ color: 'rgba(255,255,255,0.6)' }}>
            Vos réunions sont protégées par le même niveau de chiffrement que les systèmes gouvernementaux.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <button onClick={() => navigate('/')} className="btn btn-primary px-8 py-3.5 text-base font-bold">
              Créer une réunion <ArrowRight className="w-5 h-5" />
            </button>
            <button onClick={() => navigate('/about')}
              className="btn px-6 py-3 text-base font-semibold"
              style={{ border: '1px solid rgba(255,255,255,0.2)', color: '#fff', background: 'transparent' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              En savoir plus
            </button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}