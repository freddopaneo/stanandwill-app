-- Stan & Will — contenu de départ (teckel complet, autres races génériques).
-- Tout contenu santé est marqué « à valider » (vet_reviewed_at null) jusqu'à relecture du vétérinaire référent.

insert into public.breeds (id, name_fr, varieties, sizes, weight_ref, life_expectancy, worries, base_score, risk_window, content_status, sources) values
('dachshund', 'Teckel',
 '[{"id":"smooth","label":"Poil ras"},{"id":"long","label":"Poil long"},{"id":"wire","label":"Poil dur"}]',
 '[{"id":"mini","label":"Nain (jusqu''à 5 kg environ)"},{"id":"standard","label":"Standard (7 à 12 kg)"}]',
 '{"mini":{"male":[4,5.5],"female":[3.5,5]},"standard":{"male":[8,12],"female":[7,11]}}',
 '12 à 16 ans',
 '[{"id":"back","label":"Son dos"},{"id":"weight","label":"Son poids"},{"id":"food","label":"Ce qu''il mange"},{"id":"teeth","label":"Ses dents"},{"id":"other","label":"Autre chose"}]',
 70, '{"from_months":48,"to_months":96,"penalty":12}', 'full',
 '[{"label":"Dachshund IVDD UK — prévalence","url":"https://dachshund-ivdd.uk/what-is-ivdd/how-common-is-ivdd"},{"label":"Canine Genetics and Epidemiology 2018 — cohorte","url":"https://link.springer.com/content/pdf/10.1186/s40575-018-0067-7.pdf"},{"label":"HelloSafe — coûts de soins","url":"https://hellosafe.fr/assurance-animaux/teckel"}]'),
('french_bulldog','Bouledogue français','[]','[]','{"standard":{"male":[9,14],"female":[8,13]}}','10 à 12 ans','[{"id":"breath","label":"Sa respiration"},{"id":"weight","label":"Son poids"},{"id":"skin","label":"Sa peau"},{"id":"food","label":"Ce qu''il mange"},{"id":"other","label":"Autre chose"}]',72,null,'generic','[]'),
('chihuahua','Chihuahua','[]','[]','{"standard":{"male":[1.5,3],"female":[1.5,3]}}','12 à 18 ans','[{"id":"teeth","label":"Ses dents"},{"id":"weight","label":"Son poids"},{"id":"knees","label":"Ses rotules"},{"id":"food","label":"Ce qu''il mange"},{"id":"other","label":"Autre chose"}]',72,null,'generic','[]'),
('pomeranian','Spitz nain','[]','[]','{"standard":{"male":[1.8,3.5],"female":[1.8,3.5]}}','12 à 16 ans','[{"id":"trachea","label":"Sa trachée (toux)"},{"id":"weight","label":"Son poids"},{"id":"teeth","label":"Ses dents"},{"id":"food","label":"Ce qu''il mange"},{"id":"other","label":"Autre chose"}]',72,null,'generic','[]'),
('cavalier','Cavalier King Charles','[]','[]','{"standard":{"male":[5.5,8],"female":[5.5,8]}}','9 à 14 ans','[{"id":"heart","label":"Son cœur"},{"id":"weight","label":"Son poids"},{"id":"ears","label":"Ses oreilles"},{"id":"food","label":"Ce qu''il mange"},{"id":"other","label":"Autre chose"}]',72,null,'generic','[]'),
('shih_tzu','Shih tzu','[]','[]','{"standard":{"male":[4,7.5],"female":[4,7.5]}}','10 à 16 ans','[{"id":"eyes","label":"Ses yeux"},{"id":"teeth","label":"Ses dents"},{"id":"skin","label":"Sa peau"},{"id":"food","label":"Ce qu''il mange"},{"id":"other","label":"Autre chose"}]',72,null,'generic','[]'),
('labrador','Labrador','[]','[]','{"standard":{"male":[29,36],"female":[25,32]}}','10 à 12 ans','[{"id":"weight","label":"Son poids"},{"id":"joints","label":"Ses articulations"},{"id":"ears","label":"Ses oreilles"},{"id":"food","label":"Ce qu''il mange"},{"id":"other","label":"Autre chose"}]',72,null,'generic','[]'),
('golden','Golden retriever','[]','[]','{"standard":{"male":[29,34],"female":[25,29]}}','10 à 12 ans','[{"id":"weight","label":"Son poids"},{"id":"joints","label":"Ses articulations"},{"id":"skin","label":"Sa peau"},{"id":"food","label":"Ce qu''il mange"},{"id":"other","label":"Autre chose"}]',72,null,'generic','[]'),
('yorkshire','Yorkshire','[]','[]','{"standard":{"male":[2,3.2],"female":[2,3.2]}}','13 à 16 ans','[{"id":"teeth","label":"Ses dents"},{"id":"trachea","label":"Sa trachée (toux)"},{"id":"weight","label":"Son poids"},{"id":"food","label":"Ce qu''il mange"},{"id":"other","label":"Autre chose"}]',72,null,'generic','[]'),
('other','Croisé ou autre race','[]','[]','{}',null,'[{"id":"weight","label":"Son poids"},{"id":"teeth","label":"Ses dents"},{"id":"food","label":"Ce qu''il mange"},{"id":"joints","label":"Ses articulations"},{"id":"other","label":"Autre chose"}]',72,null,'generic','[]');

