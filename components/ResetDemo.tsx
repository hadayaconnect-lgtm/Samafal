"use client";

import { resetDemo } from "@/lib/store";
import { useT } from "./LangProvider";

export function ResetDemo() {
  const { t } = useT();
  function reset() {
    resetDemo();
    try {
      ["samafal:me", "samafal:cride"].forEach((k) => localStorage.removeItem(k));
      sessionStorage.removeItem("samafal:union");
    } catch {
      /* stockage indisponible */
    }
  }
  return (
    <button type="button" onClick={reset} className="text-sm text-ink/60 underline underline-offset-4 hover:text-ink">
      {t("reset_demo")}
    </button>
  );
}
