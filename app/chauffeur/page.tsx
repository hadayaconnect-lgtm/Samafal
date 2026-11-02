"use client";

import { useEffect, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { DriverForm } from "@/components/DriverForm";
import { ChevronIcon, PhoneIcon } from "@/components/Icons";
import { useT } from "@/components/LangProvider";
import { TopBar } from "@/components/TopBar";
import { addDriver, confirmPaid, patchDriver, setRideStatus } from "@/lib/store";
import { useApp } from "@/lib/useApp";
import { fmtNum } from "@/lib/pricing";
import { ZONES, zoneCoords, type ZoneId } from "@/lib/zones";
import type { Driver, Ride } from "@/lib/types";

const ME_KEY = "samafal:me";
const isToday = (ts: number) => new Date(ts).toDateString() === new Date().toDateString();
const tel = (p: string) => `tel:${p.replace(/\s/g, "")}`;

export default function ChauffeurPage() {
  const { t } = useT();
  const app = useApp();
  const [me, setMe] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    try {
      setMe(localStorage.getItem(ME_KEY));
    } catch {
      setMe(null);
    }
  }, []);

  function login(id: string | null) {
    setMe(id);
    try {
      if (id) localStorage.setItem(ME_KEY, id);
      else localStorage.removeItem(ME_KEY);
    } catch {
      /* stockage indisponible */
    }
  }

  const driver = me ? app.drivers.find((d) => d.id === me) : undefined;

  return (
    <div className="min-h-dvh">
      <TopBar title={t("driver_title")} />
      <main className="mx-auto grid max-w-xl gap-4 p-4">
        {me === undefined ? (
          <p>{t("loading")}</p>
        ) : driver ? (
          <Dashboard driver={driver} onLogout={() => login(null)} />
        ) : (
          <Login drivers={app.drivers} onLogin={login} />
        )}
      </main>
    </div>
  );
}

function Login({ drivers, onLogin }: { drivers: Driver[]; onLogin: (id: string) => void }) {
  const { t } = useT();
  const [pick, setPick] = useState("");
  return (
    <>
      <section className="card grid gap-3 p-4">
        <h2 className="text-lg font-bold">{t("who_are_you")}</h2>
        <div>
          <label className="label" htmlFor="pick">{t("pick_driver")}</label>
          <select id="pick" className="field" value={pick} onChange={(e) => setPick(e.target.value)}>
            <option value="" />
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} · {d.plate}
              </option>
            ))}
          </select>
        </div>
        <button type="button" className="btn btn-primary" disabled={!pick} onClick={() => onLogin(pick)}>
          {t("continue")}
        </button>
      </section>

      <section className="card grid gap-3 p-4">
        <h2 className="text-lg font-bold">{t("register")}</h2>
        <p className="text-sm text-ink/70">{t("register_note")}</p>
        <DriverForm submitKey="register_btn" onSubmit={(data) => onLogin(addDriver(data, false))} />
      </section>
    </>
  );
}

function RideLine({ ride }: { ride: Ride }) {
  const { t } = useT();
  return (
    <p className="flex flex-wrap items-center gap-x-2 rounded-2xl bg-mist p-3 text-sm">
      <strong>{t(`zone_${ride.pickupZone}`)}</strong>
      <ChevronIcon className="h-4 w-4 text-ink/50 rtl:-scale-x-100" />
      <strong>{t(`zone_${ride.destZone}`)}</strong>
      <span className="ms-auto text-base font-bold tabular-nums">
        {fmtNum(ride.price)} {t("currency")}
      </span>
      <span className="chip w-full sm:w-auto">{t(ride.payment === "cash" ? "pay_cash" : "pay_mobile")}</span>
    </p>
  );
}

