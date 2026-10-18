/**
 * Contenu local du bilan (v1) : les 3 points de vigilance affichés après le quiz.
 * Les textes définitifs viennent de la table `breed_risks` / `lessons` (validés par le vétérinaire référent) ;
 * cette version embarquée sert de secours hors ligne et de première expérience avant tout compte.
 */
import { breedInfo, type ScoreResult } from "@stanandwill/core";
import type { Dog } from "./store";

export interface BilanPoint {
  key: string;
  badge: string;
  tone: "sauge" | "miel" | "bon" | "vigilance" | "urgence";
  title: string;
  body: string;
  gesture: string;
  source: string;
}

function has(score: ScoreResult, key: string) {
  return score.components.some((c) => c.key === key);
}
function delta(score: ScoreResult, key: string) {
  return score.components.find((c) => c.key === key)?.delta ?? 0;
}

export function bilanPoints(dog: Dog, score: ScoreResult): BilanPoint[] {
  const n = dog.name;
  const pts: BilanPoint[] = [];
  const isDachs = dog.breed_id === "dachshund";
  const inWindow = has(score, "age_window");
  const weightDelta = delta(score, "weight");
  const postEpisode = score.mode === "post_episode";

  // 1) Le dos (teckel) — toujours en premier pour la race
  if (isDachs) {
    if (postEpisode) {
      pts.push({
        key: "back_post",
        badge: "Suivi après un épisode",
        tone: "vigilance",
        title: `Le dos de ${n} : on surveille la récidive`,
        body: `${n} a déjà eu un problème de dos. Environ un teckel sur cinq refait un épisode dans les deux ans. Les signes qui comptent : refus de monter, dos voûté, cris au portage, démarche hésitante de l'arrière-train.`,
        gesture: `Cette semaine : filmez ${n} de dos en train de marcher 20 secondes sur sol plat. Vous aurez une référence pour comparer au moindre doute.`,
        source: "Dachshund IVDD UK, cohorte 2 000 teckels ; Packer et al. 2016.",
      });
    } else if (inWindow) {
      pts.push({
        key: "back_window",
        badge: "Fenêtre d'âge à risque",
        tone: "vigilance",
        title: `${n} est dans les années où le dos lâche le plus souvent`,
        body: `Entre 4 et 8 ans, les disques du teckel sont au maximum de leur fragilité : près d'un teckel sur quatre connaît un épisode de hernie discale au cours de sa vie, et c'est à cet âge qu'il survient le plus. Les 5 signes à connaître par cœur : dos voûté, refus de sauter ou de monter, cris quand on le porte, démarche ivre de l'arrière, tremblements au repos.`,
        gesture: `Cette semaine : installez une rampe ou un marchepied devant le canapé ou le lit, l'endroit d'où ${n} saute le plus. Les sauts vers le bas sont le geste le plus souvent cité par les vétérinaires.`,
        source: "Dachshund IVDD UK ; Packer et al. 2016 (Canine Genetics and Epidemiology).",
      });
    } else {
      pts.push({
        key: "back_prep",
        badge: "Prévention",
        tone: "sauge",
        title: `Le dos de ${n} : préparer les années 4 à 8`,
        body: `${n} n'est pas (ou plus) dans la fenêtre d'âge la plus à risque, mais le teckel reste la race la plus touchée par la hernie discale. Ce qui se joue maintenant : poids de forme, musculature du dos, habitudes de saut.`,
        gesture: `Cette semaine : 10 minutes de marche en montée douce, trois fois. C'est le meilleur exercice de gainage naturel pour un teckel.`,
        source: "Dachshund IVDD UK ; recommandations Dachshund Breed Council.",
      });
    }
  } else {
    const info = breedInfo(dog.breed_id);
    if (info.headline) {
      // Race « fragile » annoncée : la première fragilité connue, en attendant le plan complet
      const h = info.headline;
      const fill = (t: string) => t.replace(/\{n\}/g, n);
      pts.push({ key: `breed_${info.id}`, badge: h.badge, tone: "vigilance", title: fill(h.title), body: fill(h.body), gesture: fill(h.gesture), source: h.source });
    } else {
      pts.push({
        key: "breed_generic",
        badge: "Race",
        tone: "sauge",
        title: `Les points faibles connus de la race de ${n}`,
        body: `Chaque race a ses fragilités héréditaires. Nous vous présentons les deux ou trois qui concernent vraiment ${n}, avec les signes qui doivent vous faire consulter.`,
        gesture: `Cette semaine : notez dans le carnet la date du dernier vaccin et du dernier vermifuge de ${n}.`,
        source: "VetCompass (Royal Veterinary College), études par race.",
      });
    }
  }

  // 2) Le poids
  if (weightDelta < 0 || dog.silhouette === "round" || dog.silhouette === "very_round") {
    pts.push({
      key: "weight_high",
      badge: "Modifiable",
      tone: "vigilance",
      title: `Le poids de ${n} pèse sur son dos`,
      body: `Chaque kilo en trop multiplie la charge sur les disques d'un chien long et bas. Le surpoids est le facteur de risque modifiable numéro un : c'est aussi celui qui fait remonter le score le plus vite.`,
      gesture: `Cette semaine : pesez ${n} (balance de salle de bain : vous avec, vous sans) et notez le chiffre. On fixera ensemble un objectif réaliste de −5 % en 8 semaines.`,
      source: "Packer et al. 2013 ; Levine et al. 2006.",
    });
  } else {
    pts.push({
      key: "weight_ok",
      badge: "À maintenir",
      tone: "bon",
      title: `La silhouette de ${n} est un atout`,
      body: `Un poids de forme protège le dos, les articulations et le cœur. Le piège : la prise de poids est lente et invisible au quotidien. Une pesée toutes les deux semaines suffit à la voir venir.`,
      gesture: `Cette semaine : pesez ${n} et enregistrez la valeur. L'app vous alertera si la courbe monte.`,
      source: "WSAVA, score corporel en 9 points.",
    });
  }

  // 3) Dents / stérilisation / activité selon le profil
  if (has(score, "neuter_early")) {
    pts.push({
      key: "neuter",
      badge: "Facteur connu",
      tone: "sauge",
      title: `Stérilisation précoce : ce que ça change pour ${n}`,
      body: `Une stérilisation avant 12 mois est associée à un risque de hernie discale plus élevé chez le teckel (étude 2018 sur plus de 1 900 chiens). On ne revient pas dessus, mais ça justifie d'être plus strict sur le poids et les sauts.`,
      gesture: `Cette semaine : remplacez le collier par un harnais en Y pour les promenades, il répartit la traction hors de la nuque.`,
      source: "Dorn & Seath 2018, Canine Genetics and Epidemiology.",
    });
  } else if (dog.activity === "lt30") {
    pts.push({
      key: "activity",
      badge: "Modifiable",
      tone: "vigilance",
      title: `${n} bouge trop peu pour muscler son dos`,
      body: `Moins de 30 minutes d'activité par jour, c'est un dos moins soutenu et un poids qui grimpe. Les teckels actifs ont moins d'épisodes que les sédentaires dans les études de cohorte.`,
      gesture: `Cette semaine : ajoutez une sortie de 15 minutes, à allure soutenue, sol plat ou légère montée.`,
      source: "Packer et al. 2016.",
    });
  } else {
    pts.push({
      key: "dental",
      badge: "Souvent oublié",
      tone: "sauge",
      title: `Les dents de ${n} : le problème numéro un en consultation`,
      body: `Les petites races cumulent le tartre ; plus de 80 % des chiens de plus de 3 ans ont une maladie parodontale. Mauvaise haleine, gencives rouges, difficulté à mâcher : ce sont les premiers signes.`,
      gesture: `Cette semaine : soulevez la babine de ${n} et regardez les molaires du fond. Prenez une photo, on la comparera dans trois mois.`,
      source: "VetCompass 2021 ; O'Neill et al.",
    });
  }

  return pts.slice(0, 3);
}
