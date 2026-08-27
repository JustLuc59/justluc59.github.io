/**
 * État central. Toutes les vues lisent ici et s'abonnent aux changements.
 * Un seul endroit modifie les données : ce fichier.
 */

import { appeler } from './api.js';

const etat = {
  entites: [],
  relations: [],
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
    etat.demo = false;
  } finally {
    etat.occupe = false;
    diffuser();
  }
}

export async function enregistrerEntite(entite) {
  const enregistree = etat.demo
    ? { ...entite, id: entite.id || idLocal('e') }
    : await appeler('enregistrerEntite', entite);
  remplacer(etat.entites, enregistree);
  etat.selection = enregistree.id;
  diffuser();
  return enregistree;
}

export async function supprimerEntite(id) {
  if (!etat.demo) await appeler('supprimerEntite', { id });
  etat.entites = etat.entites.filter((e) => e.id !== id);
  etat.relations = etat.relations.filter((r) => r.source !== id && r.cible !== id);
  if (etat.selection === id) etat.selection = null;
  diffuser();
}

export async function enregistrerRelation(relation) {
  const enregistree = etat.demo
    ? { ...relation, id: relation.id || idLocal('r') }
    : await appeler('enregistrerRelation', relation);
  remplacer(etat.relations, enregistree);
  diffuser();
  return enregistree;
}

export async function supprimerRelation(id) {
  if (!etat.demo) await appeler('supprimerRelation', { id });
  etat.relations = etat.relations.filter((r) => r.id !== id);
  diffuser();
}

/** Charge un jeu d'exemple, sans toucher au Sheet. Pratique pour essayer. */
export function chargerDemo(donnees) {
  etat.entites = donnees.entites;
  etat.relations = donnees.relations;
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
