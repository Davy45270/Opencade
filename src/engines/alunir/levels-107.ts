/** Frozen catalogue from git show eecddb7:src/engines/alunir/levels.ts. */
/** Authored flight plans. Coordinates are logical pixels; durations are fixed ticks. */
export type Mechanic = 'choix' | 'grotte' | 'mobile' | 'ravitaillement' | 'cargo' | 'meteores' | 'gravite' | 'tunnel' | 'geyser' | 'balise' | 'secours' | 'glace';
export interface Level {
    name: string; idea: string; star: Mechanic; mechanics: readonly Mechanic[];
    x: number; y: number; width: number; spawn: number; fuel: number;
}
export const LEVELS_107: readonly Level[] = [
    { name: 'Port des possibles', idea: 'Choisir sa terrasse : le petit quai rapporte double.', star: 'choix', mechanics: ['choix'], x: 137, y: 523, width: 90, spawn: 222, fuel: 950 },
    { name: 'Sous la voûte', idea: 'Descendre dans la galerie, sans toucher la voûte.', star: 'grotte', mechanics: ['grotte'], x: 142, y: 510, width: 86, spawn: 190, fuel: 1000 },
    { name: 'Le pont navette', idea: 'Suivre la terrasse qui va et vient.', star: 'mobile', mechanics: ['mobile'], x: 132, y: 530, width: 92, spawn: 210, fuel: 1100 },
    { name: 'La halte des réservoirs', idea: 'Se poser à gauche pour refaire le plein, puis repartir.', star: 'ravitaillement', mechanics: ['ravitaillement'], x: 218, y: 530, width: 88, spawn: 90, fuel: 650 },
    { name: 'Courrier lunaire', idea: 'Prendre le cargo au quai gauche, le livrer à droite.', star: 'cargo', mechanics: ['cargo'], x: 218, y: 515, width: 88, spawn: 90, fuel: 1800 },
    { name: 'Les étoiles filantes', idea: 'Les météores traversent la descente : observer leur passage.', star: 'meteores', mechanics: ['meteores'], x: 138, y: 535, width: 84, spawn: 210, fuel: 1100 },
    { name: 'Mer de plume', idea: 'Dans la zone violette, la gravité est divisée par deux.', star: 'gravite', mechanics: ['gravite'], x: 134, y: 520, width: 92, spawn: 220, fuel: 1050 },
    { name: 'Le souffle du col', idea: 'Compenser le courant dans la bande bleue.', star: 'tunnel', mechanics: ['tunnel'], x: 140, y: 530, width: 80, spawn: 220, fuel: 1100 },
    { name: 'Fontaine de poussière', idea: 'La colonne orange pousse pendant trois quarts du cycle.', star: 'geyser', mechanics: ['geyser'], x: 136, y: 525, width: 88, spawn: 210, fuel: 1150 },
    { name: 'Le phare du silence', idea: 'Survoler la balise dorée avant de se poser.', star: 'balise', mechanics: ['balise'], x: 135, y: 525, width: 90, spawn: 220, fuel: 1100 },
    { name: 'Un ami dans la nuit', idea: 'Recueillir en vol le naufragé à gauche et rentrer à droite.', star: 'secours', mechanics: ['secours'], x: 215, y: 530, width: 90, spawn: 90, fuel: 1800 },
    { name: 'Le lac miroir', idea: 'Sur la glace, attendre l’arrêt avant la victoire.', star: 'glace', mechanics: ['glace'], x: 125, y: 520, width: 110, spawn: 220, fuel: 1100 },
    { name: 'Marché souterrain', idea: 'Choisir son quai sous la voûte après la balise.', star: 'choix', mechanics: ['choix', 'grotte', 'balise'], x: 128, y: 535, width: 100, spawn: 210, fuel: 1250 },
    { name: 'La poste errante', idea: 'Embarquer le cargo, puis viser le quai mobile dans le courant.', star: 'cargo', mechanics: ['cargo', 'mobile', 'tunnel'], x: 212, y: 530, width: 100, spawn: 90, fuel: 2100 },
    { name: 'Puits des comètes', idea: 'Recharger avant de traverser la zone légère et les météores.', star: 'meteores', mechanics: ['meteores', 'ravitaillement', 'gravite'], x: 215, y: 535, width: 92, spawn: 90, fuel: 650 },
    { name: 'Le refuge givré', idea: 'Sauver le compagnon dans la grotte, puis freiner sur la glace.', star: 'secours', mechanics: ['secours', 'grotte', 'glace'], x: 208, y: 540, width: 110, spawn: 90, fuel: 2100 },
    { name: 'Le signal des sources', idea: 'Valider la balise et suivre le quai au-dessus du geyser.', star: 'balise', mechanics: ['balise', 'mobile', 'geyser'], x: 130, y: 520, width: 100, spawn: 220, fuel: 1400 },
    { name: 'Les quais du blizzard', idea: 'Choisir une terrasse dans le vent et sous les météores.', star: 'tunnel', mechanics: ['tunnel', 'choix', 'meteores'], x: 133, y: 530, width: 94, spawn: 220, fuel: 1300 },
    { name: 'Cargo de cristal', idea: 'Transporter le colis dans la gravité légère vers la glace.', star: 'glace', mechanics: ['glace', 'cargo', 'gravite'], x: 207, y: 525, width: 110, spawn: 90, fuel: 2100 },
    { name: 'La citerne cachée', idea: 'Trouver le plein sous la voûte et repartir entre les jets.', star: 'ravitaillement', mechanics: ['ravitaillement', 'grotte', 'geyser'], x: 213, y: 535, width: 94, spawn: 90, fuel: 650 },
    { name: 'Le bac des rescapés', idea: 'Sauver le pilote puis rejoindre la navette sous les météores.', star: 'mobile', mechanics: ['mobile', 'secours', 'meteores'], x: 210, y: 530, width: 100, spawn: 90, fuel: 2200 },
    { name: 'Les trois phares', idea: 'La balise ouvre les quais dans la gravité légère.', star: 'gravite', mechanics: ['gravite', 'balise', 'choix'], x: 130, y: 525, width: 100, spawn: 220, fuel: 1300 },
    { name: 'La galerie postale', idea: 'Un colis à transporter sous la voûte et entre les jets.', star: 'grotte', mechanics: ['grotte', 'cargo', 'geyser'], x: 215, y: 540, width: 94, spawn: 90, fuel: 2200 },
    { name: 'L’ambulance du vent', idea: 'Ravitaillement, secours et retour dans le courant.', star: 'secours', mechanics: ['secours', 'ravitaillement', 'tunnel'], x: 213, y: 530, width: 94, spawn: 90, fuel: 650 },
    { name: 'La patinoire céleste', idea: 'Viser le quai glacé mobile après le passage des comètes.', star: 'glace', mechanics: ['glace', 'mobile', 'meteores'], x: 125, y: 535, width: 110, spawn: 210, fuel: 1450 },
    { name: 'Les deux citernes', idea: 'Choisir son arrivée après le plein, au-dessus du geyser.', star: 'geyser', mechanics: ['geyser', 'choix', 'ravitaillement'], x: 214, y: 535, width: 94, spawn: 90, fuel: 650 },
    { name: 'L’adresse des étoiles', idea: 'Prendre le colis, valider la balise, éviter les météores.', star: 'cargo', mechanics: ['cargo', 'balise', 'meteores'], x: 214, y: 530, width: 94, spawn: 90, fuel: 2200 },
    { name: 'Le phare englouti', idea: 'Viser la balise dans le courant sous la voûte.', star: 'balise', mechanics: ['balise', 'tunnel', 'grotte'], x: 132, y: 535, width: 96, spawn: 220, fuel: 1450 },
    { name: 'Le dernier plein', idea: 'Refaire le plein puis rejoindre le quai glacé mobile.', star: 'ravitaillement', mechanics: ['ravitaillement', 'glace', 'mobile'], x: 204, y: 540, width: 110, spawn: 90, fuel: 650 },
    { name: 'L’aube des retrouvailles', idea: 'Secourir le pilote dans la gravité légère entre les jets.', star: 'gravite', mechanics: ['gravite', 'secours', 'geyser'], x: 214, y: 535, width: 94, spawn: 90, fuel: 2300 },
];
