/** Palette « Forêt et miel » et styles partagés. */
export const colors = {
  foret: "#1E5B45",
  foretFonce: "#14291F",
  sauge: "#A7C4A0",
  saugeClair: "#DCE8D8",
  miel: "#F2B544",
  mielFonce: "#D99A1F",
  creme: "#FBF8F2",
  blanc: "#FFFFFF",
  texte: "#14291F",
  texteDoux: "#4B5E54",
  ligne: "#E6E0D4",
  bon: "#2E7D32",
  vigilance: "#F2B544",
  urgence: "#C0392B",
};

export const fonts = {
  regular: "Nunito_400Regular",
  bold: "Nunito_700Bold",
  black: "Nunito_800ExtraBold",
};

export const radius = { sm: 10, md: 14, lg: 20, xl: 24 };
export const space = (n: number) => n * 4;

export const triageColor = (t: "none" | "watch" | "consult" | "emergency") =>
  t === "emergency" ? colors.urgence : t === "consult" ? colors.urgence : t === "watch" ? colors.vigilance : colors.bon;
