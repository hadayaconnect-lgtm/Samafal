"use client";

import { useState } from "react";
import { Avatar } from "@/components/Avatar";
import { AuthGate } from "@/components/AuthGate";
import { RatingBadge, RatingInput } from "@/components/Rating";
import { ChevronIcon } from "@/components/Icons";
import { useT } from "@/components/LangProvider";
import { TopBar } from "@/components/TopBar";
import { signOut } from "@/lib/auth";
import { deleteComment, inspectDriver, setDriverStatus } from "@/lib/store";
import { useAct, useApp } from "@/lib/useApp";
import { fmtNum, zonePrice, ZONE_IDS } from "@/lib/pricing";
import type { RideStatus } from "@/lib/types";

function InspectForm({ driverId, onDone }: { driverId: string; onDone: () => void }) {
  const { t } = useT();
  const act = useAct();
  const [v, setV] = useState({ car: 4, clean: 4, ac: 4 });
  const [notes, setNotes] = useState("");
  return (
    <div className="grid w-full gap-3 rounded-2xl bg-mist p-4">
      <h3 className="font-bold">{t("inspect_title")}</h3>
      <RatingInput label={t("rate_car")} value={v.car} onChange={(n) => setV({ ...v, car: n })} />
      <RatingInput label={t("rate_clean")} value={v.clean} onChange={(n) => setV({ ...v, clean: n })} />
      <RatingInput label={t("rate_ac")} value={v.ac} onChange={(n) => setV({ ...v, ac: n })} />
      <input className="field" maxLength={300} placeholder={t("inspect_notes")} aria-label={t("inspect_notes")} value={notes} onChange={(e) => setNotes(e.target.value)} />
      <div className="flex gap-2">
        <button type="button" className="btn btn-primary btn-sm" onClick={() => { act(inspectDriver(driverId, { ...v, notes })); onDone(); }}>
          {t("inspect_save")}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onDone}>{t("cancel")}</button>
      </div>
    </div>
  );
}

const isToday = (ts: number) => new Date(ts).toDateString() === new Date().toDateString();

const STATUS_KEY = {
  requested: "ride_requested",
  accepted: "ride_accepted",
  completed: "ride_completed",
  declined: "ride_declined",
  cancelled: "ride_cancelled",
} as const satisfies Record<RideStatus, string>;

type Filter = "all" | "pending" | "online" | "suspended";

export default function AdminPage() {
  const { t } = useT();
  return (
    <AuthGate title={t("union_title")} role="union">
      {() => (
        <div className="min-h-dvh">
          <TopBar
            title={t("union_title")}
            right={
              <button type="button" onClick={() => void signOut()} className="rounded-lg border border-white/25 px-2 py-1.5 text-sm text-white">
                {t("logout_union")}
              </button>
            }
          />
          <main className="mx-auto grid max-w-3xl gap-5 p-4">
            <Dashboard />
          </main>
        </div>
      )}
    </AuthGate>
  );
}

