/**
 * Offres d'abonnement et fonctions communes à tous les canaux de vente :
 *   - iOS / Android : achats intégrés via RevenueCat (lib/billing.ts)
 *   - Web (PWA)     : paiement Stripe (lib/billing.web.ts)
 * Dans les deux cas, le serveur écrit le résultat dans profiles.subscription_status, seule source de vérité.
 */
import { Platform } from "react-native";
import { API_URL, supabase, supabaseConfigured } from "./supabase";

export type OfferId = "annual" | "monthly" | "weekly";

/** Prix de lancement : 49,99 € la première année sur l'annuel (au lieu de 69,99 €), jusqu'au 31 décembre 2026 inclus. Même date que côté serveur (lib/launch.ts du site). */
export const LAUNCH_END = Date.parse("2027-01-01T00:00:00+01:00");
export const launchActive = (now = Date.now()) => now < LAUNCH_END;

export const OFFERS: { id: OfferId; title: string; subtitle: string; price: string; badge?: string }[] = [
  launchActive()
    ? { id: "annual", title: "Annuel", subtitle: "La 1re année, puis 69,99 €/an. Jusqu'au 31 décembre.", price: "49,99 €", badge: "Prix de lancement" }
    : { id: "annual", title: "Annuel", subtitle: "Soit 5,83 €/mois, 42 % d'économie", price: "69,99 €/an", badge: "Le plus choisi" },
  { id: "monthly", title: "Mensuel", subtitle: "Sans engagement", price: "9,99 €/mois" },
];

/** Identifiants produits à créer à l'identique dans App Store Connect, Google Play, RevenueCat et Stripe (« lookup key » du tarif). */
export const PRODUCT_IDS: Record<OfferId, string> = { annual: "sw_annual_6999", monthly: "sw_monthly_999", weekly: "sw_weekly_699" };
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
    // select("*") : la colonne invite_expires_at n'existe qu'après la migration 0007.
    const { data, error } = await supabase.from("profiles").select("*").eq("id", uid).maybeSingle();
    if (error) return null;
    const status = (data?.subscription_status as string | undefined) ?? null;
    // Code d'invitation arrivé à son terme : l'accès offert est fini, comme un abonnement expiré.
    if (status === "founder" && data?.invite_expires_at && Date.parse(data.invite_expires_at) <= Date.now()) return "expired";
    return status;
  } catch { return null; }
}

/**
 * Codes d'invitation (accès offert à des testeurs ou partenaires) : validés côté serveur.
 * La route et le statut gardent leur nom historique « founder » ; rien de visible pour l'utilisateur.
 */
export type InviteResult = { ok: boolean; reason?: "unknown" | "full" | "already_used" | "error"; days?: number };

export async function redeemFounderCode(code: string): Promise<InviteResult> {
  if (!code) return { ok: false, reason: "unknown" };
  const headers = await authHeaders();
  // Sur le web, le code doit être rattaché à un compte : sinon l'accès offert serait perdu au premier changement d'appareil.
  if (Platform.OS === "web" && supabaseConfigured && !headers.authorization) throw new AccountRequiredError();
  try {
    const r = await fetch(`${API_URL}/api/founder`, { method: "POST", headers, body: JSON.stringify({ code }) });
    if (r.status === 401) throw new AccountRequiredError();
    const j = await r.json().catch(() => ({}));
    if (j.ok) return { ok: true, days: j.days };
    if (j.reason === "unknown" || j.reason === "full" || j.reason === "already_used") return { ok: false, reason: j.reason };
    return { ok: false, reason: "error" };
  } catch (e) {
    if (e instanceof AccountRequiredError) throw e;
  }
  return SANDBOX && /^TECKEL-\d{4}$/i.test(code) ? { ok: true } : { ok: false, reason: "error" };
}
