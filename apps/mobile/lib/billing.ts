/**
 * Abonnements iOS / Android — RevenueCat (react-native-purchases) avec repli « bac à sable » en développement.
 * La version web (PWA) passe par Stripe : voir lib/billing.web.ts.
 *
 * Mise en service (étape 3) :
 *   1. npx expo install react-native-purchases          (module natif : nécessite un build EAS, pas Expo Go)
 *   2. .env : EXPO_PUBLIC_REVENUECAT_IOS_KEY / EXPO_PUBLIC_REVENUECAT_ANDROID_KEY (clés publiques SDK)
 *   3. Dans RevenueCat : entitlement `premium` ; produits sw_annual_4999 (essai gratuit de 2 mois, à régler dans chaque store), sw_monthly_999, sw_weekly_699 ; offering `default`.
 *   4. Webhook RevenueCat → https://<site>/api/revenuecat (met à jour profiles.subscription_status).
 * Tant que le module n'est pas installé ou la clé absente, les achats sont simulés en développement (SANDBOX) et refusés en production.
 */
import { Linking, Platform } from "react-native";
import { supabase, supabaseConfigured } from "./supabase";
import { ENTITLEMENT, OFFERS, PRODUCT_IDS, SANDBOX, type OfferId } from "./offers";

// Offres, identifiants produits et codes fondateurs : communs à l'app et au web (lib/offers.ts).
export * from "./offers";

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

/** Ouvre la page de gestion des abonnements du store (résilier, changer d'offre). */
export async function manageSubscription(): Promise<boolean> {
  const url = Platform.OS === "ios" ? "https://apps.apple.com/account/subscriptions" : "https://play.google.com/store/account/subscriptions";
  try { await Linking.openURL(url); return true; } catch { return false; }
}

/** Web uniquement (retour de Stripe). Sur iOS / Android, l'achat est confirmé immédiatement par le store. */
export async function waitForPremium(_timeoutMs = 0): Promise<boolean> {
  return hasPremium();
}
