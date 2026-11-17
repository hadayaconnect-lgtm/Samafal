"use client";

import { useT } from "./LangProvider";
import { fmtNum } from "@/lib/pricing";
import type { Driver, Ride, RideStatus } from "@/lib/types";

const DAY = 24 * 60 * 60 * 1000;
const startOfDay = (ts: number) => {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

const STATUS_KEY = {
  requested: "ride_requested",
  accepted: "ride_accepted",
  arrived: "ride_arrived",
  started: "ride_started",
  completed: "ride_completed",
  declined: "ride_declined",
  cancelled: "ride_cancelled",
} as const satisfies Record<RideStatus, string>;

const STATUS_COLOR: Record<RideStatus, string> = {
  requested: "bg-taxi",
  accepted: "bg-green",
  arrived: "bg-green",
  started: "bg-green",
  completed: "bg-ink",
  declined: "bg-line",
  cancelled: "bg-line",
};

/** Statistiques de l'administration, calculées à partir des courses et chauffeurs déjà chargés. */
export function AdminStats({ rides, drivers }: { rides: Ride[]; drivers: Driver[] }) {
  const { t } = useT();
  const today = startOfDay(Date.now());

  const done = rides.filter((r) => r.status === "completed");
  const sum = (list: Ride[]) => list.reduce((s, r) => s + r.price, 0);
  const since = (days: number) => done.filter((r) => r.updatedAt >= today - (days - 1) * DAY);
  const revenue = [
    { label: t("adm_today"), value: sum(since(1)) },
    { label: t("adm_7d"), value: sum(since(7)) },
    { label: t("adm_30d"), value: sum(since(30)) },
    { label: t("adm_all"), value: sum(done) },
  ];

  const clients = new Set(rides.map((r) => r.clientPhone || r.clientName)).size;
  const avg = done.length ? Math.round(sum(done) / done.length) : 0;

  const statuses = (Object.keys(STATUS_KEY) as RideStatus[]).map((s) => ({
    status: s,
    count: rides.filter((r) => r.status === s).length,
  }));
  const maxStatus = Math.max(1, ...statuses.map((s) => s.count));

  const days = Array.from({ length: 7 }, (_, i) => {
    const from = today - (6 - i) * DAY;
    return {
      label: new Date(from).toLocaleDateString("fr-FR", { weekday: "short" }),
      count: rides.filter((r) => r.createdAt >= from && r.createdAt < from + DAY).length,
    };
  });
  const maxDay = Math.max(1, ...days.map((d) => d.count));

  const top = drivers
    .map((d) => ({ d, n: done.filter((r) => r.driverId === d.id).length }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n)
    .slice(0, 5);

  return (
    <section className="grid gap-3">
      <h2 className="text-lg font-bold">{t("adm_stats")}</h2>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: t("adm_drivers"), value: drivers.filter((d) => !d.deleted).length },
          { label: t("adm_clients"), value: clients },
          { label: t("adm_rides_total"), value: rides.length },
          { label: t("adm_done"), value: done.length },
        ].map((c) => (
          <div key={c.label} className="card p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink/60">{c.label}</p>
            <p className="mt-1 text-3xl font-bold tabular-nums">{fmtNum(c.value)}</p>
          </div>
        ))}
      </div>

      <div className="card grid gap-3 p-4">
        <h3 className="font-bold">{t("adm_rev_title")}</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {revenue.map((r) => (
            <div key={r.label}>
              <p className="text-xs text-ink/60">{r.label}</p>
              <p className="text-xl font-bold tabular-nums">{fmtNum(r.value)}</p>
              <p className="text-xs text-ink/60">{t("currency")}</p>
            </div>
          ))}
        </div>
        <p className="text-sm text-ink/70">
          {t("adm_avg")} : <strong className="tabular-nums">{fmtNum(avg)} {t("currency")}</strong>
        </p>
      </div>

      <div className="card grid gap-2 p-4">
        <h3 className="font-bold">{t("adm_last7")}</h3>
        <div className="flex h-32 items-end gap-2" dir="ltr">
          {days.map((d, i) => (
            <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
              <span className="text-xs font-semibold tabular-nums">{d.count}</span>
              <span className="w-full rounded-t-md bg-green" style={{ height: `${(d.count / maxDay) * 100}%`, minHeight: d.count ? 4 : 2 }} />
              <span className="text-[11px] text-ink/60">{d.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card grid gap-2 p-4">
        <h3 className="font-bold">{t("adm_by_status")}</h3>
        {statuses.map((s) => (
          <div key={s.status} className="grid grid-cols-[7rem_1fr_auto] items-center gap-2 text-sm">
            <span className="truncate">{t(STATUS_KEY[s.status])}</span>
            <span className="h-2 overflow-hidden rounded-full bg-line" aria-hidden="true">
              <span className={`block h-full rounded-full ${STATUS_COLOR[s.status]}`} style={{ width: `${(s.count / maxStatus) * 100}%` }} />
            </span>
            <span className="font-semibold tabular-nums">{s.count}</span>
          </div>
        ))}
      </div>

      {top.length > 0 && (
        <div className="card grid gap-2 p-4">
          <h3 className="font-bold">{t("adm_top")}</h3>
          {top.map((x, i) => (
            <div key={x.d.id} className="flex items-center justify-between gap-3 text-sm">
              <span className="truncate">{i + 1}. {x.d.name}</span>
              <span className="font-semibold tabular-nums">{x.n}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
