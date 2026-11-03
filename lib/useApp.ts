"use client";

import { useCallback, useSyncExternalStore } from "react";
import { useT } from "@/components/LangProvider";
import { getServerSnapshot, getSnapshot, subscribe } from "./store";

export function useApp() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Lance une action en base et prévient l'utilisateur si elle est refusée. */
export function useAct() {
  const { t } = useT();
  return useCallback(
    (p: Promise<unknown>) => {
      p.catch(() => window.alert(t("action_error")));
    },
    [t],
  );
}
