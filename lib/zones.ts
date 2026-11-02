import { distanceKm, type LatLng } from "./geo";

export type ZoneId =
  | "centre"
  | "serpent"
  | "haramous"
  | "port"
  | "aeroport"
  | "balbala"
  | "gabode";

/**
 * Zones de Djibouti-ville.
 * Les coordonnées sont approximatives : à affiner avec le syndicat.
 */
export const ZONES: ({ id: ZoneId } & LatLng)[] = [
  { id: "centre", lat: 11.5886, lng: 43.145 },
  { id: "serpent", lat: 11.5985, lng: 43.152 },
  { id: "haramous", lat: 11.6075, lng: 43.162 },
  { id: "port", lat: 11.601, lng: 43.137 },
  { id: "aeroport", lat: 11.5473, lng: 43.1595 },
  { id: "balbala", lat: 11.532, lng: 43.1 },
  { id: "gabode", lat: 11.573, lng: 43.125 },
];

export const CENTER: LatLng = { lat: 11.5886, lng: 43.145 };

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
