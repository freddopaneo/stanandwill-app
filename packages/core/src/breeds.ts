/**
 * Catalogue des races (v1) — partagé app / serveur.
 * `status`:
 *   full    = contenu complet relu par le vétérinaire référent (plan, score affiné, leçons)
 *   coming  = race annoncée : bilan court + liste d'attente (non utilisé au lancement : les 5 races fragiles sont `full`)
 *   generic = bilan générique (poids, dents), pas de promesse de contenu dédié
 * Les chiffres cités dans `headline` sont ceux des sources listées ; ils sont relus par le vétérinaire avant publication.
 */
import type { BreedProfile } from "./score";

export type BreedStatus = "full" | "coming" | "generic";

export interface BreedInfo {
  id: string;
  label: string;
  status: BreedStatus;
  /** mois d'arrivée du contenu complet, pour les races `coming` */
  eta?: string;
  /** inquiétudes proposées à la dernière question du quiz */
  worries: { id: string; label: string }[];
  /** première fragilité connue de la race : titre + 2 phrases + geste + source (secours local, avant le serveur) */
  headline?: { badge: string; title: string; body: string; gesture: string; source: string };
  profile: BreedProfile;
}

const W = {
  weight: { id: "weight", label: "Son poids" },
  food: { id: "food", label: "Ce qu'il mange" },
  teeth: { id: "teeth", label: "Ses dents" },
  other: { id: "other", label: "Autre chose" },
};

