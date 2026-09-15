/**
 * Réglages de l'appli. C'est le premier fichier à modifier.
 */

/**
 * Types d'entités. Ajoute une entrée et elle apparaît partout :
 * filtres, formulaire, graphe. Le sigle est la lettre affichée dans la pastille.
 *
 * `combat: true` donne à ce type un bloc de caractéristiques sur sa fiche
 * et le rend ajoutable au tracker de combat.
 */
export const TYPES = {
  pnj:     { libelle: 'PNJ',      sigle: 'P', couleur: '#C9A227', combat: true },
  monstre: { libelle: 'Monstre',  sigle: 'M', couleur: '#A6584A', combat: true },
  joueur:  { libelle: 'Joueur',   sigle: 'J', couleur: '#D98E4A', combat: true },
  lieu:    { libelle: 'Lieu',     sigle: 'L', couleur: '#5C9EAD' },
  faction: { libelle: 'Faction',  sigle: 'F', couleur: '#B2453C' },
  objet:   { libelle: 'Objet',    sigle: 'O', couleur: '#8E7CC3' },
  quete:   { libelle: 'Quête',    sigle: 'Q', couleur: '#7FA65C' },
  session: { libelle: 'Session',  sigle: 'S', couleur: '#8E99A6' },
  rencontre: { libelle: 'Rencontre', sigle: 'R', couleur: '#C25E9A' },
};

/** Suggestions proposées dans le champ « type de lien ». Le champ reste libre. */
export const TYPES_DE_LIEN = [
  'habite à',
  'membre de',
  'dirige',
  'allié de',
  'rival de',
  'possède',
  'situé dans',
  'rencontré par',
  'quête donnée par',
  'apparaît en',
  'sbire de',
  'lieutenant de',
  'sert',
];

/**
 * Types de lien qui font d'une fiche le sbire d'une autre. Le registre des
 * vilains les utilise pour compter et lister le réseau de chaque antagoniste.
 */
export const LIENS_SBIRE = ['sbire de', 'lieutenant de', 'sert'];

/**
 * Rangs de menace. Une fiche PNJ ou Monstre qui porte un rang entre dans le
 * registre des vilains. L'ordre de la liste est l'ordre d'affichage.
 */
export const RANGS_MENACE = [
  { cle: 'sbire',      libelle: 'Sbire',      couleur: '#8E99A6' },
  { cle: 'lieutenant', libelle: 'Lieutenant', couleur: '#D98E4A' },
  { cle: 'nemesis',    libelle: 'Némésis',    couleur: '#B2453C' },
  { cle: 'seigneur',   libelle: 'Seigneur',   couleur: '#C9A227' },
];

/** Statuts d'un vilain. « vaincu » et « mort » grisent la carte. */
export const STATUTS_VILAIN = ['actif', 'en fuite', 'capturé', 'vaincu', 'mort'];
export const STATUTS_TERMINES = ['vaincu', 'mort'];

/**
 * Chiffres de combat. Pour en ajouter un, mets-le ici ET dans
 * `ONGLETS.entites` de Code.gs, puis relance `initialiser()`.
 */
export const CHAMPS_COMBAT = [
  { cle: 'niveau', libelle: 'Niveau / FP', texte: true }, // texte : accepte « 1/4 »
  { cle: 'ca',     libelle: 'CA' },
  { cle: 'pv_max', libelle: 'PV max' },
];

/**
 * Bloc de statistiques complet (façon SRD). Rempli par l'import de stat block,
 * modifiable à la main. `zone: true` = texte long sur plusieurs lignes.
 * Chaque clé doit aussi exister dans `ONGLETS.entites` de Code.gs.
 */
export const CHAMPS_STATBLOC = [
  { cle: 'taille',            libelle: 'Taille' },
  { cle: 'categorie',         libelle: 'Type de créature' },
  { cle: 'alignement',        libelle: 'Alignement' },
  { cle: 'pv_des',            libelle: 'Dés de vie' },
  { cle: 'vitesse',           libelle: 'Vitesse' },
  { cle: 'jets_sauvegarde',   libelle: 'Jets de sauvegarde' },
  { cle: 'competences',       libelle: 'Compétences' },
  { cle: 'sens',              libelle: 'Sens' },
  { cle: 'langues',           libelle: 'Langues' },
  { cle: 'resistances',       libelle: 'Résistances aux dégâts' },
  { cle: 'immunites',         libelle: 'Immunités aux dégâts' },
  { cle: 'vulnerabilites',    libelle: 'Vulnérabilités aux dégâts' },
  { cle: 'immunites_etats',   libelle: 'Immunités contre les états' },
  { cle: 'capacites',         libelle: 'Capacités',          zone: true },
  { cle: 'actions',           libelle: 'Actions',            zone: true },
  { cle: 'actions_bonus',     libelle: 'Actions bonus',      zone: true },
  { cle: 'reactions',         libelle: 'Réactions',          zone: true },
  { cle: 'actions_legendaires', libelle: 'Actions légendaires', zone: true },
];