insert into public.breed_risks (breed_id, key, title_fr, prevalence_fr, typical_age_fr, cost_fr, early_signs, factors, variety_modifiers, source_url, version) values
('dachshund','ivdd','Hernie discale (IVDD)',
 'Environ 1 teckel sur 4 au cours de sa vie, 10 à 12 fois plus que les autres chiens',
 'Le plus souvent entre 4 et 8 ans (76 % des diagnostics), pic entre 4 et 6 ans',
 'Chirurgie et rééducation : 1 200 à 2 800 €, souvent davantage avec IRM',
 '["Dos voûté ou raide","Refus de sauter, de monter ou de descendre","Tremblements, halètement sans effort","Cri à la manipulation ou au portage","Démarche vacillante des pattes arrière","Incontinence soudaine"]',
 '[{"key":"weight_ideal","label_fr":"Poids de forme maintenu","evidence":"probable","score_delta":15,"modifiable":true,"source":"consensus clinique"},
   {"key":"weight_round","label_fr":"Surpoids modéré","evidence":"probable","score_delta":-8,"modifiable":true},
   {"key":"weight_very_round","label_fr":"Surpoids marqué","evidence":"probable","score_delta":-15,"modifiable":true},
   {"key":"neuter_early","label_fr":"Stérilisation avant 12 mois","evidence":"proven","score_delta":-6,"modifiable":false,"source":"cohorte 2018 : risque x2,1 femelles, x1,5 mâles"},
   {"key":"activity_regular","label_fr":"Activité régulière 30 min à 2 h par jour","evidence":"probable","score_delta":8,"modifiable":true},
   {"key":"activity_low","label_fr":"Moins de 30 min d''activité par jour","evidence":"probable","score_delta":-4,"modifiable":true},
   {"key":"harness","label_fr":"Harnais plutôt que collier","evidence":"common_opinion","score_delta":4,"modifiable":true},
   {"key":"no_high_jumps","label_fr":"Pas de sauts depuis une hauteur (rampe, portage)","evidence":"probable","score_delta":4,"modifiable":true},
   {"key":"knows_signs","label_fr":"Connaît les 5 signes d''alerte","evidence":"common_opinion","score_delta":4,"modifiable":true},
   {"key":"stairs_ban","label_fr":"Interdiction totale des escaliers","evidence":"myth","score_delta":0,"modifiable":true,"source":"cohorte 2018 : association inversée, pas de preuve d''effet préventif"},
   {"key":"supplements","label_fr":"Compléments glucosamine / chondroïtine","evidence":"unproven","score_delta":0,"modifiable":true},
   {"key":"history_back","label_fr":"Antécédent de problème de dos","evidence":"proven","score_delta":-10,"modifiable":false}]',
 '{"smooth":-4,"long":-2,"wire":0}',
 'https://dachshund-ivdd.uk/what-is-ivdd/how-common-is-ivdd', 1),
('dachshund','obesity','Surpoids','Fréquent chez les teckels adultes stérilisés','Dès 2 ans','Aggrave le risque de dos et d''arthrose','["Côtes difficiles à sentir","Taille non marquée vue de dessus","Essoufflement à l''effort"]','[]','{}',null,1),
('dachshund','dental','Maladie parodontale','Très fréquente chez les petites races','Dès 3 ans','Détartrage sous anesthésie : 300 à 800 € par an','["Mauvaise haleine","Tartre visible","Gencives rouges"]','[{"key":"brushing","label_fr":"Brossage dentaire quotidien","evidence":"proven","score_delta":4,"modifiable":true}]','{}',null,1);

