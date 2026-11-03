"use client";

import { useState, type ReactNode } from "react";
import { normalizePhone, sendCode, signOut, useAuth, verifyCode, type Profile } from "@/lib/auth";
import { useT } from "./LangProvider";
import { TopBar } from "./TopBar";

export function AuthGate({
  title,
  role,
  fullScreen,
  children,
}: {
  title: string;
  role?: "union";
  fullScreen?: boolean;
  children: (me: Profile) => ReactNode;
}) {
  const { t } = useT();
  const { session, profile, loading, saveName } = useAuth();

  let body: ReactNode;
  if (loading || (session && !profile)) body = <p className="p-4">{t("loading")}</p>;
  else if (!session || !profile) body = <PhoneLogin />;
  else if (!profile.full_name) body = <NameStep onSave={saveName} />;
  else if (role === "union" && profile.role !== "union") {
    body = (
      <div className="card mx-auto grid w-full max-w-sm gap-3 p-5">
        <p className="font-bold">{t("auth_not_union")}</p>
        <p className="text-sm text-ink/70">{t("auth_not_union_help")}</p>
        <button type="button" className="btn btn-ghost" onClick={() => void signOut()}>
          {t("auth_logout")}
        </button>
      </div>
    );
  } else return <>{children(profile)}</>;

  return (
    <div className={fullScreen ? "min-h-dvh bg-mist" : "min-h-dvh"}>
      <TopBar title={title} />
      <main className="mx-auto grid max-w-md gap-4 p-4 pt-8">{body}</main>
    </div>
  );
}

function PhoneLogin() {
  const { t } = useT();
  const [phoneInput, setPhoneInput] = useState("");
  const [phone, setPhone] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    const p = normalizePhone(phoneInput);
    if (!p) return setError(t("auth_bad_phone"));
    setBusy(true);
    setError(null);
    try {
      await sendCode(p);
      setPhone(p);
    } catch {
      setError(t("auth_error"));
    }
    setBusy(false);
  }

  async function verify() {
    if (!phone) return;
    setBusy(true);
    setError(null);
    try {
      await verifyCode(phone, code);
    } catch {
      setError(t("auth_wrong_code"));
      setBusy(false);
    }
  }

  return phone === null ? (
    <form
      className="card grid gap-3 p-5"
      onSubmit={(e) => {
        e.preventDefault();
        void send();
      }}
    >
      <h2 className="text-lg font-bold">{t("auth_phone_title")}</h2>
      <div>
        <label className="label" htmlFor="ph">{t("auth_phone_label")}</label>
        <div className="flex items-center gap-2" dir="ltr">
          <span className="rounded-xl bg-mist px-3 py-3 font-semibold">+253</span>
          <input
            id="ph"
            className="field"
            inputMode="tel"
            autoComplete="tel-national"
            placeholder="77 00 00 00"
            value={phoneInput}
            onChange={(e) => setPhoneInput(e.target.value)}
          />
        </div>
        <p className="mt-1 text-xs text-ink/60">{t("auth_phone_hint")}</p>
      </div>
      {error && <p className="text-sm text-bad">{error}</p>}
      <button type="submit" className="btn btn-primary" disabled={busy}>
        {t("auth_send_code")}
      </button>
    </form>
  ) : (
    <form
      className="card grid gap-3 p-5"
      onSubmit={(e) => {
        e.preventDefault();
        void verify();
      }}
    >
      <h2 className="text-lg font-bold">{t("auth_code_label")}</h2>
      <p className="text-sm text-ink/70" dir="ltr">{phone}</p>
      <input
        className="field text-center text-2xl tracking-[0.4em]"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
        dir="ltr"
        aria-label={t("auth_code_label")}
      />
      {error && <p className="text-sm text-bad">{error}</p>}
      <button type="submit" className="btn btn-primary" disabled={busy || code.length < 6}>
        {t("auth_verify")}
      </button>
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        onClick={() => {
          setPhone(null);
          setCode("");
          setError(null);
        }}
      >
        {t("auth_change_number")}
      </button>
    </form>
  );
}

function NameStep({ onSave }: { onSave: (n: string) => Promise<void> }) {
  const { t } = useT();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  return (
    <form
      className="card grid gap-3 p-5"
      onSubmit={async (e) => {
        e.preventDefault();
        if (name.trim().length < 2) return;
        setBusy(true);
        try {
          await onSave(name.trim());
        } catch {
          setError(true);
          setBusy(false);
        }
      }}
    >
      <h2 className="text-lg font-bold">{t("auth_name_title")}</h2>
      <input className="field" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" aria-label={t("your_name")} />
      {error && <p className="text-sm text-bad">{t("auth_error")}</p>}
      <button type="submit" className="btn btn-primary" disabled={busy || name.trim().length < 2}>
        {t("auth_name_save")}
      </button>
    </form>
  );
}
