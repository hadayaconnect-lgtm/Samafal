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
  /** Moyenne des étoiles données par les clients (null si aucun avis). */
  clientRating: number | null;
  clientRatings: number;
  joinedAt: number;
  walletOperator: string;
  walletNumber: string;
  /** Dernière inspection du syndicat (null si jamais inspecté). */
  inspection: { car: number; clean: number; ac: number; at: number } | null;
};

export type RideStatus = "requested" | "accepted" | "arrived" | "started" | "completed" | "declined" | "cancelled";
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
  /** Le client a déjà commenté cette course. */
  commented: boolean;
  /** Étoiles données par le client (null si pas encore noté). */
  stars: number | null;
};

export type Comment = {
  rideId: string;
  driverId: string;
  author: string;
  text: string;
  at: number;
};

export type State = {
  drivers: Driver[];
  rides: Ride[];
  comments: Comment[];
  /** Prix en FDJ entre zones, clé « zoneA-zoneB » (ordre alphabétique). Vide tant que la base n'est pas lue. */
  prices: Record<string, number>;
  /** Faux tant que la première lecture de la base n'est pas terminée. */
  ready: boolean;
};
