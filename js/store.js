/**
 * État central. Toutes les vues lisent ici et s'abonnent aux changements.
 * Un seul endroit modifie les données : ce fichier.
 */

import { appeler } from './api.js';

/**
 * Copie locale des données. Elle est affichée dès l'ouverture d'une page,
 * pendant que le Sheet est relu en arrière-plan : changer de page est
 * instantané. Le Sheet reste la référence — la copie n'est qu'un cache.
 */
const CLE_CACHE = 'mj-codex:cache';

const etat = {
  entites: [],
  relations: [],
  evenements: [],    // calendrier de campagne
  reglages: {},      // paires clé/valeur du Sheet (ex. : aujourdhui)
  selection: null,   // id de l'entité affichée
  recherche: '',
  filtreType: 'tous',
  demo: false,       // true = rien n'est envoyé au Sheet
  occupe: false,
};

const abonnes = new Set();

export function abonner(fonction) {
  abonnes.add(fonction);
  return () => abonnes.delete(fonction);
}

function diffuser() {
  abonnes.forEach((fonction) => fonction(etat));
}

export function lire() {
  return etat;
}

// ---------------------------------------------------------------
// Lectures dérivées
// ---------------------------------------------------------------

export function entiteParId(id) {
  return etat.entites.find((e) => e.id === id) || null;
}

/** Liste filtrée par la recherche et le type, triée par nom. */
export function entitesVisibles() {
  const terme = etat.recherche.trim().toLowerCase();
  return etat.entites
    .filter((e) => etat.filtreType === 'tous' || e.type === etat.filtreType)
    .filter((e) => {
      if (!terme) return true;
      return [e.nom, e.resume, e.tags, e.notes]
        .join(' ')
        .toLowerCase()
        .includes(terme);
    })
    .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
}

/**
 * Liens d'une entité, dans les deux sens.
 * `sens` vaut 'sortant' (elle est la source) ou 'entrant' (elle est la cible).
 */
export function liensDe(id) {
  return etat.relations
    .filter((r) => r.source === id || r.cible === id)
    .map((r) => ({
      relation: r,
      sens: r.source === id ? 'sortant' : 'entrant',
      autre: entiteParId(r.source === id ? r.cible : r.source),
    }))
    .filter((lien) => lien.autre);
}

// ---------------------------------------------------------------
// Écritures
// ---------------------------------------------------------------

export function selectionner(id) {
  etat.selection = id;
  diffuser();
}

export function chercher(terme) {
  etat.recherche = terme;
  diffuser();
}

export function filtrer(type) {
  etat.filtreType = type;
  diffuser();
}

export async function charger() {
  etat.occupe = true;
  diffuser();
  try {
    const donnees = await appeler('charger');
    etat.entites = donnees.entites;
    etat.relations = donnees.relations;
    etat.evenements = donnees.evenements || [];
    etat.reglages = donnees.reglages || {};
    etat.demo = false;
    conserverCache();
  } finally {
    etat.occupe = false;
    diffuser();
  }
}

/** Affiche la dernière copie connue, sans réseau. Renvoie true si elle existait. */
export function restaurerCache() {
  try {
    const copie = JSON.parse(localStorage.getItem(CLE_CACHE) || 'null');
    if (!copie || !Array.isArray(copie.entites)) return false;
    etat.entites = copie.entites;
    etat.relations = copie.relations || [];
    etat.evenements = copie.evenements || [];
    etat.reglages = copie.reglages || {};
    etat.demo = false;
    diffuser();
    return true;
  } catch (err) {
    console.warn('Copie locale illisible, on relit le Sheet.', err);
    return false;
  }
}

export function oublierCache() {
  try { localStorage.removeItem(CLE_CACHE); } catch (err) { /* rien à faire */ }
}

function conserverCache() {
  if (etat.demo) return;
  try {
    localStorage.setItem(CLE_CACHE, JSON.stringify({
      entites: etat.entites, relations: etat.relations, evenements: etat.evenements, reglages: etat.reglages,
    }));
  } catch (err) {
    console.warn('Copie locale non conservée (trop volumineuse ?).', err);
  }
}

export async function enregistrerEntite(entite) {
  const enregistree = etat.demo
    ? { ...entite, id: entite.id || idLocal('e') }
    : await appeler('enregistrerEntite', entite);
  remplacer(etat.entites, enregistree);
  etat.selection = enregistree.id;
  conserverCache();
  diffuser();
  return enregistree;
}

export async function supprimerEntite(id) {
  if (!etat.demo) await appeler('supprimerEntite', { id });
  etat.entites = etat.entites.filter((e) => e.id !== id);
  etat.relations = etat.relations.filter((r) => r.source !== id && r.cible !== id);
  if (etat.selection === id) etat.selection = null;
  conserverCache();
  diffuser();
}

export async function enregistrerRelation(relation) {
  const enregistree = etat.demo
    ? { ...relation, id: relation.id || idLocal('r') }
    : await appeler('enregistrerRelation', relation);
  remplacer(etat.relations, enregistree);
  conserverCache();
  diffuser();
  return enregistree;
}

export async function supprimerRelation(id) {
  if (!etat.demo) await appeler('supprimerRelation', { id });
  etat.relations = etat.relations.filter((r) => r.id !== id);
  conserverCache();
  diffuser();
}

// ------------------------------------------------------------- calendrier

export async function enregistrerEvenement(evenement) {
  const enregistre = etat.demo
    ? { ...evenement, id: evenement.id || idLocal('v') }
    : await appeler('enregistrerEvenement', evenement);
  remplacer(etat.evenements, enregistre);
  conserverCache();
  diffuser();
  return enregistre;
}

export async function supprimerEvenement(id) {
  if (!etat.demo) await appeler('supprimerEvenement', { id });
  etat.evenements = etat.evenements.filter((v) => v.id !== id);
  conserverCache();
  diffuser();
}

/** Écrit un réglage (chaîne). Les objets sont sérialisés en JSON par l'appelant. */
export async function ecrireReglage(cle, valeur) {
  if (!etat.demo) await appeler('ecrireReglage', { cle, valeur });
  etat.reglages = { ...etat.reglages, [cle]: valeur };
  conserverCache();
  diffuser();
}

/** Charge un jeu d'exemple, sans toucher au Sheet. Pratique pour essayer. */
export function chargerDemo(donnees) {
  etat.entites = donnees.entites;
  etat.relations = donnees.relations;
  etat.evenements = donnees.evenements || [];
  etat.reglages = donnees.reglages || {};
  etat.demo = true;
  etat.selection = donnees.entites[0]?.id || null;
  diffuser();
}

// ---------------------------------------------------------------

function remplacer(liste, enregistrement) {
  const index = liste.findIndex((x) => x.id === enregistrement.id);
  if (index === -1) liste.push(enregistrement);
  else liste[index] = enregistrement;
}

function idLocal(prefixe) {
  return prefixe + '_' + Math.random().toString(36).slice(2, 10);
}