insert into public.food_rules (name_fr, aliases, level, verdict_fr, why_fr, max_g_per_kg, if_eaten_fr) values
('Chocolat', '{chocolat,cacao,brownie,nutella}', 'emergency', 'Non, jamais', 'La théobromine est toxique pour le chien ; plus le chocolat est noir, plus c''est dangereux, et un teckel est petit.', null, 'Notez l''heure, le type et la quantité. Appelez un vétérinaire ou le centre antipoison animal (CAPAE Ouest : 02 40 68 77 40) sans attendre les symptômes.'),
('Raisin', '{raisin,raisins secs,"raisin sec"}', 'emergency', 'Non, jamais', 'Peut provoquer une insuffisance rénale aiguë, même en petite quantité, sans dose seuil connue.', null, 'Appelez un vétérinaire immédiatement, même pour quelques grains.'),
('Oignon', '{oignon,ail,échalote,poireau,ciboulette}', 'emergency', 'Non', 'Les alliacés détruisent les globules rouges ; les effets apparaissent plusieurs jours après.', null, 'Appelez un vétérinaire si la quantité dépasse une cuillère à soupe pour un petit chien.'),
('Xylitol', '{xylitol,"chewing-gum",édulcorant,"beurre de cacahuète light"}', 'emergency', 'Non, jamais', 'Chute brutale du sucre sanguin et atteinte du foie, en quelques minutes.', null, 'Urgence vétérinaire immédiate.'),
('Os cuits', '{"os cuit","os de poulet","os de lapin"}', 'emergency', 'Non', 'Les os cuits se brisent en esquilles et peuvent perforer.', null, 'Surveillez vomissements, abattement, sang dans les selles ; consultez au moindre signe.'),
('Avocat', '{avocat,guacamole}', 'watch', 'À éviter', 'La persine irrite le tube digestif ; le noyau est un risque d''occlusion.', null, 'Une petite quantité de chair : surveillez 24 h.'),
('Fromage', '{fromage,comté,emmental,camembert}', 'watch', 'Un tout petit morceau, rarement', 'Gras et salé ; beaucoup de chiens digèrent mal le lactose.', 1, null),
('Pain', '{pain,baguette,croûte}', 'watch', 'Un petit bout, sans habitude', 'Calories vides ; la pâte crue est dangereuse.', 2, null),
('Carotte', '{carotte}', 'none', 'Oui', 'Peu calorique, bonne à mâcher, crue ou cuite.', 10, null),
('Pomme', '{pomme}', 'none', 'Oui, sans pépins ni trognon', 'Les pépins contiennent des traces de cyanure ; la chair est sans danger.', 8, null),
('Courgette', '{courgette}', 'none', 'Oui', 'Légume idéal pour un chien qui doit perdre du poids.', 15, null),
('Poulet cuit', '{poulet,blanc de poulet,dinde}', 'none', 'Oui, nature et sans os', 'Protéine maigre ; jamais d''os, jamais assaisonné.', 10, null),
('Banane', '{banane}', 'none', 'Oui, en petite quantité', 'Sucrée : quelques rondelles, pas plus.', 5, null),
('Fraise', '{fraise,framboise,myrtille}', 'none', 'Oui', 'Sans danger, peu caloriques.', 8, null),
('Jambon', '{jambon,charcuterie,saucisson}', 'watch', 'À éviter', 'Très salé et gras ; risque de pancréatite chez un petit chien.', null, null),
('Noix de macadamia', '{macadamia}', 'emergency', 'Non', 'Toxique : faiblesse des pattes arrière, tremblements, fièvre.', null, 'Consultez un vétérinaire dans la journée.');

-- Semaine 1 du plan teckel (une carte par jour). Semaines 2 à 4 : à compléter avec le vétérinaire.
insert into public.lessons (breed_id, week, day, type, title_fr, body_fr, check_question_fr, check_answers, evidence, score_delta, source_url) values
('dachshund',1,1,'lesson','Pourquoi le dos du teckel est différent',
 'Le teckel a été sélectionné pour un corps long sur des pattes courtes. Ce profil s''accompagne d''une particularité des disques intervertébraux, qui vieillissent plus tôt que chez les autres chiens. Résultat : environ un teckel sur quatre connaîtra une hernie discale, le plus souvent entre 4 et 8 ans. Ce n''est pas une fatalité : le poids, l''activité régulière et la rapidité de réaction aux premiers signes changent l''issue. Cette semaine, vous apprenez à connaître son dos.',
 'À quel âge le risque est-il le plus élevé ?', '[{"label":"Avant 2 ans","correct":false},{"label":"Entre 4 et 8 ans","correct":true},{"label":"Après 10 ans","correct":false}]', 'proven', 2, 'https://dachshund-ivdd.uk/what-is-ivdd/how-common-is-ivdd'),
('dachshund',1,2,'weigh','La première pesée',
 'Montez sur votre balance avec votre teckel dans les bras, puis sans lui : la différence est son poids. Notez-le dans l''app. On recommence chaque dimanche : une courbe vaut mieux qu''un chiffre, et le poids est le levier numéro un que vous contrôlez.',
 null, null, 'probable', 3, null),
