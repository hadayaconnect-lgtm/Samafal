"use client";

import { useEffect, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { DriverForm } from "@/components/DriverForm";
import { ChevronIcon, PhoneIcon } from "@/components/Icons";
import { ClientStars } from "@/components/Rating";
import { HowButton } from "@/components/HowItWorks";
import { RideHistory } from "@/components/RideHistory";
import { useT } from "@/components/LangProvider";
import { TopBar } from "@/components/TopBar";
import { BottomNav, NavIcons, NAV_H, SettingsPanel } from "@/components/BottomNav";
import { AuthGate } from "@/components/AuthGate";
import { LocationGate } from "@/components/LocationGate";
import { signOut } from "@/lib/auth";
import { confirmPaid, patchDriver, registerDriver, setRideStatus } from "@/lib/store";
import { useAct, useApp } from "@/lib/useApp";
import { useRideAlerts } from "@/lib/useRideAlerts";
import { fmtDateTime, fmtNum, PLAN_WINDOW_MS } from "@/lib/pricing";
import { zoneCoords } from "@/lib/zones";
import type { Driver, Ride } from "@/lib/types";

const isToday = (ts: number) => new Date(ts).toDateString() === new Date().toDateString();
const tel = (p: string) => `tel:${p.replace(/\s/g, "")}`;

export default function ChauffeurPage() {
  const { t } = useT();
  // Connexion par e-mail uniquement. Accès SMS de démonstration pour les examinateurs : /chauffeur?demo=1.
  const [demo, setDemo] = useState(false);
  useEffect(() => {
    setDemo(new URLSearchParams(window.location.search).has("demo"));
  }, []);
  return (
    <LocationGate>
      <AuthGate title={t("driver_title")} space="driver" methods={demo ? ["email", "phone"] : ["email"]}>
        {(me) => <Inner meId={me.id} name={me.full_name ?? ""} phone={me.phone ?? ""} />}
      </AuthGate>
    </LocationGate>
  );
}

function Inner({ meId, name, phone }: { meId: string; name: string; phone: string }) {
  const { t } = useT();
  const app = useApp();
  const driver = app.drivers.find((d) => d.id === meId);

  return (
    <div className="min-h-dvh" style={{ paddingBottom: NAV_H }}>
      <TopBar title={t("driver_title")} right={<HowButton role="driver" />} />
      <main className="mx-auto grid max-w-xl gap-4 p-4">
        {!app.ready ? (
          <p>{t("loading")}</p>
        ) : driver ? (
          <Dashboard driver={driver} />
        ) : (
          <section className="card grid gap-3 p-4">
            <h2 className="text-lg font-bold">{t("register")}</h2>
            <p className="text-sm text-ink/70">{t("register_note")}</p>
            <DriverForm submitKey="register_btn" onSubmit={registerDriver} initial={{ name, phone }} />
            <button type="button" className="btn btn-ghost btn-sm w-fit" onClick={() => void signOut()}>
              {t("auth_logout")}
            </button>
          </section>
        )}
      </main>
    </div>
  );
}

function RideLine({ ride }: { ride: Ride }) {
  const { t, lang } = useT();
  return (
    <p className="flex flex-wrap items-center gap-x-2 rounded-2xl bg-mist p-3 text-sm">
      {ride.scheduledAt !== null && (
        <span className="w-full rounded-lg bg-taxi px-2 py-1 text-sm font-bold text-ink">{t("sched_for", { date: fmtDateTime(ride.scheduledAt, lang) })}</span>
      )}
      <strong>{ride.pickupText || t(`zone_${ride.pickupZone}`)}</strong>
      <ChevronIcon className="h-4 w-4 text-ink/50 rtl:-scale-x-100" />
      <strong>{ride.destText || t(`zone_${ride.destZone}`)}</strong>
      <span className="ms-auto text-base font-bold tabular-nums">
        {fmtNum(ride.price)} {t("currency")}
      </span>
      <span className="chip w-full sm:w-auto">{t(ride.payment === "cash" ? "pay_cash" : "pay_mobile")}{ride.payOperator ? ` · ${ride.payOperator}` : ""}</span>
      <span className="w-full text-xs text-ink/60">{t("offer_from_client")}</span>
    </p>
  );
}

type Dest = { lat: number; lng: number } | string;
const mapsDir = (from: { lat: number; lng: number } | null, to: Dest) =>
  `https://www.google.com/maps/dir/?api=1${from ? `&origin=${from.lat},${from.lng}` : ""}&destination=${
    typeof to === "string" ? encodeURIComponent(`${to}, Djibouti`) : `${to.lat},${to.lng}`
  }&travelmode=driving`;

function RouteLinks({ ride }: { ride: Ride }) {
  const { t } = useT();
  const dest: Dest = ride.destText || zoneCoords(ride.destZone);
  return (
    <div className="grid grid-cols-2 gap-2">
      <a className="btn btn-ghost btn-sm" href={mapsDir(null, ride.pickup)} target="_blank" rel="noopener noreferrer">
        {t("route_to_client")}
      </a>
      <a className="btn btn-ghost btn-sm" href={mapsDir(ride.pickup, dest)} target="_blank" rel="noopener noreferrer">
        {t("route_to_dest")}
      </a>
    </div>
  );
}

function Dashboard({ driver }: { driver: Driver }) {
  const { t } = useT();
  const app = useApp();
  const act = useAct();
  const [tab, setTab] = useState<"rides" | "history" | "profile">("rides");
  useRideAlerts("driver", driver.id);

  const canWork = driver.verified && !driver.suspended;
  const mine = app.rides.filter((r) => r.driverId === driver.id);
  const requests = mine.filter((r) => r.status === "requested");
  // Un rendez-vous accepté reste « planifié » jusqu'à une heure avant l'heure prévue.
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 60000);
    return () => clearInterval(id);
  }, []);
  const isPlanned = (r: Ride) => r.scheduledAt !== null && r.status === "accepted" && r.scheduledAt - nowMs >= PLAN_WINDOW_MS;
  const planned = mine.filter(isPlanned).sort((a, b) => (a.scheduledAt ?? 0) - (b.scheduledAt ?? 0));
  const active = mine.find((r) => (r.status === "accepted" || r.status === "arrived" || r.status === "started") && !isPlanned(r));
  const doneToday = mine.filter((r) => r.status === "completed" && isToday(r.updatedAt));
  const earnings = doneToday.reduce((sum, r) => sum + r.price, 0);
  const toConfirm = mine.filter((r) => r.status === "completed" && r.payment === "mobile" && r.payStatus !== "confirmed");

  // Partage de position GPS tant que le chauffeur est disponible ou en course.
  const tracking = driver.available || Boolean(active);
  useEffect(() => {
    if (!tracking || !("geolocation" in navigator)) return;
    let last = 0;
    const watch = navigator.geolocation.watchPosition(
      (p) => {
        const now = Date.now();
        if (now - last < 5000) return;
        last = now;
        patchDriver(driver.id, { lat: p.coords.latitude, lng: p.coords.longitude }).catch(() => {});
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000 },
    );
    return () => navigator.geolocation.clearWatch(watch);
  }, [driver.id, tracking]);

  const toggleDisabled = !canWork || Boolean(active);

  const nav = (
    <BottomNav
      active={tab}
      onChange={setTab}
      tabs={[
        { id: "rides", label: t("nav_rides"), icon: NavIcons.car },
        { id: "history", label: t("nav_history"), icon: NavIcons.history },
        { id: "profile", label: t("nav_profile"), icon: NavIcons.profile },
      ]}
    />
  );

  if (tab === "history")
    return (
      <>
        <h2 className="text-lg font-bold">{t("history_title")}</h2>
        <RideHistory rides={mine} mode="driver" />
        {nav}
      </>
    );

  if (tab === "profile")
    return (
      <>
        <section className="card flex items-center gap-3 p-4">
          <Avatar name={driver.name} size={52} />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-bold">{driver.name}</h2>
            <p className="chip chip-ok w-fit">{t("role_driver")}</p>
            <p className="truncate text-sm text-ink/70" dir="ltr">{driver.vehicle} · {driver.plate}</p>
            <ClientStars rating={driver.clientRating} count={driver.clientRatings} />
          </div>
        </section>
        <SettingsPanel />
        {nav}
      </>
    );

  return (
    <>
      <section className="card grid gap-4 p-4">
        <div className="flex items-center gap-3">
          <Avatar name={driver.name} size={52} />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-bold">{driver.name}</h2>
            <p className="truncate text-sm text-ink/70" dir="ltr">{driver.vehicle} · {driver.plate}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {driver.suspended ? (
            <span className="chip chip-bad w-fit">{t("status_suspended")}</span>
          ) : driver.verified ? (
            <span className="chip chip-ok w-fit">{t("status_verified")}</span>
          ) : (
            <span className="chip chip-warn w-fit">{t("status_pending")}</span>
          )}
          <ClientStars rating={driver.clientRating} count={driver.clientRatings} />
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={driver.available}
          aria-label={t(driver.available ? "available_off" : "available_on")}
          disabled={toggleDisabled}
          onClick={() => act(patchDriver(driver.id, { available: !driver.available }))}
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
              <p className="text-sm text-ink/70" dir="ltr">{active.clientPhone}</p>
            </div>
            <a className="btn btn-ghost btn-sm" href={tel(active.clientPhone)}>
              <PhoneIcon className="h-4 w-4" />
              {t("call")}
            </a>
          </div>
          <RideLine ride={active} />
          <RouteLinks ride={active} />
          <span className="chip chip-ok w-fit">
            {t(active.status === "started" ? "ride_started" : active.status === "arrived" ? "ride_arrived" : "ride_accepted")}
          </span>
          {active.status === "accepted" && (
            <button type="button" className="btn btn-taxi" onClick={() => act(setRideStatus(active.id, "arrived"))}>
              {t("arrived_btn")}
            </button>
          )}
          {active.status === "arrived" && (
            <button type="button" className="btn btn-taxi" onClick={() => act(setRideStatus(active.id, "started"))}>
              {t("start_btn")}
            </button>
          )}
          {active.status === "started" && (
            <button type="button" className="btn btn-primary" onClick={() => act(setRideStatus(active.id, "completed"))}>
              {t("finish_ride")}
            </button>
          )}
          {active.status !== "started" && (
            <button type="button" className="btn btn-danger btn-sm" onClick={() => act(setRideStatus(active.id, "cancelled"))}>
              {t("cancel_ride")}
            </button>
          )}
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
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{r.clientName}</p>
                  <p className="text-sm text-ink/70" dir="ltr">{r.clientPhone}</p>
                </div>
                <a className="btn btn-ghost btn-sm" href={tel(r.clientPhone)}>
                  <PhoneIcon className="h-4 w-4" />
                  {t("call")}
                </a>
              </div>
              <RideLine ride={r} />
              <RouteLinks ride={r} />
              <div className="grid grid-cols-2 gap-3">
                <button type="button" className="btn btn-taxi" onClick={() => act(setRideStatus(r.id, "accepted"))}>
                  {t("accept")}
                </button>
                <button type="button" className="btn btn-danger" onClick={() => act(setRideStatus(r.id, "declined"))}>
                  {t("refuse")}
                </button>
              </div>
            </div>
          ))
        )}
      </section>

      {planned.length > 0 && (
        <section className="grid gap-2">
          <h2 className="text-sm font-bold">{t("sched_title")}</h2>
          {planned.map((r) => (
            <div key={r.id} className="card grid gap-3 border-2 border-taxi p-4">
              <p className="font-semibold">{r.clientName}</p>
              <RideLine ride={r} />
              <button type="button" className="btn btn-danger btn-sm" onClick={() => act(setRideStatus(r.id, "cancelled"))}>
                {t("cancel_ride")}
              </button>
            </div>
          ))}
        </section>
      )}

      {toConfirm.length > 0 && (
        <section className="grid gap-2">
          <h2 className="text-sm font-bold">{t("to_confirm")}</h2>
          {toConfirm.map((r) => (
            <div key={r.id} className="card grid gap-2 p-4">
              <p>
                <strong>{r.clientName}</strong> · {fmtNum(r.price)} {t("currency")}
              </p>
              <p className="text-sm text-ink/70">{t(r.payStatus === "claimed" ? "paid_claimed_driver" : "awaiting_payment")}</p>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => act(confirmPaid(r.id))}>
                {t("confirm_paid")}
              </button>
            </div>
          ))}
        </section>
      )}

      {nav}
    </>
  );
}
