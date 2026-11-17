"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { LangSwitcher } from "./TopBar";
import { LogoMark } from "./Logo";
import { useT } from "./LangProvider";

type State = "checking" | "ok" | "denied" | "unavailable";

/**
 * Localisation obligatoire (clients et chauffeurs) : tant que la position n'est pas autorisée
 * et disponible, l'application affiche cet écran et ne montre rien d'autre.
 */
export function LocationGate({ children }: { children: ReactNode }) {
  const { t } = useT();
  const [state, setState] = useState<State>("checking");

  const check = useCallback(() => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setState("unavailable");
      return;
    }
    setState((s) => (s === "ok" ? s : "checking"));
    navigator.geolocation.getCurrentPosition(
      () => setState("ok"),
      (err) => setState(err.code === 1 ? "denied" : "unavailable"),
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 },
    );
  }, []);

  useEffect(() => {
    check();
  }, [check]);

  // Si l'autorisation change pendant l'utilisation (réglages du téléphone), l'écran s'adapte aussitôt.
  useEffect(() => {
    let status: PermissionStatus | null = null;
    const onChange = () => {
      if (status?.state === "denied") setState("denied");
      else check();
    };
    try {
      void navigator.permissions
        ?.query({ name: "geolocation" })
        .then((s) => {
          status = s;
          s.addEventListener("change", onChange);
        })
        .catch(() => {});
    } catch {
      /* API indisponible */
    }
    return () => status?.removeEventListener("change", onChange);
  }, [check]);

  // Quand l'utilisateur revient des réglages, on revérifie.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [check]);

  if (state === "ok") return <>{children}</>;

  if (state === "checking") {
    return (
      <main className="grid min-h-dvh place-items-center bg-ink p-6 text-white">
        <p className="text-sm text-white/80">{t("loc_checking")}</p>
      </main>
    );
  }

  const denied = state === "denied";
  return (
    <main className="grid min-h-dvh grid-rows-[auto_1fr] bg-ink text-white">
      <header className="flex items-center justify-between px-4 py-3">
        <LogoMark size={28} />
        <LangSwitcher />
      </header>
      <div className="mx-auto grid w-full max-w-md content-center gap-4 px-5 pb-10">
        <div className="card grid gap-4 p-6 text-ink">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-taxi text-2xl" aria-hidden="true">
            📍
          </span>
          <h1 className="text-xl font-bold">{t(denied ? "loc_denied_title" : "loc_off_title")}</h1>
          <p className="text-sm text-ink/80">{t("loc_why")}</p>
          <ol className="grid list-decimal gap-1 ps-5 text-sm text-ink/80">
            <li>{t(denied ? "loc_step_settings" : "loc_step_gps")}</li>
            {denied && <li>{t("loc_step_allow")}</li>}
            <li>{t("loc_step_back")}</li>
          </ol>
          <button type="button" className="btn btn-primary" onClick={check}>
            {t("loc_retry")}
          </button>
        </div>
      </div>
    </main>
  );
}
