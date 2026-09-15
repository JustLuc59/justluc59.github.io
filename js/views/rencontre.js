/**
 * Fiche de type `rencontre` : composition (monstres × nombre), difficulté
 * calculée d'après le groupe, et lancement direct dans le tracker.
 *
 * La composition est stockée dans la colonne `composition` du Sheet sous la
 * forme "idMonstre:nb;idMonstre:nb". Le groupe = toutes les fiches Joueur qui
 * ont un niveau.
 */

import { TYPES } from '../config.js';
import * as store from '../store.js';
import * as combat from '../combat-store.js';
import { evaluerRencontre, xpDuFP, normaliserFP } from '../regles.js';
import { pastille } from './pastille.js';
import { echapper } from './liste.js';

// ------------------------------------------------------------- composition

/** "e8:3;e3:1" → [{ entite, nb }], en ignorant les fiches supprimées. */
export function lireComposition(texte) {
  return String(texte || '')
    .split(';')
    .map((part) => part.split(':'))
    .filter(([id]) => id)
    .map(([id, nb]) => ({ entite: store.entiteParId(id.trim()), nb: Math.max(1, Number(nb) || 1) }))
    .filter((l) => l.entite);
}

export function ecrireComposition(lignes) {
  return lignes.map((l) => `${l.id}:${l.nb}`).join(';');
}

/** Niveaux du groupe : fiches Joueur avec un niveau renseigné. */
export function niveauxDuGroupe() {
  return store.lire().entites
    .filter((e) => e.type === 'joueur' && Number(e.niveau) > 0)
    .map((e) => Number(e.niveau));
}

function evaluer(lignes) {
  return evaluerRencontre(
    lignes.map((l) => ({ fp: l.entite.niveau, nb: l.nb })),
    niveauxDuGroupe()
  );
}

function candidats() {
  return store.lire().entites
    .filter((e) => (TYPES[e.type] || {}).combat && e.type !== 'joueur')
    .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
}

// ------------------------------------------------------------- lecture

export function blocRencontre(entite) {
  const lignes = lireComposition(entite.composition);
  const bilan = evaluer(lignes);
  const groupe = niveauxDuGroupe();

  if (!lignes.length) {
    return `<section class="rencontre"><p class="vide">Aucun monstre. Clique sur Modifier pour composer la rencontre.</p></section>`;
  }

  return `
    <section class="rencontre">
      <table class="rencontre-table">
        <thead><tr><th>Créature</th><th>FP</th><th>Nb</th><th>PX</th></tr></thead>
        <tbody>
          ${lignes.map((l) => `
            <tr>
              <td><button class="lien-cible" data-aller="${l.entite.id}">${pastille(l.entite.type)}<span>${echapper(l.entite.nom)}</span></button></td>
              <td class="mono">${echapper(normaliserFP(l.entite.niveau) || '—')}</td>
              <td class="mono">×${l.nb}</td>
              <td class="mono">${xpDuFP(l.entite.niveau) * l.nb}</td>
            </tr>`).join('')}
        </tbody>
      </table>
      ${bilanHTML(bilan, groupe)}
      <div class="fiche-actions" style="margin-top:14px">
        <button class="bouton bouton--plein" data-action="lancer-rencontre">Lancer le combat</button>
      </div>
    </section>`;
}

export function bilanHTML(bilan, groupe) {
  return `
    <div class="bilan ${bilan.difficulte ? `bilan--${bilan.difficulte}` : ''}">
      <div class="chiffre">
        <span class="chiffre-libelle">Difficulté</span>
        <span class="chiffre-valeur">${bilan.difficulte || '—'}</span>
      </div>
      <div class="chiffre">
        <span class="chiffre-libelle">PX ajustés</span>
        <span class="chiffre-valeur">${bilan.xpAjuste}</span>
        <span class="indice">${bilan.xpBrut} × ${bilan.multiplicateur}</span>
      </div>
      <div class="chiffre">
        <span class="chiffre-libelle">PX / joueur</span>
        <span class="chiffre-valeur">${bilan.xpParJoueur}</span>
      </div>
      <p class="indice bilan-groupe">
        ${groupe.length
          ? `Groupe : ${groupe.length} joueur${groupe.length > 1 ? 's' : ''} (niv. ${groupe.join(', ')}). Seuils : facile ${bilan.seuils.facile} · moyenne ${bilan.seuils.moyenne} · difficile ${bilan.seuils.difficile} · mortelle ${bilan.seuils.mortelle}`
          : 'Renseigne le niveau sur tes fiches Joueur pour obtenir la difficulté.'}
      </p>
    </div>`;
}

