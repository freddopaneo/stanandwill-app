/**
 * Plan de prévention — 4 premières semaines, par race (v1).
 * Miroir embarqué de la table `lessons` (le serveur fera foi ensuite). Chiffres et conseils à relire par le vétérinaire référent.
 * Structure : chaque semaine = 2 leçons propres à la race + 2 rituels communs (pesée, geste commun).
 * `gestureKey` relie l'item au moteur de score (gestures : harness, no_high_jumps, knows_signs, brushing).
 */
import type { Evidence } from "./score";

export type LessonType = "lesson" | "gesture" | "check" | "weigh";

export interface Lesson {
  id: string;
  breedId: string | null; // null = toutes races
  week: 1 | 2 | 3 | 4;
  day: number; // 1..7
  type: LessonType;
  title: string;
  body: string;
  /** question de vérification (type lesson) */
  check?: { question: string; answers: { label: string; correct: boolean }[] };
  evidence?: Evidence;
  gestureKey?: "harness" | "no_high_jumps" | "knows_signs" | "brushing";
  source?: string;
}

const common: Lesson[] = [
  { id: "c-w1-weigh", breedId: null, week: 1, day: 2, type: "weigh", title: "La première pesée", evidence: "probable",
    body: "Montez sur votre balance avec votre chien dans les bras, puis sans lui : la différence est son poids. Notez-le dans le carnet. On recommence chaque semaine, le même jour : une courbe vaut mieux qu'un chiffre, et le poids est le levier numéro un que vous contrôlez." },
  { id: "c-w1-food", breedId: null, week: 1, day: 6, type: "lesson", title: "Les 6 aliments qui envoient aux urgences", evidence: "proven",
    body: "Chocolat, raisin frais ou sec, oignon et ail, xylitol (chewing-gums et pâtes à tartiner « sans sucre »), noix de macadamia, os cuits. Pour un petit chien, la dose dangereuse est minuscule : 20 g de chocolat noir suffisent pour 8 kg. Si c'est avalé : notez l'heure et la quantité, appelez le vétérinaire ou le centre antipoison, ne faites pas vomir sans avis.",
    check: { question: "Quel édulcorant est dangereux même à très faible dose ?", answers: [{ label: "Le xylitol", correct: true }, { label: "Le sucre de canne", correct: false }, { label: "Le miel", correct: false }] },
    source: "ASPCA Animal Poison Control ; CAPAE Ouest." },
  { id: "c-w2-weigh", breedId: null, week: 2, day: 2, type: "weigh", title: "Pesée de la semaine", body: "Même balance, même moment de la journée. Un écart de plus de 3 % en une semaine mérite qu'on regarde la gamelle et les friandises." },
  { id: "c-w2-teeth", breedId: null, week: 2, day: 6, type: "gesture", title: "Le premier brossage, 20 secondes", evidence: "proven", gestureKey: "brushing",
    body: "Plus de 80 % des chiens de plus de 3 ans ont une maladie parodontale, et les petites races sont les premières touchées. Commencez sans dentifrice : un doigt dans la babine, on frotte les molaires du fond cinq secondes de chaque côté, on félicite. Trois fois par semaine suffit pour changer la donne ; le dentifrice pour chien viendra la semaine prochaine.",
    source: "O'Neill et al. 2021, VetCompass." },
  { id: "c-w3-weigh", breedId: null, week: 3, day: 2, type: "weigh", title: "Pesée de la semaine", body: "Troisième point sur la courbe : c'est à partir de maintenant qu'une tendance devient lisible." },
  { id: "c-w3-treats", breedId: null, week: 3, day: 5, type: "lesson", title: "La règle des 10 % de friandises", evidence: "probable",
    body: "Les friandises ne doivent pas dépasser 10 % des calories de la journée. Pour un chien de 5 kg, c'est environ 30 kcal : un seul biscuit du commerce peut tout consommer. Astuce : prélevez la ration de friandises dans la gamelle du matin, et préférez carotte, courgette ou morceaux de pomme sans pépins.",
    check: { question: "Un chien de 5 kg a droit à combien de calories de friandises par jour, environ ?", answers: [{ label: "30 kcal", correct: true }, { label: "150 kcal", correct: false }, { label: "Autant qu'il veut s'il bouge", correct: false }] },
    source: "FEDIAF, lignes directrices nutritionnelles." },
  { id: "c-w4-weigh", breedId: null, week: 4, day: 2, type: "weigh", title: "Pesée du mois", body: "Quatre pesées : vous avez maintenant une vraie courbe. L'app vous alertera désormais si elle monte deux semaines de suite." },
  { id: "c-w4-emergency", breedId: null, week: 4, day: 6, type: "gesture", title: "La fiche d'urgence, prête à partager",
    body: "Ouvrez Carnet → Urgence et partagez la fiche de votre chien à la personne qui le garde parfois (conjoint, parents, pet-sitter). Ajoutez le numéro de votre vétérinaire et celui du service de garde. Le jour où ça compte, personne ne cherche." },
];

