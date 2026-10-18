/** Configuration du quiz d'entrée (13 questions) — cahier des charges v1, section « Parcours d'entrée ». */

export type QuizStep =
  | { id: "breed"; type: "breed" }
  | { id: "name"; type: "text"; min: number; max: number; placeholder: string }
  | { id: "photo"; type: "photo"; optional: true }
  | { id: "sex"; type: "choice"; options: { value: string; label: string }[] }
  | { id: "neutered"; type: "choice"; options: { value: string; label: string }[]; followUp: { when: string; id: "neuterAge"; options: { value: string; label: string }[] } }
  | { id: "birth"; type: "month" }
  | { id: "weight"; type: "weight"; min: number; max: number; step: number; unknownLabel: string }
  | { id: "silhouette"; type: "silhouette"; options: { value: string; label: string }[] }
  | { id: "activity"; type: "choice"; options: { value: string; label: string }[] }
  | { id: "food"; type: "food" }
  | { id: "conditions"; type: "multi"; options: { value: string; label: string }[]; none: string }
  | { id: "insurance"; type: "choice"; options: { value: string; label: string }[] }
  | { id: "worry"; type: "worry" }; // options par race (breeds.worries)

export const quizSteps: QuizStep[] = [
  { id: "breed", type: "breed" },
  { id: "name", type: "text", min: 2, max: 24, placeholder: "Gaston" },
  { id: "photo", type: "photo", optional: true },
  { id: "sex", type: "choice", options: [{ value: "male", label: "Mâle" }, { value: "female", label: "Femelle" }] },
  {
    id: "neutered", type: "choice",
    options: [{ value: "yes", label: "Oui" }, { value: "no", label: "Non" }, { value: "unknown", label: "Je ne sais pas" }],
    followUp: { when: "yes", id: "neuterAge", options: [{ value: "before_12m", label: "Avant ses 12 mois" }, { value: "after_12m", label: "Après ses 12 mois" }, { value: "unknown", label: "Je ne sais plus" }] },
  },
  { id: "birth", type: "month" },
  { id: "weight", type: "weight", min: 1.5, max: 40, step: 0.1, unknownLabel: "Je ne sais pas" },
  {
    id: "silhouette", type: "silhouette",
    options: [{ value: "very_thin", label: "Très mince" }, { value: "thin", label: "Mince" }, { value: "ideal", label: "Idéale" }, { value: "round", label: "Ronde" }, { value: "very_round", label: "Très ronde" }],
  },
  {
    id: "activity", type: "choice",
    options: [{ value: "lt30", label: "Moins de 30 min" }, { value: "30_60", label: "30 min à 1 h" }, { value: "60_120", label: "1 à 2 h" }, { value: "gt120", label: "Plus de 2 h" }],
  },
  { id: "food", type: "food" },
  {
    id: "conditions", type: "multi",
    options: [{ value: "back", label: "Un problème de dos" }, { value: "dental", label: "Un problème de dents" }, { value: "overweight", label: "Du surpoids" }, { value: "skin", label: "Des allergies de peau" }],
    none: "Rien de tout ça",
  },
  { id: "insurance", type: "choice", options: [{ value: "yes", label: "Oui" }, { value: "no", label: "Non" }, { value: "thinking", label: "J'y pense" }] },
  { id: "worry", type: "worry" },
];

/** Titres des questions, avec le prénom injecté quand il est connu. */
export function questionTitle(step: QuizStep, name?: string): string {
  const n = name || "votre chien";
  switch (step.id) {
    case "breed": return "Quelle est sa race ?";
    case "name": return "Comment s'appelle-t-il ?";
    case "photo": return `Une photo de ${n} ?`;
    case "sex": return `${n} est…`;
    case "neutered": return `${n} est-il stérilisé ?`;
    case "birth": return `Sa date de naissance ?`;
    case "weight": return `Son poids aujourd'hui ?`;
    case "silhouette": return `Sa silhouette ressemble à…`;
    case "activity": return `Combien de temps bouge-t-il par jour ?`;
    case "food": return `Que mange ${n} ?`;
    case "conditions": return `A-t-il déjà eu…`;
    case "insurance": return `${n} est-il assuré ?`;
    case "worry": return `Ce qui vous inquiète le plus pour ${n} ?`;
  }
}

export interface QuizAnswers {
  breed_id?: string; variety?: string; size?: string;
  name?: string; photoUri?: string;
  sex?: "male" | "female";
  neutered?: "yes" | "no" | "unknown"; neuterAge?: "before_12m" | "after_12m" | "unknown";
  birthMonth?: string; // YYYY-MM-01
  weightKg?: number | null;
  silhouette?: "very_thin" | "thin" | "ideal" | "round" | "very_round";
  activity?: "lt30" | "30_60" | "60_120" | "gt120";
  foodBarcode?: string; foodLabel?: string;
  conditions?: string[];
  insurance?: "yes" | "no" | "thinking";
  worry?: string;
  /** présent quand on refait le bilan d'un chien existant (mise à jour au lieu d'un ajout) */
  editDogId?: string;
}

export function ageMonthsFrom(birthMonth?: string, now = new Date()): number | null {
  if (!birthMonth) return null;
  const [y, m] = birthMonth.split("-").map(Number);
  return (now.getFullYear() - y) * 12 + (now.getMonth() + 1 - m);
}

/** Payload pour la RPC create_dog. */
export function toCreateDogPayload(a: QuizAnswers) {
  return {
    name: a.name, breed_id: a.breed_id ?? "other", variety: a.variety ?? null, size: a.size ?? null,
    sex: a.sex ?? null, neutered: a.neutered ?? "unknown", neuter_age: a.neuterAge ?? null,
    birth_month: a.birthMonth ?? null, silhouette: a.silhouette ?? null, activity: a.activity ?? null,
    conditions: a.conditions ?? [], insurance: a.insurance ?? null, main_worry: a.worry ?? null,
    weight_kg: a.weightKg != null ? String(a.weightKg) : "",
  };
}
