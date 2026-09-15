/**
 * Règles D&D 5e utilisées par le constructeur de rencontres.
 * Tables issues du SRD 5.1 (CC-BY-4.0). Pure fonction : aucun accès au DOM ni au store.
 */

/** PX rapportés par un monstre selon son facteur de puissance. */
export const XP_PAR_FP = {
  '0': 10, '1/8': 25, '1/4': 50, '1/2': 100,
  '1': 200, '2': 450, '3': 700, '4': 1100, '5': 1800,
  '6': 2300, '7': 2900, '8': 3900, '9': 5000, '10': 5900,
  '11': 7200, '12': 8400, '13': 10000, '14': 11500, '15': 13000,
  '16': 15000, '17': 18000, '18': 20000, '19': 22000, '20': 25000,
  '21': 33000, '22': 41000, '23': 50000, '24': 62000, '25': 75000,
  '26': 90000, '27': 105000, '28': 120000, '29': 135000, '30': 155000,
};

/** Seuils de PX par personnage et par niveau : [facile, moyen, difficile, mortel]. */
export const SEUILS_PAR_NIVEAU = {
  1:  [25, 50, 75, 100],
  2:  [50, 100, 150, 200],
  3:  [75, 150, 225, 400],
  4:  [125, 250, 375, 500],
  5:  [250, 500, 750, 1100],
  6:  [300, 600, 900, 1400],
  7:  [350, 750, 1100, 1700],
  8:  [450, 900, 1400, 2100],
  9:  [550, 1100, 1600, 2400],
  10: [600, 1200, 1900, 2800],
  11: [800, 1600, 2400, 3600],
  12: [1000, 2000, 3000, 4500],
  13: [1100, 2200, 3400, 5100],
  14: [1250, 2500, 3800, 5700],
  15: [1400, 2800, 4300, 6400],
  16: [1600, 3200, 4800, 7200],
  17: [2000, 3900, 5900, 8800],
  18: [2100, 4200, 6300, 9500],
  19: [2400, 4900, 7300, 10900],
  20: [2800, 5700, 8500, 12700],
};

export const DIFFICULTES = ['triviale', 'facile', 'moyenne', 'difficile', 'mortelle'];

/** Multiplicateur selon le nombre de monstres (table du DMG). */
const PALIERS = [
  { min: 1,  mult: 1 },
  { min: 2,  mult: 1.5 },
  { min: 3,  mult: 2 },
  { min: 7,  mult: 2.5 },
  { min: 11, mult: 3 },
  { min: 15, mult: 4 },
];

/** Normalise un FP saisi : "0.25" → "1/4", " 3 " → "3", "1/2" → "1/2". */
export function normaliserFP(valeur) {
  const texte = String(valeur ?? '').trim().replace(',', '.');
  if (!texte) return '';
  if (texte in XP_PAR_FP) return texte;
  const n = Number(texte);
  if (n === 0.125) return '1/8';
  if (n === 0.25) return '1/4';
  if (n === 0.5) return '1/2';
  if (Number.isInteger(n) && n >= 0 && n <= 30) return String(n);
  return texte;
}

/** Valeur numérique d'un FP, pour trier. */
export function fpEnNombre(valeur) {
  const fp = normaliserFP(valeur);
  if (fp.includes('/')) { const [a, b] = fp.split('/'); return Number(a) / Number(b); }
  const n = Number(fp);
  return Number.isFinite(n) ? n : 0;
}

export function xpDuFP(valeur) {
  return XP_PAR_FP[normaliserFP(valeur)] ?? 0;
}

/**
 * Évalue une rencontre.
 * @param {Array<{fp: string|number, nb: number}>} monstres
 * @param {number[]} niveaux  niveau de chaque joueur du groupe
 */
export function evaluerRencontre(monstres, niveaux) {
  const nbMonstres = monstres.reduce((somme, m) => somme + (Number(m.nb) || 0), 0);
  const xpBrut = monstres.reduce((somme, m) => somme + xpDuFP(m.fp) * (Number(m.nb) || 0), 0);

  // Palier de multiplicateur, décalé selon la taille du groupe.
  let indexPalier = PALIERS.findIndex((p, i) => nbMonstres >= p.min && (i === PALIERS.length - 1 || nbMonstres < PALIERS[i + 1].min));
  if (indexPalier === -1) indexPalier = 0;
  const groupe = niveaux.length;
  if (groupe > 0 && groupe < 3) indexPalier = Math.min(PALIERS.length - 1, indexPalier + 1);
  if (groupe >= 6) indexPalier = Math.max(0, indexPalier - 1);
  const multiplicateur = nbMonstres ? PALIERS[indexPalier].mult : 1;

  const xpAjuste = Math.round(xpBrut * multiplicateur);

  const seuils = niveaux.reduce((acc, niveau) => {
    const ligne = SEUILS_PAR_NIVEAU[Math.max(1, Math.min(20, Number(niveau) || 1))];
    return acc.map((v, i) => v + ligne[i]);
  }, [0, 0, 0, 0]);

  let difficulte = null;
  if (groupe) {
    difficulte = DIFFICULTES[0];
    seuils.forEach((seuil, i) => { if (xpAjuste >= seuil) difficulte = DIFFICULTES[i + 1]; });
  }

  return {
    nbMonstres,
    xpBrut,
    multiplicateur,
    xpAjuste,
    seuils: { facile: seuils[0], moyenne: seuils[1], difficile: seuils[2], mortelle: seuils[3] },
    difficulte,
    xpParJoueur: groupe ? Math.floor(xpBrut / groupe) : xpBrut,
  };
}
