import { fr, type Key } from "./fr";
import { so } from "./so";
import { ar } from "./ar";
import { aa } from "./aa";

export type Lang = "fr" | "so" | "aa" | "ar";
export type { Key };

export const LANGS: { id: Lang; label: string; dir: "ltr" | "rtl" }[] = [
  { id: "fr", label: "Français", dir: "ltr" },
  { id: "so", label: "Soomaali", dir: "ltr" },
  { id: "aa", label: "Qafar af", dir: "ltr" },
  { id: "ar", label: "العربية", dir: "rtl" },
];

const DICTS: Record<Lang, Partial<Record<Key, string>>> = { fr, so, aa, ar };

export function translate(lang: Lang, key: Key, vars?: Record<string, string | number>): string {
  let s: string = DICTS[lang][key] ?? fr[key];
  if (vars) {
    for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
  }
  return s;
}
