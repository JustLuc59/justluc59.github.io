/**
 * Lit un stat block collé (SRD français ou anglais, notes perso) et en tire
 * une fiche de type `monstre`. Heuristique volontairement tolérante : ce qui
 * n'est pas reconnu finit dans « Capacités », et la fiche s'ouvre en édition
 * pour que tu corriges ce qu'il faut.
 *
 * Aucun accès au DOM ni au store : `lireStatBloc(texte)` renvoie un objet.
 */

import { normaliserFP } from './regles.js';

/** Étiquettes reconnues en début de ligne → clé de la fiche. */
const ETIQUETTES = [
  { cle: 'ca',              motif: /^(classe d['’]armure|armor class|ac)\b/i },
  { cle: 'pv',              motif: /^(points de vie|hit points|hp)\b/i },
  { cle: 'vitesse',         motif: /^(vitesse|speed)\b/i },
  { cle: 'jets_sauvegarde', motif: /^(jets? de sauvegarde|saving throws?)\b/i },
  { cle: 'competences',     motif: /^(comp[ée]tences?|skills?)\b/i },
  { cle: 'vulnerabilites',  motif: /^(vuln[ée]rabilit[ée]s? aux d[ée]g[âa]ts|damage vulnerabilit(y|ies))\b/i },
  { cle: 'resistances',     motif: /^(r[ée]sistances? aux d[ée]g[âa]ts|damage resistances?)\b/i },
  { cle: 'immunites_etats', motif: /^(immunit[ée]s? (contre|aux) (les )?[ée]tats|condition immunit(y|ies))\b/i },
  { cle: 'immunites',       motif: /^(immunit[ée]s? aux d[ée]g[âa]ts|damage immunit(y|ies))\b/i },
  { cle: 'sens',            motif: /^(sens|senses)\b/i },
  { cle: 'langues',         motif: /^(langues?|languages?)\b/i },
  { cle: 'fp',              motif: /^(facteur de puissance|puissance|fp|challenge( rating)?|cr)\b/i },
];

/** Titres de section → clé de la fiche. */
const SECTIONS = [
  { cle: 'capacites',           motif: /^(capacit[ée]s|traits)$/i },
  { cle: 'actions_bonus',       motif: /^(actions? bonus|bonus actions?)$/i },
  { cle: 'actions_legendaires', motif: /^(actions? l[ée]gendaires?|legendary actions?)$/i },
  { cle: 'reactions',           motif: /^(r[ée]actions?)$/i },
  { cle: 'actions',             motif: /^(actions?)$/i },
];

const CARACS_ORDRE = ['force', 'dexterite', 'constitution', 'intelligence', 'sagesse', 'charisme'];
const LIGNE_EN_TETES_CARACS = /^((for|str|dex|con|int|sag|wis|cha)[\s|]*){2,6}$/i;
const LIGNE_DE_SCORES = /^[\s\d()+−–\-|]+$/;
const LIGNE_CARAC_INLINE = /^(for|str|dex|con|int|sag|wis|cha)\s+\d{1,2}\s*\(/i;
const TAILLES_FR = /\bde taille (TP|P|M|G|TG|Gig)\b/i;
const TAILLES_EN = /^(tiny|small|medium|large|huge|gargantuan)\b/i;

/**
 * @param {string} texte  le stat block brut
 * @returns {object} champs de fiche (type monstre) prêts pour store.enregistrerEntite
 */
export function lireStatBloc(texte) {
  const lignes = String(texte || '')
    .replace(/\r/g, '')
    .split('\n')
    .map((l) => l.replace(/\t/g, ' ').trim())
    .filter(Boolean);

  const fiche = { type: 'monstre', nom: '', resume: '', tags: '', notes: '' };
  if (!lignes.length) return fiche;

  fiche.nom = lignes.shift().replace(/[*_#]/g, '').trim();

  // Ligne « taille / type / alignement », si présente juste sous le nom.
  if (lignes.length && !reconnaitre(lignes[0]) && !estSection(lignes[0]) && /,/.test(lignes[0])) {
    const ligne = lignes.shift();
    const virgule = ligne.lastIndexOf(',');
    fiche.alignement = ligne.slice(virgule + 1).trim();
    let categorie = ligne.slice(0, virgule).trim();
    const fr = categorie.match(TAILLES_FR);
    const en = categorie.match(TAILLES_EN);
    if (fr) { fiche.taille = fr[1]; categorie = categorie.replace(TAILLES_FR, '').trim(); }
    if (en) { fiche.taille = en[1]; categorie = categorie.replace(TAILLES_EN, '').trim(); }
    fiche.categorie = categorie.replace(/^cr[ée]ature\s*/i, '').replace(/^[\s,;.]+|[\s,;.]+$/g, '');
  }

  // Caractéristiques : six paires « score (mod) », où qu'elles soient.
  const scores = [...lignes.join(' ').matchAll(/(\d{1,2})\s*\(\s*[+−–-]?\s*\d+\s*\)/g)].slice(0, 6);
  if (scores.length === 6) {
    CARACS_ORDRE.forEach((cle, i) => { fiche[cle] = scores[i][1]; });
  }

  // Le reste, ligne par ligne.
  let section = 'capacites';
  const blocs = {};

  for (const ligne of lignes) {
    if (LIGNE_EN_TETES_CARACS.test(ligne) || LIGNE_DE_SCORES.test(ligne) || LIGNE_CARAC_INLINE.test(ligne)) continue;

    const titre = SECTIONS.find((s) => s.motif.test(ligne));
    if (titre) { section = titre.cle; continue; }

    const etiquette = section === 'capacites' ? reconnaitre(ligne) : null;
    if (etiquette) {
      const valeur = ligne.replace(etiquette.motif, '').replace(/^\s*[:.]?\s*/, '').trim();
      appliquerEtiquette(fiche, etiquette.cle, valeur);
      continue;
    }

    (blocs[section] ||= []).push(ligne);
  }

  Object.entries(blocs).forEach(([cle, contenu]) => { fiche[cle] = contenu.join('\n'); });

  if (!fiche.resume) {
    fiche.resume = [fiche.categorie, fiche.niveau ? `FP ${fiche.niveau}` : ''].filter(Boolean).join(' · ');
  }
  return fiche;
}

function reconnaitre(ligne) {
  return ETIQUETTES.find((e) => e.motif.test(ligne)) || null;
}

function estSection(ligne) {
  return SECTIONS.some((s) => s.motif.test(ligne));
}

function appliquerEtiquette(fiche, cle, valeur) {
  if (cle === 'ca') {
    fiche.ca = premierNombre(valeur);
  } else if (cle === 'pv') {
    fiche.pv_max = premierNombre(valeur);
    const des = valeur.match(/\(([^)]+)\)/);
    if (des) fiche.pv_des = des[1].trim();
  } else if (cle === 'fp') {
    const fp = valeur.match(/^([\d]+\/[\d]+|[\d.,]+)/);
    fiche.niveau = fp ? normaliserFP(fp[1]) : valeur;
  } else {
    fiche[cle] = valeur;
  }
}

function premierNombre(texte) {
  const m = String(texte).match(/\d+/);
  return m ? m[0] : '';
}
