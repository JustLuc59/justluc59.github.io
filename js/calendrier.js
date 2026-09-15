/**
 * Calendrier de campagne : arithmétique sur les dates du monde.
 * Tout dépend de `CALENDRIER` dans config.js. Aucun accès au DOM ni au store.
 *
 * Une date = { jour (1..n), mois (index 0..), annee (entier) }.
 * Elle est stockée dans le Sheet sous forme de JSON dans le réglage `aujourdhui`.
 */

import { CALENDRIER } from './config.js';

export function joursParAn() {
  return CALENDRIER.mois.reduce((somme, m) => somme + m.jours, 0);
}

/** Nombre de jours écoulés depuis le 1er jour de l'an 0. Permet de comparer et d'avancer. */
export function numeroAbsolu({ jour, mois, annee }) {
  let n = Number(annee) * joursParAn();
  for (let i = 0; i < Number(mois); i++) n += CALENDRIER.mois[i].jours;
  return n + Number(jour) - 1;
}

export function depuisAbsolu(n) {
  const parAn = joursParAn();
  const annee = Math.floor(n / parAn);
  let reste = n - annee * parAn;
  let mois = 0;
  while (reste >= CALENDRIER.mois[mois].jours) {
    reste -= CALENDRIER.mois[mois].jours;
    mois += 1;
  }
  return { jour: reste + 1, mois, annee };
}

export function ajouterJours(date, n) {
  return depuisAbsolu(numeroAbsolu(date) + Number(n));
}

export function memeJour(a, b) {
  return a && b && numeroAbsolu(a) === numeroAbsolu(b);
}

export function jourDeSemaine(date) {
  const semaine = CALENDRIER.joursSemaine;
  return semaine[((numeroAbsolu(date) % semaine.length) + semaine.length) % semaine.length];
}

/** « 12 Vendanges 1492 CV » */
export function formater(date, { semaine = false } = {}) {
  if (!date) return '';
  const m = CALENDRIER.mois[date.mois] || { nom: '?' };
  const texte = `${date.jour} ${m.nom} ${date.annee}${CALENDRIER.suffixeAnnee ? ' ' + CALENDRIER.suffixeAnnee : ''}`;
  return semaine ? `${jourDeSemaine(date)} ${texte}` : texte;
}

/** Lit une date depuis le réglage (JSON) ; retombe sur la date initiale du config. */
export function lireDate(texte) {
  try {
    const d = JSON.parse(texte || 'null');
    if (d && Number.isFinite(Number(d.jour)) && Number.isFinite(Number(d.mois)) && Number.isFinite(Number(d.annee))) {
      return { jour: Number(d.jour), mois: Number(d.mois), annee: Number(d.annee) };
    }
  } catch (err) { /* réglage illisible : on retombe sur la date initiale */ }
  return { ...CALENDRIER.dateInitiale };
}

/** Un événement du Sheet (colonnes en chaînes) → sa date. */
export function dateDe(evenement) {
  return { jour: Number(evenement.jour), mois: Number(evenement.mois), annee: Number(evenement.annee) };
}

/** Écart en jours entre aujourd'hui et une date : « dans 3 jours », « il y a 2 jours », « aujourd'hui ». */
export function ecartTexte(date, aujourdhui) {
  const delta = numeroAbsolu(date) - numeroAbsolu(aujourdhui);
  if (delta === 0) return "aujourd'hui";
  if (delta === 1) return 'demain';
  if (delta === -1) return 'hier';
  return delta > 0 ? `dans ${delta} jours` : `il y a ${-delta} jours`;
}
