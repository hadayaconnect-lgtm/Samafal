/**
 * Couche de données de TaxiBell, branchée sur Supabase.
 * Les pages lisent l'état partagé (useApp) et appellent ces fonctions.
 * Les règles de sécurité (qui voit quoi, qui peut faire quoi, prix imposé)
 * sont appliquées par la base de données, pas par ce fichier.
 */
import type { RealtimeChannel, Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import type { Comment, Driver, Payment, PayStatus, Ride, RideStatus, State } from "./types";
import type { ZoneId } from "./zones";

const EMPTY: State = { drivers: [], rides: [], comments: [], prices: {}, ready: false };
const listeners = new Set<() => void>();
let cache: State = EMPTY;
let started = false;
let userId: string | null = null;
let channel: RealtimeChannel | null = null;
let wallets = new Map<string, { operator: string; number: string }>();
let rawDrivers: Record<string, unknown>[] = [];
let rawRides: Record<string, unknown>[] = [];
let rawComments: Record<string, unknown>[] = [];
let prices: Record<string, number> = {};
const timers: Partial<Record<"drivers" | "rides", ReturnType<typeof setTimeout>>> = {};

function emit() {
  listeners.forEach((l) => l());
}

function rebuild() {
  const myCommented = new Set(rawComments.filter((c) => c.client_id === userId).map((c) => c.ride_id as string));
  const drivers: Driver[] = rawDrivers.map((r) => {
    const w = wallets.get(r.id as string);
    const status = r.status as string;
    return {
      id: r.id as string,
      name: r.full_name as string,
      phone: r.phone as string,
      plate: r.plate as string,
      vehicle: (r.vehicle as string) ?? "",
      lat: r.lat as number,
      lng: r.lng as number,
      verified: status === "verified",
      suspended: status === "suspended",
      available: r.available as boolean,
      rating: Number(r.rating),
      rides: r.rides_count as number,
      joinedAt: new Date(r.created_at as string).getTime(),
      walletOperator: w?.operator ?? "",
      walletNumber: w?.number ?? "",
      inspection:
        r.inspected_at != null
          ? {
              car: r.inspection_car as number,
              clean: r.inspection_clean as number,
              ac: r.inspection_ac as number,
              at: new Date(r.inspected_at as string).getTime(),
            }
          : null,
    };
  });
  const rides: Ride[] = rawRides.map((r) => ({
    id: r.id as string,
    driverId: r.driver_id as string,
    clientName: r.client_name as string,
    clientPhone: r.client_phone as string,
    pickup: { lat: r.pickup_lat as number, lng: r.pickup_lng as number, gps: false },
    pickupZone: r.pickup_zone as ZoneId,
    destZone: r.dest_zone as ZoneId,
    price: r.price as number,
    payment: r.payment as Payment,
    payStatus: r.pay_status as PayStatus,
    status: r.status as RideStatus,
    createdAt: new Date(r.created_at as string).getTime(),
    updatedAt: new Date(r.updated_at as string).getTime(),
    commented: myCommented.has(r.id as string),
  }));
  const comments: Comment[] = rawComments.map((c) => ({
    rideId: c.ride_id as string,
    driverId: c.driver_id as string,
    author: c.author as string,
    text: c.comment as string,
    at: new Date(c.created_at as string).getTime(),
  }));
  cache = { drivers, rides, comments, prices, ready: true };
  emit();
}

async function loadDrivers() {
  const { data } = await supabase.from("drivers").select("*");
  if (data) rawDrivers = data;
}
async function loadWallets() {
  const { data } = await supabase.from("driver_wallets").select("*");
  if (data) wallets = new Map(data.map((w) => [w.driver_id as string, { operator: w.operator as string, number: w.number as string }]));
}
async function loadPrices() {
  const { data } = await supabase.from("zone_prices").select("*");
  if (data) prices = Object.fromEntries(data.map((x) => [`${x.zone_a}-${x.zone_b}`, x.price as number]));
}
async function loadComments() {
  const { data } = await supabase.from("ride_comments").select("*").order("created_at", { ascending: false }).limit(500);
  if (data) rawComments = data;
}
async function loadRides() {
  const { data } = await supabase.from("rides").select("*").order("created_at", { ascending: false }).limit(200);
  if (data) rawRides = data;
}

export async function refreshAll() {
  if (!userId) return;
  await Promise.all([loadDrivers(), loadWallets(), loadRides(), loadComments(), loadPrices()]);
  rebuild();
}

function schedule(table: "drivers" | "rides") {
  if (timers[table]) return;
  timers[table] = setTimeout(async () => {
    timers[table] = undefined;
    if (!userId) return;
    if (table === "drivers") await loadDrivers();
    else await Promise.all([loadRides(), loadWallets(), loadDrivers(), loadComments()]);
    rebuild();
  }, 250);
}

function apply(session: Session | null) {
  const id = session?.user.id ?? null;
  if (id === userId) return;
  userId = id;
  if (channel) {
    void supabase.removeChannel(channel);
    channel = null;
  }
  if (!id) {
    rawDrivers = [];
    rawRides = [];
    rawComments = [];
    prices = {};
    wallets = new Map();
    cache = EMPTY;
    emit();
    return;
  }
  void refreshAll();
  channel = supabase
    .channel("samafal-live")
    .on("postgres_changes", { event: "*", schema: "public", table: "rides" }, () => schedule("rides"))
    .on("postgres_changes", { event: "*", schema: "public", table: "drivers" }, () => schedule("drivers"))
    .subscribe();
}

function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  void supabase.auth.getSession().then(({ data }) => apply(data.session));
  supabase.auth.onAuthStateChange((_e, session) => apply(session));
  // Filet de sécurité si la connexion temps réel est coupée.
  setInterval(() => {
    if (document.visibilityState === "visible") void refreshAll();
  }, 20000);
}

