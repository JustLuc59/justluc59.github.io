/** Colonne de gauche : recherche, filtres, liste des entités. */

import { TYPES } from '../config.js';
import * as store from '../store.js';
import { pastille } from './pastille.js';

export function monterListe(racine) {
  racine.innerHTML = `
    <div class="liste-tete">
      <input class="champ" id="recherche" type="search" placeholder="Chercher un nom, un tag, une note" aria-label="Chercher">
      <div class="filtres" id="filtres" role="group" aria-label="Filtrer par type"></div>
    </div>
    <ul class="liste" id="resultats"></ul>
  `;

  const filtres = racine.querySelector('#filtres');
  const resultats = racine.querySelector('#resultats');
  const recherche = racine.querySelector('#recherche');

  recherche.addEventListener('input', (e) => store.chercher(e.target.value));

  // Un bouton « Tous » puis un par type déclaré dans config.js.
  const onglets = [['tous', 'Tous'], ...Object.entries(TYPES).map(([cle, t]) => [cle, t.libelle])];
  filtres.innerHTML = onglets
    .map(([cle, libelle]) => `<button class="filtre" data-type="${cle}">${libelle}</button>`)
    .join('');
  filtres.addEventListener('click', (e) => {
    const bouton = e.target.closest('.filtre');
    if (bouton) store.filtrer(bouton.dataset.type);
  });

  resultats.addEventListener('click', (e) => {
    const ligne = e.target.closest('.ligne');
    if (ligne) store.selectionner(ligne.dataset.id);
  });

  function rendre(etat) {
    filtres.querySelectorAll('.filtre').forEach((bouton) => {
      bouton.setAttribute('aria-pressed', String(bouton.dataset.type === etat.filtreType));
    });

    const visibles = store.entitesVisibles();

    if (!visibles.length) {
      resultats.innerHTML = `<li class="vide">${
        etat.entites.length
          ? 'Aucune fiche ne correspond.'
          : 'Aucune fiche pour l’instant. Crée la première avec « Nouvelle fiche ».'
      }</li>`;
      return;
    }

    resultats.innerHTML = visibles
      .map((entite) => {
        const nbLiens = store.liensDe(entite.id).length;
        return `
        <li class="ligne ${entite.id === etat.selection ? 'ligne--active' : ''}" data-id="${entite.id}" tabindex="0">
          ${pastille(entite.type)}
          <span class="ligne-texte">
            <span class="ligne-nom">${echapper(entite.nom || 'Sans nom')}</span>
            <span class="ligne-resume">${echapper(entite.resume || '')}</span>
          </span>
          <span class="ligne-liens" title="${nbLiens} lien(s)">${nbLiens}</span>
        </li>`;
      })
      .join('');
  }

  store.abonner(rendre);
  rendre(store.lire());
}

export function echapper(texte) {
  return String(texte).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])
  );
}
