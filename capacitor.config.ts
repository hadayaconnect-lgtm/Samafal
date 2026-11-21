import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Application Android de TaxiBell : une coque native qui affiche le site
 * (https://taxibell.vercel.app) et ajoute les fonctions du téléphone
 * (notifications, son). Le site se met à jour tout seul, sans nouvelle version Play.
 */
const config: CapacitorConfig = {
  appId: "com.hadayaconnect.taxibell",
  appName: "TaxiBell",
  webDir: "public",
  server: {
    url: "https://taxibell.vercel.app",
    cleartext: false,
    androidScheme: "https",
  },
  // Le site reconnaît la version de la coque (TaxiBell/5) pour activer le son personnalisé.
  android: { backgroundColor: "#0b2e22", appendUserAgent: "TaxiBell/5" },
  plugins: {
    LocalNotifications: {
      smallIcon: "ic_stat_taxibell",
      iconColor: "#1fa65b",
    },
  },
};

export default config;
