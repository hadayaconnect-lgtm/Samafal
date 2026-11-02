"use client";

import { useEffect, useState } from "react";
import { DriverForm } from "@/components/DriverForm";
import { useT } from "@/components/LangProvider";
import { TopBar } from "@/components/TopBar";
import { addDriver, confirmPaid, patchDriver, setRideStatus } from "@/lib/store";
import { useApp } from "@/lib/useApp";
import { fmtNum } from "@/lib/pricing";
import { ZONES, zoneCoords, type ZoneId } from "@/lib/zones";
import type { Driver } from "@/lib/types";

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
        <h2 className="font-semibold">{t("who_are_you")}</h2>
        <label className="label" htmlFor="pick">{t("pick_driver")}</label>
        <select id="pick" className="field" value={pick} onChange={(e) => setPick(e.target.value)}>
          <option value="" />
          {drivers.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name} · {d.plate}
            </option>
          ))}
        </select>
        <button type="button" className="btn btn-primary" disabled={!pick} onClick={() => onLogin(pick)}>
          {t("continue")}
        </button>
      </section>

      <section className="card grid gap-3 p-4">
        <h2 className="font-semibold">{t("register")}</h2>
        <p className="text-sm text-ink/70">{t("register_note")}</p>
        <DriverForm submitKey="register_btn" onSubmit={(data) => onLogin(addDriver(data, false))} />
      </section>
    </>
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

  return (
    <>
      <section className="card grid gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold">{driver.name}</h2>
            <p className="text-sm text-ink/70" dir="ltr">{driver.vehicle} · {driver.plate}</p>
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
          className={`btn ${driver.available ? "btn-danger" : "btn-taxi"}`}
          disabled={!canWork || Boolean(active)}
          onClick={() => patchDriver(driver.id, { available: !driver.available })}
        >
          {t(driver.available ? "available_off" : "available_on")}
        </button>
        <p className="text-sm text-ink/70">{t(driver.available ? "online_now" : "offline_now")}</p>

        <div>
          <label className="label" htmlFor="zone">{t("my_zone")}</label>
          <select id="zone" className="field" defaultValue="" onChange={(e) => e.target.value && setZone(e.target.value as ZoneId)}>
            <option value="" />
            {ZONES.map((z) => (
              <option key={z.id} value={z.id}>{t(`zone_${z.id}`)}</option>
            ))}
          </select>
        </div>
      </section>

      {active && (
        <section className="card grid gap-3 border-ink p-4 ring-2 ring-ink">
          <h2 className="font-semibold">{t("current_ride")}</h2>
          <p>
            {t("client")} : <strong>{active.clientName}</strong>
          </p>
          <p className="text-sm">
            {t(`zone_${active.pickupZone}`)} → {t(`zone_${active.destZone}`)} ·{" "}
            <strong>{fmtNum(active.price)} {t("currency")}</strong> · {t(active.payment === "cash" ? "pay_cash" : "pay_mobile")}
          </p>
          <a className="btn btn-ghost" href={tel(active.clientPhone)}>{t("call")}</a>
          <button type="button" className="btn btn-primary" onClick={() => setRideStatus(active.id, "completed")}>
            {t("finish_ride")}
          </button>
        </section>
      )}

      <section className="grid gap-2">
        <h2 className="text-sm font-semibold">{t("new_requests")}</h2>
        {requests.length === 0 ? (
          <p className="card p-4 text-sm">{t("none_requests")}</p>
        ) : (
          requests.map((r) => (
            <div key={r.id} className="card grid gap-3 border-taxi p-4 ring-2 ring-taxi">
              <p>
                <strong>{r.clientName}</strong>
              </p>
              <p className="text-sm">
                {t(`zone_${r.pickupZone}`)} → {t(`zone_${r.destZone}`)} ·{" "}
                <strong>{fmtNum(r.price)} {t("currency")}</strong> · {t(r.payment === "cash" ? "pay_cash" : "pay_mobile")}
              </p>
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
          <h2 className="text-sm font-semibold">{t("to_confirm")}</h2>
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

      <section className="card grid gap-1 p-4">
        <h2 className="text-sm font-semibold">{t("earnings_today")}</h2>
        <p className="text-3xl font-bold">
          {fmtNum(earnings)} <span className="text-lg font-semibold">{t("currency")}</span>
        </p>
        <p className="text-sm text-ink/70">{t("rides_today", { n: doneToday.length })}</p>
        <p className="text-sm text-ink/70">{t("zero_commission")}</p>
      </section>
    </>
  );
}
