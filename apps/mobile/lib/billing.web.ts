/**
 * Abonnements sur le web (PWA) — Stripe Checkout. Même interface que lib/billing.ts (iOS / Android).
 *
 * Parcours : l'app demande au serveur une page de paiement (POST /api/stripe/checkout), le navigateur part chez Stripe,
 * puis revient sur /paywall?checkout=success. Stripe prévient le serveur (webhook /api/stripe/webhook), qui écrit
 * profiles.subscription_status. L'app ne fait que lire ce statut : aucun secret Stripe ne se trouve ici.
 * Un compte est obligatoire avant de payer, pour rattacher l'abonnement à quelqu'un.
 */
import { API_URL } from "./supabase";
import { AccountRequiredError, OFFERS, PREMIUM_STATUSES, authHeaders, fetchSubscriptionStatus, type OfferId } from "./offers";

export * from "./offers";

export async function configureBilling(): Promise<boolean> {
  return true;
}

/** Les prix affichés sont ceux du cahier des charges ; ils doivent correspondre aux tarifs créés dans Stripe. */
export async function loadOffers(): Promise<typeof OFFERS> {
  return OFFERS;
}

export async function hasPremium(): Promise<boolean> {
  const status = await fetchSubscriptionStatus();
  return status != null && PREMIUM_STATUSES.includes(status);
}

async function call(path: string, body: unknown): Promise<{ status: number; data: any }> {
  const headers = await authHeaders();
  if (!headers.authorization) throw new AccountRequiredError();
  let r: Response;
  try { r = await fetch(`${API_URL}${path}`, { method: "POST", headers, body: JSON.stringify(body) }); }
  catch { throw new Error("Connexion impossible. Vérifiez votre réseau et réessayez."); }
  let data: any = null;
  try { data = await r.json(); } catch {}
  if (r.status === 401) throw new AccountRequiredError();
  return { status: r.status, data };
}

/**
 * Lance le paiement. Retourne true si le compte a déjà un abonnement actif ; sinon le navigateur quitte l'app
 * pour la page Stripe (la fonction retourne false, la suite se joue au retour sur /paywall?checkout=success).
 */
export async function purchase(offer: OfferId): Promise<boolean> {
  const { status, data } = await call("/api/stripe/checkout", { offer, origin: window.location.origin });
  if (data?.already) return true;
  if (status >= 400 || !data?.url) {
    throw new Error(data?.error === "not_configured" ? "Le paiement en ligne n'est pas encore activé." : "Le paiement n'a pas pu démarrer. Réessayez dans un instant.");
  }
  window.location.assign(data.url);
  return false;
}

/** « J'ai déjà un abonnement » : sur le web, il suffit de relire le statut du compte connecté. */
export async function restore(): Promise<boolean> {
  const headers = await authHeaders();
  if (!headers.authorization) throw new AccountRequiredError();
  return hasPremium();
}

/** Après le retour de Stripe : attend que le serveur ait reçu la confirmation (quelques secondes au plus). */
export async function waitForPremium(timeoutMs = 20000): Promise<boolean> {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    if (await hasPremium()) return true;
    await new Promise((r) => setTimeout(r, 1500));
  }
  return false;
}

/** Ouvre l'espace client Stripe (résilier, changer de carte, factures). */
export async function manageSubscription(): Promise<boolean> {
  const { data } = await call("/api/stripe/portal", { origin: window.location.origin });
  if (!data?.url) return false;
  window.location.assign(data.url);
  return true;
}
