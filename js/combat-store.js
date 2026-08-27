/**
 * État du combat en cours.
 *
 * Volontairement séparé du store des fiches : un combat est éphémère et
 * n'est jamais écrit dans le Sheet. Les dégâts encaissés par un PNJ ne
 * modifient donc pas ses PV max sur sa fiche.
 *
 * Le combat est gardé dans le navigateur : un rechargement de page en
 * pleine bagarre ne fait rien perdre.
 */

import { modificateur } from './config.js';

const CLE_STOCKAGE = 'mj-codex:combat';

const etat = {
  ouvert: false,
  round: 1,
  tour: 0,          // index dans `combattants`
  combattants: [],
};

const abonnes = new Set();

export function abonner(fonction) {
  abonnes.add(fonction);
  return () => abonnes.delete(fonction);
}

export function lire() {
  return etat;
}

function diffuser() {
  conserver();
  abonnes.forEach((fonction) => fonction(etat));
}

// ------------------------------------------------------------- persistance

function conserver() {
  try {
    localStorage.setItem(CLE_STOCKAGE, JSON.stringify({
      round: etat.round, tour: etat.tour, combattants: etat.combattants,
    }));
  } catch (err) {
    console.warn('Combat non conservé pour la prochaine visite.', err);
  }
}

export function restaurer() {
  try {
    const sauvegarde = JSON.parse(localStorage.getItem(CLE_STOCKAGE) || 'null');
    if (sauvegarde && Array.isArray(sauvegarde.combattants)) {
      etat.round = sauvegarde.round || 1;
      etat.tour = sauvegarde.tour || 0;
      etat.combattants = sauvegarde.combattants;
    }
  } catch (err) {
    console.warn('Combat précédent illisible, on repart à vide.', err);
  }
}

// ------------------------------------------------------------- ouverture

export function ouvrir() { etat.ouvert = true; diffuser(); }
export function fermer() { etat.ouvert = false; diffuser(); }

export function vider() {
  etat.combattants = [];
  etat.round = 1;
  etat.tour = 0;
  diffuser();
}

// ------------------------------------------------------------- combattants

/** Ajoute une entité du codex. `nb > 1` crée « Gobelin 1 », « Gobelin 2 »… */
export function ajouterDepuisFiche(entite, nb = 1) {
  const pvMax = nombre(entite.pv_max);
  for (let i = 0; i < nb; i++) {
    etat.combattants.push(construire({
      entiteId: entite.id,
      nom: nb > 1 ? `${entite.nom} ${i + 1}` : entite.nom,
      type: entite.type,
      ca: nombre(entite.ca),
      pvMax,
      modDex: modificateur(entite.dexterite),
    }));
  }
  diffuser();
}

/** Ajoute un combattant improvisé, sans fiche derrière. */
export function ajouterLibre({ nom, ca, pvMax, nb = 1 }) {
  for (let i = 0; i < nb; i++) {
    etat.combattants.push(construire({
      entiteId: null,
      nom: nb > 1 ? `${nom} ${i + 1}` : nom,
      type: 'monstre',
      ca: nombre(ca),
      pvMax: nombre(pvMax),
      modDex: 0,
    }));
  }
  diffuser();
}

function construire({ entiteId, nom, type, ca, pvMax, modDex }) {
  return {
    id: 'c_' + Math.random().toString(36).slice(2, 10),
    entiteId,
    nom,
    type,
    ca,
    pvMax,
    pv: pvMax,
    modDex,
    initiative: null,
    conditions: [],
    note: '',
  };
}

export function retirer(id) {
  const index = etat.combattants.findIndex((c) => c.id === id);
  if (index === -1) return;
  etat.combattants.splice(index, 1);
  if (etat.tour >= etat.combattants.length) etat.tour = 0;
  diffuser();
}

export function modifier(id, champs) {
  const combattant = etat.combattants.find((c) => c.id === id);
  if (!combattant) return;
  Object.assign(combattant, champs);
  diffuser();
}

/** Applique des dégâts (delta négatif) ou des soins. Borné entre 0 et PV max. */
export function ajusterPv(id, delta) {
  const combattant = etat.combattants.find((c) => c.id === id);
  if (!combattant) return;
  const plafond = combattant.pvMax || Infinity;
  combattant.pv = Math.max(0, Math.min(plafond, combattant.pv + delta));
  diffuser();
}

export function basculerCondition(id, condition) {
  const combattant = etat.combattants.find((c) => c.id === id);
  if (!combattant) return;
  const index = combattant.conditions.indexOf(condition);
  if (index === -1) combattant.conditions.push(condition);
  else combattant.conditions.splice(index, 1);
  diffuser();
}

// ------------------------------------------------------------- initiative

/** Lance 1d20 + mod. DEX. `toutes = false` épargne les valeurs déjà saisies. */
export function lancerInitiatives(toutes = false) {
  etat.combattants.forEach((c) => {
    if (toutes || c.initiative === null) {
      c.initiative = 1 + Math.floor(Math.random() * 20) + c.modDex;
    }
  });
  trier();
}

/** Tri décroissant, départage par modificateur de DEX puis par nom. */
export function trier() {
  const actif = etat.combattants[etat.tour];
  etat.combattants.sort((a, b) =>
    (b.initiative ?? -99) - (a.initiative ?? -99) ||
    b.modDex - a.modDex ||
    a.nom.localeCompare(b.nom, 'fr')
  );
  const index = etat.combattants.indexOf(actif);
  etat.tour = index === -1 ? 0 : index;
  diffuser();
}

// ------------------------------------------------------------- tours

export function suivant() {
  if (!etat.combattants.length) return;
  etat.tour += 1;
  if (etat.tour >= etat.combattants.length) {
    etat.tour = 0;
    etat.round += 1;
  }
  diffuser();
}

export function precedent() {
  if (!etat.combattants.length) return;
  etat.tour -= 1;
  if (etat.tour < 0) {
    etat.tour = etat.combattants.length - 1;
    etat.round = Math.max(1, etat.round - 1);
  }
  diffuser();
}

function nombre(valeur) {
  const n = Number(valeur);
  return Number.isFinite(n) ? n : 0;
}
