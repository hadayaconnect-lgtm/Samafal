"use client";

import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export type Profile = { id: string; phone: string | null; full_name: string | null; role: "client" | "union" };

/** 77 00 00 00 -> +25377000000. Un numéro déjà international est conservé. */
export function normalizePhone(input: string): string | null {
  let d = input.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.length === 8) d = "253" + d;
  if (d.length < 10 || d.length > 15) return null;
  return "+" + d;
}

export async function sendCode(phone: string) {
  const { error } = await supabase.auth.signInWithOtp({ phone });
  if (error) throw new Error(error.message);
}

export async function verifyCode(phone: string, token: string) {
  const { error } = await supabase.auth.verifyOtp({ phone, token: token.trim(), type: "sms" });
  if (error) throw new Error(error.message);
}

export async function signOut() {
  await supabase.auth.signOut();
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (uid: string) => {
    const { data } = await supabase.from("profiles").select("*").eq("id", uid).maybeSingle();
    setProfile((data as Profile | null) ?? null);
  }, []);

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!alive) return;
      setSession(data.session);
      if (data.session) await loadProfile(data.session.user.id);
      if (alive) setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s) void loadProfile(s.user.id);
      else setProfile(null);
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const saveName = useCallback(
    async (name: string) => {
      if (!session) return;
      const { error } = await supabase.from("profiles").update({ full_name: name }).eq("id", session.user.id);
      if (error) throw new Error(error.message);
      await loadProfile(session.user.id);
    },
    [session, loadProfile],
  );

  return { session, profile, loading, saveName };
}
