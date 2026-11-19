"use client";

import type { ReactNode } from "react";
import { LANGS, type Lang } from "@/lib/i18n";
import { signOut } from "@/lib/auth";
import { useT } from "./LangProvider";

export type NavTab<T extends string> = { id: T; label: string; icon: ReactNode };

/** Hauteur de la barre (utile pour décaler le contenu). */
export const NAV_H = "calc(4.5rem + env(safe-area-inset-bottom))";

export function BottomNav<T extends string>({ tabs, active, onChange }: { tabs: NavTab<T>[]; active: T; onChange: (id: T) => void }) {
  return (
    <nav
      aria-label="Navigation"
      className="fixed inset-x-0 bottom-0 z-30 mx-auto flex max-w-xl items-stretch justify-around rounded-t-3xl border-t border-line bg-white px-2 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(11,46,34,0.12)]"
      style={{ height: NAV_H }}
    >
      {tabs.map((tb) => {
        const on = tb.id === active;
        return (
          <button
            key={tb.id}
            type="button"
            aria-current={on ? "page" : undefined}
            onClick={() => onChange(tb.id)}
            className={`flex flex-1 flex-col items-center justify-center gap-1 text-xs ${on ? "font-bold text-ink" : "text-ink/60"}`}
          >
            <span className={`grid h-8 w-12 place-items-center rounded-xl transition ${on ? "bg-taxi" : ""}`}>{tb.icon}</span>
            {tb.label}
          </button>
        );
      })}
    </nav>
  );
}

const svg = (d: ReactNode) => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {d}
  </svg>
);
export const NavIcons = {
  home: svg(<path d="M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10" />),
  history: svg(<path d="M3 12a9 9 0 109-9M3 4v5h5M12 7v5l3 2" />),
  profile: svg(<path d="M12 12a4 4 0 100-8 4 4 0 000 8zM4 21c0-4 4-6 8-6s8 2 8 6" />),
  car: svg(<path d="M5 16l1.5-5h11L19 16M4 16h16v3H4zM7 19v1.5M17 19v1.5" />),
  chart: svg(<path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />),
  gear: svg(<path d="M12 15a3 3 0 100-6 3 3 0 000 6zM19 12l2-1-2-3-2 .6-1.5-1L15 5h-3l-.5 2.6-1.5 1L8 8 6 11l2 1v1l-2 1 2 3 2-.6 1.5 1L12 19h3l.5-2.6 1.5-1 2 .6 2-3-2-1z" />),
};

/** Langue + déconnexion : contenu des onglets « Profil » et « Réglages ». */
export function SettingsPanel({ who }: { who?: { name: string | null; phone: string | null; email: string | null; role: string } }) {
  const { lang, setLang, t } = useT();
  return (
    <div className="grid gap-3">
      {who && (
        <div className="card flex items-center gap-3 p-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-green-soft text-lg font-bold text-green-dark" aria-hidden="true">
            {(who.name ?? "?").trim().charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-bold">{who.name ?? "—"}</p>
            <p className="chip chip-ok w-fit">{who.role}</p>
            {who.phone && <p className="truncate text-sm text-ink/70" dir="ltr">{who.phone}</p>}
            {who.email && <p className="truncate text-sm text-ink/70" dir="ltr">{who.email}</p>}
          </div>
        </div>
      )}
      <div className="card p-4">
        <label className="label" htmlFor="nav-lang">{t("language")}</label>
        <select id="nav-lang" className="field" value={lang} onChange={(e) => setLang(e.target.value as Lang)}>
          {LANGS.map((l) => (
            <option key={l.id} value={l.id}>{l.label}</option>
          ))}
        </select>
      </div>
      <button type="button" className="btn btn-ghost" onClick={() => void signOut()}>
        {t("auth_logout")}
      </button>
    </div>
  );
}
