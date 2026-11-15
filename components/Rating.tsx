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

/** Note de l'inspection en petit : « ★ 4,3 · Inspecté » ou « Non inspecté ». */
export function RatingBadge({ rating, inspected }: { rating: number; inspected: boolean }) {
  const { t } = useT();
  if (!inspected) return <span className="chip">{t("rate_new")}</span>;
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-ink" dir="ltr">
      <span className="text-taxi" aria-hidden="true">★</span>
      <span className="tabular-nums">{rating.toFixed(1)}</span>
      <span className="font-normal text-ink/60">· {t("rate_inspected")}</span>
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

/** Choix de 1 à 5 étoiles (grandes, faciles à toucher). */
export function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const { t } = useT();
  return (
    <div className="flex justify-center gap-1" role="radiogroup" aria-label={t("stars_title")} dir="ltr">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={t("stars_n", { n })}
          onClick={() => onChange(n)}
          className={`h-12 w-12 text-4xl leading-none transition ${value >= n ? "text-taxi" : "text-line"}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

/** Étoiles en lecture seule : « ★★★★☆ ». */
export function StarsStatic({ value }: { value: number }) {
  const { t } = useT();
  return (
    <span className="whitespace-nowrap text-taxi" dir="ltr" role="img" aria-label={t("stars_n", { n: value })}>
      {"★".repeat(value)}
      <span className="text-line">{"★".repeat(5 - value)}</span>
    </span>
  );
}

/** Moyenne des clients : « ★ 4,6 · 12 avis » (rien tant qu'il n'y a aucun avis). */
export function ClientStars({ rating, count }: { rating: number | null; count: number }) {
  const { t } = useT();
  if (rating == null || count === 0) return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-ink" dir="ltr">
      <span className="text-taxi" aria-hidden="true">★</span>
      <span className="tabular-nums">{rating.toFixed(1)}</span>
      <span className="font-normal text-ink/60">· {t("stars_reviews", { n: count })}</span>
    </span>
  );
}
