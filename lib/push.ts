"use client";

/**
 * Notifications push (Firebase) : fonctionnent même quand l'application est fermée.
 * Application Android uniquement. Le jeton de l'appareil est enregistré dans Supabase,
 * et une fonction serveur envoie la notification à chaque demande ou changement de course.
 */
import { supabase } from "./supabase";
import { isNativeApp } from "./notify";

const TOKEN_KEY = "tb:pushToken";
let started = false;

export async function registerPush() {
  if (started || !isNativeApp()) return;
  started = true;
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    await PushNotifications.addListener("registration", async ({ value }) => {
      try {
        localStorage.setItem(TOKEN_KEY, value);
      } catch {
        /* stockage indisponible */
      }
      await supabase.rpc("save_push_token", { p_token: value });
    });
    await PushNotifications.addListener("registrationError", () => {
      /* Firebase non configuré ou refusé : l'application continue sans push */
    });
    await PushNotifications.createChannel({
      id: "taxibell-rides",
      name: "Courses TaxiBell",
      description: "Demandes de course et suivi de votre course",
      importance: 5,
      visibility: 1,
      vibration: true,
    });
    const perm = await PushNotifications.requestPermissions();
    if (perm.receive === "granted") await PushNotifications.register();
  } catch {
    started = false;
  }
}

/** À appeler à la déconnexion : cet appareil ne doit plus recevoir les alertes de l'ancien compte. */
export async function forgetPush() {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      await supabase.rpc("delete_push_token", { p_token: token });
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    /* hors ligne ou stockage indisponible */
  }
}
