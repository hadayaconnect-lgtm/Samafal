"use client";

/**
 * Alertes de l'application : notification du téléphone (application Android)
 * et petit signal sonore. Dans le navigateur, seul le son est joué.
 */
import { Capacitor } from "@capacitor/core";

/** Numéro de version de la coque Android (ajouté à l'agent utilisateur : « TaxiBell/5 »). 0 = ancienne version. */
export const nativeBuild = () => {
  if (typeof navigator === "undefined") return 0;
  const m = /TaxiBell\/(\d+)/.exec(navigator.userAgent);
  return m ? Number(m[1]) : 0;
};
/** Le son TaxiBell est dans l'application depuis la version 5 ; avant, on garde le canal d'origine (son du téléphone). */
export const channelId = () => (nativeBuild() >= 5 ? "taxibell-rides-v2" : "taxibell-rides");
export const channelSound = () => (nativeBuild() >= 5 ? "taxibell_ring.ogg" : undefined);
let prepared = false;

export const isNativeApp = () => typeof window !== "undefined" && Capacitor.isNativePlatform();

/** Demande l'autorisation de notifier et crée le canal sonore (application Android uniquement). */
export async function prepareNotifications() {
  if (prepared || !isNativeApp()) return;
  prepared = true;
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    await LocalNotifications.requestPermissions();
    await LocalNotifications.createChannel({
      id: channelId(),
      name: "Courses TaxiBell",
      description: "Demandes de course et suivi de votre course",
      importance: 5,
      visibility: 1,
      vibration: true,
      sound: channelSound(),
    });
  } catch {
    /* notifications indisponibles */
  }
}

let audio: AudioContext | null = null;

/** Deux bips courts. */
export function beep() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audio ??= new Ctx();
    void audio.resume();
    const now = audio.currentTime;
    [0, 0.28].forEach((d) => {
      const osc = audio!.createOscillator();
      const gain = audio!.createGain();
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, now + d);
      gain.gain.exponentialRampToValueAtTime(0.35, now + d + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + d + 0.22);
      osc.connect(gain).connect(audio!.destination);
      osc.start(now + d);
      osc.stop(now + d + 0.25);
    });
  } catch {
    /* son indisponible */
  }
}

let counter = 1;

export async function alertUser(title: string, body: string) {
  beep();
  try {
    navigator.vibrate?.([200, 100, 200]);
  } catch {
    /* vibration indisponible */
  }
  if (!isNativeApp()) return;
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    await LocalNotifications.schedule({
      notifications: [{ id: counter++, title, body, channelId: channelId(), smallIcon: "ic_stat_taxibell" }],
    });
  } catch {
    /* notification indisponible */
  }
}
