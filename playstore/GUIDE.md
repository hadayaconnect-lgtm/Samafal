# Publier TaxiBell sur Google Play

## 1. Créer l'application Android (sur ton PC)
Prérequis : Node 18+, Java 17 (Bubblewrap propose de les installer).
```
npm i -g @bubblewrap/cli
mkdir taxibell-android && cd taxibell-android
bubblewrap init --manifest=https://samafal.vercel.app/manifest.webmanifest
bubblewrap build
```
Résultat : `app-release-bundle.aab` (à envoyer à Google Play).
Garde le fichier `taxibell-release.keystore` et son mot de passe EN SÉCURITÉ (sauvegarde-les : sans eux, impossible de mettre à jour l'app).

## 2. Lier le site à l'app (obligatoire, sinon barre d'adresse visible)
`bubblewrap fingerprint` ou Play Console > Intégrité de l'app > Signature : copie l'empreinte SHA-256.
Dans le projet, crée `public/.well-known/assetlinks.json` :
```
[{"relation":["delegate_permission/common.handle_all_urls"],
  "target":{"namespace":"android_app","package_name":"com.hadayaconnect.taxibell",
  "sha256_cert_fingerprints":["COLLE_ICI_LE_SHA256"]}}]
```
Puis git push. Vérifie : https://samafal.vercel.app/.well-known/assetlinks.json

## 3. Fiche Play Console
- Titre : TaxiBell – Taxi Djibouti
- Description courte (80 car.) : Commandez un taxi à Djibouti et proposez votre prix.
- Icône 512x512 : public/icon-512.png
- Image de présentation 1024x500 : playstore/feature-graphic-1024x500.png
- Captures d'écran : minimum 2 (téléphone), prises sur l'app
- Politique de confidentialité : https://samafal.vercel.app/confidentialite
- Catégorie : Cartes et navigation (ou Transports)
- Sécurité des données : collecte nom, téléphone, e-mail, position (précise) ; chiffrées en transit ; l'utilisateur peut demander la suppression.
- Compte de test pour Google : numéro 25377000001, code 123456 (chauffeur)

## 4. Test fermé (compte personnel créé après nov. 2023)
12 testeurs minimum pendant 14 jours avant la production. (Pas exigé pour un compte organisation.)