export const BREEDS: BreedInfo[] = [
  {
    id: "dachshund", label: "Teckel", status: "full",
    worries: [{ id: "back", label: "Son dos" }, W.weight, W.food, W.teeth, W.other],
    profile: {
      id: "dachshund", baseScore: 70,
      riskWindow: { fromMonths: 48, toMonths: 96, penalty: 12 }, outOfWindowPenalty: 4,
      varietyModifiers: { smooth: -4, long: -2, wire: 0 },
      weightRef: { mini: { male: [4, 5.5], female: [3.5, 5] }, standard: { male: [8, 12], female: [7, 11] } },
    },
  },
  {
    id: "french_bulldog", label: "Bouledogue français", status: "full",
    worries: [{ id: "breath", label: "Sa respiration" }, W.weight, { id: "skin", label: "Sa peau" }, W.food, W.other],
    headline: {
      badge: "Respiration",
      title: "{n} respire par un museau qui ne lui laisse pas de marge",
      body: "Le bouledogue français présente un risque accru sur 20 des 43 troubles étudiés par VetCompass, et 42 fois plus de narines étroites que les autres chiens. Chaleur, effort et surpoids sont les trois facteurs qui transforment un ronflement en détresse respiratoire.",
      gesture: "Cette semaine : filmez {n} 20 secondes au repos, à la fraîche. Vous aurez une référence de son souffle normal pour comparer un jour de canicule.",
      source: "O'Neill et al. 2021, VetCompass (Royal Veterinary College).",
    },
    profile: { id: "french_bulldog", baseScore: 70, riskWindow: null, weightRef: { standard: { male: [9, 14], female: [8, 13] } } },
  },
  {
    id: "chihuahua", label: "Chihuahua", status: "full",
    worries: [W.teeth, W.weight, { id: "knees", label: "Ses rotules" }, W.food, W.other],
    headline: {
      badge: "Dents",
      title: "La bouche de {n} est trop petite pour ses dents",
      body: "Chez le chihuahua, la maladie dentaire touche 13,5 % des chiens vus en consultation, les dents de lait persistantes 5,7 %, et la luxation de rotule 4 %. Les dents se perdent sans bruit ; l'haleine est le premier signal.",
      gesture: "Cette semaine : soulevez la babine de {n} côté molaires et prenez une photo. Dans trois mois, on compare.",
      source: "O'Neill et al. 2020, VetCompass, 11 647 chihuahuas.",
    },
    profile: { id: "chihuahua", baseScore: 72, riskWindow: null, weightRef: { standard: { male: [1.5, 3], female: [1.5, 3] } } },
  },
  {
    id: "pomeranian", label: "Spitz nain", status: "full",
    worries: [{ id: "trachea", label: "Sa trachée (toux)" }, W.weight, W.teeth, W.food, W.other],
    headline: {
      badge: "Trachée",
      title: "La toux « de canard » de {n} n'est pas un rhume",
      body: "Le spitz nain est l'une des races les plus exposées au collapsus trachéal, une trachée qui s'aplatit à l'effort ou à l'excitation. Le collier qui tire et le surpoids l'aggravent ; le harnais et le poids de forme le freinent.",
      gesture: "Cette semaine : remplacez le collier par un harnais en Y pour toutes les sorties de {n}.",
      source: "Tappin 2016, Journal of Small Animal Practice ; recommandations ACVIM.",
    },
    profile: { id: "pomeranian", baseScore: 72, riskWindow: null, weightRef: { standard: { male: [1.8, 3.5], female: [1.8, 3.5] } } },
  },
  {
    id: "cavalier", label: "Cavalier King Charles", status: "full",
    worries: [{ id: "heart", label: "Son cœur" }, W.weight, { id: "ears", label: "Ses oreilles" }, W.food, W.other],
    headline: {
      badge: "Cœur",
      title: "Le cœur de {n} mérite une écoute par an dès ses 3 ans",
      body: "La maladie de la valve mitrale touche un cavalier sur deux à 5 ans et presque tous à 10 ans. Détectée tôt par un souffle à l'auscultation, elle se suit et se traite ; détectée tard, elle fatigue le cœur.",
      gesture: "Cette semaine : comptez la respiration de {n} endormi pendant une minute. Moins de 30 par minute est la norme ; notez le chiffre dans le carnet.",
      source: "Cavalier Health / ACVIM consensus 2019 (Keene et al.).",
    },
    profile: { id: "cavalier", baseScore: 70, riskWindow: { fromMonths: 60, toMonths: 144, penalty: 8 }, outOfWindowPenalty: 2, weightRef: { standard: { male: [5.5, 8], female: [5.5, 8] } } },
  },
  { id: "shih_tzu", label: "Shih tzu", status: "generic", worries: [{ id: "eyes", label: "Ses yeux" }, W.teeth, { id: "skin", label: "Sa peau" }, W.food, W.other], profile: { id: "shih_tzu", baseScore: 72, riskWindow: null, weightRef: { standard: { male: [4, 7.5], female: [4, 7.5] } } } },
  { id: "labrador", label: "Labrador", status: "generic", worries: [W.weight, { id: "joints", label: "Ses articulations" }, { id: "ears", label: "Ses oreilles" }, W.food, W.other], profile: { id: "labrador", baseScore: 72, riskWindow: null, weightRef: { standard: { male: [29, 36], female: [25, 32] } } } },
  { id: "golden", label: "Golden retriever", status: "generic", worries: [W.weight, { id: "joints", label: "Ses articulations" }, { id: "skin", label: "Sa peau" }, W.food, W.other], profile: { id: "golden", baseScore: 72, riskWindow: null, weightRef: { standard: { male: [30, 34], female: [25, 32] } } } },
  { id: "yorkshire", label: "Yorkshire", status: "generic", worries: [W.teeth, W.weight, { id: "trachea", label: "Sa trachée (toux)" }, W.food, W.other], profile: { id: "yorkshire", baseScore: 72, riskWindow: null, weightRef: { standard: { male: [2, 3.5], female: [2, 3.5] } } } },
  { id: "other", label: "Croisé ou autre race", status: "generic", worries: [W.weight, W.teeth, W.food, { id: "joints", label: "Ses articulations" }, W.other], profile: { id: "other", baseScore: 72, riskWindow: null } },
];

/** Les cinq races « fragiles » mises en avant (ordre de lancement). */
export const FRAGILE_BREEDS = BREEDS.filter((b) => b.status !== "generic");
export const OTHER_BREEDS = BREEDS.filter((b) => b.status === "generic");

export function breedInfo(id?: string | null): BreedInfo {
  return BREEDS.find((b) => b.id === id) ?? BREEDS[BREEDS.length - 1];
}

export function breedLabel(id?: string | null): string {
  return breedInfo(id).label;
}
