import {
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Mail,
  Phone,
  MapPin
} from "lucide-react";

export default function Footer() {
  const year = new Date().getFullYear();

  const linkBase =
    "text-white/80 hover:text-white transition-colors";

  const iconBtn =
    "h-10 w-10 rounded-lg flex items-center justify-center border border-white/20 hover:bg-white/10 transition";

  return (
    <footer style={{ background: 'black' }} className="text-white">
      <div className="mx-auto max-w-7xl px-6 py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center">
                <img
                  src="/senegal.jpg"
                  alt="visioplus"
                  className="h-6 w-6 object-contain"
                />
              </div>
              <span className="text-lg font-semibold">
                JokkoMeet
              </span>
            </div>

            <p className="mt-4 text-white/80 leading-relaxed">
              Une plateforme simple et sécurisée pour organiser
              et gérer vos réunions en ligne.
            </p>

            <div className="mt-6 flex items-center gap-3">
              <a href="#" aria-label="Facebook" className={iconBtn}>
                <Facebook className="h-5 w-5" />
              </a>
              <a href="#" aria-label="Twitter" className={iconBtn}>
                <Twitter className="h-5 w-5" />
              </a>
              <a href="#" aria-label="Instagram" className={iconBtn}>
                <Instagram className="h-5 w-5" />
              </a>
              <a href="#" aria-label="LinkedIn" className={iconBtn}>
                <Linkedin className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-base font-semibold">Services</h3>
            <ul className="mt-4 space-y-3">
              <li><a href="#" className={linkBase}>Réunions instantanées</a></li>
              <li><a href="#" className={linkBase}>Planification</a></li>
              <li><a href="#" className={linkBase}>Partage d’écran</a></li>
              <li><a href="#" className={linkBase}>Enregistrement</a></li>
            </ul>
          </div>

          {/* Plateforme */}
          <div>
            <h3 className="text-base font-semibold">Plateforme</h3>
            <ul className="mt-4 space-y-3">
              <li><a href="#" className={linkBase}>À propos</a></li>
              <li><a href="#" className={linkBase}>Tarification</a></li>
              <li><a href="#" className={linkBase}>Blog</a></li>
              <li><a href="#" className={linkBase}>Partenaires</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-base font-semibold">Contact</h3>
            <ul className="mt-4 space-y-4 text-white/80">
              <li className="flex items-start gap-3">
                <Mail className="h-5 w-5 mt-0.5" />
                <a href="mailto:contact@meeting.pro" className={linkBase}>
                  contact@meeting.pro
                </a>
              </li>
              <li className="flex items-start gap-3">
                <Phone className="h-5 w-5 mt-0.5" />
                <a href="tel:+221338234567" className={linkBase}>
                  +221 33 823 45 67
                </a>
              </li>
              <li className="flex items-start gap-3">
                <MapPin className="h-5 w-5 mt-0.5" />
                <span>Dakar, Sénégal — Plateau</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/20">
        <div className="mx-auto max-w-7xl px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-white/70">
          <span>© {year} visioplus. Tous droits réservés.</span>

          <nav className="flex flex-wrap items-center gap-6">
            <a href="#" className="hover:text-white">Conditions</a>
            <a href="#" className="hover:text-white">Confidentialité</a>
            <a href="#" className="hover:text-white">Mentions légales</a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
