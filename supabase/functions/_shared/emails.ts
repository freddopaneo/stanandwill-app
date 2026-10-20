/**
 * E-mails Stan & Will — rendu pur (aucune dépendance) : utilisable dans les fonctions Supabase (Deno) et testé avec Vitest.
 * Charte : vert forêt #1E5B45, crème #FBF8F2, miel #F5A623, texte #14291F. Mise en page en tableaux (compatibilité Outlook / Gmail).
 */

export interface RecapWalk { startedAt: string; durationS: number; distanceM: number; stepsEst: number }
export interface RecapWeight { date: string; kg: number }
export interface RecapDogInput { name: string; walks: RecapWalk[]; weights: RecapWeight[] }

export interface RecapDog {
  name: string;
  walks: number;
  minutes: number;
  steps: number;
  km: number;
  /** variation de minutes vs semaine précédente, en % (null si pas de référence) */
  trendPct: number | null;
  activeDays: number;
  bestDay: string | null;
  lastWeight: RecapWeight | null;
  weighDue: boolean;
}

const DAY = 86400000;
const frDay = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { weekday: "long", timeZone: "Europe/Paris" });
const parisKey = (iso: string) => new Date(iso).toLocaleDateString("fr-CA", { timeZone: "Europe/Paris" }); // AAAA-MM-JJ

/** Chiffres de la semaine écoulée (7 jours avant `now`) comparés aux 7 jours précédents. */
export function computeRecap(dog: RecapDogInput, now = new Date()): RecapDog {
  const t = now.getTime();
  const inWin = (w: RecapWalk, from: number, to: number) => { const x = new Date(w.startedAt).getTime(); return x > t - from * DAY && x <= t - to * DAY; };
  const week = dog.walks.filter((w) => inWin(w, 7, 0));
  const prev = dog.walks.filter((w) => inWin(w, 14, 7));
  const minutes = Math.round(week.reduce((a, w) => a + w.durationS, 0) / 60);
  const prevMin = Math.round(prev.reduce((a, w) => a + w.durationS, 0) / 60);
  const byDay = new Map<string, { s: number; iso: string }>();
  for (const w of week) { const k = parisKey(w.startedAt); const c = byDay.get(k) ?? { s: 0, iso: w.startedAt }; c.s += w.durationS; byDay.set(k, c); }
  const best = [...byDay.values()].sort((a, b) => b.s - a.s)[0];
  const weights = [...dog.weights].sort((a, b) => a.date.localeCompare(b.date));
  const lastWeight = weights[weights.length - 1] ?? null;
  return {
    name: dog.name,
    walks: week.length,
    minutes,
    steps: week.reduce((a, w) => a + w.stepsEst, 0),
    km: Math.round(week.reduce((a, w) => a + w.distanceM, 0) / 100) / 10,
    trendPct: prevMin > 0 ? Math.round(((minutes - prevMin) / prevMin) * 100) : null,
    activeDays: byDay.size,
    bestDay: best ? frDay(best.iso) : null,
    lastWeight,
    weighDue: !lastWeight || t - new Date(lastWeight.date).getTime() > 30 * DAY,
  };
}

