# Version web (PWA) et paiement Stripe — mise en service

La même application tourne maintenant de trois façons, à partir du même code :

| Canal | Où | Paiement | Rappels à heure fixe |
|---|---|---|---|
| iPhone / Android | App Store, Google Play (à venir) | Achat intégré via RevenueCat | Oui |
| **Web (PWA)** | Une adresse web, installable sur l'écran d'accueil | **Stripe** (carte, Apple Pay, Google Pay) | Non (e-mail du dimanche à la place) |

Quel que soit le canal, c'est le serveur qui écrit `profiles.subscription_status`. L'app ne fait que le lire :
un abonné web qui se connecte plus tard dans l'app iPhone retrouve son plan, et inversement.

## Ce qui change dans le code

**Application (`apps/mobile`)** — les fichiers `*.web.ts(x)` ne sont utilisés que dans un navigateur ; iOS et Android gardent les fichiers d'origine.

| Fichier | Rôle |
|---|---|
| `lib/billing.web.ts` | Paiement Stripe (remplace RevenueCat dans le navigateur) |
| `lib/offers.ts` | Offres et codes fondateurs, communs aux deux canaux |
| `lib/premiumSync.ts` | Relit le statut d'abonnement du compte à l'ouverture de l'app |
| `lib/notifications.web.ts` | Rappels désactivés dans le navigateur (ils n'y existent pas) |
| `lib/webSetup.web.ts` | Messages d'erreur, confirmations et partage adaptés au navigateur |
| `components/InstallHint.web.tsx` | Carte « Installer Stan & Will sur votre téléphone » |
| `public/` | Icônes, `manifest.json` et page d'accueil qui rendent l'app installable |
| `vercel.json` (racine) | Compilation et hébergement de la version web sur Vercel |

**Serveur (dossier `stanandwill`)**

| Route | Rôle |
|---|---|
| `POST /api/stripe/checkout` | Crée la page de paiement Stripe pour le compte connecté |
| `POST /api/stripe/webhook` | Reçoit la confirmation de Stripe et ouvre (ou referme) le plan |
| `POST /api/stripe/portal` | Ouvre l'espace client Stripe : résilier, changer de carte, factures |

**Base de données** : `supabase/migrations/0006_stripe.sql` ajoute l'identifiant client Stripe et **verrouille le statut
d'abonnement** (avant cette migration, un utilisateur connecté pouvait techniquement se l'attribuer lui-même).

## Mise en service, dans l'ordre

### 1. Base de données (2 min)
Supabase → SQL Editor → coller `supabase/migrations/0006_stripe.sql` → Run.

### 2. Stripe, d'abord en mode test (15 min)
1. Catalogue de produits → créer le produit « Stan & Will — plan de prévention » avec 2 tarifs récurrents en euros.
   Dans chaque tarif, ouvrir « Options supplémentaires » et renseigner la **clé de recherche** (lookup key) :

   | Tarif | Période | Clé de recherche |
   |---|---|---|
   | 69,99 € | annuelle | `sw_annual_6999` |
   | 9,99 € | mensuelle | `sw_monthly_999` |

   Pas d'essai gratuit. Le prix de lancement (49,99 € la première année, jusqu'au 31 décembre 2026) est appliqué par le serveur : ne rien régler dans Stripe.
2. Paramètres → Facturation → **Portail client** : activer, autoriser la résiliation et la mise à jour du moyen de paiement.
3. Développeurs → Webhooks → ajouter un point de terminaison `https://<adresse du site>/api/stripe/webhook` avec ces 4 événements :
   `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`.
   Copier le **secret de signature** (`whsec_…`).
4. Développeurs → Clés API : copier la **clé secrète** (`sk_test_…`).

### 3. Variables du serveur (Vercel → projet du site → Settings → Environment Variables)

| Variable | Valeur |
|---|---|
| `STRIPE_SECRET_KEY` | la clé secrète (`sk_test_…`, puis `sk_live_…`) |
| `STRIPE_WEBHOOK_SECRET` | le secret de signature (`whsec_…`) |
| `APP_WEB_ORIGINS` | l'adresse de l'app web, ex. `https://app.stanandwill.com` |
| `STRIPE_TAX` | `0` pour commencer ; `1` une fois Stripe Tax réglé avec le comptable |

Puis redéployer le site.

### 4. Héberger l'app web (Vercel)
Nouveau projet Vercel pointant sur le dépôt `stanandwill-app` (racine du dépôt : `vercel.json` s'occupe du reste).
Variables à copier depuis `apps/mobile/.env` : `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_API_URL`,
et, si souhaité, `EXPO_PUBLIC_SENTRY_DSN`, `EXPO_PUBLIC_POSTHOG_KEY`, `EXPO_PUBLIC_POSTHOG_HOST`.
Ajouter ensuite le domaine (ex. `app.stanandwill.com`) et le reporter dans `APP_WEB_ORIGINS` (étape 3).

### 5. Tester avant de passer en réel
Avec les clés de test, payer avec la carte `4242 4242 4242 4242` (date future, 3 chiffres quelconques) :
1. Quiz → bilan → écran d'abonnement → l'app demande de créer le compte → paiement Stripe → retour dans l'app, « Plan actif » dans le Carnet.
2. Carnet → Réglages → « Gérer mon abonnement » → résilier → le plan se referme à la fin de la période.
3. Stripe → Développeurs → Webhooks : chaque événement doit afficher une réponse 200.

Passage en réel : refaire les étapes 2 et 3 en mode « production » de Stripe (nouveaux tarifs, nouveau webhook, clés `sk_live_…`).

## Essayer sur le Mac

```bash
cd ~/"Claude projets"/stanandwill-app
npm install --legacy-peer-deps     # une fois : installe la brique web
npm run web                        # ouvre l'app dans le navigateur
```

`npx expo start` (Expo Go sur iPhone) continue de fonctionner comme avant.

## Limites connues de la version web

- **Rappels** : pas de notification à heure fixe. Le récap du dimanche par e-mail prend le relais.
- **Balades GPS** : le suivi s'interrompt si l'écran se verrouille ; le minuteur et la saisie manuelle restent fiables.
- **Carte de balade à partager** : la capture en image n'est pas disponible dans tous les navigateurs.
- **Hors connexion** : l'app a besoin du réseau pour s'ouvrir (pas encore de mise en cache).
- **TVA** : pour des abonnements vendus à des particuliers dans plusieurs pays de l'UE, le paramétrage (Stripe Tax, guichet OSS) est à valider avec le comptable avant le passage en réel.
