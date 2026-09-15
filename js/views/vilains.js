/**
 * Registre des vilains : toutes les fiches qui portent un rang de menace,
 * en cartes. Panneau qui recouvre l'appli, comme le combat.
 */

import { RANGS_MENACE } from '../config.js';
import * as store from '../store.js';
import { pastille } from './pastille.js';
import { echapper } from './liste.js';
import { estVilain, estTermine, rangDe, badgeRang, sbiresDe, portrait } from './statbloc.js';

let ouvert = false;
let voirTermines = false;
let rendreActuel = () => {};

export function ouvrirVilains() { ouvert = true; rendreActuel(); }
export function fermerVilains() { ouvert = false; rendreActuel(); }
export function registreOuvert() { return ouvert; }

/** Les vilains, du rang le plus élevé au plus bas, les vaincus en fin. */
export function listerVilains() {
  const ordre = (e) => RANGS_MENACE.findIndex((r) => r.cle === e.menace);
  return store.lire().entites
    .filter(estVilain)
    .sort((a, b) =>
      Number(estTermine(a)) - Number(estTermine(b)) ||
      ordre(b) - ordre(a) ||
      a.nom.localeCompare(b.nom, 'fr'));
}

export function monterVilains(racine) {
  function rendre() {
    racine.hidden = !ouvert;
    if (!ouvert) return;

    const tous = listerVilains();
    const visibles = voirTermines ? tous : tous.filter((v) => !estTermine(v));
    const nbTermines = tous.length - tous.filter((v) => !estTermine(v)).length;

    racine.innerHTML = `
      <div class="combat-tete">
        <h2 class="registre-grand-titre">Registre des vilains <span class="compte">${tous.length}</span></h2>
        <div class="combat-tete-fin">
          ${nbTermines ? `<button class="bouton" data-action="basculer-termines">${voirTermines ? 'Masquer' : 'Voir'} les vaincus (${nbTermines})</button>` : ''}
          <button class="bouton" data-action="fermer">Fermer</button>
        </div>
      </div>

      ${visibles.length
        ? `<div class="cartes">${visibles.map(carte).join('')}</div>`
        : `<div class="vide vide--grand"><p>Aucun vilain. Ouvre une fiche PNJ ou Monstre, clique Modifier et donne-lui un rang de menace.</p></div>`}
    `;

    racine.querySelector('[data-action="fermer"]').onclick = fermerVilains;
    const basculer = racine.querySelector('[data-action="basculer-termines"]');
    if (basculer) basculer.onclick = () => { voirTermines = !voirTermines; rendre(); };

    racine.querySelectorAll('[data-aller]').forEach((bouton) => {
      bouton.onclick = () => { store.selectionner(bouton.dataset.aller); fermerVilains(); };
    });
  }

  function carte(v) {
    const rang = rangDe(v);
    const sbires = sbiresDe(v.id);
    return `
      <article class="carte ${estTermine(v) ? 'carte--termine' : ''}" style="--teinte:${rang.couleur}">
        <div class="carte-visuel">
          ${v.portrait ? portrait(v, 'carte-portrait') : `<div class="carte-pastille">${pastille(v.type)}</div>`}
          ${badgeRang(v)}
        </div>
        <div class="carte-corps">
          <h3 class="carte-nom"><button class="lien-fiche" data-aller="${v.id}">${echapper(v.nom)}</button></h3>
          ${v.resume ? `<p class="carte-resume">${echapper(v.resume)}</p>` : ''}
          <div class="carte-chiffres">
            <span class="ca">CA ${v.ca || '—'}</span>
            <span class="ca">PV ${v.pv_max || '—'}</span>
            ${v.niveau ? `<span class="ca">FP ${echapper(v.niveau)}</span>` : ''}
            ${v.statut ? `<span class="statut statut--${echapper(v.statut).replace(/\s/g, '-')}">${echapper(v.statut)}</span>` : ''}
          </div>
          ${v.plan ? `<p class="carte-plan">${echapper(v.plan)}</p>` : ''}
          ${sbires.length ? `
            <p class="carte-sbires">
              <span class="plan-libelle">${sbires.length} sbire${sbires.length > 1 ? 's' : ''}</span>
              ${sbires.slice(0, 6).map((s) => `<button class="tag" data-aller="${s.id}">${echapper(s.nom)}</button>`).join('')}
              ${sbires.length > 6 ? `<span class="tag">+${sbires.length - 6}</span>` : ''}
            </p>` : ''}
        </div>
      </article>`;
  }

  rendreActuel = rendre;
  store.abonner(() => { if (ouvert) rendre(); });
  rendre();
}
