"use client";

import { useEffect, useState } from "react";
import { DriverForm } from "@/components/DriverForm";
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
      <main className="mx-auto grid max-w-3xl gap-4 p-4">
        {ok === undefined ? (
          <p>{t("loading")}</p>
        ) : ok ? (
          <Dashboard />
        ) : (
          <form
            className="card mx-auto grid w-full max-w-sm gap-3 p-4"
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

  const verified = app.drivers.filter((d) => d.verified);
  const online = app.drivers.filter((d) => d.verified && !d.suspended && d.available);
  const pending = app.drivers.filter((d) => !d.verified);
  const ridesToday = app.rides.filter((r) => isToday(r.createdAt));
  const volume = app.rides
    .filter((r) => r.status === "completed" && isToday(r.updatedAt))
    .reduce((sum, r) => sum + r.price, 0);

  const stats: { label: string; value: string }[] = [
    { label: t("stat_drivers"), value: String(app.drivers.length) },
    { label: t("stat_verified"), value: String(verified.length) },
    { label: t("stat_online"), value: String(online.length) },
    { label: t("stat_pending"), value: String(pending.length) },
    { label: t("stat_rides"), value: String(ridesToday.length) },
    { label: t("stat_volume"), value: `${fmtNum(volume)} ${t("currency")}` },
  ];

  const sorted = [...app.drivers].sort((a, b) => Number(a.verified) - Number(b.verified));

  return (
    <>
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="card p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink/60">{s.label}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{s.value}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-2">
        <h2 className="text-sm font-semibold">{t("drivers_list")}</h2>
        {sorted.map((d) => (
          <div key={d.id} className="card flex flex-wrap items-center justify-between gap-3 p-3">
            <div className="min-w-0">
              <p className="truncate font-semibold">{d.name}</p>
              <p className="text-sm text-ink/70" dir="ltr">
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
                {d.available && !d.suspended && d.verified && <span className="chip">{t("stat_online")}</span>}
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
      </section>

      <section className="card grid gap-3 p-4">
        <h2 className="font-semibold">{t("add_driver")}</h2>
        <DriverForm submitKey="add" onSubmit={(data) => addDriver(data, true)} />
      </section>

      <section className="grid gap-2">
        <h2 className="text-sm font-semibold">{t("recent_rides")}</h2>
        {app.rides.length === 0 ? (
          <p className="card p-4 text-sm">{t("no_rides")}</p>
        ) : (
          app.rides.slice(0, 8).map((r) => {
            const drv = app.drivers.find((d) => d.id === r.driverId);
            return (
              <div key={r.id} className="card flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
                <span>
                  {r.clientName} · {t(`zone_${r.pickupZone}`)} → {t(`zone_${r.destZone}`)}
                  <span className="block text-ink/70">{drv?.name}</span>
                </span>
                <span className="text-end">
                  <strong>{fmtNum(r.price)} {t("currency")}</strong>
                  <span className="block text-ink/70">{t(STATUS_KEY[r.status])}</span>
                </span>
              </div>
            );
          })
        )}
      </section>

      <section className="grid gap-2">
        <h2 className="text-sm font-semibold">{t("price_table")}</h2>
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[34rem] border-collapse text-sm tabular-nums">
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
                    <td key={b} className="p-2">{fmtNum(zonePrice(a, b))}</td>
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