function Dashboard({ driver, onLogout }: { driver: Driver; onLogout: () => void }) {
  const { t } = useT();
  const app = useApp();

  const canWork = driver.verified && !driver.suspended;
  const mine = app.rides.filter((r) => r.driverId === driver.id);
  const requests = mine.filter((r) => r.status === "requested");
  const active = mine.find((r) => r.status === "accepted");
  const doneToday = mine.filter((r) => r.status === "completed" && isToday(r.updatedAt));
  const earnings = doneToday.reduce((sum, r) => sum + r.price, 0);
  const toConfirm = mine.filter((r) => r.status === "completed" && r.payment === "mobile" && r.payStatus !== "confirmed");

  // Partage de position GPS tant que le chauffeur est disponible.
  useEffect(() => {
    if (!driver.available || !("geolocation" in navigator)) return;
    let last = 0;
    const watch = navigator.geolocation.watchPosition(
      (p) => {
        const now = Date.now();
        if (now - last < 5000) return;
        last = now;
        patchDriver(driver.id, { lat: p.coords.latitude, lng: p.coords.longitude });
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000 },
    );
    return () => navigator.geolocation.clearWatch(watch);
  }, [driver.id, driver.available]);

  function setZone(id: ZoneId) {
    const c = zoneCoords(id);
    patchDriver(driver.id, { lat: c.lat, lng: c.lng });
  }

  const toggleDisabled = !canWork || Boolean(active);

  return (
    <>
      <section className="card grid gap-4 p-4">
        <div className="flex items-center gap-3">
          <Avatar name={driver.name} size={52} />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-bold">{driver.name}</h2>
            <p className="truncate text-sm text-ink/70" dir="ltr">{driver.vehicle} · {driver.plate}</p>
          </div>
          <button type="button" className="btn btn-ghost btn-sm shrink-0" onClick={onLogout}>
            {t("logout")}
          </button>
        </div>

        {driver.suspended ? (
          <span className="chip chip-bad w-fit">{t("status_suspended")}</span>
        ) : driver.verified ? (
          <span className="chip chip-ok w-fit">{t("status_verified")}</span>
        ) : (
          <span className="chip chip-warn w-fit">{t("status_pending")}</span>
        )}

        <button
          type="button"
          role="switch"
          aria-checked={driver.available}
          aria-label={t(driver.available ? "available_off" : "available_on")}
          disabled={toggleDisabled}
          onClick={() => patchDriver(driver.id, { available: !driver.available })}
          className={`flex w-full items-center justify-between gap-4 rounded-2xl p-4 text-start transition disabled:cursor-not-allowed disabled:opacity-50 ${
            driver.available ? "bg-green text-white" : "bg-mist text-ink"
          }`}
        >
          <span>
            <span className="block text-xl font-bold">{t(driver.available ? "state_online" : "state_offline")}</span>
            <span className="block text-sm opacity-80">{t(driver.available ? "online_now" : "offline_now")}</span>
          </span>
          <span
            aria-hidden="true"
            className={`relative h-8 w-14 shrink-0 rounded-full transition ${driver.available ? "bg-white/30" : "bg-line"}`}
          >
            <span
              className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${
                driver.available ? "start-7" : "start-1"
              }`}
            />
          </span>
        </button>
      </section>

      <section className="rounded-2xl bg-ink p-4 text-white">
        <h2 className="text-sm font-semibold opacity-80">{t("earnings_today")}</h2>
        <p className="mt-1 text-4xl font-bold tabular-nums">
          {fmtNum(earnings)} <span className="text-xl font-semibold">{t("currency")}</span>
        </p>
        <p className="mt-1 text-sm opacity-80">
          {t("rides_today", { n: doneToday.length })} · {t("zero_commission")}
        </p>
      </section>

      {active && (
        <section className="card grid gap-3 border-2 border-green p-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-green-dark">{t("current_ride")}</h2>
          <div className="flex items-center gap-3">
            <Avatar name={active.clientName} />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-ink/60">{t("client")}</p>
              <p className="truncate font-bold">{active.clientName}</p>
            </div>
            <a className="btn btn-ghost btn-sm" href={tel(active.clientPhone)}>
              <PhoneIcon className="h-4 w-4" />
              {t("call")}
            </a>
          </div>
          <RideLine ride={active} />
          <button type="button" className="btn btn-primary" onClick={() => setRideStatus(active.id, "completed")}>
            {t("finish_ride")}
          </button>
        </section>
      )}

      <section className="grid gap-2">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          {t("new_requests")}
          {requests.length > 0 && <span className="chip bg-taxi text-ink">{requests.length}</span>}
        </h2>
        {requests.length === 0 ? (
          <p className="rounded-2xl bg-white p-4 text-sm text-ink/70">{t("none_requests")}</p>
        ) : (
          requests.map((r) => (
            <div key={r.id} className="card grid gap-3 border-2 border-taxi p-4">
              <div className="flex items-center gap-3">
                <Avatar name={r.clientName} />
                <p className="min-w-0 flex-1 truncate font-bold">{r.clientName}</p>
              </div>
              <RideLine ride={r} />
              <div className="grid grid-cols-2 gap-3">
                <button type="button" className="btn btn-taxi" onClick={() => setRideStatus(r.id, "accepted")}>
                  {t("accept")}
                </button>
                <button type="button" className="btn btn-danger" onClick={() => setRideStatus(r.id, "declined")}>
                  {t("refuse")}
                </button>
              </div>
            </div>
          ))
        )}
      </section>

      {toConfirm.length > 0 && (
        <section className="grid gap-2">
          <h2 className="text-sm font-bold">{t("to_confirm")}</h2>
          {toConfirm.map((r) => (
            <div key={r.id} className="card grid gap-2 p-4">
              <p>
                <strong>{r.clientName}</strong> · {fmtNum(r.price)} {t("currency")}
              </p>
              <p className="text-sm text-ink/70">{t(r.payStatus === "claimed" ? "paid_claimed_driver" : "awaiting_payment")}</p>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => confirmPaid(r.id)}>
                {t("confirm_paid")}
              </button>
            </div>
          ))}
        </section>
      )}

      <section className="card p-4">
        <label className="label" htmlFor="zone">{t("my_zone")}</label>
        <select id="zone" className="field" defaultValue="" onChange={(e) => e.target.value && setZone(e.target.value as ZoneId)}>
          <option value="" />
          {ZONES.map((z) => (
            <option key={z.id} value={z.id}>{t(`zone_${z.id}`)}</option>
          ))}
        </select>
      </section>
    </>
  );
}
