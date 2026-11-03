"use client";

import { useId, useState, type ChangeEvent } from "react";
import type { Key } from "@/lib/i18n";
import type { NewDriver } from "@/lib/store";
import { useT } from "./LangProvider";

const EMPTY: NewDriver = {
  name: "",
  phone: "",
  plate: "",
  vehicle: "",
  walletOperator: "D-Money",
  walletNumber: "",
};

export function DriverForm({ submitKey, onSubmit }: { submitKey: Key; onSubmit: (d: NewDriver) => Promise<void> | void }) {
  const { t } = useT();
  const uid = useId();
  const [f, setF] = useState<NewDriver>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const set = (k: keyof NewDriver) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value }));

  const ok = f.name.trim().length > 1 && f.phone.trim().length > 5 && f.plate.trim().length > 0;

  return (
    <form
      className="grid gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!ok) return;
        setBusy(true);
        setError(false);
        try {
          await onSubmit({
          name: f.name.trim(),
          phone: f.phone.trim(),
          plate: f.plate.trim(),
          vehicle: f.vehicle.trim(),
          walletOperator: f.walletOperator,
          walletNumber: f.walletNumber.trim(),
          });
          setF(EMPTY);
        } catch {
          setError(true);
        }
        setBusy(false);
      }}
    >
      <div>
        <label className="label" htmlFor={`${uid}-name`}>{t("full_name")}</label>
        <input id={`${uid}-name`} className="field" value={f.name} onChange={set("name")} autoComplete="name" />
      </div>
      <div>
        <label className="label" htmlFor={`${uid}-phone`}>{t("phone")}</label>
        <input id={`${uid}-phone`} className="field" value={f.phone} onChange={set("phone")} inputMode="tel" placeholder="+253 77 00 00 00" dir="ltr" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor={`${uid}-plate`}>{t("plate")}</label>
          <input id={`${uid}-plate`} className="field" value={f.plate} onChange={set("plate")} dir="ltr" />
        </div>
        <div>
          <label className="label" htmlFor={`${uid}-vehicle`}>{t("vehicle")}</label>
          <input id={`${uid}-vehicle`} className="field" value={f.vehicle} onChange={set("vehicle")} dir="ltr" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor={`${uid}-op`}>{t("wallet_operator")}</label>
          <select id={`${uid}-op`} className="field" value={f.walletOperator} onChange={set("walletOperator")}>
            <option>D-Money</option>
            <option>Waafi</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor={`${uid}-wn`}>{t("wallet_number")}</label>
          <input id={`${uid}-wn`} className="field" value={f.walletNumber} onChange={set("walletNumber")} inputMode="tel" dir="ltr" />
        </div>
      </div>
      {error && <p className="text-sm text-bad">{t("register_error")}</p>}
      <button type="submit" className="btn btn-primary" disabled={!ok || busy}>
        {t(submitKey)}
      </button>
    </form>
  );
}
