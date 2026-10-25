/** Envoi via l'API Resend (https://resend.com/docs/api-reference). Clé lue dans les secrets Supabase : RESEND_API_KEY. */
import type { Rendered } from "./emails.ts";

export const EMAIL_FROM = Deno.env.get("EMAIL_FROM") ?? "Stan & Will <bonjour@mail.stanandwill.com>";
export const EMAIL_REPLY_TO = Deno.env.get("EMAIL_REPLY_TO") ?? undefined;
export const APP_URL = Deno.env.get("APP_URL") ?? "https://stanandwill-dopaneo.vercel.app";

export interface Outgoing { to: string; mail: Rendered; tags?: { name: string; value: string }[]; headers?: Record<string, string> }

const toPayload = (o: Outgoing) => ({
  from: EMAIL_FROM, to: [o.to], subject: o.mail.subject, html: o.mail.html, text: o.mail.text,
  ...(EMAIL_REPLY_TO ? { reply_to: EMAIL_REPLY_TO } : {}), ...(o.tags ? { tags: o.tags } : {}), ...(o.headers ? { headers: o.headers } : {}),
});

async function call(path: string, body: unknown, idempotencyKey?: string) {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) throw new Error("RESEND_API_KEY manquant dans les secrets Supabase");
  const res = await fetch("https://api.resend.com" + path, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}) },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
  return res.json();
}

export const sendOne = (o: Outgoing, idempotencyKey?: string) => call("/emails", toPayload(o), idempotencyKey);

/** Envoi groupé : 100 e-mails maximum par appel (limite Resend). */
export async function sendBatch(list: Outgoing[], idempotencyPrefix: string): Promise<number> {
  let sent = 0;
  for (let i = 0; i < list.length; i += 100) {
    const chunk = list.slice(i, i + 100);
    await call("/emails/batch", chunk.map(toPayload), `${idempotencyPrefix}-${i / 100}`);
    sent += chunk.length;
  }
  return sent;
}
