import { livePrice } from "./store";
import { ZONES, type ZoneId } from "./zones";

/**
 * TARIFS DE SECOURS (en FDJ), utilisés seulement si la base n'a pas encore répondu.
 * Les vrais prix sont dans la table zone_prices et se modifient dans l'espace Administration.
 * Le prix est symétrique : A vers B = B vers A.
 */
const MIN_PRICE = 500;

const PAIRS: Record<string, number> = {
  "aeroport-balbala": 700,
  "aeroport-centre": 1000,
  "aeroport-nagad": 700,
  "aeroport-peltier": 1000,
  "aeroport-port": 1000,
  "aeroport-serpent": 1000,
  "ambouli-balbala": 700,
  "ambouli-nagad": 700,
  "ambouli-peltier": 1000,
  "balbala-centre": 1000,
  "balbala-haramous": 1000,
  "balbala-nagad": 700,
  "balbala-peltier": 1000,
  "balbala-port": 1000,
  "balbala-quartier7": 700,
  "balbala-serpent": 1000,
  "centre-nagad": 1000,
  "haramous-nagad": 1000,
  "nagad-peltier": 1000,
  "nagad-port": 1000,
  "nagad-quartier7": 700,
  "nagad-serpent": 1000,
  "peltier-quartier7": 1000,
};

export function zonePrice(a: ZoneId, b: ZoneId): number {
  const live = livePrice(a, b);
  if (live !== null) return live;
  if (a === b) return MIN_PRICE;
  return PAIRS[`${a}-${b}`] ?? PAIRS[`${b}-${a}`] ?? MIN_PRICE;
}

export const fmtNum = (n: number) => n.toLocaleString("fr-FR");

/** Liste des zones dans l'ordre d'affichage du tableau. */
export const ZONE_IDS: ZoneId[] = ZONES.map((z) => z.id);
