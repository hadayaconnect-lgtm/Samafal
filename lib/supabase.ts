import { createClient } from "@supabase/supabase-js";

/**
 * Clés PUBLIQUES du projet Supabase « Allo Taxi » (faites pour être dans le navigateur).
 * La sécurité repose sur les règles RLS du schéma, pas sur le secret de ces valeurs.
 * Ne jamais mettre ici la clé « service_role » ou « secret ».
 */
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://vhifrqcllkspckndwvkc.supabase.co";
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "sb_publishable_9IWRBpiCFw-UO6g8O4bzgg_7R24UaoC";

export const supabase = createClient(URL, KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
});
