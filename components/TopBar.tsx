"use client";

import type { ReactNode } from "react";
import { LANGS, type Lang } from "@/lib/i18n";
import { LogoMark } from "./Logo";
import { useT } from "./LangProvider";

export function LangSwitcher() {
  const { lang, setLang, t } = useT();
  return (
    <select
      aria-label={t("language")}
      value={lang}
      onChange={(e) => setLang(e.target.value as Lang)}
      className="rounded-lg border border-white/25 bg-transparent px-2 py-1.5 text-sm text-white"
    >
      {LANGS.map((l) => (
        <option key={l.id} value={l.id} className="text-ink">
          {l.label}
        </option>
      ))}
    </select>
  );
}

export function TopBar({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <header className="flex items-center justify-between gap-3 bg-ink px-4 py-2.5 text-white">
      <div className="flex min-w-0 items-center gap-3">
        <LogoMark size={28} />
        <h1 className="truncate text-base font-semibold">{title}</h1>
      </div>
      <div className="flex items-center gap-2">
        {right}
        <LangSwitcher />
      </div>
    </header>
  );
}
