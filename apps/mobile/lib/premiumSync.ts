/**
 * Aligne le plan affiché sur le statut d'abonnement du compte (profiles.subscription_status, écrit par le serveur).
 * - Statut actif (essai, abonné, fondateur) : le plan s'ouvre, y compris sur un autre appareil ou canal que celui de l'achat.
 * - Statut « expired » : le plan se referme.
 * - Pas de compte, ou statut « none » : on ne touche à rien (un code fondateur saisi sans compte reste valable sur l'appareil).
 */
import { useEffect } from "react";
import { AppState } from "react-native";
import { useStore } from "./store";
import { PREMIUM_STATUSES, fetchSubscriptionStatus } from "./offers";

export function usePremiumSync() {
  const { session, premium, setPremium } = useStore();
  const uid = session?.user.id;
  useEffect(() => {
    if (!uid) return;
    let alive = true;
    const check = async () => {
      const status = await fetchSubscriptionStatus();
      if (!alive || status == null) return;
      if (PREMIUM_STATUSES.includes(status)) { if (!premium) setPremium(true); }
      else if (status === "expired" && premium) setPremium(false);
    };
    check();
    const sub = AppState.addEventListener("change", (st) => { if (st === "active") check(); });
    return () => { alive = false; sub.remove(); };
  }, [uid, premium]); // eslint-disable-line react-hooks/exhaustive-deps
}
