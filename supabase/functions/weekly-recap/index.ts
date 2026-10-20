/**
 * Récap du dimanche — appelé chaque dimanche à 18 h (heure de Paris) par pg_cron (voir docs/EMAILS.md).
 * Protégé par un secret partagé : en-tête « Authorization: Bearer <CRON_SECRET> ».
 * Ne s'adresse qu'aux maîtres ayant au moins un chien, sans demande de suppression, et abonnés au récap.
 * Déploiement : npx supabase functions deploy weekly-recap --no-verify-jwt
 */
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { computeRecap, renderRecap, signUser } from "../_shared/emails.ts";
import { sendBatch, APP_URL, type Outgoing } from "../_shared/resend.ts";

Deno.serve(async (req) => {
  const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { "Content-Type": "application/json" } });
  const secret = Deno.env.get("CRON_SECRET");
  if (!secret || req.headers.get("Authorization") !== `Bearer ${secret}`) return json({ error: "interdit" }, 403);

  // Test : { "only": "adresse@exemple.fr" } n'envoie qu'à ce compte.
  const body = await req.json().catch(() => ({}));
  const only: string | undefined = body?.only;

  const url = Deno.env.get("SUPABASE_URL")!;
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const unsubSecret = Deno.env.get("UNSUBSCRIBE_SECRET") ?? secret;
  const now = new Date();
  const since = new Date(now.getTime() - 14 * 86400000).toISOString();
  const weekKey = now.toISOString().slice(0, 10);

  const { data: profiles, error } = await admin.from("profiles").select("id")
    .eq("recap_opt_in", true).is("deletion_requested_at", null);
  if (error) return json({ error: error.message }, 500);

  const out: Outgoing[] = [];
  const sentIds: string[] = [];
  let skipped = 0;
  for (const p of profiles ?? []) {
    const { data: links } = await admin.from("dog_owners").select("dog_id").eq("user_id", p.id);
    const ids = (links ?? []).map((l: any) => l.dog_id);
    if (!ids.length) { skipped++; continue; }
    const { data: dogs } = await admin.from("dogs").select("id, name").in("id", ids).is("archived_at", null).order("created_at");
    if (!dogs?.length) { skipped++; continue; }
    const { data: user } = await admin.auth.admin.getUserById(p.id);
    const email = user?.user?.email;
    if (!email || (only && email.toLowerCase() !== only.toLowerCase())) { skipped++; continue; }

    const recaps = [];
    for (const d of dogs) {
      const [{ data: walks }, { data: weights }] = await Promise.all([
        admin.from("walks").select("started_at, duration_s, distance_m, steps_est").eq("dog_id", d.id).gte("started_at", since),
        admin.from("weights").select("kg, measured_at, measured_ts").eq("dog_id", d.id).order("measured_at", { ascending: false }).limit(1),
      ]);
      recaps.push(computeRecap({
        name: d.name,
        walks: (walks ?? []).map((w: any) => ({ startedAt: w.started_at, durationS: w.duration_s, distanceM: w.distance_m, stepsEst: w.steps_est })),
        weights: (weights ?? []).map((w: any) => ({ date: w.measured_ts ?? `${w.measured_at}T12:00:00Z`, kg: Number(w.kg) })),
      }, now));
    }
    sentIds.push(p.id);
    const token = await signUser(p.id, unsubSecret);
    const unsubscribeUrl = `${url}/functions/v1/email-prefs?u=${p.id}&t=${token}`;
    out.push({
      to: email,
      mail: renderRecap(recaps, { appUrl: APP_URL, unsubscribeUrl, now }),
      tags: [{ name: "type", value: "weekly_recap" }],
      // Désinscription en un clic (Gmail / Yahoo 2024) : https://datatracker.ietf.org/doc/html/rfc8058
      headers: { "List-Unsubscribe": `<${unsubscribeUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
    });
  }

  try {
    const sent = await sendBatch(out, `recap-${weekKey}${only ? "-test" : ""}`);
    if (!only && sent) await admin.from("profiles").update({ last_recap_at: now.toISOString() }).in("id", sentIds);
    return json({ sent, skipped });
  } catch (e) {
    return json({ error: String((e as Error).message ?? e), prepared: out.length }, 500);
  }
});