function Dashboard() {
  const { t } = useT();
  const app = useApp();
  const act = useAct();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [inspecting, setInspecting] = useState<string | null>(null);

  const verified = app.drivers.filter((d) => d.verified);
  const online = app.drivers.filter((d) => d.verified && !d.suspended && d.available);
  const pending = app.drivers.filter((d) => !d.verified);
  const suspended = app.drivers.filter((d) => d.suspended);
  const ridesToday = app.rides.filter((r) => isToday(r.createdAt));
  const volume = app.rides
    .filter((r) => r.status === "completed" && isToday(r.updatedAt))
    .reduce((sum, r) => sum + r.price, 0);

  const shown = [...app.drivers]
    .sort((a, b) => Number(a.verified) - Number(b.verified))
    .filter((d) => {
      const text = `${d.name} ${d.plate} ${d.phone}`.toLowerCase();
      if (q.trim() && !text.includes(q.trim().toLowerCase())) return false;
      if (filter === "pending") return !d.verified;
      if (filter === "online") return d.verified && !d.suspended && d.available;
      if (filter === "suspended") return d.suspended;
      return true;
    });

  const filters: { id: Filter; label: string; count: number }[] = [
    { id: "all", label: t("filter_all"), count: app.drivers.length },
    { id: "pending", label: t("stat_pending"), count: pending.length },
    { id: "online", label: t("stat_online"), count: online.length },
    { id: "suspended", label: t("status_suspended"), count: suspended.length },
  ];

  return (
    <>
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl bg-green p-4 text-white">
          <p className="text-xs font-semibold uppercase tracking-wide opacity-80">{t("stat_online")}</p>
          <p className="mt-1 text-3xl font-bold tabular-nums">{online.length}</p>
        </div>
        <div className="rounded-2xl bg-ink p-4 text-white">
          <p className="text-xs font-semibold uppercase tracking-wide opacity-80">{t("stat_volume")}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{fmtNum(volume)}</p>
          <p className="text-xs opacity-80">{t("currency")}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink/60">{t("stat_rides")}</p>
          <p className="mt-1 text-3xl font-bold tabular-nums">{ridesToday.length}</p>
        </div>
        <button
          type="button"
          onClick={() => setFilter("pending")}
          className={`rounded-2xl p-4 text-start ${pending.length > 0 ? "bg-taxi text-ink" : "card"}`}
        >
          <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{t("stat_pending")}</p>
          <p className="mt-1 text-3xl font-bold tabular-nums">{pending.length}</p>
        </button>
      </section>

      <section className="grid gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-bold">{t("drivers_list")}</h2>
          <p className="text-sm text-ink/60 tabular-nums">
            {t("stat_verified")} : {verified.length} / {app.drivers.length}
          </p>
        </div>

        <div>
          <label className="sr-only" htmlFor="q">{t("search")}</label>
          <input
            id="q"
            className="field"
            type="search"
            placeholder={t("search")}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-2" role="group">
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={`btn btn-sm border ${
                filter === f.id ? "border-ink bg-ink text-white" : "border-line bg-white"
              }`}
            >
              {f.label}
              <span className={`tabular-nums ${filter === f.id ? "opacity-80" : "text-ink/50"}`}>{f.count}</span>
            </button>
          ))}
        </div>

        <div className="grid gap-2">
          {shown.map((d) => (
            <div key={d.id} className="card flex flex-wrap items-center gap-3 p-3">
              <Avatar name={d.name} size={44} />
              <div className="min-w-0 flex-1 basis-40">
                <p className="truncate font-semibold">{d.name}</p>
                <p className="truncate text-sm text-ink/70" dir="ltr">
                  {d.vehicle} · {d.plate} · {d.phone}
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {d.suspended ? (
                    <span className="chip chip-bad">{t("status_suspended")}</span>
                  ) : d.verified ? (
                    <span className="chip chip-ok">{t("verified")}</span>
                  ) : (
                    <span className="chip chip-warn">{t("stat_pending")}</span>
                  )}
                  {d.available && !d.suspended && d.verified && <span className="chip">{t("state_online")}</span>}
                  <RatingBadge rating={d.rating} inspected={d.inspection !== null} />
                </div>
                <p className="mt-1 text-xs text-ink/60">
                  {d.inspection
                    ? `${t("rate_inspected_on", { date: new Date(d.inspection.at).toLocaleDateString("fr-FR") })} · ${d.inspection.car}/${d.inspection.clean}/${d.inspection.ac}`
                    : t("rate_not_inspected")}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setInspecting(inspecting === d.id ? null : d.id)}>
                  {t("inspect")}
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${d.verified ? "btn-ghost" : "btn-primary"}`}
                  onClick={() => act(setDriverStatus(d.id, d.verified ? "pending" : "verified"))}
                >
                  {t(d.verified ? "unvalidate" : "validate")}
                </button>
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={() => act(setDriverStatus(d.id, d.suspended ? "verified" : "suspended"))}
                >
                  {t(d.suspended ? "reactivate" : "suspend")}
                </button>
              </div>
              {inspecting === d.id && <InspectForm driverId={d.id} onDone={() => setInspecting(null)} />}
              {app.comments.some((c) => c.driverId === d.id) && (
                <details className="w-full text-sm">
                  <summary className="cursor-pointer font-semibold">
                    {t("comments_title")} ({app.comments.filter((c) => c.driverId === d.id).length})
                  </summary>
                  <div className="mt-2 grid gap-2">
                    {app.comments
                      .filter((c) => c.driverId === d.id)
                      .map((c) => (
                        <div key={c.rideId} className="flex items-start justify-between gap-3 rounded-xl bg-mist p-3">
                          <p dir="auto">
                            {c.text}
                            <span className="block text-xs text-ink/60">{c.author} · {new Date(c.at).toLocaleDateString("fr-FR")}</span>
                          </p>
                          <button type="button" className="btn btn-danger btn-sm shrink-0" onClick={() => act(deleteComment(c.rideId))}>
                            {t("comments_delete")}
                          </button>
                        </div>
                      ))}
                  </div>
                </details>
              )}
            </div>
          ))}
        </div>

      </section>

      <section className="grid gap-2">
        <h2 className="text-lg font-bold">{t("recent_rides")}</h2>
        {app.rides.length === 0 ? (
          <p className="rounded-2xl bg-white p-4 text-sm text-ink/70">{t("no_rides")}</p>
        ) : (
          app.rides.slice(0, 8).map((r) => {
            const drv = app.drivers.find((d) => d.id === r.driverId);
            return (
              <div key={r.id} className="card flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-x-1.5 font-semibold">
                    {r.clientName} · {t(`zone_${r.pickupZone}`)}
                    <ChevronIcon className="h-3.5 w-3.5 rtl:-scale-x-100" />
                    {t(`zone_${r.destZone}`)}
                  </span>
                  <span className="block text-ink/70">{drv?.name}</span>
                </span>
                <span className="text-end">
                  <strong className="tabular-nums">{fmtNum(r.price)} {t("currency")}</strong>
                  <span className="block text-ink/70">{t(STATUS_KEY[r.status])}</span>
                </span>
              </div>
            );
          })
        )}
      </section>

      <section className="grid gap-2">
        <h2 className="text-lg font-bold">{t("price_table")}</h2>
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[36rem] border-collapse text-sm tabular-nums">
            <thead>
              <tr>
                <th className="p-2" />
                {ZONE_IDS.map((z) => (
                  <th key={z} className="p-2 text-start text-xs font-semibold">{t(`zone_${z}`)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ZONE_IDS.map((a) => (
                <tr key={a} className="border-t border-line">
                  <th className="p-2 text-start text-xs font-semibold">{t(`zone_${a}`)}</th>
                  {ZONE_IDS.map((b) => (
                    <td key={b} className={`p-2 ${a === b ? "bg-green-soft font-semibold text-green-dark" : ""}`}>
                      {fmtNum(zonePrice(a, b))}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
