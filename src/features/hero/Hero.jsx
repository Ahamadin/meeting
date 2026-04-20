import React from 'react';

/**
 * Composant Hero (full Tailwind)
 * Props:
 *  - imageSrc: string (illustration à droite)
 *  - onPrimary: () => void  (CTA principal)
 *  - onSecondary: () => void (CTA secondaire)
 */
export default function Hero({ imageSrc, onPrimary, onSecondary }) {
  return (
    <section className="relative overflow-hidden bg-[#0f2346] text-[#e9eefc]">
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-6 py-12 md:grid-cols-2 md:py-16 lg:py-20">
        {/* Colonne gauche */}
        <div>
          <h1 className="font-extrabold leading-[0.95] tracking-[0.2px] text-[clamp(36px,6.2vw,76px)]">
            <span className="block text-[#1dbd3a]">Réunions vidéo</span>
            <span className="block text-[#1dbd3a]">pour une</span>{' '}
            <span className="text-[#ffd400]">équipe</span>
            <br />
            <span className="text-[#ffd400]">accessible</span>,
            <br />
            <span className="text-[#e42320]">efficace</span>{' '}
            <span className="text-[#e42320]">et</span>
            <br />
            <span className="block text-[#e42320]">souveraine</span>
          </h1>

          <p className="mt-4 max-w-[60ch] text-[clamp(16px,1.6vw,19px)] text-[#c8d2f3]">
            Créez. Invitez. Collaborez. Une plateforme de visioconférence chifrée,
            rapide et réutilisable — pensée pour vos équipes et vos services.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            {/* j’utilise tes classes btn pour rester cohérent avec ton design */}
            <button onClick={onPrimary} className="btn btn-solid">
              Démarrer une réunion
            </button>
            <button onClick={onSecondary} className="btn btn-ghost">
              À propos de la plateforme
            </button>
          </div>

          <ul className="mt-4 flex list-none gap-5 text-sm text-[#c8d2f3]">
            <li>✓ Chiffré</li>
            <li>✓ Haute qualité</li>
            <li>✓ 100% en ligne</li>
          </ul>
        </div>

        {/* Colonne droite */}
        <div className="grid place-items-center">
          <div className="relative w-[92%] max-w-[640px] rounded-3xl bg-white p-3 shadow-[0_20px_60px_rgba(0,0,0,0.35),inset_0_0_0_1px_rgba(255,255,255,0.06)]">
            <img
              src={imageSrc}
              alt="Visuel de réunion moderne"
              className="block w-full rounded-2xl"
              loading="eager"
              decoding="async"
            />
            {/* bande verte décorative */}
            <div
              aria-hidden="true"
              className="absolute left-3 right-3 -bottom-2 h-2 rounded-lg"
              style={{
                background:
                  'linear-gradient(90deg,#1dbd3a 0%,#158a2c 25%,#1dbd3a 50%,#158a2c 75%,#1dbd3a 100%)',
              }}
            />
            {/* halos lumineux */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -left-2 -top-2 h-20 w-20"
              style={{
                background:
                  'radial-gradient(circle, rgba(255,255,255,.9) 0%, rgba(255,255,255,0) 70%)',
                filter: 'drop-shadow(0 0 18px rgba(255,255,255,.35))',
              }}
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-1 -bottom-1 h-20 w-20"
              style={{
                background:
                  'radial-gradient(circle, rgba(255,255,255,.9) 0%, rgba(255,255,255,0) 70%)',
                filter: 'drop-shadow(0 0 18px rgba(255,255,255,.35))',
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
