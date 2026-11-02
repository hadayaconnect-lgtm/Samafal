/**
 * Couche de données de Samafal : localStorage d'abord.
 * Toutes les pages passent par ces fonctions. Pour passer à Supabase,
 * il suffira de réécrire ce fichier (mêmes noms de fonctions).
 * Plusieurs onglets du même navigateur se synchronisent entre eux.
 */
import { SEED } from "./seed";
import { CENTER } from "./zones";
import type { Driver, Ride, RideStatus, State } from "./types";

const KEY = "samafal:v1";
const listeners = new Set<() => void>();
let cache: State = SEED;
let loaded = false;
let wired = false;

function read(): State {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as State;
  } catch {
    /* données illisibles : on repart de la démo */
  }
  return SEED;
}

function emit() {
  listeners.forEach((l) => l());
}

export function getSnapshot(): State {
  if (!loaded) {
    cache = read();
    loaded = true;
  }
  return cache;
}

export function getServerSnapshot(): State {
  return SEED;
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!wired) {
    wired = true;
    window.addEventListener("storage", (e) => {
      if (e.key === KEY) {
        cache = read();
        loaded = true;
        emit();
      }
    });
  }
  return () => {
    listeners.delete(listener);
  };
}

function commit(next: State) {
  cache = next;
  loaded = true;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* stockage plein ou bloqué : l'app continue en mémoire */
  }
  emit();
}

function mutate(fn: (s: State) => State) {
  commit(fn(getSnapshot()));
}

export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

export type NewDriver = {
  name: string;
  phone: string;
  plate: string;
  vehicle: string;
  walletOperator: string;
  walletNumber: string;
};

export function addDriver(input: NewDriver, verified: boolean): string {
  const id = uid();
  const driver: Driver = {
    id,
    ...input,
    walletNumber: input.walletNumber || input.phone,
    lat: CENTER.lat,
    lng: CENTER.lng,
    verified,
    suspended: false,
    available: false,
    rating: 5,
    rides: 0,
    joinedAt: Date.now(),
  };
  mutate((s) => ({ ...s, drivers: [...s.drivers, driver] }));
  return id;
}

export function patchDriver(id: string, patch: Partial<Driver>) {
  mutate((s) => ({
    ...s,
    drivers: s.drivers.map((d) => (d.id === id ? { ...d, ...patch } : d)),
  }));
}

export function requestRide(
  input: Omit<Ride, "id" | "status" | "payStatus" | "createdAt" | "updatedAt">,
): string {
  const id = uid();
  const now = Date.now();
  const ride: Ride = { ...input, id, status: "requested", payStatus: "pending", createdAt: now, updatedAt: now };
  mutate((s) => ({ ...s, rides: [ride, ...s.rides] }));
  return id;
}

export function setRideStatus(id: string, status: RideStatus) {
  mutate((s) => {
    const ride = s.rides.find((r) => r.id === id);
    if (!ride) return s;
    const wasAccepted = ride.status === "accepted";
    const rides = s.rides.map((r) =>
      r.id === id
        ? {
            ...r,
            status,
            updatedAt: Date.now(),
            payStatus: status === "completed" && r.payment === "cash" ? ("confirmed" as const) : r.payStatus,
          }
        : r,
    );
    const drivers = s.drivers.map((d) => {
      if (d.id !== ride.driverId) return d;
      if (status === "accepted") return { ...d, available: false };
      if (wasAccepted && (status === "completed" || status === "cancelled")) {
        return { ...d, available: true, rides: status === "completed" ? d.rides + 1 : d.rides };
      }
      return d;
    });
    return { drivers, rides };
  });
}

/** Le client annonce avoir payé par mobile money. */
export function claimPaid(id: string) {
  mutate((s) => ({
    ...s,
    rides: s.rides.map((r) => (r.id === id && r.payStatus === "pending" ? { ...r, payStatus: "claimed" } : r)),
  }));
}

/** Le chauffeur confirme avoir reçu le paiement. */
export function confirmPaid(id: string) {
  mutate((s) => ({
    ...s,
    rides: s.rides.map((r) => (r.id === id ? { ...r, payStatus: "confirmed" } : r)),
  }));
}

export function resetDemo() {
  commit(SEED);
}