export function brancherLectureRencontre(racine, entite, signalerErreur) {
  const bouton = racine.querySelector('[data-action="lancer-rencontre"]');
  if (!bouton) return;
  bouton.onclick = () => {
    const lignes = lireComposition(entite.composition);
    if (!lignes.length) return;
    if (combat.lire().combattants.length && confirm('Un combat est déjà en cours. Le vider avant de lancer cette rencontre ?')) {
      combat.vider();
    }
    lignes.forEach((l) => combat.ajouterDepuisFiche(l.entite, l.nb));
    // Les joueurs du groupe rejoignent automatiquement.
    store.lire().entites
      .filter((e) => e.type === 'joueur')
      .forEach((j) => combat.ajouterDepuisFiche(j, 1));
    combat.ouvrir();
  };
}

// ------------------------------------------------------------- édition

export function formulaireRencontre(entite) {
  const lignes = lireComposition(entite.composition);
  const choix = candidats();

  return `
    <fieldset class="groupe" data-compositeur>
      <legend class="registre-titre">Composition</legend>
      ${choix.length ? '' : `<p class="vide">Aucune fiche PNJ ou Monstre. Importe un stat block ou crée-en une.</p>`}
      <div class="rangees" data-rangees>
        ${lignes.map((l) => rangee(choix, l.entite.id, l.nb)).join('')}
      </div>
      ${choix.length ? `<button class="bouton bouton--mini" type="button" data-action="ajouter-rangee">+ Ajouter une créature</button>` : ''}
      <div data-apercu>${bilanHTML(evaluer(lignes), niveauxDuGroupe())}</div>
      <input type="hidden" name="composition" value="${echapper(entite.composition || '')}">
    </fieldset>
    <template data-rangee-vide>${choix.length ? rangee(choix, choix[0].id, 1) : ''}</template>`;
}

function rangee(choix, id, nb) {
  return `
    <div class="rangee rangee--composition" data-rangee>
      <select class="champ" data-comp-id>
        ${choix.map((c) => `<option value="${c.id}" ${c.id === id ? 'selected' : ''}>${echapper(c.nom)} — FP ${echapper(normaliserFP(c.niveau) || '?')}</option>`).join('')}
      </select>
      <input class="champ champ--mini" type="number" min="1" value="${nb}" data-comp-nb aria-label="Nombre">
      <button class="lien-retirer" type="button" data-action="retirer-rangee" title="Retirer">×</button>
    </div>`;
}

/**
 * Branche le compositeur. Appelé par fiche.js après affichage du formulaire.
 * Le champ caché `composition` est mis à jour à chaque changement : le
 * formulaire parent n'a rien de spécial à faire à l'enregistrement.
 */
export function brancherFormulaireRencontre(formulaire) {
  const bloc = formulaire.querySelector('[data-compositeur]');
  if (!bloc) return;
  const rangees = bloc.querySelector('[data-rangees]');
  const cache = bloc.querySelector('[name="composition"]');
  const apercu = bloc.querySelector('[data-apercu]');
  const gabarit = formulaire.querySelector('[data-rangee-vide]');

  function relire() {
    const lignes = [...rangees.querySelectorAll('[data-rangee]')].map((r) => ({
      id: r.querySelector('[data-comp-id]').value,
      nb: Math.max(1, Number(r.querySelector('[data-comp-nb]').value) || 1),
    }));
    cache.value = ecrireComposition(lignes);
    apercu.innerHTML = bilanHTML(evaluer(lireComposition(cache.value)), niveauxDuGroupe());
  }

  bloc.addEventListener('input', relire);
  bloc.addEventListener('change', relire);
  bloc.addEventListener('click', (e) => {
    const bouton = e.target.closest('[data-action]');
    if (!bouton) return;
    if (bouton.dataset.action === 'ajouter-rangee') {
      rangees.insertAdjacentHTML('beforeend', gabarit.innerHTML);
      relire();
    }
    if (bouton.dataset.action === 'retirer-rangee') {
      bouton.closest('[data-rangee]').remove();
      relire();
    }
  });
}
