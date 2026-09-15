/**
 * Bibliothèque de sorts. Lue depuis deux fichiers statiques :
 *   data/sorts.json        le SRD 5.1 en français (ne pas modifier à la main :
 *                          il sera remplacé lors d'une mise à jour)
 *   data/sorts-perso.json  tes sorts maison, même format, jamais écrasé
 *
 * Chargée à la demande (première recherche), puis gardée en mémoire.
 */

let sorts = null;
let chargement = null;

export const ECOLES = ['Abjuration', 'Conjuration', 'Divination', 'Enchantement', 'Évocation', 'Illusion', 'Nécromancie', 'Transmutation'];
export const CLASSES = ['Barde', 'Clerc', 'Druide', 'Ensorceleur', 'Magicien', 'Occultiste', 'Paladin', 'Rôdeur'];

export function charger() {
  if (sorts) return Promise.resolve(sorts);
  if (chargement) return chargement;
  chargement = Promise.all([
    lireFichier('data/sorts.json'),
    lireFichier('data/sorts-perso.json').then((liste) => liste.map((s) => ({ ...s, perso: true }))),
  ]).then(([srd, perso]) => {
    sorts = [...perso, ...srd].sort((a, b) => a.niveau - b.niveau || a.nom.localeCompare(b.nom, 'fr'));
    return sorts;
  });
  return chargement;
}

async function lireFichier(chemin) {
  try {
    const reponse = await fetch(chemin);
    if (!reponse.ok) return [];
    return await reponse.json();
  } catch (err) {
    console.warn('Fichier de sorts illisible :', chemin, err);
    return [];
  }
}

/** Tous les sorts chargés, ou [] si `charger()` n'a pas encore abouti. */
export function tous() {
  return sorts || [];
}

export function parId(id) {
  return tous().find((s) => s.id === id) || null;
}

/**
 * Filtre la bibliothèque.
 * @param {object} filtres  { texte, niveau ('' | 0..9), classe, ecole, concentration, rituel }
 */
export function chercher(filtres = {}) {
  const terme = normaliser(filtres.texte || '');
  const parLeNom = (s) => normaliser(s.nom).includes(terme);
  const trouves = tous().filter((s) => {
    if (filtres.niveau !== '' && filtres.niveau != null && s.niveau !== Number(filtres.niveau)) return false;
    if (filtres.classe && !s.classes.includes(filtres.classe)) return false;
    if (filtres.ecole && s.ecole !== filtres.ecole) return false;
    if (filtres.concentration && !s.concentration) return false;
    if (filtres.rituel && !s.rituel) return false;
    if (terme) {
      const cible = normaliser(`${s.nom} ${s.ecole} ${s.classes.join(' ')}`);
      // Le nom d'abord ; si rien, on cherche aussi dans la description.
      if (!cible.includes(terme) && !normaliser(s.description).includes(terme)) return false;
    }
    return true;
  });
  // Les sorts dont le nom correspond passent avant ceux trouvés dans la description.
  return terme ? trouves.sort((a, b) => Number(parLeNom(b)) - Number(parLeNom(a))) : trouves;
}

/** Minuscules sans accents, pour que « eclair » trouve « Éclair ». */
export function normaliser(texte) {
  return String(texte).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function libelleNiveau(niveau) {
  return niveau === 0 ? 'Tour de magie' : `Niveau ${niveau}`;
}
