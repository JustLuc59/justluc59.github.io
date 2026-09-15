/**
 * Sorts : la fiche d'un sort, la page bibliothèque, et la recherche rapide
 * qui s'affiche dans le tracker de combat.
 */

import * as sorts from '../sorts-store.js';
import { echapper } from './liste.js';

// ------------------------------------------------------------- fiche d'un sort

export function ficheSort(s) {
  const etiquettes = [
    sorts.libelleNiveau(s.niveau),
    s.ecole,
    s.rituel ? 'rituel' : '',
    s.concentration ? 'concentration' : '',
    s.perso ? 'perso' : '',
  ].filter(Boolean);

  return `
    <article class="sort">
      <header class="sort-tete">
        <h2 class="fiche-nom">${echapper(s.nom)}</h2>
        <p class="tags">${etiquettes.map((t) => `<span class="tag ${t === 'concentration' ? 'tag--actif' : ''}">${echapper(t)}</span>`).join('')}</p>
      </header>
      <dl class="statbloc-lignes">
        <div class="statbloc-ligne"><dt>Incantation</dt><dd>${echapper(s.incantation)}</dd></div>
        <div class="statbloc-ligne"><dt>Portée</dt><dd>${echapper(s.portee)}</dd></div>
        <div class="statbloc-ligne"><dt>Composantes</dt><dd>${echapper(s.composantes)}${s.materiel ? ` <span class="indice">(${echapper(s.materiel)})</span>` : ''}</dd></div>
        <div class="statbloc-ligne"><dt>Durée</dt><dd>${echapper(s.duree)}</dd></div>
        ${s.jds ? `<div class="statbloc-ligne"><dt>Sauvegarde</dt><dd>${echapper(s.jds)}</dd></div>` : ''}
        ${s.degats && s.degats.type ? `<div class="statbloc-ligne"><dt>Dégâts</dt><dd>${echapper(s.degats.type)}${degatsParNiveau(s.degats.par_niveau)}</dd></div>` : ''}
        <div class="statbloc-ligne"><dt>Classes</dt><dd>${s.classes.map(echapper).join(', ') || '—'}</dd></div>
      </dl>
      <div class="notes notes--sort">${paragraphes(s.description)}</div>
      ${s.niveaux_superieurs ? `<p class="statbloc-para"><strong>Aux niveaux supérieurs.</strong> ${echapper(s.niveaux_superieurs)}</p>` : ''}
    </article>`;
}

function degatsParNiveau(table) {
  const entrees = Object.entries(table || {});
  if (!entrees.length) return '';
  return ` <span class="indice">— ${entrees.map(([n, d]) => `${n} : ${d}`).join(' · ')}</span>`;
}

function paragraphes(texte) {
  return String(texte || '').split('\n').filter((l) => l.trim()).map((l) => `<p>${echapper(l)}</p>`).join('');
}

/** Une ligne de résultat, réutilisée par la page et par le combat. */
function ligneSort(s, actif) {
  return `
    <li class="ligne ligne--sort ${actif ? 'ligne--active' : ''}" data-sort="${echapper(s.id)}" tabindex="0">
      <span class="sort-niveau" title="${sorts.libelleNiveau(s.niveau)}">${s.niveau === 0 ? 'T' : s.niveau}</span>
      <span class="ligne-texte">
        <span class="ligne-nom">${echapper(s.nom)}${s.perso ? ' <span class="tag">perso</span>' : ''}</span>
        <span class="ligne-resume">${echapper(s.ecole)} · ${echapper(s.incantation)}${s.concentration ? ' · concentration' : ''}</span>
      </span>
    </li>`;
}

// ------------------------------------------------------------- page bibliothèque

