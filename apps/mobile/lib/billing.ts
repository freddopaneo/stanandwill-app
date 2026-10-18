/**
 * Abonnements — RevenueCat (react-native-purchases) avec repli « bac à sable » en développement.
 *
 * Mise en service (étape 3) :
 *   1. npx expo install react-native-purchases          (module natif : nécessite un build EAS, pas Expo Go)
 *   2. .env : EXPO_PUBLIC_REVENUECAT_IOS_KEY / EXPO_PUBLIC_REVENUECAT_ANDROID_KEY (clés publiques SDK)
 *   3. Dans RevenueCat : entitlement `premium` ; produits sw_annual_4999 (essai 7 j), sw_monthly_999, sw_weekly_699 ; offering `default`.
 *   4. Webhook RevenueCat → https://<site>/api/revenuecat (met à jour profiles.subscription_status).
 * Tant que le module n'est pas installé ou la clé absente, les achats sont simulés en développement (SANDBOX) et refusés en production.
 */
import { Platform } from "react-native";
import { API_URL, supabase, supabaseConfigured } from "./supabase";

export type OfferId = "annual" | "monthly" | "weekly";

export const OFFERS: { id: OfferId; title: string; subtitle: string; price: string; badge?: string }[] = [
  { id: "annual", title: "Annuel", subtitle: "7 jours d'essai gratuit · 4,17 €/mois", price: "49,99 €/an", badge: "Le plus choisi" },
  { id: "monthly", title: "Mensuel", subtitle: "Sans engagement", price: "9,99 €/mois" },
  { id: "weekly", title: "Hebdomadaire", subtitle: "Pour un besoin ponctuel", price: "6,99 €/sem." },
];

/** Identifiants produits à créer à l'identique dans App Store Connect, Google Play et RevenueCat. */
export const PRODUCT_IDS: Record<OfferId, string> = { annual: "sw_annual_4999", monthly: "sw_monthly_999", weekly: "sw_weekly_699" };
export const ENTITLEMENT = "premium";

const SANDBOX = __DEV__ || process.env.EXPO_PUBLIC_BILLING_SANDBOX === "1";
const RC_KEY = Platform.OS === "ios" ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY;

let Purchases: any = null;
let configured = false;

/** Charge le SDK natif s'il est installé (import dynamique pour ne pas casser Expo Go). */
async function loadSdk(): Promise<any | null> {
  if (Purchases) return Purchases;
  if (!RC_KEY) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require("react-native-purchases");
    Purchases = mod.default ?? mod;
    return Purchases;
  } catch {
    return null;
  }
}

/** À appeler au démarrage et après connexion : associe l'utilisateur Supabase (pour le webhook). */
export async function configureBilling(): Promise<boolean> {
  const sdk = await loadSdk();
  if (!sdk || configured) return Boolean(sdk);
  sdk.configure({ apiKey: RC_KEY });
  configured = true;
  if (supabaseConfigured) {
    const { data } = await supabase.auth.getSession();
    if (data.session?.user.id) await sdk.logIn(data.session.user.id).catch(() => {});
  }
  return true;
}

/** Prix localisés depuis le store, si disponibles (sinon les valeurs par défaut ci-dessus). */
export async function loadOffers(): Promise<typeof OFFERS> {
  const sdk = await loadSdk();
  if (!sdk) return OFFERS;
  try {
    await configureBilling();
    const offerings = await sdk.getOfferings();
    const pkgs: any[] = offerings.current?.availablePackages ?? [];
    return OFFERS.map((o) => {
      const p = pkgs.find((x) => x.product?.identifier === PRODUCT_IDS[o.id]);
      return p ? { ...o, price: `${p.product.priceString}${o.id === "annual" ? "/an" : o.id === "monthly" ? "/mois" : "/sem."}` } : o;
    });
  } catch { return OFFERS; }
}

export async function hasPremium(): Promise<boolean> {
  const sdk = await loadSdk();
  if (!sdk) return false;
  try {
    await configureBilling();
    const info = await sdk.getCustomerInfo();
    return Boolean(info.entitlements.active[ENTITLEMENT]);
  } catch { return false; }
}

export async function purchase(offer: OfferId): Promise<boolean> {
  const sdk = await loadSdk();
  if (!sdk) {
    if (SANDBOX) { await new Promise((r) => setTimeout(r, 700)); return true; }
    throw new Error("Paiement indisponible : l'app doit être installée depuis l'App Store ou Google Play.");
  }
  await configureBilling();
  const offerings = await sdk.getOfferings();
  const pkg = (offerings.current?.availablePackages ?? []).find((x: any) => x.product?.identifier === PRODUCT_IDS[offer]);
  if (!pkg) throw new Error("Offre introuvable. Réessayez dans un instant.");
  try {
    const { customerInfo } = await sdk.purchasePackage(pkg);
    return Boolean(customerInfo.entitlements.active[ENTITLEMENT]);
  } catch (e: any) {
    if (e?.userCancelled) return false;
    throw e;
  }
}

export async function restore(): Promise<boolean> {
  const sdk = await loadSdk();
  if (!sdk) return false;
  await configureBilling();
  const info = await sdk.restorePurchases();
  return Boolean(info.entitlements.active[ENTITLEMENT]);
}

/** Codes fondateurs : validés côté serveur (route /api/founder). */
export async function redeemFounderCode(code: string): Promise<boolean> {
  if (!code) return false;
  try {
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (supabaseConfigured) {
      const { data } = await supabase.auth.getSession();
      if (data.session?.access_token) headers.authorization = `Bearer ${data.session.access_token}`;
    }
    const r = await fetch(`${API_URL}/api/founder`, { method: "POST", headers, body: JSON.stringify({ code }) });
    if (r.ok) { const j = await r.json(); return Boolean(j.ok); }
  } catch {}
  return SANDBOX && /^TECKEL-\d{4}$/i.test(code);
}
