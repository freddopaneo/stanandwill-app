/**
 * Suivi technique et statistiques d'usage — conforme RGPD.
 *
 * 1. Sentry (plantages et erreurs) : intérêt légitime (sécurité et bon fonctionnement du service).
 *    Aucune donnée personnelle : pas d'e-mail, pas de nom de chien, pas d'adresse IP (sendDefaultPii: false).
 * 2. PostHog, hébergé dans l'UE (eu.i.posthog.com) : statistiques d'usage ANONYMES, uniquement si le maître
 *    a dit oui (désactivé par défaut). Événements génériques uniquement (quiz terminé, balade enregistrée…),
 *    jamais de contenu saisi (questions posées, notes, noms), jamais de position GPS, pas d'enregistrement d'écran.
 *
 * Sans clé dans .env (EXPO_PUBLIC_SENTRY_DSN, EXPO_PUBLIC_POSTHOG_KEY), tout est silencieusement désactivé.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Sentry from "@sentry/react-native";
import PostHog from "posthog-react-native";

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN ?? "";
const POSTHOG_KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY ?? "";
const POSTHOG_HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com";
const CONSENT_KEY = "sw.analytics.consent.v1";

export type Consent = "yes" | "no" | null;

let posthog: PostHog | null = null;
let consent: Consent = null;
const listeners = new Set<(c: Consent) => void>();

/** Supprime toute trace d'identité d'un événement Sentry avant envoi. */
function scrub<T extends { user?: unknown; request?: unknown; extra?: Record<string, unknown> }>(event: T): T {
  delete event.user;
  delete event.request;
  return event;
}

/** À appeler une fois au démarrage (app/_layout.tsx). */
export async function initTelemetry() {
  if (SENTRY_DSN) {
    Sentry.init({
      dsn: SENTRY_DSN,
      sendDefaultPii: false,
      environment: __DEV__ ? "development" : "production",
      tracesSampleRate: __DEV__ ? 0 : 0.1,
      enableAutoSessionTracking: true,
      beforeSend: (e) => scrub(e),
      beforeBreadcrumb: (b) => (b.category === "console" ? null : b), // pas de journaux console (risque de données saisies)
    });
  }
  try {
    const saved = (await AsyncStorage.getItem(CONSENT_KEY)) as Consent;
    consent = saved === "yes" || saved === "no" ? saved : null;
  } catch { consent = null; }
  if (POSTHOG_KEY) {
    posthog = new PostHog(POSTHOG_KEY, {
      host: POSTHOG_HOST,
      defaultOptIn: false,               // rien n'est envoyé sans accord
      personProfiles: "never",           // aucun profil de personne
      captureAppLifecycleEvents: true,   // ouverture / mise en arrière-plan de l'app
      enableSessionReplay: false,
      disableGeoip: true,
    } as any);
    if (consent === "yes") await posthog.optIn();
    else await posthog.optOut();
  }
  listeners.forEach((l) => l(consent));
}

export const getConsent = () => consent;

export function onConsentChange(l: (c: Consent) => void) {
  listeners.add(l);
  return () => { listeners.delete(l); };
}

/** Enregistre le choix du maître (Réglages ou carte d'accueil). */
export async function setConsent(c: "yes" | "no") {
  consent = c;
  AsyncStorage.setItem(CONSENT_KEY, c).catch(() => {});
  if (posthog) {
    if (c === "yes") await posthog.optIn();
    else { posthog.reset(); await posthog.optOut(); }
  }
  listeners.forEach((l) => l(c));
}

/** Événements mesurés : liste fermée, propriétés génériques uniquement. */
export type EventName =
  | "onboarding_started" | "quiz_completed" | "bilan_viewed" | "paywall_viewed" | "trial_started" | "purchase_completed"
  | "account_created" | "account_restored" | "walk_completed" | "weight_added" | "health_event_added" | "badge_earned"
  | "challenge_completed" | "plan_item_done" | "scan_done" | "question_asked" | "share_card" | "reminder_changed";

export type EventProps = Record<string, string | number | boolean | null>;

export function track(name: EventName, props?: EventProps) {
  if (!posthog || consent !== "yes") return;
  try { posthog.capture(name, props ?? {}); } catch {}
}

/** Erreur attrapée mais utile à connaître (réseau, synchro…). Jamais de données saisies dans `context`. */
export function reportError(err: unknown, context?: Record<string, string | number | boolean>) {
  if (!SENTRY_DSN) return;
  try { Sentry.captureException(err, context ? { tags: context } : undefined); } catch {}
}

/** Tranche de durée (évite d'envoyer des valeurs trop précises). */
export const minutesBucket = (s: number) => {
  const m = Math.round(s / 60);
  return m < 10 ? "<10" : m < 20 ? "10-19" : m < 30 ? "20-29" : m < 45 ? "30-44" : m < 60 ? "45-59" : "60+";
};

export { Sentry };
