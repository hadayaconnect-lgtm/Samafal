"use client";

import { useSyncExternalStore } from "react";
import { getServerSnapshot, getSnapshot, subscribe } from "./store";

export function useApp() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