const dachshund: Lesson[] = [
  { id: "d-w1-1", breedId: "dachshund", week: 1, day: 1, type: "lesson", title: "Pourquoi le dos du teckel est différent", evidence: "proven",
    body: "Le teckel a été sélectionné pour un corps long sur des pattes courtes. Ce profil s'accompagne d'une particularité des disques intervertébraux, qui vieillissent plus tôt que chez les autres chiens. Environ un teckel sur quatre connaîtra une hernie discale, le plus souvent entre 4 et 8 ans. Ce n'est pas une fatalité : le poids, l'activité régulière et la rapidité de réaction aux premiers signes changent l'issue.",
    check: { question: "À quel âge le risque est-il le plus élevé ?", answers: [{ label: "Avant 2 ans", correct: false }, { label: "Entre 4 et 8 ans", correct: true }, { label: "Après 10 ans", correct: false }] },
    source: "Dachshund IVDD UK ; Packer et al. 2016." },
  { id: "d-w1-2", breedId: "dachshund", week: 1, day: 3, type: "lesson", title: "Les 5 signes qui ne doivent jamais attendre", evidence: "common_opinion", gestureKey: "knows_signs",
    body: "Dos voûté ou raide. Refus soudain de sauter ou de monter. Tremblements et halètement sans effort. Cri quand on le porte. Démarche hésitante des pattes arrière. Un seul de ces signes : repos strict dans une pièce fermée, aucun escalier, pas de manipulation du dos, vétérinaire sous 24 heures. Si les pattes arrière faiblissent, c'est immédiatement.",
    check: { question: "Il refuse de sauter sur le canapé et tremble. Vous faites quoi ?", answers: [{ label: "J'attends demain", correct: false }, { label: "Repos strict et vétérinaire sous 24 h", correct: true }, { label: "Je le fais courir pour vérifier", correct: false }] } },
  { id: "d-w1-3", breedId: "dachshund", week: 1, day: 4, type: "gesture", title: "Harnais plutôt que collier", evidence: "common_opinion", gestureKey: "harness",
    body: "Un harnais en Y qui dégage les épaules répartit la traction sur le poitrail au lieu du cou. Vérifiez qu'il ne frotte pas sous les pattes avant et que deux doigts passent sous les sangles. Ce n'est pas une preuve scientifique pour le dos, mais un consensus pour le cou et un confort réel pour un chien long." },
  { id: "d-w2-1", breedId: "dachshund", week: 2, day: 1, type: "lesson", title: "Escaliers et canapé : ce que disent vraiment les études", evidence: "myth",
    body: "Surprise : les études de cohorte ne montrent pas de lien entre monter les escaliers et la hernie discale ; certaines trouvent même l'inverse, l'exercice modéré protégeant le dos. Ce qui ressort, c'est le saut vers le bas depuis une hauteur, le surpoids et la sédentarité. Donc : on ne porte pas son teckel partout, on l'empêche de sauter du lit et du canapé.",
    check: { question: "Quel geste est associé au risque dans les études ?", answers: [{ label: "Monter les escaliers", correct: false }, { label: "Sauter depuis une hauteur", correct: true }, { label: "Marcher une heure", correct: false }] },
    source: "Packer et al. 2013 ; Dachshund Breed Council 2018." },
  { id: "d-w2-2", breedId: "dachshund", week: 2, day: 4, type: "gesture", title: "Une rampe devant le canapé", evidence: "probable", gestureKey: "no_high_jumps",
    body: "Installez une rampe ou un marchepied large devant l'endroit d'où il saute le plus. Les premiers jours, guidez-le avec une friandise, puis bloquez l'accès direct. Un teckel apprend la rampe en moins d'une semaine si elle est stable et antidérapante." },
  { id: "d-w3-1", breedId: "dachshund", week: 3, day: 1, type: "lesson", title: "Le poids de forme d'un teckel, concrètement", evidence: "probable",
    body: "Debout, vu de dessus, on doit voir une taille marquée derrière les côtes ; de profil, le ventre remonte. On doit sentir les côtes sous une fine couche, sans appuyer. Un teckel standard mâle se situe entre 8 et 12 kg, un nain entre 4 et 5,5 kg. Chaque kilo de trop augmente la charge sur des disques déjà fragiles.",
    check: { question: "Comment vérifier le poids de forme sans balance ?", answers: [{ label: "Sentir les côtes sans appuyer", correct: true }, { label: "Il doit avoir le ventre bien rond", correct: false }, { label: "Impossible sans vétérinaire", correct: false }] } },
  { id: "d-w3-2", breedId: "dachshund", week: 3, day: 4, type: "gesture", title: "Dix minutes de montée douce", evidence: "probable",
    body: "Trois fois cette semaine : une marche de 10 minutes en légère montée, en laisse, allure régulière. C'est le meilleur gainage naturel du dos pour un teckel, sans impact. On évite les jeux de lancer avec virages brusques." },
  { id: "d-w4-1", breedId: "dachshund", week: 4, day: 1, type: "lesson", title: "Le protocole de la première heure", evidence: "common_opinion",
    body: "Si un jour les signes apparaissent : 1) cage ou petite pièce fermée, tapis antidérapant ; 2) on le porte d'une main sous le poitrail, l'autre sous l'arrière-train, dos horizontal ; 3) rien à manger avant l'avis vétérinaire ; 4) appel au vétérinaire en décrivant les signes et l'heure de début ; 5) si les pattes arrière lâchent, urgences immédiatement, chaque heure compte pour la chirurgie.",
    check: { question: "Comment porte-t-on un teckel suspect de hernie ?", answers: [{ label: "Sous les aisselles, à la verticale", correct: false }, { label: "Une main sous le poitrail, une sous l'arrière, dos horizontal", correct: true }] } },
  { id: "d-w4-2", breedId: "dachshund", week: 4, day: 4, type: "lesson", title: "Assurance : avant les premiers symptômes", evidence: "proven",
    body: "Une chirurgie de hernie discale avec rééducation coûte 1 200 à 2 800 €. Les assureurs excluent ce qui a déjà été diagnostiqué et appliquent un délai de carence : la seule bonne date pour assurer un teckel, c'est avant le premier épisode. Comparez les plafonds annuels (au moins 2 000 €) et vérifiez que la hernie discale n'est pas exclue pour la race." },
];