export function monterBibliotheque(racineListe, racineFiche) {
  const filtres = { texte: '', niveau: '', classe: '', ecole: '', concentration: false, rituel: false };
  let selection = null;

  racineListe.innerHTML = `
    <div class="liste-tete">
      <input class="champ" id="sorts-texte" type="search" placeholder="Nom, école, mot de la description" aria-label="Chercher un sort">
      <div class="rangee rangee--filtres">
        <select class="champ" name="niveau" aria-label="Niveau">
          <option value="">Tous niveaux</option>
          <option value="0">Tours de magie</option>
          ${[1,2,3,4,5,6,7,8,9].map((n) => `<option value="${n}">Niveau ${n}</option>`).join('')}
        </select>
        <select class="champ" name="classe" aria-label="Classe">
          <option value="">Toutes classes</option>
          ${sorts.CLASSES.map((c) => `<option value="${c}">${c}</option>`).join('')}
        </select>
      </div>
      <div class="rangee rangee--filtres">
        <select class="champ" name="ecole" aria-label="École">
          <option value="">Toutes écoles</option>
          ${sorts.ECOLES.map((c) => `<option value="${c}">${c}</option>`).join('')}
        </select>
        <label class="case"><input type="checkbox" name="concentration"> Conc.</label>
        <label class="case"><input type="checkbox" name="rituel"> Rituel</label>
      </div>
      <p class="indice" id="sorts-compte"></p>
    </div>
    <ul class="liste" id="sorts-resultats"><li class="vide">Chargement des sorts…</li></ul>`;

  const resultats = racineListe.querySelector('#sorts-resultats');
  const compte = racineListe.querySelector('#sorts-compte');

  racineListe.querySelector('#sorts-texte').addEventListener('input', (e) => { filtres.texte = e.target.value; rendre(); });
  racineListe.querySelectorAll('select, input[type="checkbox"]').forEach((champ) => {
    champ.addEventListener('change', () => {
      filtres[champ.name] = champ.type === 'checkbox' ? champ.checked : champ.value;
      rendre();
    });
  });

  resultats.addEventListener('click', (e) => {
    const ligne = e.target.closest('[data-sort]');
    if (!ligne) return;
    selection = ligne.dataset.sort;
    rendre();
  });

  function rendre() {
    const liste = sorts.chercher(filtres);
    compte.textContent = `${liste.length} sort${liste.length > 1 ? 's' : ''}`;
    resultats.innerHTML = liste.length
      ? liste.map((s) => ligneSort(s, s.id === selection)).join('')
      : `<li class="vide">Aucun sort ne correspond.</li>`;

    const s = sorts.parId(selection);
    racineFiche.innerHTML = s ? ficheSort(s) : `<div class="vide vide--grand"><p>Choisis un sort à gauche.</p></div>`;
  }

  sorts.charger().then(rendre);
}

// ------------------------------------------------------------- recherche rapide (combat)

/**
 * Petit tiroir de recherche pour le tracker : un champ, dix résultats, la
 * fiche du sort cliqué. La bibliothèque se charge au premier caractère tapé.
 */
export function gabaritRechercheSort() {
  return `
    <details class="sort-tiroir" data-tiroir-sorts>
      <summary class="registre-titre">Chercher un sort</summary>
      <div class="sort-tiroir-corps">
        <input class="champ" type="search" placeholder="boule de feu, soin, dissipation…" data-sort-texte aria-label="Chercher un sort">
        <ul class="liste sort-tiroir-liste" data-sort-resultats></ul>
        <div data-sort-fiche></div>
      </div>
    </details>`;
}

export function brancherRechercheSort(racine) {
  const tiroir = racine.querySelector('[data-tiroir-sorts]');
  if (!tiroir) return;
  const champ = tiroir.querySelector('[data-sort-texte]');
  const liste = tiroir.querySelector('[data-sort-resultats]');
  const fiche = tiroir.querySelector('[data-sort-fiche]');

  // On garde ce qui était tapé et ouvert entre deux redessins du tracker.
  champ.value = memoire.texte;
  tiroir.open = memoire.ouvert;
  tiroir.ontoggle = () => { memoire.ouvert = tiroir.open; };

  async function rendre() {
    memoire.texte = champ.value;
    await sorts.charger();
    const terme = champ.value.trim();
    const trouves = terme ? sorts.chercher({ texte: terme, niveau: '' }).slice(0, 10) : [];
    liste.innerHTML = trouves.map((s) => ligneSort(s, s.id === memoire.selection)).join('');
    const s = sorts.parId(memoire.selection);
    fiche.innerHTML = s ? ficheSort(s) : '';
  }

  champ.addEventListener('input', () => { memoire.selection = null; rendre(); });
  liste.addEventListener('click', (e) => {
    const ligne = e.target.closest('[data-sort]');
    if (!ligne) return;
    memoire.selection = ligne.dataset.sort;
    rendre();
  });

  if (memoire.texte) rendre();
}

const memoire = { texte: '', selection: null, ouvert: false };
