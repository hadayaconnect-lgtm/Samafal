"use client";

import Link from "next/link";
import type { ComponentType } from "react";
import { ChevronIcon, PinIcon, ShieldIcon, WheelIcon } from "@/components/Icons";
import { LangSwitcher } from "@/components/TopBar";
import { LogoMark } from "@/components/Logo";
import { useT } from "@/components/LangProvider";
import { useApp } from "@/lib/useApp";
import type { Key } from "@/lib/i18n";

type Role = {
  href: string;
  title: Key;
  sub: Key;
  Icon: ComponentType<{ className?: string }>;
  main?: boolean;
};

const ROLES: Role[] = [
  { href: "/client", title: "home_client", sub: "home_client_sub", Icon: PinIcon, main: true },
  { href: "/chauffeur", title: "home_driver", sub: "home_driver_sub", Icon: WheelIcon },
  { href: "/syndicat", title: "home_union", sub: "home_union_sub", Icon: ShieldIcon },
];

export default function Home() {
  const { t } = useT();
  const app = useApp();
  const online = app.drivers.filter((d) => d.verified && !d.suspended && d.available).length;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="bg-ink px-5 pb-14 pt-4 text-white">
        <div className="mx-auto flex w-full max-w-xl flex-col gap-8">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <LogoMark size={40} />
              <span className="text-2xl font-extrabold tracking-tight">{t("app_name")}</span>
            </div>
            <LangSwitcher />
          </div>
          <div className="grid gap-4">
            <p className="text-3xl font-bold leading-tight text-balance">{t("tagline")}</p>
            {app.ready && (
            <p className="inline-flex w-fit items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm">
                <span className="h-2.5 w-2.5 rounded-full bg-taxi" aria-hidden="true" />
                {t("online_count", { n: online })}
              </p>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto -mt-8 flex w-full max-w-xl flex-1 flex-col gap-3 px-5 pb-6">
        <nav className="grid gap-3">
          {ROLES.map(({ href, title, sub, Icon, main }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-4 rounded-2xl p-5 shadow-sm transition hover:shadow-md ${
                main ? "bg-green text-white" : "border border-line bg-white text-ink"
              }`}
            >
              <span
                className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${
                  main ? "bg-white/15" : "bg-green-soft text-green-dark"
                }`}
              >
                <Icon className="h-6 w-6" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-lg font-bold">{t(title)}</span>
                <span className={`block text-sm ${main ? "text-white/85" : "text-ink/70"}`}>{t(sub)}</span>
              </span>
              <ChevronIcon className="h-5 w-5 shrink-0 rtl:-scale-x-100" />
            </Link>
          ))}
        </nav>

        <div className="mt-auto grid gap-3 pt-6 text-sm text-ink/70">
          <p>{t("live_note")}</p>
        </div>
      </main>
    </div>
  );
}
