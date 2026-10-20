/**
 * Désinscription du récap du dimanche en un clic (lien signé dans l'e-mail + en-tête List-Unsubscribe).
 * GET  → page de confirmation (le désabonnement est déjà effectué) ; POST → désabonnement silencieux (RFC 8058).
 * Déploiement : npx supabase functions deploy email-prefs --no-verify-jwt
 */
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { verifyUser } from "../_shared/emails.ts";

const page = (title: string, msg: string) => `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
<body style="margin:0;background:#FBF8F2;font-family:Nunito,Helvetica,Arial,sans-serif;color:#14291F;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:16px">
<div style="max-width:420px;background:#fff;border:1px solid #E6E0D4;border-radius:20px;padding:28px;text-align:center">
<div style="font-size:40px">🐾</div><h1 style="font-size:22px;margin:8px 0">${title}</h1><p style="font-size:16px;line-height:24px;margin:0">${msg}</p></div></body></html>`;

Deno.serve(async (req) => {
  const u = new URL(req.url);
  const uid = u.searchParams.get("u") ?? "";
  const token = u.searchParams.get("t") ?? "";
  const secret = Deno.env.get("UNSUBSCRIBE_SECRET") ?? Deno.env.get("CRON_SECRET") ?? "";
  const html = (s: string, status = 200) => new Response(s, { status, headers: { "Content-Type": "text/html; charset=utf-8" } });

  if (!uid || !token || !secret || !(await verifyUser(uid, token, secret))) {
    return html(page("Lien invalide", "Ce lien de désinscription n'est pas valide. Vous pouvez aussi arrêter le récap depuis l'app : Carnet → Réglages."), 400);
  }
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { error } = await admin.from("profiles").update({ recap_opt_in: false }).eq("id", uid);
  if (error) return html(page("Oups", "La désinscription n'a pas abouti. Réessayez dans un instant."), 500);
  if (req.method === "POST") return new Response(null, { status: 204 });
  return html(page("C'est noté", "Vous ne recevrez plus le récap du dimanche. Vous pouvez le réactiver à tout moment dans l'app : Carnet → Réglages."));
});
