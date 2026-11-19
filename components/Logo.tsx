/** Logo TaxiBell : un taxi vu de face dans un médaillon jaune, avec sa plaque « TAXIBELL ».
 *  En petit (moins de 72 px) les textes sont retirés pour rester nets. */
export function LogoMark({ size = 40 }: { size?: number }) {
  const withText = size >= 72;
  const font = { fontFamily: "DejaVu Sans, Arial, Helvetica, sans-serif", fontWeight: 700 } as const;
  return (
    <svg width={size} height={size} viewBox="0 0 180 180" role="img" aria-label="TaxiBell">
      <rect width="180" height="180" rx="40" fill="#0f2d22" />
      <circle cx="90" cy="90" r="76" fill="none" stroke="#f2b01e" strokeWidth="5" />
      <rect x="72" y="30" width="36" height="14" rx="5" fill="#f2b01e" />
      {withText && (
        <text x="90" y="41" textAnchor="middle" fontSize="9" textLength="26" lengthAdjust="spacingAndGlyphs" fill="#0f2d22" {...font}>
          TAXI
        </text>
      )}
      <path d="M54 100 L63 62 Q65 55 73 55 L107 55 Q115 55 117 62 L126 100 Z" fill="#ffffff" />
      <path d="M63 96 L70 66 L110 66 L117 96 Z" fill="#0f2d22" />
      <rect x="42" y="96" width="96" height="42" rx="14" fill="#ffffff" />
      <circle cx="55" cy="106" r="6" fill="#f2b01e" />
      <circle cx="125" cy="106" r="6" fill="#f2b01e" />
      <rect x="64" y="112" width="52" height="18" rx="4" fill="#f2b01e" />
      {withText && (
        <text x="90" y="125" textAnchor="middle" fontSize="10" textLength="44" lengthAdjust="spacingAndGlyphs" fill="#0f2d22" {...font}>
          TAXIBELL
        </text>
      )}
    </svg>
  );
}
