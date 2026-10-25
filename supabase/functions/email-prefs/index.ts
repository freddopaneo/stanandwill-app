/**
 * Désinscription du récap du dimanche en un clic (lien signé dans l'e-mail + en-tête List-Unsubscribe).
 * GET  → désabonne puis redirige vers la page de confirmation du site (APP_URL/recap?statut=…) :
 *        les fonctions Supabase ne peuvent pas servir de page HTML (elles sont forcées en texte brut).
 * POST → désabonnement silencieux (clients mail, RFC 8058).
 * Déploiement : npx supabase functions deploy email-prefs --no-verify-jwt
 */
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { verifyUser } from "../_shared/emails.ts";
import { APP_URL } from "../_shared/resend.ts";

Deno.serve(async (req) => {
  const u = new URL(req.url);
  const uid = u.searchParams.get("u") ?? "";
  const token = u.searchParams.get("t") ?? "";
  const secret = Deno.env.get("UNSUBSCRIBE_SECRET") ?? Deno.env.get("CRON_SECRET") ?? "";
  const done = (statut: "ok" | "invalide" | "erreur", status: number) =>
    req.method === "POST"
      ? new Response(null, { status: statut === "ok" ? 204 : status })
      : new Response(null, { status: 303, headers: { Location: `${APP_URL.replace(/\/$/, "")}/recap?statut=${statut}` } });

  if (!uid || !token || !secret || !(await verifyUser(uid, token, secret))) return done("invalide", 400);
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { error } = await admin.from("profiles").update({ recap_opt_in: false }).eq("id", uid);
  if (error) return done("erreur", 500);
  return done("ok", 204);
});
