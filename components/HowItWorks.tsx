"use client";

import { useT } from "@/components/LangProvider";

/** Mode d'emploi en 3 étapes : chacun voit le sien (client ou chauffeur) une fois dans son espace. */
export function HowItWorks({ role }: { role: "client" | "driver" }) {
  const { t } = useT();
  const keys = role === "driver" ? (["how_d1", "how_d2", "how_d3"] as const) : (["how_1", "how_2", "how_3"] as const);
  return (
    <section className="card grid gap-3 p-4" aria-labelledby={`how-${role}`}>
      <h2 id={`how-${role}`} className="text-lg font-bold">{t("how_title")}</h2>
      <ol className="grid gap-3">
        {keys.map((k, i) => (
          <li key={k} className="flex items-center gap-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-taxi font-bold text-ink">{i + 1}</span>
            <span className="text-sm">{t(k)}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
