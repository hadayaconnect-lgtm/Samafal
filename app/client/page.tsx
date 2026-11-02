"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { TopBar } from "@/components/TopBar";
import { useT } from "@/components/LangProvider";
import { useApp } from "@/lib/useApp";
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

export default function ClientPage() {
  const { t } = useT();
  const app = useApp();

  const [gps, setGps] = useState<LatLng | null>(null);
  const [gpsError, setGpsError] = useState(false);
  const [pickupId, setPickupId] = useState<ZoneId | "gps">("centre");
  const [destId, setDestId] = useState<ZoneId>("aeroport");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [payment, setPayment] = useState<Payment>("cash");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [rideId, setRideId] = useState<string | null>(null);
  const [formError, setFormError] = useState(false);

  useEffect(() => {
    try {
      setName(localStorage.getItem("samafal:cname") ?? "");
      setPhone(localStorage.getItem("samafal:cphone") ?? "");
      setRideId(localStorage.getItem("samafal:cride"));
    } catch {
      /* stockage indisponible */
    }
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
    if (name.trim().length < 2 || phone.trim().length < 6) {
      setFormError(true);
      return;
    }
    setFormError(false);
    try {
      localStorage.setItem("samafal:cname", name.trim());
      localStorage.setItem("samafal:cphone", phone.trim());
    } catch {
      /* stockage indisponible */
    }
    const id = requestRide({
      driverId: sel.d.id,
      clientName: name.trim(),
      clientPhone: phone.trim(),
      pickup: { lat: pos.lat, lng: pos.lng, gps: usingGps },
      pickupZone,
      destZone: destId,
      price,
      payment,
    });
    saveRideId(id);
  }

  const mapDrivers =
    rideActive && rideDriver
      ? [{ id: rideDriver.id, lat: rideDriver.lat, lng: rideDriver.lng, label: rideDriver.name, selected: true }]
      : nearby.map((n) => ({ id: n.d.id, lat: n.d.lat, lng: n.d.lng, label: n.d.name, selected: n.d.id === sel?.d.id }));

  const mapUser: LatLng = rideActive && ride ? ride.pickup : pos;
  const mapDest = zoneCoords(rideActive && ride ? ride.destZone : destId);

  return (
    <div className="flex h-dvh flex-col">
      <TopBar title={t("client_title")} />
      <div className="relative h-[38dvh] shrink-0 border-b border-line">
        <TaxiMap center={mapUser} user={mapUser} dest={mapDest} drivers={mapDrivers} onSelect={rideActive ? undefined : setSelectedId} />
      </div>

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto grid max-w-xl gap-4 p-4">
          {rideActive && ride && rideDriver ? (
            <RidePanel ride={ride} driver={rideDriver} onDone={() => saveRideId(null)} />
          ) : (
            <>
              <section className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label" htmlFor="pickup">{t("pickup")}</label>
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
                <div>
                  <label className="label" htmlFor="dest">{t("destination")}</label>
                  <select id="dest" className="field" value={destId} onChange={(e) => setDestId(e.target.value as ZoneId)}>
                    {ZONES.map((z) => (
                      <option key={z.id} value={z.id}>{t(`zone_${z.id}`)}</option>
                    ))}
                  </select>
                </div>
                <button type="button" onClick={locate} className="btn btn-ghost btn-sm col-span-2">
                  {t("use_gps")}
                </button>
                {gpsError && <p className="col-span-2 text-sm text-bad">{t("gps_error")}</p>}
              </section>

              <section>
                <h2 className="mb-2 text-sm font-semibold">{t("taxis_nearby")}</h2>
                {nearby.length === 0 ? (
                  <p className="card p-4 text-sm">{t("no_taxi")}</p>
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
                            className={`card flex w-full items-center justify-between gap-3 p-3 text-start ${on ? "border-ink ring-2 ring-ink" : ""}`}
                          >
                            <span className="min-w-0">
                              <span className="block truncate font-semibold">{d.name}</span>
                              <span className="block truncate text-sm text-ink/70" dir="ltr">
                                {d.vehicle} · {d.plate}
                              </span>
                            </span>
                            <span className="shrink-0 text-end text-sm">
                              <span className="chip chip-ok">{t("verified")}</span>
                              <span className="mt-1 block text-ink/70">
                                {t("away", { km: km.toFixed(1), min: etaMin(km) })}
                              </span>
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              {sel && (
                <section className="card grid gap-4 p-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-sm text-ink/70">{t("fixed_price")}</span>
                    <span className="text-2xl font-bold">
                      {fmtNum(price)} <span className="text-base font-semibold">{t("currency")}</span>
                    </span>
                  </div>

                  <div>
                    <span className="label">{t("pay_method")}</span>
                    <div className="grid grid-cols-2 gap-2" role="group" aria-label={t("pay_method")}>
                      {(["cash", "mobile"] as Payment[]).map((p) => (
                        <button
                          key={p}
                          type="button"
                          aria-pressed={payment === p}
                          onClick={() => setPayment(p)}
                          className={`btn btn-sm ${payment === p ? "btn-primary" : "btn-ghost"}`}
                        >
                          {t(p === "cash" ? "pay_cash" : "pay_mobile")}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label" htmlFor="cname">{t("your_name")}</label>
                      <input id="cname" className="field" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
                    </div>
                    <div>
                      <label className="label" htmlFor="cphone">{t("your_phone")}</label>
                      <input id="cphone" className="field" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" autoComplete="tel" dir="ltr" />
                    </div>
                  </div>
                  {formError && <p className="text-sm text-bad">{t("form_error")}</p>}

                  <div className="grid grid-cols-2 gap-3">
                    <button type="button" className="btn btn-taxi" onClick={reserve}>
                      {t("book")}
                    </button>
                    <a className="btn btn-ghost" href={tel(sel.d.phone)}>
                      {t("call")}
                    </a>
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function RidePanel({ ride, driver, onDone }: { ride: Ride; driver: Driver; onDone: () => void }) {
  const { t } = useT();
  const priceTxt = fmtNum(ride.price);

  const call = (
    <a className="btn btn-ghost" href={tel(driver.phone)}>
      {t("call")} {driver.name}
    </a>
  );

  if (ride.status === "requested") {
    return (
      <section className="card grid gap-3 p-4">
        <h2 className="text-lg font-semibold">{t("waiting_title", { name: driver.name })}</h2>
        <p className="text-sm text-ink/70">{t("waiting_sub")}</p>
        {call}
        <button
          type="button"
          className="btn btn-danger"
          onClick={() => {
            setRideStatus(ride.id, "cancelled");
            onDone();
          }}
        >
          {t("cancel_request")}
        </button>
      </section>
    );
  }

  if (ride.status === "accepted") {
    const eta = etaMin(roadKm(driver, ride.pickup));
    return (
      <section className="card grid gap-3 p-4">
        <h2 className="text-lg font-semibold">{t("accepted_title", { name: driver.name })}</h2>
        <p className="text-sm text-ink/70" dir="auto">
          {t("accepted_sub", { min: eta, vehicle: driver.vehicle, plate: driver.plate })}
        </p>
        <p className="text-sm">
          {t("fixed_price")} : <strong>{priceTxt} {t("currency")}</strong> · {t(ride.payment === "cash" ? "pay_cash" : "pay_mobile")}
        </p>
        {call}
        <button
          type="button"
          className="btn btn-danger"
          onClick={() => {
            setRideStatus(ride.id, "cancelled");
            onDone();
          }}
        >
          {t("cancel_request")}
        </button>
      </section>
    );
  }

  if (ride.status === "declined") {
    return (
      <section className="card grid gap-3 p-4">
        <h2 className="text-lg font-semibold">{t("declined_title", { name: driver.name })}</h2>
        <p className="text-sm text-ink/70">{t("declined_sub")}</p>
        <button type="button" className="btn btn-taxi" onClick={onDone}>
          {t("choose_other")}
        </button>
      </section>
    );
  }

  // completed
  const confirmed = ride.payStatus === "confirmed";
  return (
    <section className="card grid gap-3 p-4">
      <h2 className="text-lg font-semibold">{t("done_title")}</h2>
      {ride.payment === "cash" ? (
        <p>{t("pay_cash_note", { price: priceTxt, cur: t("currency") })}</p>
      ) : confirmed ? (
        <p className="font-semibold text-ok">{t("paid_confirmed")}</p>
      ) : (
        <>
          <p>
            {t("pay_mobile_note", {
              price: priceTxt,
              cur: t("currency"),
              operator: driver.walletOperator,
              number: driver.walletNumber,
            })}
          </p>
          {ride.payStatus === "pending" ? (
            <button type="button" className="btn btn-taxi" onClick={() => claimPaid(ride.id)}>
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
    </section>
  );
}