const frenchBulldog: Lesson[] = [
  { id: "f-w1-1", breedId: "french_bulldog", week: 1, day: 1, type: "lesson", title: "Respirer avec un museau court", evidence: "proven",
    body: "Le bouledogue français est brachycéphale : narines étroites, voile du palais long, trachée fine. Dans l'étude VetCompass, il présente un risque accru sur 20 des 43 troubles étudiés, et 42 fois plus de sténose des narines. Ronfler n'est pas « normal » : c'est le signe d'un effort respiratoire permanent, aggravé par la chaleur, l'excitation et le surpoids.",
    check: { question: "Le ronflement d'un bouledogue au repos, c'est…", answers: [{ label: "Normal pour la race", correct: false }, { label: "Un signe d'effort respiratoire à surveiller", correct: true }] },
    source: "O'Neill et al. 2021, VetCompass (RVC)." },
  { id: "f-w1-2", breedId: "french_bulldog", week: 1, day: 3, type: "lesson", title: "Les 5 signes d'une détresse respiratoire", evidence: "common_opinion", gestureKey: "knows_signs",
    body: "Langue ou gencives bleutées ou très pâles. Halètement bruyant qui ne se calme pas au repos. Refus de bouger, position assise tête tendue. Vomissements ou bave mousseuse après l'effort. Effondrement. Un seul de ces signes : à l'ombre, mouillez les pattes et le ventre à l'eau fraîche (jamais glacée), vétérinaire immédiatement.",
    check: { question: "Premier geste si la langue devient bleutée ?", answers: [{ label: "Le faire boire beaucoup", correct: false }, { label: "Ombre, eau fraîche sur pattes et ventre, vétérinaire immédiatement", correct: true }] } },
  { id: "f-w1-3", breedId: "french_bulldog", week: 1, day: 4, type: "gesture", title: "Harnais, jamais de collier", evidence: "common_opinion", gestureKey: "harness",
    body: "Toute pression sur le cou réduit encore une trachée déjà fine. Un harnais en Y ou en H, réglé pour laisser passer deux doigts, est la seule option raisonnable pour cette race. Vérifiez aussi que la laisse n'est pas à enrouleur : la traction permanente est le pire scénario." },
  { id: "f-w2-1", breedId: "french_bulldog", week: 2, day: 1, type: "lesson", title: "Chaleur : la règle des 22 degrés", evidence: "proven",
    body: "Au-dessus de 22 °C, un bouledogue évacue mal la chaleur parce qu'il halète moins efficacement. Les coups de chaleur de la race surviennent souvent en promenade ordinaire, pas en canicule extrême. Règle : sorties tôt le matin et tard le soir dès 22 °C, jamais de voiture au soleil, tapis rafraîchissant à la maison, eau toujours disponible.",
    check: { question: "À partir de quelle température adapte-t-on les sorties ?", answers: [{ label: "30 °C", correct: false }, { label: "22 °C", correct: true }] },
    source: "Hall et al. 2020, Scientific Reports (coups de chaleur par race)." },
  { id: "f-w2-2", breedId: "french_bulldog", week: 2, day: 4, type: "gesture", title: "Les plis, 30 secondes par jour", evidence: "probable",
    body: "Les plis du museau et de la queue retiennent humidité et débris : rougeurs, odeur, infection. Chaque soir, une compresse sèche puis une lingette adaptée dans chaque pli, et on sèche. Si un pli est rouge ou sent fort trois jours de suite, montrez-le au vétérinaire." },
  { id: "f-w3-1", breedId: "french_bulldog", week: 3, day: 1, type: "lesson", title: "Le poids, multiplicateur de tous les risques", evidence: "proven",
    body: "Chez le bouledogue, chaque kilo de trop aggrave la respiration, la chaleur et les articulations à la fois. Poids de forme : 9 à 14 kg pour un mâle, 8 à 13 kg pour une femelle, avec une taille visible derrière les côtes. La race est gourmande et peu sportive : la gamelle est votre principal outil de prévention.",
    check: { question: "Que fait un kilo de trop chez un bouledogue ?", answers: [{ label: "Rien de particulier", correct: false }, { label: "Il aggrave respiration, chaleur et articulations", correct: true }] } },
  { id: "f-w3-2", breedId: "french_bulldog", week: 3, day: 4, type: "gesture", title: "Le test des 5 minutes de marche", evidence: "common_opinion",
    body: "Par temps doux, marchez 5 minutes à allure normale puis arrêtez-vous : combien de temps met-il à retrouver une respiration silencieuse ? Moins de 2 minutes, c'est bien ; plus de 5 minutes, parlez-en au vétérinaire, une évaluation BOAS peut être utile. Notez le résultat dans le carnet et refaites le test dans un mois." },
  { id: "f-w4-1", breedId: "french_bulldog", week: 4, day: 1, type: "lesson", title: "Le dos du bouledogue aussi", evidence: "proven",
    body: "Comme le teckel, le bouledogue français est prédisposé aux hernies discales, souvent plus jeune (3 à 6 ans). Les signes : refus de sauter, dos voûté, cris, faiblesse des pattes arrière. Même protocole : repos strict, pas d'escalier, vétérinaire sous 24 heures, urgences si les pattes lâchent.",
    check: { question: "Un bouledogue de 4 ans refuse soudain de sauter et crie quand on le porte. Vous faites quoi ?", answers: [{ label: "Repos strict et vétérinaire sous 24 h", correct: true }, { label: "Un peu de sport pour le détendre", correct: false }] } },
  { id: "f-w4-2", breedId: "french_bulldog", week: 4, day: 4, type: "lesson", title: "Assurance : la race la plus chère à soigner", evidence: "proven",
    body: "Chirurgie des voies respiratoires (narines, voile du palais) : 1 500 à 3 000 €. Hernie discale : 1 200 à 2 800 €. Dermatite chronique : des centaines d'euros par an. Les primes sont plus élevées pour la race, mais les exclusions le sont aussi après diagnostic : assurez avant le premier problème, et vérifiez que le syndrome brachycéphale est couvert." },
];

