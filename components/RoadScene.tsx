/**
 * Bandeau décoratif de l'accueil : un petit taxi roule sur une route, devant la ville
 * (mosquée, immeubles, palmiers). Les animations sont définies dans globals.css
 * et s'arrêtent si l'appareil demande moins de mouvement.
 */
export function RoadScene() {
  return (
    <div
      className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-[#123f2e] to-[#0b2e22]"
      aria-hidden="true"
      dir="ltr"
    >
      <svg viewBox="0 0 400 118" className="block h-auto w-full" focusable="false">
        <defs>
          <linearGradient id="tb-beam" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#fff3b0" stopOpacity="0.55" />
            <stop offset="1" stopColor="#fff3b0" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Soleil couchant */}
        <circle cx="335" cy="36" r="28" fill="#f2b01e" opacity="0.14" />
        <circle cx="335" cy="36" r="16" fill="#f2b01e" opacity="0.9" />

        {/* Ville : immeubles, mosquée, minaret */}
        <g fill="#0f4a35">
          <rect x="8" y="62" width="22" height="30" />
          <rect x="34" y="48" width="16" height="44" />
          <rect x="54" y="66" width="26" height="26" />
          <rect x="86" y="56" width="14" height="36" />
          <rect x="104" y="70" width="22" height="22" />
          <rect x="140" y="66" width="28" height="26" />
          <path d="M143 66a11 11 0 0 1 22 0z" />
          <rect x="172" y="44" width="5" height="48" />
          <path d="M170.500 44L174.500 37L178.500 44z" />
          <rect x="190" y="60" width="18" height="32" />
          <rect x="212" y="72" width="20" height="20" />
          <rect x="300" y="58" width="16" height="34" />
          <rect x="320" y="70" width="24" height="22" />
        </g>
        {/* Fenêtres allumées */}
        <g fill="#f2b01e" opacity="0.55">
          <rect x="13" y="68" width="3" height="3" />
          <rect x="21" y="76" width="3" height="3" />
          <rect x="39" y="56" width="3" height="3" />
          <rect x="39" y="68" width="3" height="3" />
          <rect x="91" y="64" width="3" height="3" />
          <rect x="195" y="68" width="3" height="3" />
          <rect x="305" y="66" width="3" height="3" />
          <rect x="305" y="78" width="3" height="3" />
        </g>

        {/* Palmiers */}
        <g stroke="#0c3d2a" strokeWidth="3" strokeLinecap="round" fill="none">
          <path d="M250 90C250 78 252 70 253 62" />
          <path d="M253 62q-14 -4 -22 6M253 62q-10 -11 -22 -6M253 62q10 -11 22 -6M253 62q14 -4 22 6M253 62q0 -12 -2 -17" />
          <path d="M376 90C376 80 378 72 379 66" />
          <path d="M379 66q-12 -4 -19 5M379 66q-9 -10 -19 -5M379 66q9 -10 19 -5M379 66q12 -4 19 5M379 66q0 -11 -2 -15" />
        </g>

        {/* Route */}
        <rect x="0" y="88" width="400" height="30" fill="#061a12" />
        <rect x="0" y="88" width="400" height="2.500" fill="#1d5c43" />
        <line
          className="tb-dash"
          x1="0"
          y1="108"
          x2="400"
          y2="108"
          stroke="#f2b01e"
          strokeWidth="2.500"
          strokeDasharray="14 12"
          strokeLinecap="round"
        />

        {/* Taxi (vu de côté, roule vers la droite) */}
        <g className="tb-taxi">
          <polygon points="70,70 114,58 114,86 70,75" fill="url(#tb-beam)" />
          <rect x="0" y="66" width="70" height="18" rx="5" fill="#1fa65b" />
          <path d="M14 66L22 50Q23 48 26 48H44Q47 48 48.500 50L56 66z" fill="#1fa65b" />
          <path d="M20 64L26 52H34V64zM37 64V52H44L50 64z" fill="#cfe8d8" />
          <rect x="29" y="41" width="12" height="7" rx="1.500" fill="#ffffff" />
          <text x="35" y="46.200" fontSize="4.400" fontWeight="800" textAnchor="middle" fill="#0a5a31">
            TAXI
          </text>
          <line x1="2" y1="76" x2="68" y2="76" stroke="#ffffff" strokeWidth="3" strokeDasharray="3 3" />
          <rect x="66" y="69" width="4.500" height="4.500" rx="1" fill="#fff3b0" />
          <rect x="0" y="69" width="2.500" height="4.500" fill="#e14b3a" />
          <g className="tb-wheel">
            <circle cx="16" cy="84" r="7.500" fill="#101010" />
            <circle cx="16" cy="84" r="3" fill="#cbd5d0" />
            <line x1="16" y1="78.500" x2="16" y2="89.500" stroke="#101010" strokeWidth="1.200" />
          </g>
          <g className="tb-wheel">
            <circle cx="54" cy="84" r="7.500" fill="#101010" />
            <circle cx="54" cy="84" r="3" fill="#cbd5d0" />
            <line x1="54" y1="78.500" x2="54" y2="89.500" stroke="#101010" strokeWidth="1.200" />
          </g>
        </g>
      </svg>
    </div>
  );
}
