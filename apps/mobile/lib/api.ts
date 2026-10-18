/**
 * Appels au serveur (fonctions Next.js du projet `stanandwill`, hébergé sur Netlify) :
 *   POST /api/scan        { type, query | image (base64), dog }   → ScanResult
 *   POST /api/assistant   { question, dog, history }              → AskResult
 * Le serveur porte la clé Claude, applique la minimisation des données (jamais d'identité du maître)
 * et le triage. L'app n'appelle jamais le modèle directement.
 *
 * Tant que le serveur n'est pas déployé (étapes 5 et 6), un secours local répond avec les règles
 * alimentaires d'urgence embarquées, pour que les parcours soient testables.
 */
import * as FileSystem from "expo-file-system/legacy";
import { API_URL, supabase, supabaseConfigured } from "./supabase";
import type { Dog } from "./store";

export type Triage = "none" | "watch" | "consult" | "emergency";

export interface ScanResult {
  triage: Triage;
  title: string;
  summary: string;
  points: string[];
  action?: string;
  source?: string;
}

export interface AskResult {
  triage: Triage;
  answer: string;
  followUp?: string[];
  source?: string;
}

function dogContext(d: Dog) {
  // Minimisation : uniquement ce qui sert la réponse. Pas de nom de maître, pas d'e-mail, pas d'identifiant.
  return { breed_id: d.breed_id, variety: d.variety, size: d.size, sex: d.sex, birth_month: d.birth_month, neutered: d.neutered, weightKg: d.weightKg, silhouette: d.silhouette, conditions: d.conditions, name: d.name };
}
/** Identifiant du chien en base (uuid) — absent tant qu'il n'est que local. */
function dogId(d: Dog) {
  return d.id.startsWith("local-") ? undefined : d.id;
}

export class QuotaError extends Error { constructor() { super("quota"); this.name = "QuotaError"; } }

async function authHeaders() {
  const h: Record<string, string> = { "content-type": "application/json" };
  if (supabaseConfigured) {
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) h.authorization = `Bearer ${data.session.access_token}`;
  }
  return h;
}

async function post<T>(path: string, body: unknown, timeoutMs = 25000): Promise<T | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(`${API_URL}${path}`, { method: "POST", headers: await authHeaders(), body: JSON.stringify(body), signal: ctrl.signal });
    if (r.status === 402) throw new QuotaError();
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch (e) {
    if (e instanceof QuotaError) throw e;
    return null;
  } finally { clearTimeout(t); }
}

// ---------- Secours local : règles alimentaires d'urgence (miroir de supabase/seed.sql) ----------
const EMERGENCY_FOODS: { match: RegExp; name: string; why: string }[] = [
  { match: /chocolat|cacao/i, name: "Chocolat", why: "La théobromine est toxique : vomissements, agitation, troubles cardiaques. Dose dangereuse dès 20 g de chocolat noir pour un teckel de 8 kg." },
  { match: /raisin/i, name: "Raisin (frais ou sec)", why: "Insuffisance rénale aiguë possible, même à faible dose et sans seuil connu." },
  { match: /oignon|échalote|ail\b|poireau/i, name: "Oignon, ail, poireau", why: "Destruction des globules rouges (anémie), effet cumulatif sur plusieurs jours." },
  { match: /xylitol|bouleau|e967/i, name: "Xylitol (édulcorant)", why: "Chute brutale du sucre sanguin en 30 minutes, atteinte du foie. Présent dans chewing-gums, beurres de cacahuète « sans sucre »." },
  { match: /macadamia/i, name: "Noix de macadamia", why: "Faiblesse de l'arrière-train, tremblements, fièvre dans les 12 heures." },
  { match: /os cuit|os de poulet|os de lapin/i, name: "Os cuits", why: "Esquilles : perforation ou occlusion digestive." },
  { match: /alcool|bière|vin\b/i, name: "Alcool", why: "Toxique à très faible dose chez un petit chien." },
  { match: /avocat/i, name: "Avocat", why: "Persine : troubles digestifs ; le noyau provoque des occlusions." },
];