const chihuahua: Lesson[] = [
  { id: "ch-w1-1", breedId: "chihuahua", week: 1, day: 1, type: "lesson", title: "Une bouche trop petite pour ses dents", evidence: "proven",
    body: "Le chihuahua a les mêmes 42 dents qu'un labrador dans une mâchoire minuscule. Résultat : chevauchement, tartre précoce, et dents de lait qui ne tombent pas (5,7 % des chiens vus en consultation). La maladie dentaire touche 13,5 % des chihuahuas, et les bactéries de la bouche voyagent vers le cœur et les reins.",
    check: { question: "Pourquoi le chihuahua est-il si exposé au tartre ?", answers: [{ label: "Il mange trop sucré", correct: false }, { label: "42 dents dans une mâchoire minuscule", correct: true }] },
    source: "O'Neill et al. 2020, VetCompass, 11 647 chihuahuas." },
  { id: "ch-w1-2", breedId: "chihuahua", week: 1, day: 3, type: "lesson", title: "Les signes dentaires à repérer", evidence: "common_opinion", gestureKey: "knows_signs",
    body: "Haleine forte, gencives rouges au bord des dents, salive épaisse, croquettes avalées sans mâcher, patte qui frotte la gueule, deux dents côte à côte à la même place chez un jeune. Si l'un de ces signes est présent, un détartrage sous anesthésie n'est pas un luxe : c'est le soin qui ajoute des années.",
    check: { question: "Un chihuahua de 8 mois a deux canines côte à côte. C'est…", answers: [{ label: "Normal, ça va tomber", correct: false }, { label: "Une dent de lait persistante à faire retirer", correct: true }] } },
  { id: "ch-w1-3", breedId: "chihuahua", week: 1, day: 4, type: "gesture", title: "Harnais, pour la trachée", evidence: "common_opinion", gestureKey: "harness",
    body: "Le collier appuie sur une trachée de la taille d'une paille. Harnais en Y, laisse courte, et on ne tire jamais pour « corriger ». Si vous entendez une toux sèche après une traction, c'est la trachée qui se plaint." },
  { id: "ch-w2-1", breedId: "chihuahua", week: 2, day: 1, type: "lesson", title: "Les rotules qui sautent", evidence: "proven",
    body: "La luxation de la rotule touche environ 4 % des chihuahuas : le chien lève une patte arrière trois foulées puis repart comme si de rien n'était. Grade 1 et 2 se gèrent par le poids et la musculation ; grade 3 et 4 se corrigent par chirurgie. Le surpoids transforme un grade 1 en grade 3.",
    check: { question: "Il saute sur trois pattes quelques pas puis repart normalement. C'est probablement…", answers: [{ label: "Une épine", correct: false }, { label: "Une rotule qui se luxe, à faire vérifier", correct: true }] } },
  { id: "ch-w2-2", breedId: "chihuahua", week: 2, day: 4, type: "gesture", title: "Pas de saut depuis vos bras", evidence: "probable", gestureKey: "no_high_jumps",
    body: "La chute la plus fréquente d'un chihuahua, c'est depuis les bras de son maître ou depuis le canapé. Pour un chien de 2 kg, 60 cm équivalent à un étage. Posez-le toujours au sol, installez un marchepied au canapé, et apprenez-lui à attendre." },
  { id: "ch-w3-1", breedId: "chihuahua", week: 3, day: 1, type: "lesson", title: "Hypoglycémie et froid : le très petit gabarit", evidence: "probable",
    body: "Sous 2 kg, les réserves sont faibles : un repas sauté, un froid vif ou un stress long peuvent faire chuter le sucre sanguin (faiblesse, tremblements, regard vague). Fractionnez en trois repas, un manteau dès 10 °C, et gardez un tube de miel : une noisette sur la gencive en attendant le vétérinaire.",
    check: { question: "Chihuahua de 1,8 kg qui tremble et semble absent après avoir sauté un repas : premier geste ?", answers: [{ label: "Une noisette de miel sur la gencive puis vétérinaire", correct: true }, { label: "Le laisser dormir", correct: false }] } },
  { id: "ch-w3-2", breedId: "chihuahua", week: 3, day: 4, type: "gesture", title: "Dentifrice pour chien, 3 fois par semaine", evidence: "proven", gestureKey: "brushing",
    body: "Après deux semaines de brossage au doigt, passez au doigtier ou à la brosse souple avec un dentifrice enzymatique pour chien (jamais le vôtre : le fluor et le xylitol sont toxiques). Trente secondes, molaires du fond en priorité, récompense ensuite." },
  { id: "ch-w4-1", breedId: "chihuahua", week: 4, day: 1, type: "lesson", title: "Le cœur du chihuahua après 7 ans", evidence: "proven",
    body: "Comme beaucoup de petites races, le chihuahua est exposé à la maladie de la valve mitrale après 7 ans. Un souffle à l'auscultation est le premier signe, bien avant la toux ou l'essoufflement. Une auscultation par an dès 6 ans, puis une échographie si un souffle apparaît : détectée tôt, elle se traite longtemps.",
    check: { question: "À partir de quel âge demander une auscultation annuelle ?", answers: [{ label: "6 ans", correct: true }, { label: "12 ans", correct: false }] } },
  { id: "ch-w4-2", breedId: "chihuahua", week: 4, day: 4, type: "lesson", title: "Assurance et soins dentaires", evidence: "proven",
    body: "Un détartrage sous anesthésie coûte 250 à 500 €, avec extractions 500 à 1 200 €, et la plupart des contrats ne couvrent pas le détartrage. Cherchez une formule « prévention » avec forfait dentaire, et comparez les plafonds pour la chirurgie des rotules (1 000 à 2 000 € par patte)." },
];

