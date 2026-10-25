# Suivi des plantages et statistiques — mise en service

Deux services, tous deux hébergés **dans l'Union européenne**, gratuits au démarrage :

| Service | Rôle | Base RGPD | Sans clé |
|---|---|---|---|
| **Sentry** (région UE, Francfort) | Plantages et erreurs (ex. synchro du Carnet en échec) | Intérêt légitime : sécurité du service. Aucune donnée personnelle envoyée. | Désactivé |
| **PostHog Cloud EU** | Statistiques d'usage anonymes (entonnoir quiz → bilan → abonnement, balades, badges) | **Consentement** : désactivé par défaut, carte « Aidez Stan & Will » sur Aujourd'hui + interrupteur dans Réglages | Désactivé |

## Ce qui est mesuré (liste fermée, `lib/telemetry.ts`)
onboarding_started · quiz_completed (race, nombre de chiens) · paywall_viewed · purchase_completed (offre) · account_created / account_restored · walk_completed (source GPS/minuteur/manuel, tranche de durée) · weight_added · health_event_added (type) · badge_earned (badge) · challenge_completed · plan_item_done · scan_done (mode) · question_asked (niveau de triage) · share_card.

**Jamais** : nom du chien, e-mail, texte des questions, notes, position GPS, photos, enregistrement d'écran, adresse IP (géolocalisation désactivée), profil de personne.

## Mise en service (10 min)
1. **Sentry** : https://sentry.io/signup → choisir la région **EU (Germany)** à la création de l'organisation (nom conseillé : `eureca-design`) → Create Project → plateforme **React Native** → nom `stanandwill-app` → copier le **DSN**.
2. **PostHog** : https://eu.posthog.com/signup (bien **eu.**) → organisation `Eureca Design`, projet `Stan & Will` → Settings → Project → copier la **Project API Key** (`phc_…`).
   - Dans Settings → Project → *IP data capture* : désactiver (« Discard client IP data »).
3. Dans `apps/mobile/.env` sur le Mac, ajouter :
   ```
   EXPO_PUBLIC_SENTRY_DSN=le DSN copié
   EXPO_PUBLIC_POSTHOG_KEY=la clé phc_ copiée
   EXPO_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com
   ```
4. Relancer Expo : `npx expo start -c`.

## Vérifier
- Sentry : Issues → les erreurs apparaissent avec l'environnement `development` (Expo Go) ou `production` (TestFlight).
- PostHog : Activity → après avoir accepté la carte « Aidez Stan & Will », enregistrer une balade → l'événement `walk_completed` apparaît en moins d'une minute.

## À faire avant les stores
- Mentionner Sentry et PostHog (sous-traitants, UE) dans la politique de confidentialité de l'app.
- Fiche App Store « App Privacy » : Diagnostics (crash data) = non lié à l'identité ; Usage Data = non lié à l'identité, uniquement avec consentement.
