import { ZONES, type ZoneId } from "./zones";

/**
 * TARIFS PROVISOIRES (en FDJ) entre zones, à valider avec le syndicat.
 * Le prix est symétrique : A vers B = B vers A.
 */
const SAME_ZONE = 300;

const PAIRS: Record<string, number> = {
  "centre-serpent": 400,
  "centre-haramous": 600,
  "centre-port": 500,
  "centre-aeroport": 1000,
  "centre-balbala": 800,
  "centre-gabode": 500,
  "serpent-haramous": 400,
  "serpent-port": 500,
  "serpent-aeroport": 1100,
  "serpent-balbala": 900,
  "serpent-gabode": 600,
  "haramous-port": 700,
  "haramous-aeroport": 1200,
  "haramous-balbala": 1000,
  "haramous-gabode": 800,
  "port-aeroport": 1100,
  "port-balbala": 800,
  "port-gabode": 600,
  "aeroport-balbala": 800,
  "aeroport-gabode": 700,
  "balbala-gabode": 600,
};

export function zonePrice(a: ZoneId, b: ZoneId): number {
  if (a === b) return SAME_ZONE;
  return PAIRS[`${a}-${b}`] ?? PAIRS[`${b}-${a}`] ?? SAME_ZONE;
}

export const fmtNum = (n: number) => n.toLocaleString("fr-FR");

/** Liste des zones dans l'ordre d'affichage du tableau. */
export const ZONE_IDS: ZoneId[] = ZONES.map((z) => z.id);
