/** Page Codex : liste à gauche, fiche au centre, registre des vilains, import. */

import { TYPES } from '../config.js';
import * as store from '../store.js';
import * as combat from '../combat-store.js';
import { demarrerMJ, ficheDemandee } from '../mj.js';
import { monterListe } from '../views/liste.js';
import { monterFiche, passerEnEdition } from '../views/fiche.js';
import { monterVilains, ouvrirVilains, fermerVilains, registreOuvert, listerVilains } from '../views/vilains.js';
import { lireStatBloc } from '../statbloc.js';

const { annoncer, rafraichir } = demarrerMJ({
  actif: 'codex',
  extras: [
    { id: 'nouvelle', libelle: 'Nouvelle fiche', plein: true },
    { id: 'importer', libelle: 'Importer' },
    { id: 'vilains',  libelle: 'Vilains', compte: true },
  ],
});

monterListe(document.querySelector('#panneau-liste'));
monterFiche(document.querySelector('#panneau-fiche'), { signalerErreur: annoncer });
monterVilains(document.querySelector('#panneau-vilains'));

// ------------------------------------------------------------- barre

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

document.querySelector('#vilains').onclick = () => { combat.fermer(); ouvrirVilains(); };
document.querySelector('#combat').addEventListener('click', fermerVilains);

store.abonner(() => {
  const marque = document.querySelector('#vilains-compte');
  const nb = listerVilains().length;
  marque.hidden = !nb;
  marque.textContent = nb;
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && registreOuvert()) fermerVilains();
});

// ------------------------------------------------------------- import de stat block

const dialogueImport = document.querySelector('#import');
const formulaireImport = document.querySelector('#form-import');

document.querySelector('#importer').onclick = () => dialogueImport.showModal();
document.querySelector('#fermer-import').onclick = () => dialogueImport.close();

formulaireImport.onsubmit = async (e) => {
  e.preventDefault();
  try {
    const fiche = lireStatBloc(formulaireImport.texte.value);
    if (!fiche.nom) throw new Error('Impossible de lire un nom sur la première ligne.');
    await store.enregistrerEntite(fiche);
    passerEnEdition();
    store.selectionner(store.lire().selection);
    formulaireImport.reset();
    dialogueImport.close();
    annoncer('Fiche créée depuis le stat block. Vérifie et enregistre.', 'info');
  } catch (err) {
    annoncer(err.message);
  }
};

// ------------------------------------------------------------- chargement

// Une fiche demandée dans l'URL (depuis le graphe) s'ouvre dès que les données sont là.
const demandee = ficheDemandee();
if (demandee) {
  const arreter = store.abonner((etat) => {
    if (!etat.entites.length) return;
    arreter();
    if (store.entiteParId(demandee)) store.selectionner(demandee);
    history.replaceState(null, '', location.pathname);
  });
}

rafraichir();
