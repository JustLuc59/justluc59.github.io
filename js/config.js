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
];

/**
 * Chiffres de combat. Pour en ajouter un, mets-le ici ET dans
 * `ONGLETS.entites` de Code.gs, puis relance `initialiser()`.
 */
export const CHAMPS_COMBAT = [
  { cle: 'niveau', libelle: 'Niveau / FP' },
  { cle: 'ca',     libelle: 'CA' },
  { cle: 'pv_max', libelle: 'PV max' },
];

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
