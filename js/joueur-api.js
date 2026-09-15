/**
 * Accès côté joueur. Volontairement indépendant de api.js et store.js :
 * cette page n'a jamais la clé du MJ, seulement CODE_JOUEUR (voir Code.gs),
 * qui ne permet que de lire sa fiche et d'y modifier quelques champs.
 */

const CLE_STOCKAGE = 'mj-codex:joueur';
let reglages = { url: '', code: '', id: '' };

try {
  const sauvegarde = localStorage.getItem(CLE_STOCKAGE);
  if (sauvegarde) reglages = { ...reglages, ...JSON.parse(sauvegarde) };
} catch (err) {
  console.warn('Réglages joueur non relus.', err);
}

export function lireReglages() { return { ...reglages }; }

export function ecrireReglages(nouveaux) {
  reglages = { ...reglages, ...nouveaux };
  try { localStorage.setItem(CLE_STOCKAGE, JSON.stringify(reglages)); }
  catch (err) { console.warn('Réglages joueur non conservés.', err); }
}

export function estConfiguree() { return Boolean(reglages.url && reglages.code); }

export async function appeler(action, contenu = {}) {
  if (!estConfiguree()) throw new Error("Adresse ou code manquant.");
  let reponse;
  try {
    reponse = await fetch(reglages.url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ cle: reglages.code, action, contenu }),
      redirect: 'follow',
    });
  } catch (err) {
    throw new Error("Pas de réponse. Vérifie l'adresse et ta connexion.");
  }
  if (!reponse.ok) throw new Error('Erreur ' + reponse.status + '.');
  const resultat = await reponse.json();
  if (!resultat.ok) throw new Error(resultat.erreur || 'Refusé.');
  return resultat.donnees;
}
