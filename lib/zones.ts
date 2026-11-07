import { distanceKm, type LatLng } from "./geo";

export type ZoneId =
  | "centre"
  | "serpent"
  | "peltier"
  | "haramous"
  | "port"
  | "ambouli"
  | "quartier7"
  | "aeroport"
  | "balbala"
  | "nagad";

/**
 * Zones de Djibouti-ville.
 * Repères relevés sur Google Maps (un point par zone).
 */
export const ZONES: ({ id: ZoneId } & LatLng)[] = [
  { id: "centre", lat: 11.5911, lng: 43.1462 },
  { id: "serpent", lat: 11.6056, lng: 43.1549 },
  { id: "peltier", lat: 11.6083, lng: 43.1532 },
  { id: "haramous", lat: 11.5638, lng: 43.1661 },
  { id: "port", lat: 11.6066, lng: 43.1396 },
  { id: "ambouli", lat: 11.5589, lng: 43.1464 },
  { id: "quartier7", lat: 11.5764, lng: 43.1411 },
  { id: "aeroport", lat: 11.5521, lng: 43.1497 },
  { id: "balbala", lat: 11.5666, lng: 43.1036 },
  { id: "nagad", lat: 11.517, lng: 43.1398 },
];

export const CENTER: LatLng = { lat: 11.5911, lng: 43.1462 };

export function zoneCoords(id: ZoneId): LatLng {
  const z = ZONES.find((x) => x.id === id) ?? ZONES[0];
  return { lat: z.lat, lng: z.lng };
}

/** Zone la plus proche d'un point (sert à tarifer un départ GPS). */
export function nearestZone(p: LatLng): ZoneId {
  let best = ZONES[0];
  let bestKm = Infinity;
  for (const z of ZONES) {
    const km = distanceKm(p, z);
    if (km < bestKm) {
      best = z;
      bestKm = km;
    }
  }
  return best.id;
}
