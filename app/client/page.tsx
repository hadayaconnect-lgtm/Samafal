"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { CheckIcon, ChevronIcon, PhoneIcon, PinIcon } from "@/components/Icons";
import { TopBar } from "@/components/TopBar";
import { useT } from "@/components/LangProvider";
import { AuthGate } from "@/components/AuthGate";
import { LocationGate } from "@/components/LocationGate";
import { ClientStars, RatingBadge, RatingBar, StarPicker } from "@/components/Rating";
import { HowButton } from "@/components/HowItWorks";
import { RideHistory } from "@/components/RideHistory";
import { signOut } from "@/lib/auth";
import { useAct, useApp } from "@/lib/useApp";
import { useRideAlerts } from "@/lib/useRideAlerts";
import { claimPaid, commentRide, rateRide, requestRide, setRideStatus } from "@/lib/store";
import { nearestZone, zoneCoords, type ZoneId } from "@/lib/zones";
import { etaMin, roadKm, type LatLng } from "@/lib/geo";
import { DEFAULT_OFFER, fmtNum, MAX_OFFER, MIN_OFFER, OFFER_STEP } from "@/lib/pricing";
import type { Driver, Payment, Ride } from "@/lib/types";

const TaxiMap = dynamic(() => import("@/components/TaxiMap"), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-mist" />,
});

const tel = (p: string) => `tel:${p.replace(/\s/g, "")}`;
const plain = (p: LatLng): LatLng => ({ lat: p.lat, lng: p.lng });

export default function ClientPage() {
  const { t } = useT();
  // Accès de démonstration pour les examinateurs (Google Play) : /client?demo=1 ajoute la connexion par SMS (numéros de test).
  const [demo, setDemo] = useState(false);
  useEffect(() => {
    setDemo(new URLSearchParams(window.location.search).has("demo"));
  }, []);
  return (
    <LocationGate>
      <AuthGate title={t("client_title")} space="client" fullScreen methods={demo ? ["email", "phone"] : ["email"]}>
        {() => <Client />}
      </AuthGate>
    </LocationGate>
  );
}

