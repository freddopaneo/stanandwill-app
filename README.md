# Stan & Will — application mobile

Compagnon de prévention santé pour chiens, par race (teckel en premier). Éditeur : Pixglass SRL.
Palette « Forêt et miel », logo B « Sous le bouclier ».

## Ce que contient ce dépôt

```
stanandwill-app/
├─ apps/mobile/          Application Expo (iOS + Android), expo-router
│  ├─ app/(onboarding)/  welcome → quiz (13 étapes) → computing → bilan → paywall → auth
│  ├─ app/(tabs)/        Aujourd'hui · Scanner · Demander · Carnet
│  ├─ components/        ui.tsx (boutons, cartes, titres), ScoreGauge.tsx
│  └─ lib/               theme, store (données locales), supabase, billing, api, content, sync
├─ packages/core/        Logique pure partagée : moteur de score (testé), quiz, payloads
└─ supabase/             migrations/0001_init.sql (schéma + RLS + RGPD), seed.sql (teckel, aliments, leçons)
```

État au 3 octobre 2026 : étapes 1 et 2 du cahier des charges terminées.
L'app se lance, le parcours complet fonctionne **sans compte et sans serveur** (données sur le téléphone),
le score se calcule localement, l'abonnement est simulé en développement.

## Démarrer sur votre Mac (10 minutes)

1. Installer Node.js 22 LTS : https://nodejs.org (bouton « LTS »).
2. Installer l'app **Expo Go** sur votre iPhone (App Store).
3. Dans le Terminal :
   ```bash
   cd ~/"Claude projets"/stanandwill-app
   npm install --legacy-peer-deps
   cd apps/mobile
   cp .env.example .env        # laissez vide pour l'instant : l'app tourne en mode local
   npx expo start
   ```
4. Scannez le QR code affiché avec l'appareil photo de l'iPhone : l'app s'ouvre dans Expo Go.

Vérifications : `npm test` (9 tests du score) et `npm run typecheck` depuis la racine.

## Comptes à ouvrir au nom de Pixglass (dans cet ordre)

| Compte | Pour quoi | Coût | À faire |
|---|---|---|---|
| **Supabase** (région Frankfurt) | base de données, comptes utilisateurs, photos | 0 € puis 25 $/mois (Pro) | Créer le projet, puis SQL Editor → coller `supabase/migrations/0001_init.sql`, puis `supabase/seed.sql`. Copier l'URL et la clé « anon public » dans `apps/mobile/.env`. Activer l'auth e-mail (OTP). Signer le DPA. |
| **Expo (EAS)** | compilation iOS/Android, mises à jour | 0 € puis 19 $/mois | `npx eas login`, puis `npx eas build:configure`. |
| **Apple Developer** | App Store | 99 $/an | Inscription au nom de Pixglass (numéro D-U-N-S nécessaire, 1 à 2 semaines). |
| **Google Play Console** | Android | 25 $ une fois | Compte organisation Pixglass. |
| **RevenueCat** | abonnements unifiés, paywall, webhooks | 0 € jusqu'à 2 500 $/mois de revenus | Créer les produits `sw_annual_4999`, `sw_monthly_999`, `sw_weekly_699` et l'entitlement `premium` (identiques dans App Store Connect et Play Console). |
| **Stripe** | paiement web (hors stores) | 1,5 % + 0,25 € par transaction | Compte Pixglass, lié au site Next.js. |
| **Anthropic (API Claude)** | scanner et assistant, côté serveur uniquement | à l'usage (~0,02 € par réponse) | Clé stockée dans Netlify, jamais dans l'app. |

## Prochaines étapes de développement

3. **Paiement** : installer `react-native-purchases`, remplacer `lib/billing.ts` par les appels RevenueCat, webhook RevenueCat → `profiles.subscription_status`. Route `/api/founder` pour les codes fondateurs.
4. **Aujourd'hui** : plan hebdomadaire depuis les tables `plans` / `plan_items` / `lessons`, notifications (expo-notifications) à l'heure choisie.
5. **Scanner** : lecture code-barres (expo-camera), route `/api/scan` (Open Pet Food Facts + règles `food_rules` + analyse photo Claude Vision), upload chiffré dans le bucket `dog-media`.
6. **Demander** : route `/api/assistant` (prompt système par race, triage, sources), historique `conversations` / `messages`, quotas `usage`.
7. **Carnet** : synchronisation `weights` / `health_events` / `documents`, rappels vaccins, fiche d'urgence PDF, contacts vétérinaire.
8. **Stores** : captures, fiche App Store / Play, politique de confidentialité, TestFlight avec 20 maîtres de teckels.

## Règles non négociables (sécurité et RGPD)

- Hébergement et traitement en Union européenne (Supabase Frankfurt, Netlify fonctions `fra1`).
- L'app ne contient aucune clé secrète : seulement l'URL Supabase et la clé « anon » ; RLS actif sur toutes les tables (testé).
- Le modèle IA ne reçoit jamais l'identité du maître : uniquement le profil du chien (`lib/api.ts → dogContext`).
- Photos de scan supprimées sous 30 jours (`expire_scan_photos()`), export (`export_my_data()`) et suppression (`request_account_deletion()`) en un geste depuis l'onglet Carnet → Réglages.
- Mention IA affichée avant la première interaction et sur chaque réponse ; jamais de diagnostic.
