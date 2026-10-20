/**
 * E-mail de bienvenue — appelé par l'app juste après la première connexion (jeton de l'utilisateur).
 * Idempotent : profiles.welcome_sent_at garantit un seul envoi, même si l'app rappelle la fonction.
 * Déploiement : npx supabase functions deploy welcome-email
 */
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { renderWelcome } from "../_shared/emails.ts";
import { sendOne, APP_URL } from "../_shared/resend.ts";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const jwt = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    const { data: u, error: ue } = await admin.auth.getUser(jwt);
    if (ue || !u.user?.email) return json({ error: "non authentifié" }, 401);
    const uid = u.user.id;

    // Verrou : on « réserve » l'envoi (une seule ligne passe de null à maintenant).
    const { data: claimed } = await admin.from("profiles").update({ welcome_sent_at: new Date().toISOString() })
      .eq("id", uid).is("welcome_sent_at", null).select("id");
    if (!claimed?.length) return json({ sent: false, reason: "déjà envoyé" });

    const { data: dogs } = await admin.from("dog_owners").select("dogs(name, archived_at)").eq("user_id", uid);
    const names = (dogs ?? []).map((r: any) => r.dogs).filter((d: any) => d && !d.archived_at).map((d: any) => d.name as string);

    try {
      await sendOne({ to: u.user.email, mail: renderWelcome(names, APP_URL), tags: [{ name: "type", value: "welcome" }] }, `welcome-${uid}`);
    } catch (e) {
      // Échec d'envoi : on libère le verrou pour un nouvel essai à la prochaine connexion.
      await admin.from("profiles").update({ welcome_sent_at: null }).eq("id", uid);
      throw e;
    }
    return json({ sent: true });
  } catch (e) {
    return json({ error: String((e as Error).message ?? e) }, 500);
  }
});
