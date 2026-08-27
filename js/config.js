/**
 * Réglages de l'appli. C'est le premier fichier à modifier.
 */

/**
 * Types d'entités. Ajoute une entrée et elle apparaît partout :
 * filtres, formulaire, graphe. Le sigle est la lettre affichée dans la pastille.
 */
export const TYPES = {
  pnj:     { libelle: 'PNJ',      sigle: 'P', couleur: '#C9A227' },
  lieu:    { libelle: 'Lieu',     sigle: 'L', couleur: '#5C9EAD' },
  faction: { libelle: 'Faction',  sigle: 'F', couleur: '#B2453C' },
  objet:   { libelle: 'Objet',    sigle: 'O', couleur: '#8E7CC3' },
  quete:   { libelle: 'Quête',    sigle: 'Q', couleur: '#7FA65C' },
  session: { libelle: 'Session',  sigle: 'S', couleur: '#8E99A6' },
  joueur:  { libelle: 'Joueur',   sigle: 'J', couleur: '#D98E4A' },
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
