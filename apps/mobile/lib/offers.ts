/**
 * Offres d'abonnement et fonctions communes à tous les canaux de vente :
 *   - iOS / Android : achats intégrés via RevenueCat (lib/billing.ts)
 *   - Web (PWA)     : paiement Stripe (lib/billing.web.ts)
 * Dans les deux cas, le serveur écrit le résultat dans profiles.subscription_status, seule source de vérité.
 */
import { API_URL, supabase, supabaseConfigured } from "./supabase";

export type OfferId = "annual" | "monthly" | "weekly";

export const OFFERS: { id: OfferId; title: string; subtitle: string; price: string; badge?: string }[] = [
  { id: "annual", title: "Annuel", subtitle: "7 jours d'essai gratuit · 4,17 €/mois", price: "49,99 €/an", badge: "Le plus choisi" },
  { id: "monthly", title: "Mensuel", subtitle: "Sans engagement", price: "9,99 €/mois" },
  { id: "weekly", title: "Hebdomadaire", subtitle: "Pour un besoin ponctuel", price: "6,99 €/sem." },
];

/** Identifiants produits à créer à l'identique dans App Store Connect, Google Play, RevenueCat et Stripe (« lookup key » du tarif). */
export const PRODUCT_IDS: Record<OfferId, string> = { annual: "sw_annual_4999", monthly: "sw_monthly_999", weekly: "sw_weekly_699" };
export const ENTITLEMENT = "premium";

/** Statuts de profiles.subscription_status qui ouvrent le plan de prévention. */
export const PREMIUM_STATUSES = ["trial", "active", "founder"];

export const SANDBOX = __DEV__ || process.env.EXPO_PUBLIC_BILLING_SANDBOX === "1";

/** Levée quand un paiement demande d'abord un compte (web : l'abonnement Stripe est rattaché au compte). */
export class AccountRequiredError extends Error {
  constructor() { super("Créez votre compte pour continuer : l'abonnement y est rattaché."); this.name = "AccountRequiredError"; }
}

/** En-têtes d'appel au serveur, avec le jeton du compte s'il existe. */
export async function authHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (supabaseConfigured) {
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) headers.authorization = `Bearer ${data.session.access_token}`;
  }
  return headers;
}

/** Statut d'abonnement enregistré sur le compte (null : pas de compte, ou lecture impossible). */
export async function fetchSubscriptionStatus(): Promise<string | null> {
  if (!supabaseConfigured) return null;
  try {
    const { data: s } = await supabase.auth.getSession();
    const uid = s.session?.user.id;
    if (!uid) return null;
    const { data, error } = await supabase.from("profiles").select("subscription_status").eq("id", uid).maybeSingle();
    if (error) return null;
    return (data?.subscription_status as string | undefined) ?? null;
  } catch { return null; }
}

/** Codes fondateurs : validés côté serveur (route /api/founder). */
export async function redeemFounderCode(code: string): Promise<boolean> {
  if (!code) return false;
  try {
    const r = await fetch(`${API_URL}/api/founder`, { method: "POST", headers: await authHeaders(), body: JSON.stringify({ code }) });
    if (r.ok) { const j = await r.json(); return Boolean(j.ok); }
  } catch {}
  return SANDBOX && /^TECKEL-\d{4}$/i.test(code);
}