/** Conseil de saison (mois de `now`, heure de Paris). Conseils généraux, jamais un diagnostic. */
export function seasonTip(now = new Date()): string {
  const m = Number(new Date(now).toLocaleDateString("fr-CA", { timeZone: "Europe/Paris", month: "numeric" }));
  if (m >= 1 && m <= 4) return "Chenilles processionnaires : en balade, éloignez votre chien des pins et des cordons de chenilles. Au moindre contact (langue gonflée, bave), direction le vétérinaire sans attendre.";
  if (m >= 5 && m <= 6) return "Épillets : après chaque balade dans les herbes hautes, inspectez oreilles, entre les doigts et truffe. Un éternuement soudain ou une tête penchée doivent alerter.";
  if (m >= 7 && m <= 8) return "Chaleur : sortez tôt le matin ou tard le soir, testez le bitume avec le dos de la main (7 secondes), et emportez toujours de l'eau.";
  if (m >= 9 && m <= 10) return "Automne : les jours raccourcissent. Un harnais ou un collier lumineux rend votre chien visible au crépuscule, et attention aux champignons ramassés en chemin.";
  return "Froid : les petits gabarits et les poils ras apprécient un manteau. Au retour, essuyez les coussinets (sel de déneigement) et séchez bien le ventre.";
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const nf = (n: number) => n.toLocaleString("fr-FR").replace(/ | /g, " ");

function layout(opts: { preheader: string; title: string; body: string; footer: string }): string {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(opts.title)}</title></head>
<body style="margin:0;padding:0;background:#FBF8F2;font-family:Nunito,Helvetica,Arial,sans-serif;color:#14291F">
<span style="display:none!important;opacity:0;color:transparent;height:0;width:0;overflow:hidden">${esc(opts.preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FBF8F2"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
<tr><td style="background:#1E5B45;border-radius:20px 20px 0 0;padding:22px 28px;color:#FBF8F2;font-size:20px;font-weight:800;letter-spacing:.2px">Stan &amp; Will <span style="font-weight:400;font-size:14px;color:#DCE8D8">· prévention santé par race</span></td></tr>
<tr><td style="background:#FFFFFF;border:1px solid #E6E0D4;border-top:0;border-radius:0 0 20px 20px;padding:28px">${opts.body}</td></tr>
<tr><td style="padding:18px 8px;font-size:12px;line-height:18px;color:#4B5E54;text-align:center">${opts.footer}</td></tr>
</table></td></tr></table></body></html>`;
}

const btn = (label: string, href: string) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0 4px"><tr><td style="background:#F5A623;border-radius:14px"><a href="${esc(href)}" style="display:inline-block;padding:14px 22px;font-weight:800;font-size:16px;color:#14291F;text-decoration:none">${esc(label)}</a></td></tr></table>`;

const LEGAL = "Stan &amp; Will est édité par Eureca Design SRL (Belgique). L'app ne pose pas de diagnostic et ne remplace pas une consultation vétérinaire.";

export interface Rendered { subject: string; html: string; text: string }

export function renderWelcome(dogNames: string[], appUrl: string): Rendered {
  const names = dogNames.length ? dogNames.map(esc).join(" et ") : "votre chien";
  const plain = dogNames.length ? dogNames.join(" et ") : "votre chien";
  const subject = `Bienvenue chez Stan & Will, ${dogNames.length === 1 ? `le carnet de ${plain} est à l'abri` : "vos carnets sont à l'abri"}`;
  const body = `
<h1 style="margin:0 0 12px;font-size:24px;line-height:30px;font-weight:800">Bienvenue&nbsp;!</h1>
<p style="margin:0 0 12px;font-size:16px;line-height:24px">Votre compte est créé : le carnet de ${names} est désormais sauvegardé. Pesées, événements de santé et balades vous suivent si vous changez de téléphone.</p>
<p style="margin:0 0 8px;font-size:16px;line-height:24px;font-weight:700">Trois gestes pour bien démarrer</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="font-size:15px;line-height:22px">
<tr><td style="padding:4px 10px 4px 0;vertical-align:top">⚖️</td><td style="padding:4px 0">Une pesée par mois, toujours sur la même balance : c'est le premier indicateur de santé.</td></tr>
<tr><td style="padding:4px 10px 4px 0;vertical-align:top">🐾</td><td style="padding:4px 0">Lancez le suivi à chaque balade : l'app estime les pas selon la taille de votre chien.</td></tr>
<tr><td style="padding:4px 10px 4px 0;vertical-align:top">🩺</td><td style="padding:4px 0">Apprenez les signes d'alerte propres à sa race, dans l'onglet Carnet → Urgence.</td></tr>
</table>
${btn("Ouvrir l'app", appUrl)}
<p style="margin:16px 0 0;font-size:14px;line-height:21px;color:#4B5E54">Chaque dimanche soir, un court récap de la semaine de ${names}. Vous pouvez l'arrêter en un clic.</p>`;
  const text = `Bienvenue !\n\nVotre compte est créé : le carnet de ${plain} est désormais sauvegardé.\n\nTrois gestes pour bien démarrer :\n- Une pesée par mois, sur la même balance.\n- Lancez le suivi à chaque balade.\n- Apprenez les signes d'alerte de sa race (Carnet → Urgence).\n\nOuvrir l'app : ${appUrl}\n\nStan & Will, édité par Eureca Design SRL (Belgique).`;
  return { subject, html: layout({ preheader: "Votre carnet est sauvegardé. Trois gestes pour bien démarrer.", title: subject, body, footer: LEGAL }), text };
}

export function renderRecap(dogs: RecapDog[], opts: { appUrl: string; unsubscribeUrl: string; now?: Date }): Rendered {
  const tip = seasonTip(opts.now);
  const total = dogs.reduce((a, d) => a + d.walks, 0);
  const lead = dogs[0]?.name ?? "votre chien";
  const subject = total === 0
    ? `La semaine de ${dogs.length > 1 ? "vos chiens" : lead} : on repart lundi ?`
    : dogs.length > 1
      ? `Votre semaine : ${total} balade${total > 1 ? "s" : ""} pour ${dogs.map((d) => d.name).join(" et ")}`
      : `La semaine de ${lead} : ${dogs[0].minutes} min de balade, ≈ ${nf(dogs[0].steps)} pas`;

  const card = (d: RecapDog) => {
    const trend = d.trendPct == null ? "" : d.trendPct >= 0
      ? `<span style="color:#2E7D32;font-weight:700">+${d.trendPct} %</span> vs la semaine d'avant`
      : `<span style="color:#C0392B;font-weight:700">${d.trendPct} %</span> vs la semaine d'avant`;
    const stats = d.walks === 0
      ? `<p style="margin:6px 0 0;font-size:15px;line-height:22px">Pas de balade enregistrée cette semaine. Même 15 minutes par jour comptent : le nez au vent, c'est bon pour le corps et pour la tête.</p>`
      : `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:10px"><tr>
<td style="text-align:center;padding:8px;background:#FBF8F2;border-radius:12px"><div style="font-size:22px;font-weight:800">${d.minutes}</div><div style="font-size:12px;color:#4B5E54">minutes</div></td><td width="8"></td>
<td style="text-align:center;padding:8px;background:#FBF8F2;border-radius:12px"><div style="font-size:22px;font-weight:800">≈ ${nf(d.steps)}</div><div style="font-size:12px;color:#4B5E54">pas estimés</div></td><td width="8"></td>
<td style="text-align:center;padding:8px;background:#FBF8F2;border-radius:12px"><div style="font-size:22px;font-weight:800">${d.activeDays}/7</div><div style="font-size:12px;color:#4B5E54">jours actifs</div></td></tr></table>
<p style="margin:10px 0 0;font-size:14px;line-height:21px;color:#4B5E54">${d.walks} balade${d.walks > 1 ? "s" : ""} · ${String(d.km).replace(".", ",")} km${d.bestDay ? ` · meilleur jour : ${d.bestDay}` : ""}${trend ? ` · ${trend}` : ""}</p>`;
    const weigh = d.weighDue
      ? `<p style="margin:10px 0 0;font-size:14px;line-height:21px">⚖️ ${d.lastWeight ? `Dernière pesée il y a plus d'un mois (${String(d.lastWeight.kg).replace(".", ",")} kg).` : "Aucune pesée enregistrée."} Une pesée cette semaine ?</p>`
      : "";
    return `<div style="border:1px solid #E6E0D4;border-radius:16px;padding:16px;margin:0 0 12px"><div style="font-size:18px;font-weight:800">🐾 ${esc(d.name)}</div>${stats}${weigh}</div>`;
  };

  const body = `
<h1 style="margin:0 0 14px;font-size:22px;line-height:28px;font-weight:800">Votre récap du dimanche</h1>
${dogs.map(card).join("")}
<div style="background:#DCE8D8;border-radius:16px;padding:16px;margin-top:6px"><div style="font-size:13px;font-weight:800;color:#1E5B45;text-transform:uppercase;letter-spacing:.5px">Conseil de saison</div><p style="margin:6px 0 0;font-size:15px;line-height:22px">${esc(tip)}</p></div>
${btn("Voir le carnet", opts.appUrl)}`;

  const text = [
    "Votre récap du dimanche", "",
    ...dogs.map((d) => d.walks === 0
      ? `${d.name} : pas de balade enregistrée cette semaine.`
      : `${d.name} : ${d.walks} balade(s), ${d.minutes} min, ≈ ${nf(d.steps)} pas, ${d.activeDays}/7 jours actifs.${d.weighDue ? " Pensez à une pesée." : ""}`),
    "", `Conseil de saison : ${tip}`, "", `Voir le carnet : ${opts.appUrl}`, "",
    `Ne plus recevoir ce récap : ${opts.unsubscribeUrl}`,
  ].join("\n");

  const footer = `Vous recevez ce récap car vous avez un compte Stan &amp; Will. <a href="${esc(opts.unsubscribeUrl)}" style="color:#1E5B45">Ne plus recevoir le récap du dimanche</a>.<br>${LEGAL}`;
  return { subject, html: layout({ preheader: total ? `${total} balade${total > 1 ? "s" : ""} cette semaine, et le conseil de saison.` : "Le conseil de saison et un petit coup de pouce pour la semaine.", title: subject, body, footer }), text };
}

// ——— Lien de désinscription signé (HMAC-SHA256, aucun identifiant devinable) ———

const enc = new TextEncoder();
const b64url = (buf: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

export async function signUser(userId: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(await crypto.subtle.sign("HMAC", key, enc.encode("unsub:" + userId)));
}

export async function verifyUser(userId: string, token: string, secret: string): Promise<boolean> {
  const expected = await signUser(userId, secret);
  if (expected.length !== token.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ token.charCodeAt(i);
  return diff === 0;
}
