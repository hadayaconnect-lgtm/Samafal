"use client";

import { useEffect, useState } from "react";
import { useT } from "@/components/LangProvider";

/** Bouton « ? » de la barre du haut : ouvre le mode d'emploi en 3 étapes (celui du client ou celui du chauffeur).
 *  La fenêtre s'ouvre d'elle-même une seule fois à la première visite, ensuite seulement au toucher. */
export function HowButton({ role }: { role: "client" | "driver" }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(true);
  const storeKey = `tb:how-seen-${role}`;

  useEffect(() => {
    try {
      if (!localStorage.getItem(storeKey)) {
        setSeen(false);
        setOpen(true);
      }
    } catch {
      /* stockage indisponible : la fenêtre reste accessible avec le bouton */
    }
  }, [storeKey]);

  function close() {
    setOpen(false);
    setSeen(true);
    try {
      localStorage.setItem(storeKey, "1");
    } catch {
      /* stockage indisponible */
    }
  }

  const keys = role === "driver" ? (["how_d1", "how_d2", "how_d3"] as const) : (["how_1", "how_2", "how_3"] as const);

  return (
    <>
      <button
        type="button"
        aria-label={t("how_title")}
        onClick={() => setOpen(true)}
        className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full bg-taxi text-base font-extrabold text-ink shadow-[0_0_12px_rgba(242,176,30,0.7)]"
      >
        {!seen && (
          <span className="absolute inset-0 animate-ping rounded-full bg-taxi opacity-60 motion-reduce:animate-none" aria-hidden="true" />
        )}
        <span className="relative">?</span>
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/45"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`how-${role}`}
          onClick={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div className="w-full max-w-xl rounded-t-3xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-ink">
            <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-line" aria-hidden="true" />
            <h2 id={`how-${role}`} className="mb-4 text-lg font-bold">{t("how_title")}</h2>
            <ol className="mb-5 grid gap-3">
              {keys.map((k, i) => (
                <li key={k} className="flex items-center gap-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-taxi font-bold text-ink">{i + 1}</span>
                  <span className="text-sm">{t(k)}</span>
                </li>
              ))}
            </ol>
            <button type="button" className="btn btn-primary w-full" onClick={close}>
              {t("how_ok")}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
