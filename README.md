# Samafal

Application de taxis pour Djibouti : le client voit les taxis les plus proches, réserve, et paie en espèces ou par mobile money. Les chauffeurs sont validés par l'administrateur de l'application.

Version actuelle : **démonstration**. Les données sont stockées dans le navigateur (localStorage), avec un chemin de migration vers Supabase.

## Lancer

```bash
npm install
npm run dev
```

Ouvrir http://localhost:3000. Pour voir le parcours complet, ouvrir deux onglets : `/client` et `/chauffeur` (choisir un chauffeur, passer disponible). Les onglets se synchronisent entre eux.

## Décisions de conception

- **Tarif** : le client propose son prix (500 à 5000 FDJ, par pas de 100) ; le chauffeur accepte ou refuse, sans contre-offre. Limites vérifiées côté serveur (`supabase/migration-offre.sql`). Destination choisie dans une liste de 10 zones ; le chauffeur ouvre l'itinéraire dans Google Maps.
- **Paiement** : espèces, ou mobile money par transfert direct au numéro du chauffeur. Le client annonce « J'ai payé », le chauffeur confirme « Paiement reçu ». Aucune API d'opérateur pour l'instant.
- **Langues** : français, somali, arabe (affichage de droite à gauche), afar. Les textes somali et arabe doivent être relus par des locuteurs natifs. L'afar est à remplir dans `lib/i18n/aa.ts` (en attendant, le français s'affiche).
- **Administration** (`/admin`) : valide ou suspend les chauffeurs, inspecte les véhicules, modère les commentaires. Réservée aux comptes ayant le rôle `union` dans la table `profiles` (le nom technique du rôle est resté `union`).
- **Commission** : aucune pour le moment.

## Structure

```
app/            pages : accueil, client, chauffeur, admin
components/     carte (Leaflet / OpenStreetMap), formulaire chauffeur, sélecteur de langue
lib/store.ts    toutes les données passent ici (à remplacer par Supabase)
lib/i18n/       traductions
lib/pricing.ts  tarifs par zone
lib/seed.ts     chauffeurs fictifs de démonstration
```

## Étapes suivantes

1. Migrer `lib/store.ts` vers Supabase (comptes, temps réel, historique).
2. Vrais SMS de connexion (fournisseur à brancher dans Supabase).
3. Notifications aux chauffeurs (nouvelle demande).
4. Relecture des traductions et traduction afar.
5. Intégration d'API mobile money si des accords sont signés avec les opérateurs.
