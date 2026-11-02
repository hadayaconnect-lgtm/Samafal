/** Logo Samafal : un taxi vu de face, avec son enseigne de toit. */
export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" role="img" aria-label="Samafal">
      <rect width="48" height="48" rx="12" fill="#0f7a43" />
      <rect x="19" y="8" width="10" height="5" rx="1.5" fill="#f2b01e" />
      <path
        d="M10 27l3.2-8.6A3 3 0 0 1 16 16.4h16a3 3 0 0 1 2.8 2l3.2 8.6v9h-4v-3H14v3h-4z"
        fill="#ffffff"
      />
      <path d="M15 26l2-6h14l2 6z" fill="#cfe8d8" />
      <circle cx="16" cy="29.5" r="2.4" fill="#0f7a43" />
      <circle cx="32" cy="29.5" r="2.4" fill="#0f7a43" />
    </svg>
  );
}
