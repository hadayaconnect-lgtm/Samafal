# Samafal

Application de taxis pour Djibouti : le client voit les taxis les plus proches, réserve, et paie en espèces ou par mobile money. Les chauffeurs sont validés par le syndicat.

Version actuelle : **démonstration**. Les données sont stockées dans le navigateur (localStorage), avec un chemin de migration vers Supabase.

## Lancer

```bash
npm install
npm run dev
```

Ouvrir http://localhost:3000. Pour voir le parcours complet, ouvrir deux onglets : `/client` et `/chauffeur` (choisir un chauffeur, passer disponible). Les onglets se synchronisent entre eux.

## Décisions de conception

- **Tarif** : prix fixe par zone (7 zones de Djibouti-ville). Tableau provisoire dans `lib/pricing.ts`, à valider avec le syndicat. Les coordonnées des zones (`lib/zones.ts`) sont approximatives.
- **Paiement** : espèces, ou mobile money par transfert direct au numéro du chauffeur. Le client annonce « J'ai payé », le chauffeur confirme « Paiement reçu ». Aucune API d'opérateur pour l'instant.
- **Langues** : français, somali, arabe (affichage de droite à gauche), afar. Les textes somali et arabe doivent être relus par des locuteurs natifs. L'afar est à remplir dans `lib/i18n/aa.ts` (en attendant, le français s'affiche).
- **Syndicat** : valide ou suspend les chauffeurs. Code de démonstration `1234` dans `app/syndicat/page.tsx` : à remplacer par une vraie authentification.
- **Commission** : aucune pour le moment.

## Structure

```
app/            pages : accueil, client, chauffeur, syndicat
components/     carte (Leaflet / OpenStreetMap), formulaire chauffeur, sélecteur de langue
lib/store.ts    toutes les données passent ici (à remplacer par Supabase)
lib/i18n/       traductions
lib/pricing.ts  tarifs par zone
lib/seed.ts     chauffeurs fictifs de démonstration
```

## Étapes suivantes

1. Migrer `lib/store.ts` vers Supabase (comptes, temps réel, historique).
2. Vraie authentification chauffeurs et syndicat (téléphone + code SMS).
3. Notifications aux chauffeurs (nouvelle demande).
4. Relecture des traductions et traduction afar.
5. Intégration d'API mobile money si des accords sont signés avec les opérateurs.
