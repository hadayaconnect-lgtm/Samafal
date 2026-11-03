"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { CheckIcon, ChevronIcon, PhoneIcon, PinIcon } from "@/components/Icons";
import { TopBar } from "@/components/TopBar";
import { useT } from "@/components/LangProvider";
import { AuthGate } from "@/components/AuthGate";
import { useAct, useApp } from "@/lib/useApp";
import { claimPaid, requestRide, setRideStatus } from "@/lib/store";
import { ZONES, nearestZone, zoneCoords, type ZoneId } from "@/lib/zones";
import { etaMin, roadKm, type LatLng } from "@/lib/geo";
import { fmtNum, zonePrice } from "@/lib/pricing";
import type { Driver, Payment, Ride } from "@/lib/types";

const TaxiMap = dynamic(() => import("@/components/TaxiMap"), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-mist" />,
});

const tel = (p: string) => `tel:${p.replace(/\s/g, "")}`;
const plain = (p: LatLng): LatLng => ({ lat: p.lat, lng: p.lng });

export default function ClientPage() {
  const { t } = useT();
  return (
    <AuthGate title={t("client_title")} fullScreen>
      {() => <Client />}
    </AuthGate>
  );
}

function Client() {
  const { t } = useT();
  const app = useApp();
  const act = useAct();

  const [gps, setGps] = useState<LatLng | null>(null);
  const [gpsError, setGpsError] = useState(false);
  const [pickupId, setPickupId] = useState<ZoneId | "gps">("centre");
  const [destId, setDestId] = useState<ZoneId>("aeroport");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [payment, setPayment] = useState<Payment>("cash");
  const [rideId, setRideId] = useState<string | null>(null);

  const sheetRef = useRef<HTMLElement>(null);
  const [sheetH, setSheetH] = useState(320);

  useEffect(() => {
    try {
      setRideId(localStorage.getItem("samafal:cride"));
    } catch {
      /* stockage indisponible */
    }
  }, []);

  useEffect(() => {
    const el = sheetRef.current;
    if (!el) return;
    const update = () => setSheetH(el.offsetHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  function saveRideId(id: string | null) {
    setRideId(id);
    try {
      if (id) localStorage.setItem("samafal:cride", id);
      else localStorage.removeItem("samafal:cride");
    } catch {
      /* stockage indisponible */
    }
  }

  const usingGps = pickupId === "gps" && gps !== null;
  const pos: LatLng = usingGps && gps ? gps : zoneCoords(pickupId === "gps" ? "centre" : pickupId);
  const pickupZone: ZoneId = usingGps && gps ? nearestZone(gps) : pickupId === "gps" ? "centre" : pickupId;

  const nearby = useMemo(
    () =>
      app.drivers
        .filter((d) => d.verified && !d.suspended && d.available)
        .map((d) => ({ d, km: roadKm(pos, d) }))
        .sort((a, b) => a.km - b.km),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [app.drivers, pos.lat, pos.lng],
  );

  const sel = nearby.find((n) => n.d.id === selectedId) ?? nearby[0];
  const price = zonePrice(pickupZone, destId);

  const ride = rideId ? app.rides.find((r) => r.id === rideId) : undefined;
  const rideActive = ride !== undefined && ride.status !== "cancelled";
  const rideDriver = ride ? app.drivers.find((d) => d.id === ride.driverId) : undefined;
  const showRide = rideActive && ride !== undefined && rideDriver !== undefined;

  function locate() {
    if (!("geolocation" in navigator)) {
      setGpsError(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setGps({ lat: p.coords.latitude, lng: p.coords.longitude });
        setPickupId("gps");
        setGpsError(false);
      },
      () => setGpsError(true),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  function reserve() {
    if (!sel) return;
    act(
      requestRide({
        driverId: sel.d.id,
        pickup: { lat: pos.lat, lng: pos.lng },
        pickupZone,
        destZone: destId,
        payment,
      }).then(saveRideId),
    );
  }

  const mapDrivers =
    showRide && rideDriver
      ? [{ id: rideDriver.id, lat: rideDriver.lat, lng: rideDriver.lng, label: rideDriver.name, selected: true }]
      : nearby.map((n) => ({ id: n.d.id, lat: n.d.lat, lng: n.d.lng, label: n.d.name, selected: n.d.id === sel?.d.id }));

  const startPt: LatLng = showRide && ride ? ride.pickup : pos;
  const destPt = zoneCoords(showRide && ride ? ride.destZone : destId);
  const focusDriver = showRide && rideDriver ? rideDriver : sel?.d;
  const focus: LatLng[] = [plain(startPt), plain(destPt), ...(focusDriver ? [plain(focusDriver)] : [])];

  return (
    <div className="relative h-dvh overflow-hidden">
      <div className="absolute inset-0 isolate">
        <TaxiMap
          focus={focus}
          user={startPt}
          dest={destPt}
          drivers={mapDrivers}
          onSelect={showRide ? undefined : setSelectedId}
          bottomPad={sheetH}
        />
      </div>

      <div className="absolute inset-x-0 top-0 z-20">
        <TopBar title={t("client_title")} />
      </div>

      <main
        ref={sheetRef}
        className="absolute inset-x-0 bottom-0 z-20 mx-auto max-h-[66dvh] max-w-xl overflow-y-auto rounded-t-3xl bg-white shadow-[0_-8px_30px_rgba(11,46,34,0.22)]"
      >
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-line" aria-hidden="true" />

        {showRide && ride && rideDriver ? (
          <RidePanel ride={ride} driver={rideDriver} onDone={() => saveRideId(null)} />
        ) : (
          <>
            <div className="grid gap-4 p-4">
              <section className="grid gap-2" aria-label={t("pickup")}>
                <div className="flex items-center gap-3">
                  <span className="h-3 w-3 shrink-0 rounded-full bg-[#2563eb] ring-4 ring-[#2563eb]/20" aria-hidden="true" />
                  <label htmlFor="pickup" className="sr-only">{t("pickup")}</label>
                  <select
                    id="pickup"
                    className="field"
                    value={pickupId}
                    onChange={(e) => setPickupId(e.target.value as ZoneId | "gps")}
                  >
                    {gps && <option value="gps">{t("pickup_gps")}</option>}
                    {ZONES.map((z) => (
                      <option key={z.id} value={z.id}>{t(`zone_${z.id}`)}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-3">
                  <span className="h-3 w-3 shrink-0 rotate-45 rounded-[2px] bg-bad" aria-hidden="true" />
                  <label htmlFor="dest" className="sr-only">{t("destination")}</label>
                  <select id="dest" className="field" value={destId} onChange={(e) => setDestId(e.target.value as ZoneId)}>
                    {ZONES.map((z) => (
                      <option key={z.id} value={z.id}>{t(`zone_${z.id}`)}</option>
                    ))}
                  </select>
                </div>
                <button type="button" onClick={locate} className="btn btn-ghost btn-sm w-fit">
                  <PinIcon className="h-4 w-4" />
                  {t("use_gps")}
                </button>
                {gpsError && <p className="text-sm text-bad">{t("gps_error")}</p>}
              </section>

              <section>
                <h2 className="mb-2 text-sm font-bold">{t("taxis_nearby")}</h2>
                {nearby.length === 0 ? (
                  <p className="rounded-2xl bg-mist p-4 text-sm">{t("no_taxi")}</p>
                ) : (
                  <ul className="grid gap-2">
                    {nearby.slice(0, 6).map(({ d, km }) => {
                      const on = d.id === sel?.d.id;
                      return (
                        <li key={d.id}>
                          <button
                            type="button"
                            onClick={() => setSelectedId(d.id)}
                            aria-pressed={on}
                            className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-start transition ${
                              on ? "border-green bg-green-soft ring-2 ring-green" : "border-line bg-white"
                            }`}
                          >
                            <Avatar name={d.name} />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-semibold">{d.name}</span>
                              <span className="block truncate text-sm text-ink/70" dir="ltr">
                                {d.vehicle} · {d.plate}
                              </span>
                              <span className="flex items-center gap-1 text-xs font-semibold text-green-dark">
                                <CheckIcon className="h-3.5 w-3.5" />
                                {t("verified")}
                              </span>
                            </span>
                            <span className="shrink-0 text-end">
                              <span className="block text-xl font-bold leading-none tabular-nums" dir="ltr">
                                {etaMin(km)} min
                              </span>
                              <span className="mt-1 block text-xs text-ink/60" dir="ltr">{km.toFixed(1)} km</span>
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              {sel && (
                <>
                  <section aria-label={t("pay_method")}>
                    <span className="label">{t("pay_method")}</span>
                    <div className="grid grid-cols-2 gap-2" role="group">
                      {(["cash", "mobile"] as Payment[]).map((p) => (
                        <button
                          key={p}
                          type="button"
                          aria-pressed={payment === p}
                          onClick={() => setPayment(p)}
                          className={`btn btn-sm border ${
                            payment === p ? "border-green bg-green-soft text-green-dark ring-2 ring-green" : "border-line bg-white"
                          }`}
                        >
                          {t(p === "cash" ? "pay_cash" : "pay_mobile")}
                        </button>
                      ))}
                    </div>
                  </section>

                </>
              )}
            </div>

            {sel && (
              <div className="sticky bottom-0 flex gap-3 border-t border-line bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                <a className="btn btn-ghost" href={tel(sel.d.phone)} aria-label={`${t("call")} ${sel.d.name}`}>
                  <PhoneIcon className="h-5 w-5" />
                </a>
                <button type="button" className="btn btn-taxi flex-1 justify-between" onClick={reserve}>
                  <span>{t("book")}</span>
                  <span className="tabular-nums">{fmtNum(price)} {t("currency")}</span>
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function Tracker({ status }: { status: Ride["status"] }) {
  const { t } = useT();
  const steps = ["requested", "accepted", "completed"] as const;
  const idx = status === "completed" ? 2 : status === "accepted" ? 1 : 0;
  return (
    <ol className="grid grid-cols-3 gap-2">
      {steps.map((s, i) => (
        <li key={s} className="grid gap-1">
          <span className={`h-1.5 rounded-full ${i <= idx ? "bg-green" : "bg-line"}`} />
          <span className={`text-xs font-semibold ${i <= idx ? "text-green-dark" : "text-ink/50"}`}>
            {t(`ride_${s}`)}
          </span>
        </li>
      ))}
    </ol>
  );
}

function RidePanel({ ride, driver, onDone }: { ride: Ride; driver: Driver; onDone: () => void }) {
  const { t } = useT();
  const act = useAct();
  const priceTxt = fmtNum(ride.price);

  const header = (
    <div className="flex items-center gap-3">
      <Avatar name={driver.name} size={48} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-lg font-bold">{driver.name}</p>
        <p className="truncate text-sm text-ink/70" dir="ltr">{driver.vehicle} · {driver.plate}</p>
      </div>
      <a className="btn btn-ghost btn-sm shrink-0" href={tel(driver.phone)} aria-label={`${t("call")} ${driver.name}`}>
        <PhoneIcon className="h-4 w-4" />
        {t("call")}
      </a>
    </div>
  );

  const trip = (
    <p className="flex flex-wrap items-center gap-x-2 rounded-2xl bg-mist p-3 text-sm">
      <strong>{t(`zone_${ride.pickupZone}`)}</strong>
      <ChevronIcon className="h-4 w-4 text-ink/50 rtl:-scale-x-100" />
      <strong>{t(`zone_${ride.destZone}`)}</strong>
      <span className="ms-auto font-bold tabular-nums">{priceTxt} {t("currency")}</span>
    </p>
  );

  const cancel = (
    <button
      type="button"
      className="btn btn-danger"
      onClick={() => {
        act(setRideStatus(ride.id, "cancelled"));
        onDone();
      }}
    >
      {t("cancel_request")}
    </button>
  );

  if (ride.status === "requested") {
    return (
      <div className="grid gap-4 p-4">
        <Tracker status={ride.status} />
        {header}
        <div>
          <h2 className="text-lg font-bold">{t("waiting_title", { name: driver.name })}</h2>
          <p className="text-sm text-ink/70">{t("waiting_sub")}</p>
        </div>
        {trip}
        {cancel}
      </div>
    );
  }

  if (ride.status === "accepted") {
    const eta = etaMin(roadKm(driver, ride.pickup));
    return (
      <div className="grid gap-4 p-4">
        <Tracker status={ride.status} />
        {header}
        <div>
          <h2 className="text-lg font-bold">{t("accepted_title", { name: driver.name })}</h2>
          <p className="text-sm text-ink/70" dir="auto">
            {t("accepted_sub", { min: eta, vehicle: driver.vehicle, plate: driver.plate })}
          </p>
        </div>
        {trip}
        <p className="text-sm text-ink/70">{t(ride.payment === "cash" ? "pay_cash" : "pay_mobile")}</p>
        {cancel}
      </div>
    );
  }

  if (ride.status === "declined") {
    return (
      <div className="grid gap-4 p-4">
        {header}
        <div>
          <h2 className="text-lg font-bold">{t("declined_title", { name: driver.name })}</h2>
          <p className="text-sm text-ink/70">{t("declined_sub")}</p>
        </div>
        <button type="button" className="btn btn-taxi" onClick={onDone}>
          {t("choose_other")}
        </button>
      </div>
    );
  }

  // terminée
  const confirmed = ride.payStatus === "confirmed";
  return (
    <div className="grid gap-4 p-4">
      <Tracker status={ride.status} />
      {header}
      <h2 className="text-lg font-bold">{t("done_title")}</h2>
      {trip}
      {ride.payment === "cash" ? (
        <p className="rounded-2xl bg-green-soft p-3 font-semibold text-green-dark">
          {t("pay_cash_note", { price: priceTxt, cur: t("currency") })}
        </p>
      ) : confirmed ? (
        <p className="rounded-2xl bg-green-soft p-3 font-semibold text-green-dark">{t("paid_confirmed")}</p>
      ) : (
        <>
          <p className="rounded-2xl bg-green-soft p-3 font-semibold text-green-dark">
            {t("pay_mobile_note", {
              price: priceTxt,
              cur: t("currency"),
              operator: driver.walletOperator,
              number: driver.walletNumber,
            })}
          </p>
          {ride.payStatus === "pending" ? (
            <button type="button" className="btn btn-taxi" onClick={() => act(claimPaid(ride.id))}>
              {t("i_paid")}
            </button>
          ) : (
            <p className="text-sm text-ink/70">{t("paid_claimed")}</p>
          )}
        </>
      )}
      <button type="button" className="btn btn-primary" onClick={onDone}>
        {t("new_ride")}
      </button>
    </div>
  );
}