const pomeranian: Lesson[] = [
  { id: "p-w1-1", breedId: "pomeranian", week: 1, day: 1, type: "lesson", title: "La toux de canard : le collapsus trachéal", evidence: "proven",
    body: "Chez le spitz nain, les anneaux de la trachée peuvent s'affaisser, surtout à l'excitation, à la traction sur le collier ou par temps chaud. Le signe typique : une toux sèche « de canard » ou « de klaxon », souvent le soir ou quand on rentre à la maison. C'est chronique mais ça se gère : poids, harnais, air frais, et traitement si besoin.",
    check: { question: "La toux « de canard » du spitz apparaît surtout…", answers: [{ label: "Pendant le sommeil", correct: false }, { label: "À l'excitation ou à la traction sur le collier", correct: true }] },
    source: "Tappin 2016, JSAP ; recommandations ACVIM." },
  { id: "p-w1-2", breedId: "pomeranian", week: 1, day: 3, type: "lesson", title: "Quand la toux devient une urgence", evidence: "common_opinion", gestureKey: "knows_signs",
    body: "Toux qui ne s'arrête pas après deux minutes au calme, langue bleutée, respiration sifflante au repos, évanouissement après une quinte : ce sont les signes d'une crise. Calme, air frais, pas de collier, vétérinaire immédiatement. Une crise passe souvent avec un sédatif léger et de l'oxygène, mais elle ne doit jamais être gérée seul.",
    check: { question: "Il tousse puis s'évanouit quelques secondes. Vous faites quoi ?", answers: [{ label: "Vétérinaire immédiatement", correct: true }, { label: "J'attends la prochaine crise pour filmer", correct: false }] } },
  { id: "p-w1-3", breedId: "pomeranian", week: 1, day: 4, type: "gesture", title: "Harnais en Y, laisse souple", evidence: "common_opinion", gestureKey: "harness",
    body: "Chez cette race, le harnais n'est pas une option de confort, c'est une mesure médicale : chaque traction sur le cou aplatit la trachée. Harnais en Y, laisse de 1,5 m sans enrouleur, et on apprend la marche au pied avec des friandises, pas avec des à-coups." },
  { id: "p-w2-1", breedId: "pomeranian", week: 2, day: 1, type: "lesson", title: "Les rotules du spitz", evidence: "proven",
    body: "La luxation de la rotule est fréquente chez le spitz nain. Le chien saute une foulée sur trois pattes puis repart. Les grades légers se stabilisent par le poids de forme et des muscles de cuisse solides ; les grades sévères se corrigent par chirurgie (1 000 à 2 000 € par patte). Les sauts répétés depuis le canapé aggravent.",
    check: { question: "Que fait le surpoids sur une rotule qui se luxe ?", answers: [{ label: "Rien", correct: false }, { label: "Il aggrave le grade", correct: true }] } },
  { id: "p-w2-2", breedId: "pomeranian", week: 2, day: 4, type: "gesture", title: "Marchepied et sol antidérapant", evidence: "probable", gestureKey: "no_high_jumps",
    body: "Un marchepied devant le canapé, un tapis sur le parquet glissant près de la gamelle et du panier : deux gestes qui protègent rotules et trachée (moins d'excitation, moins de sauts). Récompensez l'usage du marchepied les premiers jours." },
  { id: "p-w3-1", breedId: "pomeranian", week: 3, day: 1, type: "lesson", title: "Dents : la même histoire que le chihuahua", evidence: "proven",
    body: "Petite mâchoire, 42 dents : le tartre s'installe dès 2 ans et les dents de lait persistent souvent. Haleine forte et gencives rouges sont les premiers signes. Le brossage trois fois par semaine est le geste le plus rentable de tout le plan.",
    check: { question: "Fréquence minimale de brossage utile ?", answers: [{ label: "Une fois par mois", correct: false }, { label: "Trois fois par semaine", correct: true }] } },
  { id: "p-w3-2", breedId: "pomeranian", week: 3, day: 4, type: "gesture", title: "Dentifrice pour chien, 30 secondes", evidence: "proven", gestureKey: "brushing",
    body: "Doigtier ou brosse souple, dentifrice enzymatique pour chien, molaires du fond en priorité, récompense ensuite. Jamais de dentifrice humain." },
  { id: "p-w4-1", breedId: "pomeranian", week: 4, day: 1, type: "lesson", title: "Le pelage qui tombe par plaques", evidence: "probable",
    body: "L'alopécie X (« black skin disease ») touche le spitz : le poil s'éclaircit sur le tronc et la peau fonce, sans démangeaison. Ce n'est pas douloureux mais ça mérite un bilan (thyroïde, surrénales) pour écarter une cause traitable. Ne rasez jamais un spitz : le sous-poil repousse mal.",
    check: { question: "Faut-il raser un spitz l'été ?", answers: [{ label: "Oui, pour la chaleur", correct: false }, { label: "Non, le poil protège et repousse mal", correct: true }] } },
  { id: "p-w4-2", breedId: "pomeranian", week: 4, day: 4, type: "lesson", title: "Assurance et affections chroniques", evidence: "proven",
    body: "Collapsus trachéal et luxation de rotule sont des affections chroniques : une fois diagnostiquées, elles sont exclues des nouveaux contrats. La bonne date pour assurer un spitz est avant la première toux. Vérifiez le plafond annuel et la prise en charge des traitements au long cours." },
];