function Client() {
  const { t } = useT();
  const app = useApp();
  const act = useAct();
  useRideAlerts("client");

  const [gps, setGps] = useState<LatLng | null>(null);
  const [gpsError, setGpsError] = useState(false);
  // Lieux écrits par le client.
  const [pickupText, setPickupText] = useState("");
  const [destText, setDestText] = useState("");
  const [placeError, setPlaceError] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [payment, setPayment] = useState<Payment>("cash");
  // Le client peut taper son prix librement ; la valeur envoyée reste bornée entre MIN_OFFER et MAX_OFFER.
  const [priceText, setPriceText] = useState(String(DEFAULT_OFFER));
  const typedPrice = parseInt(priceText.replace(/\D/g, ""), 10);
  // Arrondi au multiple de 100 le plus proche : la base de données n'accepte que des pas de 100 FDJ.
  const price = Number.isFinite(typedPrice)
    ? Math.min(MAX_OFFER, Math.max(MIN_OFFER, Math.round(typedPrice / OFFER_STEP) * OFFER_STEP))
    : MIN_OFFER;
  const setPrice = (fn: (p: number) => number) => setPriceText(String(fn(price)));
  const [rideId, setRideId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

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

  // La position GPS est obligatoire (LocationGate) : elle donne les coordonnées de départ.
  const pos: LatLng = gps ?? zoneCoords("centre");
  const pickupZone: ZoneId = gps ? nearestZone(gps) : "centre";

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
        setGpsError(false);
      },
      () => setGpsError(true),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  // Localisation automatique à l'ouverture : les distances partent du client, pas du centre-ville.
  useEffect(() => {
    locate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function reserve() {
    if (!sel) return;
    const from = pickupText.trim();
    const to = destText.trim();
    if (from.length < 2 || to.length < 2) {
      setPlaceError(true);
      return;
    }
    setPlaceError(false);
    act(
      requestRide({
        driverId: sel.d.id,
        pickup: { lat: pos.lat, lng: pos.lng },
        pickupZone,
        destZone: pickupZone,
        pickupText: from,
        destText: to,
        payment,
        price,
      }).then(saveRideId),
    );
  }

  const mapDrivers =
    showRide && rideDriver
      ? [{ id: rideDriver.id, lat: rideDriver.lat, lng: rideDriver.lng, label: rideDriver.name, selected: true }]
      : nearby.map((n) => ({ id: n.d.id, lat: n.d.lat, lng: n.d.lng, label: n.d.name, selected: n.d.id === sel?.d.id }));

  const startPt: LatLng = showRide && ride ? ride.pickup : pos;
  const focusDriver = showRide && rideDriver ? rideDriver : sel?.d;
  const focus: LatLng[] = [plain(startPt), ...(focusDriver ? [plain(focusDriver)] : [])];

  return (
    <div className="relative h-dvh overflow-hidden">
      <div className="absolute inset-0 isolate">
        <TaxiMap
          focus={focus}
          user={startPt}
          userLabel={t("pickup")}
          drivers={mapDrivers}
          onSelect={showRide ? undefined : setSelectedId}
          bottomPad={sheetH}
        />
      </div>

      <div className="absolute inset-x-0 top-0 z-20">
        <TopBar title={t("client_title")} right={<HowButton role="client" />} />
      </div>

      <main
        ref={sheetRef}
        className="absolute inset-x-0 bottom-0 z-20 mx-auto max-h-[66dvh] max-w-xl overflow-y-auto rounded-t-3xl bg-white shadow-[0_-8px_30px_rgba(11,46,34,0.22)]"
      >
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-line" aria-hidden="true" />

        {showRide && ride && rideDriver ? (
          <RidePanel ride={ride} driver={rideDriver} onDone={() => saveRideId(null)} />
        ) : showHistory ? (
          <div className="grid gap-4 p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold">{t("history_title")}</h2>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowHistory(false)}>
                {t("history_back")}
              </button>
            </div>
            <RideHistory rides={app.rides} mode="client" />
          </div>
        ) : (
          <>
            <div className="grid gap-4 p-4">
              <section className="grid gap-2" aria-label={t("pickup")}>
                <div className="flex items-center gap-3">
                  <span className="h-3 w-3 shrink-0 rounded-full bg-[#2563eb] ring-4 ring-[#2563eb]/20" aria-hidden="true" />
                  <label htmlFor="pickup" className="w-24 shrink-0 text-sm font-semibold">{t("pickup")}</label>
                  <input
                    id="pickup"
                    className="field"
                    value={pickupText}
                    maxLength={80}
                    placeholder={t("place_pickup_ph")}
                    autoComplete="off"
                    onChange={(e) => setPickupText(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <span className="h-3 w-3 shrink-0 rotate-45 rounded-[2px] bg-bad" aria-hidden="true" />
                  <label htmlFor="dest" className="w-24 shrink-0 text-sm font-semibold">{t("destination")}</label>
                  <input
                    id="dest"
                    className="field"
                    value={destText}
                    maxLength={80}
                    placeholder={t("place_dest_ph")}
                    autoComplete="off"
                    onChange={(e) => setDestText(e.target.value)}
                  />
                </div>
                {placeError && <p className="text-sm text-bad">{t("place_need")}</p>}
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
                              <span className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                                <span className="flex items-center gap-1 text-xs font-semibold text-green-dark">
                                  <CheckIcon className="h-3.5 w-3.5" />
                                  {t("verified")}
                                </span>
                                <RatingBadge rating={d.rating} inspected={d.inspection !== null} />
                                <ClientStars rating={d.clientRating} count={d.clientRatings} />
                              </span>
                            </span>
                            <span className="shrink-0 text-end">
                              <span className="block text-xl font-bold leading-none tabular-nums" dir="ltr">
                                {etaMin(km)} min
                              </span>
                              <span className="mt-1 block text-xs text-ink/60" dir="ltr">{km < 1 ? `${Math.max(5, Math.round((km * 1000) / 5) * 5)} m` : `${km.toFixed(1)} km`}</span>
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
                  <section aria-label={t("offer_label")}>
                    <span className="label">{t("offer_label")}</span>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        className="btn btn-ghost h-12 w-12 shrink-0 text-xl"
                        aria-label={t("offer_less")}
                        disabled={price <= MIN_OFFER}
                        onClick={() => setPrice((p) => Math.max(MIN_OFFER, p - OFFER_STEP))}
                      >
                        −
                      </button>
                      <div className="flex flex-1 items-center justify-center gap-2" dir="ltr">
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          enterKeyHint="done"
                          className="w-28 rounded-xl border border-line bg-white px-2 py-2 text-center text-2xl font-bold tabular-nums outline-none focus:border-brand"
                          aria-label={t("offer_label")}
                          value={priceText}
                          onFocus={(e) => e.currentTarget.select()}
                          onChange={(e) => setPriceText(e.target.value.replace(/\D/g, "").slice(0, 6))}
                          onBlur={() => setPriceText(String(price))}
                        />
                        <span className="text-lg font-bold">{t("currency")}</span>
                      </div>
                      <button
                        type="button"
                        className="btn btn-ghost h-12 w-12 shrink-0 text-xl"
                        aria-label={t("offer_more")}
                        disabled={price >= MAX_OFFER}
                        onClick={() => setPrice((p) => Math.min(MAX_OFFER, p + OFFER_STEP))}
                      >
                        +
                      </button>
                    </div>
                    <p className="mt-2 text-center text-xs text-ink/60">{t("offer_hint")}</p>
                  </section>

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

                  {/* Avis et commentaires en bas : le prix proposé reste visible sans faire défiler. */}
                  <RatingDetails driver={sel.d} />
                </>
              )}

              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowHistory(true)}>
                  {t("history_open")}
                </button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => void signOut()}>
                  {t("auth_logout")}
                </button>
              </div>
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
  const steps = ["requested", "accepted", "arrived", "started", "completed"] as const;
  const idx = Math.max(0, steps.indexOf(status as (typeof steps)[number]));
  return (
    <ol className="grid grid-cols-5 gap-1.5">
      {steps.map((s, i) => (
        <li key={s} className="grid gap-1">
          <span className={`h-1.5 rounded-full ${i <= idx ? "bg-green" : "bg-line"}`} />
          <span className={`text-[11px] font-semibold leading-tight ${i <= idx ? "text-green-dark" : "text-ink/50"}`}>
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
      <strong>{ride.pickupText || t(`zone_${ride.pickupZone}`)}</strong>
      <ChevronIcon className="h-4 w-4 text-ink/50 rtl:-scale-x-100" />
      <strong>{ride.destText || t(`zone_${ride.destZone}`)}</strong>
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

  if (ride.status === "accepted" || ride.status === "arrived" || ride.status === "started") {
    const eta = etaMin(roadKm(driver, ride.pickup));
    const title =
      ride.status === "arrived"
        ? t("arrived_title", { name: driver.name })
        : ride.status === "started"
          ? t("started_title")
          : t("accepted_title", { name: driver.name });
    const sub =
      ride.status === "arrived"
        ? t("arrived_sub", { vehicle: driver.vehicle, plate: driver.plate })
        : ride.status === "started"
          ? t("started_sub", { name: driver.name })
          : t("accepted_sub", { min: eta, vehicle: driver.vehicle, plate: driver.plate });
    return (
      <div className="grid gap-4 p-4">
        <Tracker status={ride.status} />
        {header}
        <div>
          <h2 className="text-lg font-bold">{title}</h2>
          <p className="text-sm text-ink/70" dir="auto">{sub}</p>
        </div>
        {trip}
        <p className="text-sm text-ink/70">{t(ride.payment === "cash" ? "pay_cash" : "pay_mobile")}</p>
        {ride.status !== "started" && cancel}
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
      {ride.stars ? (
        <p className="text-sm font-semibold text-green-dark">{t("stars_thanks")}</p>
      ) : (
        <StarForm rideId={ride.id} />
      )}
      {ride.commented ? <p className="text-sm font-semibold text-green-dark">{t("rate_thanks")}</p> : <CommentForm rideId={ride.id} />}
      <button type="button" className="btn btn-primary" onClick={onDone}>
        {t("new_ride")}
      </button>
    </div>
  );
}

function RatingDetails({ driver }: { driver: Driver }) {
  const { t, lang } = useT();
  const app = useApp();
  const fmt = (ts: number) => new Date(ts).toLocaleDateString(lang === "ar" ? "ar" : lang === "so" ? "so" : "fr-FR");
  const comments = app.comments.filter((c) => c.driverId === driver.id).slice(0, 5);
  if (!driver.inspection && comments.length === 0) return null;
  return (
    <div className="mt-3 grid gap-3 rounded-2xl bg-mist p-4">
      {driver.inspection && (
        <div className="grid gap-2">
          <p className="text-sm font-bold">
            {t("rate_inspection")}{" "}
            <span className="font-normal text-ink/60">· {t("rate_inspected_on", { date: fmt(driver.inspection.at) })}</span>
          </p>
          <RatingBar label={t("rate_car")} value={driver.inspection.car} />
          <RatingBar label={t("rate_clean")} value={driver.inspection.clean} />
          <RatingBar label={t("rate_ac")} value={driver.inspection.ac} />
        </div>
      )}
      {comments.length > 0 && (
        <div className="grid gap-2">
          <p className="text-sm font-bold">{t("comments_title")}</p>
          {comments.map((c) => (
            <p key={c.rideId} className="rounded-xl bg-white p-3 text-sm" dir="auto">
              {c.text}
              <span className="mt-1 block text-xs text-ink/60">
                {c.author} · {fmt(c.at)}
              </span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function StarForm({ rideId }: { rideId: string }) {
  const { t } = useT();
  const act = useAct();
  const [stars, setStars] = useState(0);
  const [busy, setBusy] = useState(false);
  return (
    <section className="grid gap-2 rounded-2xl border border-line p-4">
      <h3 className="text-center font-bold">{t("stars_title")}</h3>
      <StarPicker value={stars} onChange={setStars} />
      <button
        type="button"
        className="btn btn-taxi"
        disabled={busy || stars === 0}
        onClick={() => {
          setBusy(true);
          act(rateRide(rideId, stars).finally(() => setBusy(false)));
        }}
      >
        {t("stars_send")}
      </button>
    </section>
  );
}

function CommentForm({ rideId }: { rideId: string }) {
  const { t } = useT();
  const act = useAct();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <section className="grid gap-3 rounded-2xl border border-line p-4">
      <h3 className="font-bold">{t("rate_title")}</h3>
      <textarea
        className="field min-h-20"
        maxLength={300}
        aria-label={t("rate_comment")}
        placeholder={t("rate_comment")}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <p className="text-xs text-ink/60">{t("rate_comment_hint")}</p>
      <button
        type="button"
        className="btn btn-taxi"
        disabled={busy || text.trim().length < 2}
        onClick={() => {
          setBusy(true);
          act(commentRide(rideId, text.trim()).finally(() => setBusy(false)));
        }}
      >
        {t("rate_send")}
      </button>
    </section>
  );
}
