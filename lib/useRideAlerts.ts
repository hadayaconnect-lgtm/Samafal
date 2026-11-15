"use client";

import { useEffect, useRef } from "react";
import { useT } from "@/components/LangProvider";
import { useApp } from "./useApp";
import { alertUser, prepareNotifications } from "./notify";
import { fmtNum } from "./pricing";
import type { RideStatus } from "./types";

/**
 * Prévient la personne quand sa situation change :
 *  - chauffeur : une nouvelle demande de course arrive ;
 *  - client : le chauffeur accepte, arrive, démarre, termine ou refuse.
 * Les courses déjà présentes à l'ouverture ne déclenchent rien.
 */
export function useRideAlerts(role: "client" | "driver", meId?: string) {
  const { t } = useT();
  const app = useApp();
  const seen = useRef<Map<string, RideStatus> | null>(null);

  useEffect(() => {
    void prepareNotifications();
  }, []);

  useEffect(() => {
    if (!app.ready) return;
    const mine = role === "driver" ? app.rides.filter((r) => r.driverId === meId) : app.rides;
    const prev = seen.current;
    seen.current = new Map(mine.map((r) => [r.id, r.status]));
    if (!prev) return;

    for (const r of mine) {
      const before = prev.get(r.id);
      if (before === r.status) continue;
      if (role === "driver") {
        if (r.status === "requested" && before === undefined) {
          void alertUser(t("notif_new_request"), `${r.clientName} · ${fmtNum(r.price)} ${t("currency")}`);
        } else if (r.status === "cancelled" && before !== "cancelled") {
          void alertUser(t("notif_ride_cancelled"), r.clientName);
        }
      } else if (["accepted", "arrived", "started", "completed", "declined"].includes(r.status)) {
        const name = app.drivers.find((d) => d.id === r.driverId)?.name ?? "";
        const label = t(`ride_${r.status as "accepted" | "arrived" | "started" | "completed" | "declined"}`);
        void alertUser(t("notif_ride_title"), `${label} · ${name}`);
      }
    }
  }, [app.ready, app.rides, app.drivers, role, meId, t]);
}
