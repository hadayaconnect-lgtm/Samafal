/** Le client propose son prix ; le chauffeur accepte ou refuse. */
export const MIN_OFFER = 500;
export const MAX_OFFER = 20000;
export const OFFER_STEP = 100;
export const DEFAULT_OFFER = 500;

/** Portefeuilles mobile money acceptés (même liste dans la base : migration-operateurs.sql). */
export const WALLET_OPERATORS = ["D-Money", "Waafi", "CAC Pay", "Sabapay", "Dahab Plus", "Eximpay", "BCI-Pay"];

/** Date et heure lisibles (ex. « 21 nov. 2026, 07:30 »). */
export const fmtDateTime = (ms: number, lang: string) =>
  new Date(ms).toLocaleString(lang === "ar" ? "ar" : "fr-FR", { dateStyle: "medium", timeStyle: "short" });

/** Une course planifiée devient « en cours » dans l'application une heure avant l'heure du rendez-vous. */
export const PLAN_WINDOW_MS = 60 * 60 * 1000;
/** Délai minimal entre la réservation et le rendez-vous. */
export const MIN_LEAD_MS = 30 * 60 * 1000;

export const fmtNum = (n: number) => n.toLocaleString("fr-FR");