const cavalier: Lesson[] = [
  { id: "cv-w1-1", breedId: "cavalier", week: 1, day: 1, type: "lesson", title: "Le cœur du cavalier : la valve mitrale", evidence: "proven",
    body: "La maladie de la valve mitrale touche un cavalier sur deux à 5 ans et presque tous à 10 ans. La valve fuit, le cœur grossit, puis fatigue. Détectée au stade du souffle, elle se suit par échographie et se traite dès que le cœur grossit : les chiens traités à ce stade vivent en moyenne 15 mois de plus sans symptôme.",
    check: { question: "À 5 ans, quelle proportion de cavaliers a déjà un souffle ?", answers: [{ label: "Un sur dix", correct: false }, { label: "Un sur deux", correct: true }] },
    source: "Consensus ACVIM 2019 (Keene et al.) ; étude EPIC 2016." },
  { id: "cv-w1-2", breedId: "cavalier", week: 1, day: 3, type: "lesson", title: "Les signes cardiaques à connaître", evidence: "common_opinion", gestureKey: "knows_signs",
    body: "Toux la nuit ou au réveil. Respiration rapide au repos (plus de 30 par minute endormi). Fatigue en promenade, refus de monter. Ventre qui gonfle. Évanouissement. Un seul de ces signes chez un cavalier : vétérinaire dans la semaine ; respiration rapide persistante ou évanouissement : le jour même.",
    check: { question: "Au-dessus de combien de respirations par minute, endormi, consulte-t-on ?", answers: [{ label: "30", correct: true }, { label: "60", correct: false }] } },
  { id: "cv-w1-3", breedId: "cavalier", week: 1, day: 4, type: "gesture", title: "Compter sa respiration endormie", evidence: "proven",
    body: "Chaque semaine, quand il dort profondément : comptez les mouvements du flanc pendant 30 secondes et multipliez par deux. Notez le chiffre dans le carnet. C'est l'indicateur le plus simple et le plus fiable pour suivre un cœur de cavalier à la maison ; les cardiologues le demandent." },
  { id: "cv-w2-1", breedId: "cavalier", week: 2, day: 1, type: "lesson", title: "Les oreilles, tous les dimanches", evidence: "probable",
    body: "Oreilles tombantes et poil long : l'air circule mal, les otites reviennent. Chaque semaine, regardez et sentez l'intérieur : propre et sans odeur, c'est bon ; brun, odorant ou douloureux, c'est une otite à traiter vite. Séchez l'intérieur des oreilles après chaque bain ou baignade.",
    check: { question: "Que fait-on après une baignade ?", answers: [{ label: "On sèche l'intérieur des oreilles", correct: true }, { label: "Rien, elles sèchent seules", correct: false }] } },
  { id: "cv-w2-2", breedId: "cavalier", week: 2, day: 4, type: "gesture", title: "Harnais plutôt que collier", evidence: "common_opinion", gestureKey: "harness",
    body: "Pour un chien dont on surveille le cœur et qui peut souffrir de syringomyélie (douleurs du cou), le collier n'a pas sa place. Harnais en Y, réglé pour deux doigts, et promenades à son rythme." },
  { id: "cv-w3-1", breedId: "cavalier", week: 3, day: 1, type: "lesson", title: "Le grattage fantôme : la syringomyélie", evidence: "proven",
    body: "Le cavalier se gratte parfois le cou ou l'épaule « dans le vide », sans toucher la peau, surtout en laisse ou à l'excitation ; il peut crier sans raison apparente ou éviter qu'on lui touche la tête. Ce sont des signes possibles de syringomyélie, une malformation fréquente dans la race. Ça se diagnostique par IRM et se soulage par traitement.",
    check: { question: "Il se gratte le cou dans le vide en laisse, sans toucher la peau. C'est…", answers: [{ label: "Une puce", correct: false }, { label: "Un signe possible de syringomyélie, à signaler au vétérinaire", correct: true }] } },
  { id: "cv-w3-2", breedId: "cavalier", week: 3, day: 4, type: "gesture", title: "Le poids, pour le cœur", evidence: "probable", gestureKey: "no_high_jumps",
    body: "Un cavalier en surpoids fait travailler un cœur déjà fragile. Poids de forme : 5,5 à 8 kg. Cette semaine : mesurez la ration avec un verre doseur plutôt qu'à l'œil, et remplacez une friandise sur deux par un morceau de carotte. Pas de sauts répétés depuis le canapé : un marchepied protège aussi le cou." },
  { id: "cv-w4-1", breedId: "cavalier", week: 4, day: 1, type: "lesson", title: "Les yeux du cavalier", evidence: "probable",
    body: "Yeux grands et saillants : sécheresse oculaire, ulcères de la cornée et cataracte précoce sont plus fréquents. Signes : œil rouge, paupière fermée, écoulement épais, surface terne. Un œil fermé qui pleure, c'est le jour même : un ulcère non traité peut percer en 48 heures.",
    check: { question: "Œil à moitié fermé qui pleure depuis ce matin : on consulte…", answers: [{ label: "Le jour même", correct: true }, { label: "Si ça dure une semaine", correct: false }] } },
  { id: "cv-w4-2", breedId: "cavalier", week: 4, day: 4, type: "lesson", title: "Assurance : le cœur est la clé du contrat", evidence: "proven",
    body: "Suivi cardiologique : 150 à 300 € par échographie, puis des traitements à vie (30 à 80 € par mois). La plupart des assureurs excluent les maladies cardiaques dès qu'un souffle est noté dans le dossier. Pour un cavalier, assurer avant 3 ans n'est pas un détail, c'est la différence entre un cœur suivi et un cœur subi." },
];

