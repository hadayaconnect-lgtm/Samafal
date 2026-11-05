import type { ZoneId } from "./zones";

export type Driver = {
  id: string;
  name: string;
  phone: string;
  plate: string;
  vehicle: string;
  lat: number;
  lng: number;
  verified: boolean;
  suspended: boolean;
  available: boolean;
  rating: number;
  rides: number;
  joinedAt: number;
  walletOperator: string;
  walletNumber: string;
  /** Avis des clients : nombre d'avis et moyennes par critère (null tant qu'il n'y en a pas). */
  ratingsCount: number;
  ratingCar: number | null;
  ratingClean: number | null;
  ratingAc: number | null;
  ratingDrive: number | null;
  /** Dernière inspection du syndicat (null si jamais inspecté). */
  inspection: { car: number; clean: number; ac: number; at: number } | null;
};

export type RideStatus = "requested" | "accepted" | "completed" | "declined" | "cancelled";
export type Payment = "cash" | "mobile";
export type PayStatus = "pending" | "claimed" | "confirmed";

export type Ride = {
  id: string;
  driverId: string;
  clientName: string;
  clientPhone: string;
  pickup: { lat: number; lng: number; gps: boolean };
  pickupZone: ZoneId;
  destZone: ZoneId;
  price: number;
  payment: Payment;
  payStatus: PayStatus;
  status: RideStatus;
  createdAt: number;
  updatedAt: number;
  /** Le client a déjà noté cette course. */
  rated: boolean;
};

export type State = {
  drivers: Driver[];
  rides: Ride[];
  /** Faux tant que la première lecture de la base n'est pas terminée. */
  ready: boolean;
};
