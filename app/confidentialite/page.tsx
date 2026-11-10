import type { Metadata } from "next";
import { COMPANY, CONTACT_EMAIL } from "@/lib/config";

export const metadata: Metadata = { title: "Politique de confidentialité — TaxiBell" };

export default function Privacy() {
  return (
    <main className="mx-auto grid max-w-2xl gap-5 p-5 leading-relaxed">
      <h1 className="text-2xl font-bold">Politique de confidentialité — TaxiBell</h1>
      <p className="text-sm text-ink/60">Dernière mise à jour : novembre 2026</p>

      <section className="grid gap-2">
        <h2 className="text-lg font-bold">Qui sommes-nous ?</h2>
        <p>
          TaxiBell met en relation des clients et des chauffeurs de taxi à Djibouti. L’application est éditée par {COMPANY}.
          {CONTACT_EMAIL ? ` Contact : ${CONTACT_EMAIL}.` : ""}
        </p>
      </section>

      <section className="grid gap-2">
        <h2 className="text-lg font-bold">Données que nous collectons</h2>
        <ul className="list-disc ps-5">
          <li>Votre nom, votre numéro de téléphone et, pour les clients, votre adresse e-mail.</li>
          <li>Votre position, lorsque vous utilisez « Ma position » (client) ou lorsque vous êtes disponible (chauffeur).</li>
          <li>Vos courses : départ, destination, prix proposé, statut et mode de paiement.</li>
          <li>Pour les chauffeurs : plaque, véhicule, numéro de portefeuille mobile, notes d’inspection.</li>
          <li>Les commentaires que les clients laissent après une course (affichés avec le seul prénom).</li>
        </ul>
      </section>

      <section className="grid gap-2">
        <h2 className="text-lg font-bold">Pourquoi ?</h2>
        <p>
          Pour vous connecter (code reçu par SMS ou par e-mail), afficher les taxis proches, réaliser la course et permettre
          au chauffeur et au client de se joindre. Nous ne vendons pas vos données et nous ne faisons pas de publicité ciblée.
        </p>
      </section>

      <section className="grid gap-2">
        <h2 className="text-lg font-bold">Qui voit quoi ?</h2>
        <ul className="list-disc ps-5">
          <li>Le chauffeur voit votre nom, votre numéro et votre point de départ lorsque vous demandez une course.</li>
          <li>Le client voit le nom, le véhicule, la plaque, la note et la position du chauffeur.</li>
          <li>L’administration de TaxiBell peut consulter les profils et les courses pour valider les chauffeurs et traiter les litiges.</li>
        </ul>
      </section>

      <section className="grid gap-2">
        <h2 className="text-lg font-bold">Hébergement et conservation</h2>
        <p>
          Les données sont hébergées chez Supabase (base de données) et Vercel (site). Elles sont conservées tant que votre compte
          existe. Vous pouvez demander leur suppression à tout moment.
        </p>
      </section>

      <section className="grid gap-2">
        <h2 className="text-lg font-bold">Vos droits</h2>
        <p>
          Vous pouvez demander l’accès, la correction ou la suppression de vos données, ou la suppression de votre compte, en nous
          écrivant{CONTACT_EMAIL ? ` à ${CONTACT_EMAIL}` : ""}.
        </p>
      </section>
    </main>
  );
}