export const LESSONS: Lesson[] = [...common, ...dachshund, ...frenchBulldog, ...chihuahua, ...pomeranian, ...cavalier];

export interface PlanItem extends Lesson { dueDayIndex: number } // 0 = jour 1 du plan

/** Construit le plan des 4 premières semaines pour une race : items de la race + items communs, triés par jour. */
export function buildPlan(breedId: string): PlanItem[] {
  const own = LESSONS.filter((l) => l.breedId === breedId);
  const base = own.length ? own : [];
  const items = [...base, ...LESSONS.filter((l) => l.breedId === null)];
  return items
    .map((l) => ({ ...l, dueDayIndex: (l.week - 1) * 7 + (l.day - 1) }))
    .sort((a, b) => a.dueDayIndex - b.dueDayIndex || (a.breedId ? -1 : 1));
}

/** Index du jour courant dans le plan, à partir de sa date de début (ISO). */
export function planDayIndex(startedOn: string, now = new Date()): number {
  const start = new Date(startedOn);
  start.setHours(0, 0, 0, 0);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((today.getTime() - start.getTime()) / 86400000));
}

/** L'item à faire aujourd'hui : le premier item dû et non fait ; sinon le dernier item dû. */
export function todaysItem(plan: PlanItem[], dayIndex: number, doneIds: Set<string>): PlanItem | null {
  const due = plan.filter((p) => p.dueDayIndex <= dayIndex);
  if (!due.length) return plan[0] ?? null;
  return due.find((p) => !doneIds.has(p.id)) ?? due[due.length - 1];
}
