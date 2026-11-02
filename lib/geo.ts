export type LatLng = { lat: number; lng: number };

const toRad = (x: number) => (x * Math.PI) / 180;

/** Distance à vol d'oiseau en km. */
export function distanceKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/** Estimation de la distance par la route (x1,3 en ville). */
export const roadKm = (a: LatLng, b: LatLng) => distanceKm(a, b) * 1.3;

/** Temps d'approche estimé à environ 24 km/h. */
export const etaMin = (km: number) => Math.max(1, Math.round(km / 0.4));
