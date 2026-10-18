/**
 * « Notre album » — Stan (poil dur, 7 ans) et Will (poil ras, 3 ans), les deux teckels qui ont inspiré l'app.
 * Photos recompressées (1400 px max) et nettoyées de leurs métadonnées EXIF (aucune géolocalisation embarquée).
 * Les mêmes photos servent d'illustrations : accueil, états vides des onglets, écran Copains.
 */
import type { ImageSourcePropType } from "react-native";

export interface AlbumPhoto { id: string; src: ImageSourcePropType; caption: string; who: "stan" | "will" | "both" | "friends"; tall?: boolean }

export const ALBUM: AlbumPhoto[] = [
  { id: "p01", src: require("../assets/album/p01.jpg"), caption: "Devant la porte, prêts pour la balade", who: "both" },
  { id: "p02", src: require("../assets/album/p02.jpg"), caption: "Will et son foulard du dimanche", who: "will" },
  { id: "p03", src: require("../assets/album/p03.jpg"), caption: "Stan attend sa récompense", who: "stan" },
  { id: "p04", src: require("../assets/album/p04.jpg"), caption: "Pause dans les dunes, langues au vent", who: "both", tall: true },
  { id: "p05", src: require("../assets/album/p05.jpg"), caption: "Sieste sur les coussins", who: "both" },
  { id: "p06", src: require("../assets/album/p06.jpg"), caption: "Le regard qui réclame une friandise", who: "both" },
  { id: "p07", src: require("../assets/album/p07.jpg"), caption: "Stan, un œil sur la cuisine", who: "stan" },
  { id: "p08", src: require("../assets/album/p08.jpg"), caption: "Lovés dans le même panier", who: "both" },
  { id: "p09", src: require("../assets/album/p09.jpg"), caption: "Avec leur copine Perle", who: "friends" },
  { id: "p10", src: require("../assets/album/p10.jpg"), caption: "Partie de balle au jardin", who: "both" },
  { id: "p11", src: require("../assets/album/p11.jpg"), caption: "Deux museaux très attentifs", who: "both" },
  { id: "p12", src: require("../assets/album/p12.jpg"), caption: "Will, roulé au coin du feu", who: "will" },
  { id: "p13", src: require("../assets/album/p13.jpg"), caption: "Qui a dit « balade » ?", who: "both" },
  { id: "p14", src: require("../assets/album/p14.jpg"), caption: "Soirée d'hiver devant la cheminée", who: "both" },
  { id: "p15", src: require("../assets/album/p15.jpg"), caption: "Comité d'accueil", who: "both" },
  { id: "p16", src: require("../assets/album/p16.jpg"), caption: "En route ! Chacun son siège", who: "both" },
  { id: "p17", src: require("../assets/album/p17.jpg"), caption: "Câlin du dimanche", who: "both" },
];

export const photo = (id: string) => ALBUM.find((p) => p.id === id)!.src;

/** Illustrations par écran : toujours Stan et Will, présents partout dans l'app. */
export const ILLUSTRATIONS = {
  welcome: photo("p01"),
  baladesEmpty: photo("p04"),
  copains: photo("p09"),
  carnetEmpty: photo("p14"),
  aujourdhui: photo("p13"),
} as const;
