/** Le client propose son prix ; le chauffeur accepte ou refuse. */
export const MIN_OFFER = 500;
export const MAX_OFFER = 20000;
export const OFFER_STEP = 100;
export const DEFAULT_OFFER = 500;

/** Portefeuilles mobile money acceptés (même liste dans la base : migration-operateurs.sql). */
export const WALLET_OPERATORS = ["D-Money", "Waafi", "CAC Pay", "Sabapay", "Dahab Plus", "Eximpay", "BCI-Pay"];

export const fmtNum = (n: number) => n.toLocaleString("fr-FR");
