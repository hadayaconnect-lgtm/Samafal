"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { LANGS, translate, type Key, type Lang } from "@/lib/i18n";

type Vars = Record<string, string | number>;
type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: Key, vars?: Vars) => string;
  dir: "ltr" | "rtl";
};

const LangCtx = createContext<Ctx | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("fr");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("samafal:lang");
      if (saved && LANGS.some((l) => l.id === saved)) setLangState(saved as Lang);
    } catch {
      /* stockage indisponible */
    }
  }, []);

  const dir = LANGS.find((l) => l.id === lang)?.dir ?? "ltr";

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang, dir]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem("samafal:lang", l);
    } catch {
      /* stockage indisponible */
    }
  }, []);

  const t = useCallback((key: Key, vars?: Vars) => translate(lang, key, vars), [lang]);

  const value = useMemo(() => ({ lang, setLang, t, dir }), [lang, setLang, t, dir]);
  return <LangCtx.Provider value={value}>{children}</LangCtx.Provider>;
}

export function useT(): Ctx {
  const ctx = useContext(LangCtx);
  if (!ctx) throw new Error("LangProvider manquant");
  return ctx;
}
