/** Pastille avec les initiales d'une personne. */
export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      className="inline-grid shrink-0 place-items-center rounded-full bg-green-soft font-bold text-green-dark"
    >
      {initials}
    </span>
  );
}
