"use client";

import { ChevronIcon } from "./Icons";
import { StarsStatic } from "./Rating";
import { useT } from "./LangProvider";
import { fmtNum } from "@/lib/pricing";
import { useApp } from "@/lib/useApp";
import type { Ride, RideStatus } from "@/lib/types";

const STATUS_KEY = {
  requested: "ride_requested",
  accepted: "ride_accepted",
  arrived: "ride_arrived",
  started: "ride_started",
  completed: "ride_completed",
  declined: "ride_declined",
  cancelled: "ride_cancelled",
} as const satisfies Record<RideStatus, string>;

/**
 * Liste des courses passées. mode « client » : on voit le chauffeur et la note donnée.
 * mode « driver » : on voit le client et la note reçue.
 */
export function RideHistory({ rides, mode, limit = 30 }: { rides: Ride[]; mode: "client" | "driver"; limit?: number }) {
  const { t, lang } = useT();
  const app = useApp();
  const locale = lang === "ar" ? "ar" : lang === "so" ? "so" : "fr-FR";
  const past = rides
    .filter((r) => r.status === "completed" || r.status === "cancelled" || r.status === "declined")
    .sort((a, b) => b.createdAt - a.createdAt);
  const done = past.filter((r) => r.status === "completed");
  const sum = done.reduce((s, r) => s + r.price, 0);

  if (past.length === 0) return <p className="rounded-2xl bg-mist p-4 text-sm">{t("history_empty")}</p>;

  return (
    <div className="grid gap-2">
      <p className="text-sm font-semibold text-green-dark tabular-nums">
        {t("history_total", { n: done.length, sum: fmtNum(sum), cur: t("currency") })}
      </p>
      <ul className="grid gap-2">
        {past.slice(0, limit).map((r) => {
          const who = mode === "client" ? app.drivers.find((d) => d.id === r.driverId)?.name ?? "" : r.clientName;
          return (
            <li key={r.id} className="card grid gap-1 p-3 text-sm">
              <p className="flex flex-wrap items-center gap-x-2">
                <strong>{r.pickupText || t(`zone_${r.pickupZone}`)}</strong>
                <ChevronIcon className="h-3.5 w-3.5 text-ink/50 rtl:-scale-x-100" />
                <strong>{r.destText || t(`zone_${r.destZone}`)}</strong>
                <span className="ms-auto font-bold tabular-nums">
                  {fmtNum(r.price)} {t("currency")}
                </span>
              </p>
              <p className="flex flex-wrap items-center justify-between gap-x-3 text-xs text-ink/70">
                <span dir="auto">
                  {who} · {new Date(r.createdAt).toLocaleString(locale, { dateStyle: "short", timeStyle: "short" })}
                </span>
                <span className={r.status === "completed" ? "font-semibold text-green-dark" : "font-semibold text-bad"}>
                  {t(STATUS_KEY[r.status])}
                </span>
              </p>
              {r.status === "completed" && (
                <p className="flex items-center gap-2 text-xs text-ink/70">
                  {t(mode === "client" ? "hist_rating_given" : "hist_rating_got")} :
                  {r.stars ? <StarsStatic value={r.stars} /> : <span>{t("hist_not_rated")}</span>}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