('dachshund',1,3,'lesson','Les 5 signes qui ne doivent jamais attendre',
 'Dos voûté ou raide. Refus soudain de sauter ou de monter. Tremblements et halètement sans effort. Cri quand on le porte. Démarche hésitante des pattes arrière. Un seul de ces signes chez un teckel : repos strict dans une pièce fermée ou une cage, aucun escalier, pas de manipulation du dos, vétérinaire sous 24 heures. Si les pattes arrière faiblissent, c''est immédiatement.',
 'Il refuse de sauter sur le canapé et tremble. Vous faites quoi ?', '[{"label":"J''attends de voir demain","correct":false},{"label":"Repos strict et vétérinaire sous 24 h","correct":true},{"label":"Je le fais courir pour vérifier","correct":false}]', 'common_opinion', 4, null),
('dachshund',1,4,'gesture','Harnais plutôt que collier',
 'Un harnais en Y qui dégage les épaules répartit la traction sur le poitrail au lieu du cou. Vérifiez qu''il ne frotte pas sous les pattes avant et que deux doigts passent sous les sangles. Ce n''est pas une preuve scientifique pour le dos, mais un consensus pour le cou et la trachée, et un confort réel pour un chien long.',
 null, null, 'common_opinion', 4, null),
('dachshund',1,5,'lesson','Les escaliers : ce que dit vraiment la science',
 'Tout le monde interdit les escaliers aux teckels. La seule grande étude sur le sujet (2 000 chiens, 2018) a trouvé l''inverse de ce qu''on attendait : les chiens à qui on interdisait les sauts avaient plus de hernies, parce que les maîtres avaient changé les règles après le diagnostic. Il n''y a pas de preuve que les escaliers provoquent la hernie. Par prudence, on évite les sauts depuis une hauteur et les sols glissants ; on n''a pas besoin de porter un teckel en pleine forme à chaque marche.',
 'Les escaliers provoquent-ils la hernie discale ?', '[{"label":"Oui, c''est prouvé","correct":false},{"label":"Aucune preuve ; prudence sur les sauts en hauteur","correct":true}]', 'myth', 2, 'https://link.springer.com/content/pdf/10.1186/s40575-018-0067-7.pdf'),
('dachshund',1,6,'check','Comment vous le portez',
 'Une main sous le poitrail, l''autre sous l''arrière-train, le dos horizontal. Jamais sous les aisselles seules : le dos pend et se plie. Montrez le geste à toute la famille, enfants compris.',
 'Qui porte votre teckel à la maison ? Tout le monde connaît le geste ?', '[{"label":"Oui","correct":true},{"label":"Pas encore","correct":false}]', 'common_opinion', 2, null),
('dachshund',1,7,'weigh','La pesée du dimanche',
 'Deuxième pesée. Si le chiffre bouge de plus de 300 g en une semaine chez un teckel nain, on regarde la ration. La zone cible de sa variété est affichée sur la courbe.',
 null, null, 'probable', 3, null);

insert into public.season_alerts (key, title_fr, body_fr, trigger) values
('heat', 'Chaleur demain', '{temp} °C annoncés : balades avant 9 h et après 20 h, pas de bitume chaud (testez 5 secondes avec la main), eau partout, jamais dans une voiture.', '{"type":"temp_gt","value":28}'),
('easter_chocolate', 'Pâques : le chocolat', 'Le chocolat est toxique pour {dog}. Les œufs cachés au jardin aussi. S''il en avale : notez l''heure et la quantité, appelez un vétérinaire sans attendre les symptômes.', '{"type":"date","from":"03-25","to":"04-25"}'),
('christmas_food', 'Noël : la table', 'Chocolat, raisins secs, os de volaille, foie gras : {dog} n''en a pas besoin. Une carotte crue fait un très bon cadeau.', '{"type":"date","from":"12-15","to":"12-31"}'),
('processionary', 'Chenilles processionnaires', 'De mars à mai, les chenilles descendent des pins. Contact avec la langue = urgence (gonflement, bave). Évitez les pinèdes et surveillez le sol.', '{"type":"date","from":"03-01","to":"05-31"}'),
('ticks', 'Saison des tiques', 'Printemps et automne : vérifiez oreilles, cou et aisselles après chaque sortie en herbe ; antiparasitaire à jour dans le carnet.', '{"type":"date","from":"03-15","to":"06-15"}'),
('fireworks', 'Feux d''artifice ce soir', 'Rentrez {dog} avant la nuit, fermez volets et fenêtres, musique douce, et ne le grondez pas s''il a peur.', '{"type":"date","from":"07-13","to":"07-14"}');