function localFood(query: string, d: Dog): ScanResult {
  const hit = EMERGENCY_FOODS.find((f) => f.match.test(query));
  if (hit) {
    return {
      triage: "emergency",
      title: `${hit.name} : à ne pas donner`,
      summary: hit.why,
      points: [`Si ${d.name} en a déjà avalé : notez la quantité et l'heure.`, "Appelez votre vétérinaire ou un centre antipoison vétérinaire (CAPAE Ouest : 02 40 68 77 40, 24 h/24)."],
      action: "Ne faites pas vomir sans avis vétérinaire.",
      source: "Table des aliments à risque Stan & Will (validée vét.), ASPCA Animal Poison Control.",
    };
  }
  if (/^\d{8,14}$/.test(query)) {
    return {
      triage: "none",
      title: "Produit à identifier",
      summary: "La lecture des fiches produits (Open Pet Food Facts) se fait côté serveur : disponible dès que l'API est déployée (étape 5).",
      points: ["En attendant, tapez le nom du produit ou de l'ingrédient qui vous inquiète."],
    };
  }
  return {
    triage: "none",
    title: query,
    summary: `Rien de connu comme dangereux dans « ${query} » pour un chien. Pour un aliment industriel, nous vérifierons la densité calorique et l'adéquation au poids de ${d.name} dès que l'analyse serveur sera active.`,
    points: ["Règle simple : les friandises ne dépassent pas 10 % des calories de la journée.", "Pour un teckel, chaque kilo compte : préférez les friandises de moins de 3 kcal."],
    source: "FEDIAF, lignes directrices nutritionnelles.",
  };
}

export async function analyzeFood(query: string, dog: Dog): Promise<ScanResult> {
  const r = await post<ScanResult>("/api/scan", { type: "food", query, dog: dogContext(dog), dog_id: dogId(dog) });
  return r ?? localFood(query, dog);
}

export async function analyzePhoto(type: "stool" | "skin" | "eye" | "posture", uri: string, dog: Dog): Promise<ScanResult> {
  let image: string | null = null;
  try { image = await FileSystem.readAsStringAsync(uri, { encoding: "base64" }); } catch {}
  const r = image ? await post<ScanResult>("/api/scan", { type, image, dog: dogContext(dog), dog_id: dogId(dog) }, 45000) : null;
  if (r) return r;
  const labels = { stool: "des selles", skin: "de la peau", eye: "de l'œil", posture: "de la posture" }[type];
  return {
    triage: "none",
    title: `Analyse ${labels} : bientôt`,
    summary: "L'analyse photo passe par notre serveur (étape 5 du développement). Votre photo n'a pas été envoyée.",
    points: ["Si vous observez du sang, un œil fermé, une démarche anormale ou une douleur : n'attendez pas, appelez votre vétérinaire."],
  };
}

export async function ask(question: string, dog: Dog, history: { role: "user" | "assistant"; content: string }[]): Promise<AskResult> {
  const r = await post<AskResult>("/api/assistant", { question, dog: dogContext(dog), dog_id: dogId(dog), history: history.slice(-8) }, 40000);
  if (r) return r;
  const urgent = /sang|paralys|ne tient plus|convuls|respire mal|gonflé|vomit.*(sang|plusieurs)|ne marche plus|traîne.*pattes|hurle/i.test(question);
  if (urgent) {
    return {
      triage: "emergency",
      answer: `Ce que vous décrivez peut être une urgence. Pour un teckel, une faiblesse des pattes arrière, une douleur au dos ou des vomissements répétés justifient un appel immédiat au vétérinaire, même la nuit. Gardez ${dog.name} au calme, portez-le en soutenant l'arrière-train, ne lui donnez rien par la bouche.`,
      followUp: ["Trouver un vétérinaire de garde", "Les 5 signes d'alerte du dos"],
      source: "Protocole d'orientation Stan & Will (validé vét.).",
    };
  }
  return {
    triage: "none",
    answer: "L'assistant répond depuis notre serveur (étape 6 du développement), avec le profil de " + dog.name + " et les sources vétérinaires de sa race. En attendant, les réponses ne sont pas disponibles hors connexion. En cas de doute sur un symptôme, appelez votre vétérinaire.",
  };
}
