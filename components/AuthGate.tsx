"use client";

import { useState, type ReactNode } from "react";
import {
  normalizePhone,
  saveLoginDetails,
  sendCode,
  sendEmailCode,
  signOut,
  useAuth,
  validEmail,
  verifyCode,
  verifyEmailCode,
  type Profile,
} from "@/lib/auth";
import { useT } from "./LangProvider";
import { TopBar } from "./TopBar";

export function AuthGate({
  title,
  role,
  fullScreen,
  methods = ["phone", "email"],
  children,
}: {
  title: string;
  role?: "union";
  fullScreen?: boolean;
  /** Modes de connexion proposés (par défaut : SMS et e-mail). */
  methods?: ("phone" | "email")[];
  children: (me: Profile) => ReactNode;
}) {
  const { t } = useT();
  const { session, profile, loading, saveName } = useAuth();

  let body: ReactNode;
  if (loading || (session && !profile)) body = <p className="p-4">{t("loading")}</p>;
  else if (!session || !profile) body = <Login methods={methods} />;
  else if (!profile.full_name || !profile.phone) body = <NameStep profile={profile} onSave={saveName} />;
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

function Login({ methods }: { methods: ("phone" | "email")[] }) {
  const { t } = useT();
  const [mode, setMode] = useState<"phone" | "email">(methods[0] ?? "phone");
  return (
    <div className="grid gap-4">
      {methods.length > 1 && (
        <div className="grid grid-cols-2 gap-2" role="group" aria-label={t("auth_phone_title")}>
          {methods.map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              onClick={() => setMode(m)}
              className={`btn btn-sm border ${
                mode === m ? "border-green bg-green-soft text-green-dark ring-2 ring-green" : "border-line bg-white"
              }`}
            >
              {t(m === "phone" ? "auth_tab_phone" : "auth_tab_email")}
            </button>
          ))}
        </div>
      )}
      <CodeLogin key={mode} mode={mode} />
    </div>
  );
}

function CodeLogin({ mode }: { mode: "phone" | "email" }) {
  const { t } = useT();
  const isEmail = mode === "email";
  const [input, setInput] = useState("");
  const [target, setTarget] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Première connexion par e-mail : nom et téléphone demandés avant l'envoi du code.
  const [isNew, setIsNew] = useState(true);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const askDetails = isEmail && isNew;

  async function send() {
    const v = isEmail ? validEmail(input) : normalizePhone(input);
    if (!v) return setError(t(isEmail ? "auth_bad_email" : "auth_bad_phone"));
    if (askDetails && name.trim().length < 2) return setError(t("auth_need_name"));
    if (askDetails && !normalizePhone(contact)) return setError(t("auth_bad_phone"));
    setBusy(true);
    setError(null);
    try {
      await (isEmail ? sendEmailCode(v) : sendCode(v));
      setTarget(v);
    } catch {
      setError(t("auth_error"));
    }
    setBusy(false);
  }

  async function verify() {
    if (!target) return;
    setBusy(true);
    setError(null);
    try {
      await (isEmail ? verifyEmailCode(target, code) : verifyCode(target, code));
      const p = normalizePhone(contact);
      if (askDetails && p) await saveLoginDetails(name.trim(), p).catch(() => {});
    } catch {
      setError(t("auth_wrong_code"));
      setBusy(false);
    }
  }

  return target === null ? (
    <form
      className="card grid gap-3 p-5"
      onSubmit={(e) => {
        e.preventDefault();
        void send();
      }}
    >
      <h2 className="text-lg font-bold">{t("auth_phone_title")}</h2>
      <div>
        <label className="label" htmlFor="login-id">{t(isEmail ? "auth_email_label" : "auth_phone_label")}</label>
        {isEmail ? (
          <input
            id="login-id"
            className="field"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="nom@exemple.com"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            dir="ltr"
          />
        ) : (
          <div className="flex items-center gap-2" dir="ltr">
            <span className="rounded-xl bg-mist px-3 py-3 font-semibold">+253</span>
            <input
              id="login-id"
              className="field"
              inputMode="tel"
              autoComplete="tel-national"
              placeholder="77 00 00 00"
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
          </div>
        )}
        <p className="mt-1 text-xs text-ink/60">{t(isEmail ? "auth_email_hint" : "auth_phone_hint")}</p>
      </div>
      {isEmail && (
        <>
          {isNew && (
            <>
              <div>
                <label className="label" htmlFor="login-name">{t("your_name")}</label>
                <input
                  id="login-name"
                  className="field"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                />
              </div>
              <div>
                <label className="label" htmlFor="login-contact">{t("auth_contact_phone")}</label>
                <div className="flex items-center gap-2" dir="ltr">
                  <span className="rounded-xl bg-mist px-3 py-3 font-semibold">+253</span>
                  <input
                    id="login-contact"
                    className="field"
                    inputMode="tel"
                    autoComplete="tel-national"
                    placeholder="77 00 00 00"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                  />
                </div>
                <p className="mt-1 text-xs text-ink/60">{t("auth_contact_phone_hint")}</p>
              </div>
            </>
          )}
          <button type="button" className="btn btn-ghost btn-sm w-fit" onClick={() => setIsNew((v) => !v)}>
            {t(isNew ? "auth_have_account" : "auth_first_time")}
          </button>
        </>
      )}
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
      <h2 className="text-lg font-bold">{t(isEmail ? "auth_code_label_email" : "auth_code_label")}</h2>
      <p className="text-sm text-ink/70" dir="ltr">{target}</p>
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
          setTarget(null);
          setCode("");
          setError(null);
        }}
      >
        {t(isEmail ? "auth_change_email" : "auth_change_number")}
      </button>
    </form>
  );
}

function NameStep({ profile, onSave }: { profile: Profile; onSave: (n: string, phone?: string) => Promise<void> }) {
  const { t } = useT();
  const needName = !profile.full_name;
  const needPhone = !profile.phone;
  const [name, setName] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const phone = normalizePhone(phoneInput);
  const ready = (!needName || name.trim().length >= 2) && (!needPhone || phone !== null);
  return (
    <form
      className="card grid gap-3 p-5"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!ready) return;
        setBusy(true);
        setError(null);
        try {
          await onSave(needName ? name.trim() : "", needPhone && phone ? phone : undefined);
        } catch {
          setError(t("auth_error"));
          setBusy(false);
        }
      }}
    >
      <h2 className="text-lg font-bold">{t("auth_name_title")}</h2>
      {needName && (
        <input className="field" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" aria-label={t("your_name")} />
      )}
      {needPhone && (
        <div>
          <label className="label" htmlFor="contact-ph">{t("auth_contact_phone")}</label>
          <div className="flex items-center gap-2" dir="ltr">
            <span className="rounded-xl bg-mist px-3 py-3 font-semibold">+253</span>
            <input
              id="contact-ph"
              className="field"
              inputMode="tel"
              autoComplete="tel-national"
              placeholder="77 00 00 00"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
            />
          </div>
          <p className="mt-1 text-xs text-ink/60">{t("auth_contact_phone_hint")}</p>
        </div>
      )}
      {error && <p className="text-sm text-bad">{error}</p>}
      <button type="submit" className="btn btn-primary" disabled={busy || !ready}>
        {t("auth_name_save")}
      </button>
    </form>
  );
}
