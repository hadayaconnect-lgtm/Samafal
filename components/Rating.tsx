"use client";

import { useT } from "./LangProvider";

/** Choix d'une note de 1 à 5 (cinq boutons). */
export function RatingInput({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <div>
      <span className="label">{label}</span>
      <div className="grid grid-cols-5 gap-1.5" role="radiogroup" aria-label={label}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            onClick={() => onChange(n)}
            className={`btn btn-sm border tabular-nums ${
              value >= n ? "border-taxi bg-taxi text-ink" : "border-line bg-white text-ink/60"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Note sur 5 en petit : « ★ 4,6 · 12 avis » ou « Nouveau ». */
export function RatingBadge({ rating, count, inspected }: { rating: number; count: number; inspected: boolean }) {
  const { t } = useT();
  if (count === 0 && !inspected) {
    return <span className="chip">{t("rate_new")}</span>;
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-ink" dir="ltr">
      <span className="text-taxi" aria-hidden="true">★</span>
      <span className="tabular-nums">{rating.toFixed(1)}</span>
      {count > 0 && <span className="font-normal text-ink/60">· {t("rate_count", { n: count })}</span>}
    </span>
  );
}

/** Barre de note pour un critère. */
export function RatingBar({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 text-sm">
      <span>{label}</span>
      <span className="font-semibold tabular-nums" dir="ltr">{value == null ? "–" : value.toFixed(1)}</span>
      <span className="col-span-2 h-1.5 overflow-hidden rounded-full bg-line" aria-hidden="true">
        <span className="block h-full rounded-full bg-green" style={{ width: `${((value ?? 0) / 5) * 100}%` }} />
      </span>
    </div>
  );
}
