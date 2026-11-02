"use client";

import Link from "next/link";
import { ResetDemo } from "@/components/ResetDemo";
import { useT } from "@/components/LangProvider";
import { TopBar } from "@/components/TopBar";
import type { Key } from "@/lib/i18n";

const ROLES: { href: string; title: Key; sub: Key; tone: string }[] = [
  { href: "/client", title: "home_client", sub: "home_client_sub", tone: "bg-taxi text-ink" },
  { href: "/chauffeur", title: "home_driver", sub: "home_driver_sub", tone: "bg-ink text-white" },
  { href: "/syndicat", title: "home_union", sub: "home_union_sub", tone: "bg-white text-ink border border-line" },
];

export default function Home() {
  const { t } = useT();
  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar title={t("app_name")} home />
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 p-5">
        <p className="pt-4 text-2xl font-semibold leading-snug text-balance">{t("tagline")}</p>
        <nav className="grid gap-3">
          {ROLES.map((r) => (
            <Link key={r.href} href={r.href} className={`rounded-2xl p-5 ${r.tone}`}>
              <span className="block text-lg font-semibold">{t(r.title)}</span>
              <span className="mt-1 block text-sm opacity-80">{t(r.sub)}</span>
            </Link>
          ))}
        </nav>
        <div className="mt-auto grid gap-3 pb-2 text-sm text-ink/70">
          <p>{t("demo_note")}</p>
          <ResetDemo />
        </div>
      </main>
    </div>
  );
}
