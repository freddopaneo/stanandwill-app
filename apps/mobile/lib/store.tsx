import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Session } from "@supabase/supabase-js";
import { supabase, supabaseConfigured } from "./supabase";
import { computeScore, breedInfo, ageMonthsFrom, type QuizAnswers, type ScoreResult, type BreedProfile, type WalkSummary } from "@stanandwill/core";
import { pushWalkToCloud } from "./sync";

export interface Dog {
  id: string; name: string; breed_id: string; variety?: string | null; size?: string | null; sex?: "male" | "female" | null;
  neutered: "yes" | "no" | "unknown"; neuter_age?: "before_12m" | "after_12m" | "unknown" | null; birth_month?: string | null;
  silhouette?: QuizAnswers["silhouette"] | null; activity?: QuizAnswers["activity"] | null; conditions: string[];
  insurance?: "yes" | "no" | "thinking" | null; main_worry?: string | null; photo_path?: string | null; weightKg?: number | null;
}

export interface WeightEntry { date: string; kg: number }
export interface WaitlistEntry { breedId: string; email: string; sentAt: string; synced: boolean }
export interface HealthEvent { id: string; date: string; kind: "vaccine" | "deworm" | "vet" | "symptom" | "gesture" | "note"; title: string; note?: string }

/** Tout ce qui appartient à un chien : le profil, ses pesées, ses événements. */
export interface DogRecord {
  dog: Dog; weights: WeightEntry[]; events: HealthEvent[];
  /** balades enregistrées (résumés uniquement, jamais la trace GPS) */
  walks?: WalkSummary[];
  /** date ISO de début du plan de prévention (jour 1) */
  planStartedOn?: string;
  /** items du plan réalisés : id → { at, correct? } */
  done?: Record<string, { at: string; correct?: boolean }>;
}

/** Nombre de chiens inclus dans l'abonnement standard (argument commercial : multi-chiens sans surcoût). */
export const DOGS_INCLUDED = 3;

interface Store {
  session: Session | null;
  answers: QuizAnswers;
  setAnswers: (patch: Partial<QuizAnswers>) => void;
  resetAnswers: () => void;
  /** Tous les chiens du foyer, dans l'ordre d'ajout. */
  dogs: DogRecord[];
  /** Le chien actif (celui affiché dans les onglets). */
  dog: Dog | null;
  activeDogId: string | null;
  setActiveDog: (id: string) => void;
  /** Ajoute un chien (fin de quiz) et le rend actif. */
  addDog: (d: Dog) => void;
  /** Remplace le profil du chien actif (refaire le bilan). */
  updateActiveDog: (d: Dog) => void;
  updateDog: (id: string, d: Dog) => void;
  removeDog: (id: string) => void;
  score: ScoreResult | null;
  scoreFor: (id: string) => ScoreResult | null;
  recomputeScore: () => ScoreResult | null;
  premium: boolean;
  setPremium: (v: boolean) => void;
  weights: WeightEntry[];
  addWeight: (kg: number) => void;
  events: HealthEvent[];
  addEvent: (e: Omit<HealthEvent, "id" | "date"> & { date?: string }) => void;
  /** Balades du chien actif */
  walks: WalkSummary[];
  addWalk: (w: WalkSummary) => void;
  removeWalk: (id: string) => void;
  resetAll: () => Promise<void>;
  /** Plan de prévention du chien actif */
  planStartedOn: string | null;
  done: Record<string, { at: string; correct?: boolean }>;
  completeItem: (id: string, opts?: { correct?: boolean; gestureKey?: string | null }) => void;
  /** Heure du rappel quotidien (5–22), null = désactivé */
  notifHour: number | null;
  setNotifHour: (h: number | null) => void;
  waitlist: WaitlistEntry | null;
  setWaitlist: (w: WaitlistEntry | null) => void;
  /** Compatibilité : `setDog(d)` = addDog si nouveau, updateActiveDog sinon ; `setDog(null)` ne fait rien. */
  setDog: (d: Dog | null) => void;
  ready: boolean;
}

const Ctx = createContext<Store | null>(null);
const KEY = "sw.local.v2";
const LEGACY_KEY = "sw.local.v1";

export function breedProfile(breedId?: string): BreedProfile {
  return breedInfo(breedId).profile;
}

export function dogToInput(d: Dog | QuizAnswers, weightKg?: number | null, extra?: { daysSinceWeigh?: number | null; gestures?: string[] }) {
  const isDog = "id" in d;
  const breedId = isDog ? d.breed_id : (d as QuizAnswers).breed_id;
  return {
    breed: breedProfile(breedId),
    variety: d.variety ?? null, size: d.size ?? null, sex: d.sex ?? null,
    ageMonths: ageMonthsFrom(isDog ? (d as Dog).birth_month ?? undefined : (d as QuizAnswers).birthMonth),
    neutered: d.neutered ?? "unknown",
    neuterAge: isDog ? (d as Dog).neuter_age ?? null : (d as QuizAnswers).neuterAge ?? null,
    weightKg: weightKg ?? (isDog ? (d as Dog).weightKg : (d as QuizAnswers).weightKg) ?? null,
    silhouette: d.silhouette ?? null, activity: d.activity ?? null,
    conditions: d.conditions ?? [],
    daysSinceWeigh: extra?.daysSinceWeigh ?? null,
    gestures: extra?.gestures ?? [],
  };
}

