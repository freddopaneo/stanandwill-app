import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

// Renseigner dans .env : EXPO_PUBLIC_SUPABASE_URL et EXPO_PUBLIC_SUPABASE_ANON_KEY (clé publique « anon », jamais la clé de service).
const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? (Constants.expoConfig?.extra as any)?.supabaseUrl ?? "";
const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? (Constants.expoConfig?.extra as any)?.supabaseAnonKey ?? "";

export const supabaseConfigured = Boolean(url && anon);

export const supabase = createClient(url || "https://placeholder.supabase.co", anon || "placeholder", {
  auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
});

/** URL de l'API serveur (fonctions Next.js : score, scan, assistant). */
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "https://stanandwill.netlify.app";
