"use client";

import { useEffect, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { DriverForm } from "@/components/DriverForm";
import { ChevronIcon } from "@/components/Icons";
import { useT } from "@/components/LangProvider";
import { TopBar } from "@/components/TopBar";
import { addDriver, patchDriver } from "@/lib/store";
import { useApp } from "@/lib/useApp";
import { fmtNum, zonePrice, ZONE_IDS } from "@/lib/pricing";
import type { RideStatus } from "@/lib/types";

/** Code de démonstration. À remplacer par une vraie authentification (Supabase) avant la mise en service. */
const DEMO_PIN = "1234";
const SESSION_KEY = "samafal:union";
const isToday = (ts: number) => new Date(ts).toDateString() === new Date().toDateString();

const STATUS_KEY = {
  requested: "ride_requested",
  accepted: "ride_accepted",
  completed: "ride_completed",
  declined: "ride_declined",
  cancelled: "ride_cancelled",
} as const satisfies Record<RideStatus, string>;

type Filter = "all" | "pending" | "online" | "suspended";

export default function SyndicatPage() {
  const { t } = useT();
  const [ok, setOk] = useState<boolean | undefined>(undefined);
  const [pin, setPin] = useState("");
  const [wrong, setWrong] = useState(false);

  useEffect(() => {
    try {
      setOk(sessionStorage.getItem(SESSION_KEY) === "1");
    } catch {
      setOk(false);
    }
  }, []);

  function enter() {
    if (pin === DEMO_PIN) {
      try {
        sessionStorage.setItem(SESSION_KEY, "1");
      } catch {
        /* stockage indisponible */
      }
      setOk(true);
      setWrong(false);
    } else {
      setWrong(true);
    }
  }

  function leave() {
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      /* stockage indisponible */
    }
    setOk(false);
    setPin("");
  }

  return (
    <div className="min-h-dvh">
      <TopBar
        title={t("union_title")}
        right={
          ok ? (
            <button type="button" onClick={leave} className="rounded-lg border border-white/25 px-2 py-1.5 text-sm text-white">
              {t("logout_union")}
            </button>
          ) : undefined
        }
      />
      <main className="mx-auto grid max-w-3xl gap-5 p-4">
        {ok === undefined ? (
          <p>{t("loading")}</p>
        ) : ok ? (
          <Dashboard />
        ) : (
          <form
            className="card mx-auto mt-6 grid w-full max-w-sm gap-3 p-5"
            onSubmit={(e) => {
              e.preventDefault();
              enter();
            }}
          >
            <label className="label" htmlFor="pin">{t("pin")}</label>
            <input
              id="pin"
              className="field"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              dir="ltr"
            />
            {wrong && <p className="text-sm text-bad">{t("pin_wrong")}</p>}
            <button type="submit" className="btn btn-primary">{t("enter")}</button>
          </form>
        )}
      </main>
    </div>
  );
}

function Dashboard() {
  const { t } = useT();
  const app = useApp();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

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
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={`btn btn-sm ${d.verified ? "btn-ghost" : "btn-primary"}`}
                  onClick={() => patchDriver(d.id, { verified: !d.verified, available: d.verified ? false : d.available })}
                >
                  {t(d.verified ? "unvalidate" : "validate")}
                </button>
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={() => patchDriver(d.id, { suspended: !d.suspended, available: false })}
                >
                  {t(d.suspended ? "reactivate" : "suspend")}
                </button>
              </div>
            </div>
          ))}
        </div>

        <details className="card p-4">
          <summary className="cursor-pointer font-semibold">{t("add_driver")}</summary>
          <div className="mt-4">
            <DriverForm submitKey="add" onSubmit={(data) => addDriver(data, true)} />
          </div>
        </details>
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