/** Pré-remplit le quiz à partir d'un chien existant (refaire le bilan). */
export function answersFromDog(d: Dog): QuizAnswers {
  return {
    editDogId: d.id, breed_id: d.breed_id, variety: d.variety ?? undefined, size: d.size ?? undefined, name: d.name, photoUri: d.photo_path ?? undefined,
    sex: d.sex ?? undefined, neutered: d.neutered, neuterAge: d.neuter_age ?? undefined, birthMonth: d.birth_month ?? undefined,
    weightKg: d.weightKg ?? null, silhouette: d.silhouette ?? undefined, activity: d.activity ?? undefined,
    conditions: d.conditions, insurance: d.insurance ?? undefined, worry: d.main_worry ?? undefined,
  };
}

function scoreOf(r: DogRecord): ScoreResult {
  const last = r.weights[r.weights.length - 1];
  const daysSinceWeigh = last ? Math.floor((Date.now() - new Date(last.date).getTime()) / 86400000) : null;
  const gestures = Array.from(new Set(r.events.filter((e) => e.kind === "gesture").map((e) => e.title)));
  return computeScore(dogToInput(r.dog, last?.kg ?? null, { daysSinceWeigh, gestures }));
}

interface Saved { answers: QuizAnswers; dogs: DogRecord[]; activeDogId: string | null; premium: boolean; waitlist: WaitlistEntry | null; notifHour?: number | null }

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [answers, setA] = useState<QuizAnswers>({});
  const [dogs, setDogs] = useState<DogRecord[]>([]);
  const [activeDogId, setActiveId] = useState<string | null>(null);
  const [premium, setPremiumState] = useState(false);
  const [waitlist, setWaitlistState] = useState<WaitlistEntry | null>(null);
  const [notifHour, setNotifHourState] = useState<number | null>(8);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        let raw = await AsyncStorage.getItem(KEY);
        if (!raw) {
          // Migration depuis la version mono-chien
          const legacy = await AsyncStorage.getItem(LEGACY_KEY);
          if (legacy) {
            const l = JSON.parse(legacy);
            const migrated: Saved = {
              answers: l.answers ?? {}, premium: Boolean(l.premium), waitlist: l.waitlist ?? null,
              dogs: l.dog ? [{ dog: l.dog, weights: l.weights ?? [], events: l.events ?? [] }] : [],
              activeDogId: l.dog?.id ?? null,
            };
            raw = JSON.stringify(migrated);
            await AsyncStorage.setItem(KEY, raw);
            await AsyncStorage.removeItem(LEGACY_KEY).catch(() => {});
          }
        }
        if (raw) {
          const saved: Saved = JSON.parse(raw);
          setA(saved.answers ?? {}); setDogs(saved.dogs ?? []); setActiveId(saved.activeDogId ?? saved.dogs?.[0]?.dog.id ?? null);
          setPremiumState(Boolean(saved.premium)); setWaitlistState(saved.waitlist ?? null);
          if (saved.notifHour !== undefined) setNotifHourState(saved.notifHour);
        }
      } catch {}
      if (supabaseConfigured) {
        const { data } = await supabase.auth.getSession();
        setSession(data.session);
        supabase.auth.onAuthStateChange((_e, s) => setSession(s));
      }
      setReady(true);
    })();
  }, []);

  const persist = (next: Partial<Saved>) => {
    const payload: Saved = {
      answers: next.answers ?? answers, dogs: next.dogs ?? dogs, activeDogId: next.activeDogId === undefined ? activeDogId : next.activeDogId,
      premium: next.premium ?? premium, waitlist: next.waitlist === undefined ? waitlist : next.waitlist,
      notifHour: next.notifHour === undefined ? notifHour : next.notifHour,
    };
    AsyncStorage.setItem(KEY, JSON.stringify(payload)).catch(() => {});
  };

  const active = dogs.find((r) => r.dog.id === activeDogId) ?? dogs[0] ?? null;
  const score = useMemo(() => (active ? scoreOf(active) : null), [active]);

  const updateRecord = (id: string, fn: (r: DogRecord) => DogRecord) => {
    const next = dogs.map((r) => (r.dog.id === id ? fn(r) : r));
    setDogs(next); persist({ dogs: next });
  };

  const value = useMemo<Store>(() => ({
    session, answers, dogs, premium, ready, waitlist, score,
    dog: active?.dog ?? null,
    activeDogId: active?.dog.id ?? null,
    weights: active?.weights ?? [],
    events: active?.events ?? [],
    walks: active?.walks ?? [],
    planStartedOn: active?.planStartedOn ?? null,
    done: active?.done ?? {},
    notifHour,
    setNotifHour: (h) => { setNotifHourState(h); persist({ notifHour: h }); },
    completeItem: (id, opts) => {
      if (!active) return;
      updateRecord(active.dog.id, (r) => {
        const done = { ...(r.done ?? {}), [id]: { at: new Date().toISOString(), correct: opts?.correct } };
        const events = opts?.gestureKey && !r.events.some((e) => e.kind === "gesture" && e.title === opts.gestureKey)
          ? [...r.events, { id: "ev-" + Date.now(), date: new Date().toISOString(), kind: "gesture" as const, title: opts.gestureKey }]
          : r.events;
        return { ...r, done, events, planStartedOn: r.planStartedOn ?? new Date().toISOString() };
      });
    },
    setWaitlist: (w) => { setWaitlistState(w); persist({ waitlist: w }); },
    setAnswers: (patch) => setA((prev) => { const n = { ...prev, ...patch }; persist({ answers: n }); return n; }),
    resetAnswers: () => { setA({}); persist({ answers: {} }); },
    setActiveDog: (id) => { if (dogs.some((r) => r.dog.id === id)) { setActiveId(id); persist({ activeDogId: id }); } },
    addDog: (d) => {
      const rec: DogRecord = { dog: d, weights: d.weightKg != null ? [{ date: new Date().toISOString(), kg: d.weightKg }] : [], events: [], planStartedOn: new Date().toISOString(), done: {} };
      const next = [...dogs, rec];
      setDogs(next); setActiveId(d.id); setA({}); persist({ dogs: next, activeDogId: d.id, answers: {} });
    },
    updateActiveDog: (d) => { if (active) updateRecord(active.dog.id, (r) => ({ ...r, dog: { ...d, id: r.dog.id } })); },
    updateDog: (id, d) => {
      const next = dogs.map((r) => (r.dog.id === id ? { ...r, dog: { ...d, id } } : r));
      setDogs(next); setActiveId(id); setA({}); persist({ dogs: next, activeDogId: id, answers: {} });
    },
    removeDog: (id) => {
      const next = dogs.filter((r) => r.dog.id !== id);
      const nextActive = activeDogId === id ? next[0]?.dog.id ?? null : activeDogId;
      setDogs(next); setActiveId(nextActive); persist({ dogs: next, activeDogId: nextActive });
    },
    setDog: (d) => {
      if (!d) return;
      const exists = dogs.some((r) => r.dog.id === d.id);
      if (exists) updateRecord(d.id, (r) => ({ ...r, dog: d }));
      else {
        const rec: DogRecord = { dog: d, weights: d.weightKg != null ? [{ date: new Date().toISOString(), kg: d.weightKg }] : [], events: [], planStartedOn: new Date().toISOString(), done: {} };
        const next = [...dogs, rec]; setDogs(next); setActiveId(d.id); persist({ dogs: next, activeDogId: d.id });
      }
    },
    scoreFor: (id) => { const r = dogs.find((x) => x.dog.id === id); return r ? scoreOf(r) : null; },
    recomputeScore: () => (active ? scoreOf(active) : null),
    setPremium: (v) => { setPremiumState(v); persist({ premium: v }); },
    addWeight: (kg) => { if (active) updateRecord(active.dog.id, (r) => ({ ...r, dog: { ...r.dog, weightKg: kg }, weights: [...r.weights, { date: new Date().toISOString(), kg }] })); },
    addWalk: (w) => {
      if (!active) return;
      updateRecord(active.dog.id, (r) => ({ ...r, walks: [...(r.walks ?? []), w].slice(-400) }));
      if (session && !active.dog.id.startsWith("local-")) pushWalkToCloud(active.dog.id, w).catch(() => {});
    },
    removeWalk: (id) => { if (active) updateRecord(active.dog.id, (r) => ({ ...r, walks: (r.walks ?? []).filter((w) => w.id !== id) })); },
    addEvent: (e) => { if (active) updateRecord(active.dog.id, (r) => ({ ...r, events: [...r.events, { ...e, id: "ev-" + Date.now(), date: e.date ?? new Date().toISOString() }] })); },
    resetAll: async () => {
      await AsyncStorage.multiRemove([KEY, LEGACY_KEY]).catch(() => {});
      setA({}); setDogs([]); setActiveId(null); setPremiumState(false); setWaitlistState(null); setNotifHourState(8);
    },
  }), [session, answers, dogs, active, score, premium, ready, waitlist, activeDogId, notifHour]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useStore = () => {
  const s = useContext(Ctx);
  if (!s) throw new Error("StoreProvider manquant");
  return s;
};