/** Prix lu dans la base (null tant que non chargé). */
export function livePrice(a: string, b: string): number | null {
  const key = [a, b].sort().join("-");
  return prices[key] ?? null;
}

export function getSnapshot(): State {
  return cache;
}
export function getServerSnapshot(): State {
  return EMPTY;
}
export function subscribe(listener: () => void) {
  listeners.add(listener);
  start();
  return () => {
    listeners.delete(listener);
  };
}

function fail(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

export type NewDriver = {
  name: string;
  phone: string;
  plate: string;
  vehicle: string;
  walletOperator: string;
  walletNumber: string;
};

/** Le chauffeur crée sa propre fiche (en attente de validation par le syndicat). */
export async function registerDriver(input: NewDriver): Promise<void> {
  const { data } = await supabase.auth.getUser();
  const id = data.user?.id;
  if (!id) throw new Error("Non connecté");
  const { error } = await supabase.from("drivers").insert({
    id,
    full_name: input.name,
    phone: input.phone,
    plate: input.plate,
    vehicle: input.vehicle,
  });
  fail(error);
  const { error: e2 } = await supabase.from("driver_wallets").insert({
    driver_id: id,
    operator: input.walletOperator,
    number: input.walletNumber || input.phone,
  });
  fail(e2);
  await refreshAll();
}

/** Disponibilité et position : le chauffeur uniquement. */
export async function patchDriver(id: string, patch: { available?: boolean; lat?: number; lng?: number }) {
  const row: Record<string, unknown> = { location_updated_at: new Date().toISOString() };
  if (patch.available !== undefined) row.available = patch.available;
  if (patch.lat !== undefined) row.lat = patch.lat;
  if (patch.lng !== undefined) row.lng = patch.lng;
  const { error } = await supabase.from("drivers").update(row).eq("id", id);
  fail(error);
  await loadDrivers();
  rebuild();
}

/** Validation, suspension : le syndicat uniquement. */
export async function setDriverStatus(id: string, status: "pending" | "verified" | "suspended") {
  const { error } = await supabase.rpc("set_driver_status", { p_driver: id, p_status: status });
  fail(error);
  await loadDrivers();
  rebuild();
}

export async function requestRide(input: {
  driverId: string;
  pickup: { lat: number; lng: number };
  pickupZone: ZoneId;
  destZone: ZoneId;
  payment: Payment;
  price: number;
}): Promise<string> {
  const { data, error } = await supabase
    .from("rides")
    .insert({
      driver_id: input.driverId,
      pickup_zone: input.pickupZone,
      dest_zone: input.destZone,
      pickup_lat: input.pickup.lat,
      pickup_lng: input.pickup.lng,
      payment: input.payment,
      price: input.price,
    })
    .select("id")
    .single();
  fail(error);
  await refreshAll();
  return data!.id as string;
}

const ACTION: Record<string, string> = {
  accepted: "accept",
  declined: "decline",
  completed: "complete",
  cancelled: "cancel",
};

export async function setRideStatus(id: string, status: RideStatus) {
  const action = ACTION[status];
  if (!action) return;
  const { error } = await supabase.rpc("ride_action", { p_ride: id, p_action: action });
  fail(error);
  await refreshAll();
}

/** Le client annonce avoir payé par mobile money. */
export async function claimPaid(id: string) {
  const { error } = await supabase.rpc("ride_action", { p_ride: id, p_action: "claim_paid" });
  fail(error);
  await refreshAll();
}

/** Le chauffeur confirme avoir reçu le paiement. */
export async function confirmPaid(id: string) {
  const { error } = await supabase.rpc("ride_action", { p_ride: id, p_action: "confirm_paid" });
  fail(error);
  await refreshAll();
}

/** Le client laisse un commentaire sur une course terminée (visible de tous, prénom seulement). */
export async function commentRide(id: string, text: string) {
  const { error } = await supabase.rpc("comment_ride", { p_ride: id, p_comment: text });
  fail(error);
  await refreshAll();
}

/** Le syndicat supprime un commentaire abusif. */
export async function deleteComment(rideId: string) {
  const { error } = await supabase.from("ride_comments").delete().eq("ride_id", rideId);
  fail(error);
  await loadComments();
  rebuild();
}

/** Le syndicat enregistre une inspection du véhicule. */
export async function inspectDriver(id: string, r: { car: number; clean: number; ac: number; notes?: string }) {
  const { error } = await supabase.rpc("inspect_driver", {
    p_driver: id,
    p_car: r.car,
    p_clean: r.clean,
    p_ac: r.ac,
    p_notes: r.notes ?? null,
  });
  fail(error);
  await loadDrivers();
  rebuild();
}

/** L'administrateur change le prix d'un trajet entre deux zones (dans les deux sens). */
export async function setPrice(a: string, b: string, price: number) {
  const [za, zb] = [a, b].sort();
  const { error } = await supabase.from("zone_prices").update({ price }).eq("zone_a", za).eq("zone_b", zb);
  fail(error);
  await loadPrices();
  rebuild();
}