/**
 * Champs propres aux fiches Joueur. Ceux marqués `joueur: true` sont
 * modifiables par le joueur lui-même depuis joueur.html ; les autres ne le
 * sont que par le MJ. Chaque clé doit exister dans `ONGLETS.entites` de Code.gs
 * ET dans `CHAMPS_JOUEUR_MODIFIABLES` de Code.gs pour ceux du joueur.
 */
export const CHAMPS_JOUEUR = [
  { cle: 'race',         libelle: 'Race / espèce' },
  { cle: 'classe',       libelle: 'Classe' },
  { cle: 'pv_actuel',    libelle: 'PV actuels',   joueur: true, nombre: true },
  { cle: 'inventaire',   libelle: 'Inventaire',   joueur: true, zone: true },
  { cle: 'notes_joueur', libelle: 'Notes du joueur', joueur: true, zone: true },
];

/**
 * Calendrier de la campagne. Change les noms et les durées : tout le reste
 * (semaine, avance des jours, affichage) suit. Une année = la somme des mois.
 */
export const CALENDRIER = {
  mois: [
    { nom: 'Givre',       jours: 30 },
    { nom: 'Dégel',       jours: 30 },
    { nom: 'Semailles',   jours: 30 },
    { nom: 'Floraison',   jours: 30 },
    { nom: 'Foin',        jours: 30 },
    { nom: 'Moisson',     jours: 30 },
    { nom: 'Vendanges',   jours: 30 },
    { nom: 'Brume',       jours: 30 },
    { nom: 'Frimas',      jours: 30 },
    { nom: 'Longue-Nuit', jours: 30 },
    { nom: 'Cendres',     jours: 30 },
    { nom: 'Aubes',       jours: 30 },
  ],
  joursSemaine: ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'],
  suffixeAnnee: 'CV',   // affiché après l'année : 1492 CV
  dateInitiale: { jour: 1, mois: 0, annee: 1492 },  // si le Sheet n'a encore rien
};

/** Caractéristiques. Le modificateur est calculé, jamais saisi. */
export const CARACS = [
  { cle: 'force',        libelle: 'FOR' },
  { cle: 'dexterite',    libelle: 'DEX' },
  { cle: 'constitution', libelle: 'CON' },
  { cle: 'intelligence', libelle: 'INT' },
  { cle: 'sagesse',      libelle: 'SAG' },
  { cle: 'charisme',     libelle: 'CHA' },
];

/** États proposés dans le tracker. Liste libre, adapte-la à ta table. */
export const CONDITIONS = [
  'À terre', 'Agrippé', 'Assourdi', 'Aveuglé', 'Charmé', 'Concentration',
  'Effrayé', 'Empoisonné', 'Entravé', 'Étourdi', 'Inconscient',
  'Invisible', 'Paralysé', 'Pétrifié',
];

/** Modificateur D&D 5e : (score − 10) ÷ 2, arrondi vers le bas. */
export function modificateur(score) {
  const valeur = Number(score);
  if (!Number.isFinite(valeur) || valeur === 0) return 0;
  return Math.floor((valeur - 10) / 2);
}

/** Affiche un modificateur avec son signe : +3, −1, +0. */
export function signe(valeur) {
  return (valeur >= 0 ? '+' : '−') + Math.abs(valeur);
}

/**
 * Connexion à l'API Apps Script.
 *
 * Laisse ces deux valeurs vides si ton dépôt GitHub est public : l'appli
 * demandera l'URL et la clé au premier lancement et les gardera dans le
 * navigateur. Ne commite jamais ta clé dans un dépôt public.
 */
export const API_PAR_DEFAUT = {
  url: '',
  cle: '',
};
