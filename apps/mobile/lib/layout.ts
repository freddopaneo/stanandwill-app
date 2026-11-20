import { Platform, useWindowDimensions } from "react-native";

/** Largeur maximale de l'app dans un navigateur d'ordinateur (même valeur que dans public/index.html). */
export const APP_MAX_WIDTH = 480;

/**
 * Largeur réellement occupée par l'app. Sur téléphone : la largeur de l'écran. Dans un navigateur d'ordinateur,
 * l'app reste au format téléphone, centrée : il faut donc dimensionner d'après cette colonne, pas d'après la fenêtre
 * (sinon une photo calculée « pleine largeur » fait 1 400 px de large et on n'en voit qu'un morceau).
 */
export function useAppWidth(): number {
  const { width } = useWindowDimensions();
  return Platform.OS === "web" ? Math.min(width, APP_MAX_WIDTH) : width;
}
