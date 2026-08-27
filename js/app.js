/** Assemble l'appli : barre du haut, trois panneaux, boîte de connexion. */

import { TYPES } from './config.js';
import * as api from './api.js';
import * as store from './store.js';
import { DEMO } from './demo.js';
import { monterListe } from './views/liste.js';
import { monterFiche, passerEnEdition } from './views/fiche.js';
import { monterGraphe } from './views/graphe.js';
import { monterCombat } from './views/combat.js';
import * as combat from './combat-store.js';

const bandeau = document.querySelector('#bandeau');
const dialogue = document.querySelector('#connexion');

monterListe(document.querySelector('#panneau-liste'));
monterFiche(document.querySelector('#panneau-fiche'), { signalerErreur: annoncer });
monterGraphe(document.querySelector('#panneau-graphe'));

combat.restaurer();
monterCombat(document.querySelector('#panneau-combat'));

// ------------------------------------------------------------- barre du haut

document.querySelector('#nouvelle').onclick = async () => {
  try {
    const premierType = Object.keys(TYPES)[0];
    await store.enregistrerEntite({ type: premierType, nom: 'Nouvelle fiche', resume: '', notes: '', tags: '' });
    passerEnEdition();
    store.selectionner(store.lire().selection); // redessine en mode édition
  } catch (err) {
    annoncer(err.message);
  }
};

document.querySelector('#combat').onclick = () => combat.ouvrir();
document.querySelector('#recharger').onclick = () => rafraichir();
document.querySelector('#ouvrir-connexion').onclick = () => ouvrirConnexion();
document.querySelector('#essayer').onclick = () => {
  store.chargerDemo(structuredClone(DEMO));
  annoncer('Mode démo : rien n’est envoyé au Sheet.', 'info');
};

// ------------------------------------------------------------- connexion

const formulaireConnexion = document.querySelector('#form-connexion');

function ouvrirConnexion() {
  const reglages = api.lireReglages();
  formulaireConnexion.url.value = reglages.url;
  formulaireConnexion.cle.value = reglages.cle;
  dialogue.showModal();
}

formulaireConnexion.onsubmit = async (e) => {
  e.preventDefault();
  api.ecrireReglages({
    url: formulaireConnexion.url.value.trim(),
    cle: formulaireConnexion.cle.value.trim(),
  });
  dialogue.close();
  await rafraichir();
};

document.querySelector('#fermer-connexion').onclick = () => dialogue.close();

// ------------------------------------------------------------- chargement

async function rafraichir() {
  if (!api.estConfiguree()) {
    annoncer('Aucun Sheet connecté. Ouvre Connexion, ou clique sur Démo pour essayer.', 'info');
    return;
  }
  try {
    annoncer('Lecture du Sheet…', 'info');
    await store.charger();
    annoncer('', 'info');
  } catch (err) {
    annoncer(err.message);
  }
}

function annoncer(message, ton = 'erreur') {
  bandeau.textContent = message;
  bandeau.className = message ? `bandeau bandeau--${ton}` : 'bandeau';
}

// Indique le mode démo dans la barre, en continu.
store.abonner((etat) => {
  document.querySelector('#etat-demo').hidden = !etat.demo;
});

// Le nombre de combattants s'affiche sur le bouton Combat.
combat.abonner((etat) => {
  const marque = document.querySelector('#combat-compte');
  marque.hidden = !etat.combattants.length;
  marque.textContent = etat.combattants.length;
});

// Raccourcis pendant le combat : Espace passe au tour suivant, Échap ferme.
document.addEventListener('keydown', (e) => {
  if (!combat.lire().ouvert) return;
  const saisie = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName);
  if (e.code === 'Space' && !saisie) { e.preventDefault(); combat.suivant(); }
  if (e.key === 'Escape') combat.fermer();
});

rafraichir();
