# TestFlight — de l'inscription Apple à 20 maîtres testeurs

Objectif : installer Stan & Will sur l'iPhone de 20 maîtres (famille, amis, club de teckels) avant l'ouverture des stores.
Durée : **3 à 10 jours**, surtout à cause de la vérification Apple (D-U-N-S). Le travail technique, lui, prend environ 1 heure.

---

## Étape A — Lancer tout de suite (côté Frédéric)

### A1. Numéro D-U-N-S d'Eureca Design SRL (gratuit, 1 à 5 jours ouvrés)
Apple exige ce numéro pour inscrire une **société** (l'app est publiée au nom d'Eureca Design, pas à titre personnel).
1. Vérifier si la société en a déjà un : https://developer.apple.com/enroll/duns-lookup/ → saisir exactement la raison sociale et l'adresse du siège en Belgique (telles qu'au registre BCE).
2. S'il n'existe pas : le même formulaire permet de le demander gratuitement à Dun & Bradstreet. Réponse par e-mail.

### A2. Compte Apple Developer « Organisation » (99 USD/an)
1. Avec un identifiant Apple **dédié** de préférence (ex. `apps@eurecadesign.be`), pas l'identifiant personnel.
2. https://developer.apple.com/programs/enroll/ → **Organization** → numéro D-U-N-S, site web de la société, adresse e-mail sur le domaine de la société.
3. Apple peut appeler pour vérifier que tu as le pouvoir d'engager la société (gérant) : prévoir d'être joignable.
4. Paiement → validation sous 1 à 3 jours.

### A3. Compte Expo (gratuit, 2 minutes)
https://expo.dev/signup → organisation `eurecadesign`. C'est le service qui compile l'app dans le cloud (pas besoin de Xcode sur le Mac).

---

## Étape B — Première compilation (≈ 30 min, dès que A2 est validé)

Dans le Terminal, dossier `stanandwill-app/apps/mobile` :
```bash
npx eas-cli login                 # compte Expo
npx eas-cli init                  # relie le projet à Expo (remplit extra.eas.projectId dans app.json)
npx eas-cli build --platform ios --profile production
```
- EAS demande de se connecter au compte **Apple Developer** : répondre oui, il crée seul les certificats et le profil de distribution.
- Les clés du fichier `.env` (Supabase, Sentry, PostHog) doivent aussi être déclarées sur Expo : `npx eas-cli env:create` pour chacune, environnement **production** (ou via expo.dev → Project → Environment variables). Visibilité : « Plain text » (ce sont des clés publiques).
- Compilation : 15 à 25 minutes dans le cloud. Un lien `.ipa` s'affiche à la fin.

## Étape C — App Store Connect et TestFlight (≈ 20 min)
1. https://appstoreconnect.apple.com → Apps → **+** → Nouvelle app : plateforme iOS, nom « Stan & Will », langue principale **Français**, identifiant de lot `be.eurecadesign.stanandwill`, SKU `stanandwill-ios`.
2. Copier l'**Apple ID** de l'app (nombre) dans `eas.json` → `submit.production.ios.ascAppId`.
3. Envoyer la compilation : `npx eas-cli submit --platform ios --latest`.
4. TestFlight → **Testeurs internes** (jusqu'à 100 personnes ayant un rôle dans le compte) : immédiat, sans validation Apple.
   **Testeurs externes** (lien public, jusqu'à 10 000) : première version soumise à une vérification « Beta App Review » (24–48 h). Pour 20 maîtres : groupe externe « Maîtres pionniers » + **lien public**.
5. Remplir « Informations de test » avec le texte de `docs/APP_STORE.md` (section TestFlight).

## Étape D — Questionnaire de confidentialité Apple (« App Privacy »)
| Donnée | Collectée | Liée à l'identité | Pistage | Usage |
|---|---|---|---|---|
| Adresse e-mail | Oui | Oui | Non | Fonctionnement (compte) |
| Données de santé de l'animal* | Oui | Oui | Non | Fonctionnement |
| Diagnostics (plantages) — Sentry | Oui | Non | Non | Fonctionnement |
| Données d'usage — PostHog | Oui, avec consentement | Non | Non | Analyse |
| Position | **Non collectée** (distance calculée sur le téléphone, météo avec position arrondie non conservée) | — | — | — |
| Photos | Oui (scan) | Non | Non | Fonctionnement |

*Apple classe « Santé et forme » pour l'humain : les données du chien relèvent plutôt de « Autre contenu utilisateur ». Choisir **Other User Content**.

---

## Ce qui est déjà prêt dans le code (25 oct.)
- `apps/mobile/eas.json` : profils `development` (simulateur), `preview` (installation interne), `production` (TestFlight/App Store, numéro de build automatique).
- `app.json` : version 0.1.0, build 1, chiffrement standard déclaré (pas de formulaire export à chaque envoi), **manifeste de confidentialité Apple** (raisons d'accès aux API requises depuis 2024), textes d'autorisation en français (caméra, photos, position), plugin Sentry (région UE, organisation `stanandwill-eu` — à ajuster si le slug diffère).
- Polices Nunito référencées depuis la racine du monorepo (corrige un échec de compilation après le passage au SDK 58).
- Génération du projet iOS natif vérifiée (`expo prebuild`) : tous les plugins passent.
- Envoi des cartes de symboles Sentry désactivé pour l'instant (`SENTRY_DISABLE_AUTO_UPLOAD`) : à activer avec un jeton Sentry quand l'app sera en production.
