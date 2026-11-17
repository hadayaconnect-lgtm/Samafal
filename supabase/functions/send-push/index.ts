// Fonction Supabase « send-push » : envoie une notification push (Firebase FCM)
// quand une course est créée ou change de statut, et quand un chauffeur demande à s'inscrire
// (l'administrateur est alors prévenu).
// Appelée par un Database Webhook sur public.rides (INSERT et UPDATE) et public.drivers (INSERT).
//
// Secrets à définir (Supabase > Edge Functions > Secrets) :
//   FCM_SERVICE_ACCOUNT : contenu complet du fichier JSON « compte de service » Firebase
//   WEBHOOK_SECRET      : mot de passe de ton choix, le même que dans l'en-tête du webhook
// SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont fournis automatiquement par Supabase.

import { createClient } from "npm:@supabase/supabase-js@2";

type Ride = {
  id: string;
  client_id: string;
  driver_id: string;
  client_name: string;
  price: number;
  status: string;
};

const TEXTS: Record<string, string> = {
  accepted: "Course acceptée",
  arrived: "Votre taxi est arrivé",
  started: "Course commencée",
  completed: "Course terminée",
  declined: "Course refusée",
};

const b64url = (data: ArrayBuffer | string) => {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : new Uint8Array(data);
  let s = "";
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

async function accessToken(sa: { client_email: string; private_key: string }) {
  const now = Math.floor(Date.now() / 1000);
  const head = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );
  const pem = sa.private_key.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    "pkcs8",
    der,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(`${head}.${claim}`));
  const jwt = `${head}.${claim}.${b64url(sig)}`;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }),
  });
  const json = await res.json();
  if (!json.access_token) throw new Error("Jeton Google refusé : " + JSON.stringify(json));
  return json.access_token as string;
}

Deno.serve(async (req) => {
  if (req.headers.get("x-webhook-secret") !== Deno.env.get("WEBHOOK_SECRET")) {
    return new Response("Interdit", { status: 401 });
  }
  const payload = await req.json();
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  let userIds: string[] = [];
  let title = "";
  let body = "";
  let rideId = "";

  if (payload.table === "drivers") {
    // Nouveau chauffeur à valider : on prévient tous les administrateurs.
    const drv = payload.record as { full_name?: string; plate?: string; status?: string } | undefined;
    if (payload.type !== "INSERT" || !drv || drv.status !== "pending") return new Response("rien à envoyer");
    const { data: admins } = await db.from("profiles").select("id").eq("role", "union");
    userIds = (admins ?? []).map((a: { id: string }) => a.id);
    title = "Nouveau chauffeur à valider";
    body = `${drv.full_name ?? "Un chauffeur"}${drv.plate ? " · " + drv.plate : ""}`;
  } else {
  const ride = payload.record as Ride | undefined;
  const old = payload.old_record as Ride | null | undefined;
  if (!ride) return new Response("ok");
  rideId = ride.id;
  let userId: string | null = null;
  if (payload.type === "INSERT" && ride.status === "requested") {
    userId = ride.driver_id;
    title = "Nouvelle demande de course";
    body = `${ride.client_name} · ${ride.price} FDJ`;
  } else if (payload.type === "UPDATE" && old && old.status !== ride.status) {
    if (ride.status === "cancelled") {
      userId = ride.driver_id;
      title = "Course annulée";
      body = ride.client_name;
    } else if (TEXTS[ride.status]) {
      userId = ride.client_id;
      title = "Votre course";
      body = TEXTS[ride.status];
    }
  }
  if (userId) userIds = [userId];
  }
  if (!userIds.length) return new Response("rien à envoyer");

  const { data: tokens } = await db.from("push_tokens").select("token").in("user_id", userIds);
  if (!tokens?.length) return new Response("aucun appareil");

  const sa = JSON.parse(Deno.env.get("FCM_SERVICE_ACCOUNT")!);
  const bearer = await accessToken(sa);
  const url = `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`;

  for (const { token } of tokens) {
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${bearer}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        message: {
          token,
          notification: { title, body },
          data: { rideId },
          android: { priority: "HIGH", notification: { channel_id: "taxibell-rides", sound: "default" } },
        },
      }),
    });
    if (res.status === 404 || res.status === 400) {
      const txt = await res.text();
      if (txt.includes("UNREGISTERED") || txt.includes("INVALID_ARGUMENT")) {
        await db.from("push_tokens").delete().eq("token", token);
      }
    }
  }
  return new Response("envoyé");
});
