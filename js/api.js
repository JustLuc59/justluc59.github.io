/**
 * Appels vers l'API Apps Script.
 *
 * Note technique : on envoie du `text/plain` volontairement. Avec
 * `application/json`, le navigateur déclenche une requête OPTIONS de
 * vérification que les Apps Script ne savent pas traiter, et l'appel échoue.
 */

import { API_PAR_DEFAUT } from './config.js';

const CLE_STOCKAGE = 'mj-codex:api';
let reglages = { ...API_PAR_DEFAUT };

// Réglages mémorisés d'une visite à l'autre, avec repli si le navigateur bloque.
try {
  const sauvegarde = localStorage.getItem(CLE_STOCKAGE);
  if (sauvegarde) reglages = { ...reglages, ...JSON.parse(sauvegarde) };
} catch (err) {
  console.warn('Réglages non relus depuis le navigateur.', err);
}

export function lireReglages() {
  return { ...reglages };
}

export function ecrireReglages(nouveaux) {
  reglages = { ...reglages, ...nouveaux };
  try {
    localStorage.setItem(CLE_STOCKAGE, JSON.stringify(reglages));
  } catch (err) {
    console.warn('Réglages non conservés pour la prochaine visite.', err);
  }
}

export function estConfiguree() {
  return Boolean(reglages.url && reglages.cle);
}

/**
 * Envoie une action au Sheet et renvoie les données.
 * @param {string} action  charger | enregistrerEntite | supprimerEntite | ...
 * @param {object} contenu corps de l'action
 */
export async function appeler(action, contenu = {}) {
  if (!estConfiguree()) {
    throw new Error("Connexion au Sheet non renseignée. Ouvre Connexion pour l'ajouter.");
  }

  let reponse;
  try {
    reponse = await fetch(reglages.url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ cle: reglages.cle, action, contenu }),
      redirect: 'follow',
    });
  } catch (err) {
    throw new Error("Le Sheet n'a pas répondu. Vérifie l'URL de déploiement et ta connexion.");
  }

  if (!reponse.ok) {
    throw new Error('Le Sheet a renvoyé une erreur ' + reponse.status + '.');
  }

  const resultat = await reponse.json();
  if (!resultat.ok) throw new Error(resultat.erreur || 'Action refusée par le Sheet.');
  return resultat.donnees;
}
