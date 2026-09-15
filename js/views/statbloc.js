/**
 * Morceaux de fiche propres aux créatures : bandeau vilain, portrait,
 * bloc de statistiques complet. Utilisés par `fiche.js` en lecture et en édition.
 */

import { CHAMPS_STATBLOC, CHAMPS_JOUEUR, RANGS_MENACE, STATUTS_VILAIN, STATUTS_TERMINES, LIENS_SBIRE } from '../config.js';
import * as store from '../store.js';
import { pastille } from './pastille.js';
import { echapper } from './liste.js';

export function rangDe(entite) {
  return RANGS_MENACE.find((r) => r.cle === entite.menace) || null;
}

export function estVilain(entite) {
  return Boolean(rangDe(entite));
}

export function estTermine(entite) {
  return STATUTS_TERMINES.includes(entite.statut);
}

/** Fiches reliées à ce vilain par un lien de type « sbire de », « sert »… */
export function sbiresDe(id) {
  return store.liensDe(id)
    .filter((l) => l.sens === 'entrant' && LIENS_SBIRE.includes((l.relation.type || '').trim()))
    .map((l) => l.autre);
}

/** Étiquette de rang colorée. */
export function badgeRang(entite) {
  const rang = rangDe(entite);
  if (!rang) return '';
  return `<span class="rang" style="--teinte:${rang.couleur}">${rang.libelle}</span>`;
}

// ------------------------------------------------------------- lecture

/** Portrait, rang, statut et plan — au-dessus des chiffres de combat. */
export function blocVilain(entite) {
  if (!estVilain(entite)) return '';
  const sbires = sbiresDe(entite.id);
  return `
    <section class="bloc-vilain ${estTermine(entite) ? 'bloc-vilain--termine' : ''}">
      <div class="bloc-vilain-tete">
        ${entite.statut ? `<span class="statut statut--${echapper(entite.statut).replace(/\s/g, '-')}">${echapper(entite.statut)}</span>` : ''}
      </div>
      ${entite.plan ? `<p class="vilain-plan"><span class="plan-libelle">Plan en cours</span>${echapper(entite.plan).replace(/\n/g, '<br>')}</p>` : ''}
      ${sbires.length ? `
        <p class="sbires"><span class="plan-libelle">Réseau</span>
          ${sbires.map((s) => `<button class="lien-cible" data-aller="${s.id}">${pastille(s.type)}<span>${echapper(s.nom)}</span></button>`).join('')}
        </p>` : ''}
    </section>`;
}

export function portrait(entite, classe = 'portrait') {
  if (!entite.portrait) return '';
  return `<img class="${classe}" src="${echapper(entite.portrait)}" alt="" loading="lazy">`;
}

/** Tout le stat block, uniquement les lignes renseignées. */
export function blocStatBloc(entite) {
  const lignes = CHAMPS_STATBLOC.filter((c) => !c.zone && entite[c.cle]);
  const zones = CHAMPS_STATBLOC.filter((c) => c.zone && entite[c.cle]);
  if (!lignes.length && !zones.length) return '';

  return `
    <section class="statbloc">
      ${lignes.length ? `<dl class="statbloc-lignes">${lignes.map((c) => `
        <div class="statbloc-ligne"><dt>${c.libelle}</dt><dd>${echapper(entite[c.cle])}</dd></div>`).join('')}</dl>` : ''}
      ${zones.map((c) => `
        <div class="statbloc-zone">
          <h3 class="registre-titre">${c.libelle}</h3>
          ${paragraphes(entite[c.cle])}
        </div>`).join('')}
    </section>`;
}

/** « Nom de la capacité. Description » → nom en gras. */
function paragraphes(texte) {
  return String(texte).split('\n').filter((l) => l.trim()).map((l) => {
    const m = l.match(/^([^.:]{2,60}[.:])\s+(.*)$/);
    return m
      ? `<p class="statbloc-para"><strong>${echapper(m[1])}</strong> ${echapper(m[2])}</p>`
      : `<p class="statbloc-para">${echapper(l)}</p>`;
  }).join('');
}

// ------------------------------------------------------------- édition

export function formulaireVilain(entite) {
  return `
    <fieldset class="groupe">
      <legend class="registre-titre">Vilain <span class="indice">un rang suffit pour entrer au registre</span></legend>
      <div class="grille-saisie">
        <label class="etiquette etiquette--serree">Rang de menace
          <select class="champ" name="menace">
            <option value="">— aucun —</option>
            ${RANGS_MENACE.map((r) => `<option value="${r.cle}" ${r.cle === entite.menace ? 'selected' : ''}>${r.libelle}</option>`).join('')}
          </select>
        </label>
        <label class="etiquette etiquette--serree">Statut
          <select class="champ" name="statut">
            <option value="">—</option>
            ${STATUTS_VILAIN.map((s) => `<option value="${s}" ${s === entite.statut ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </label>
        <label class="etiquette etiquette--serree">Portrait <span class="indice">URL d'image</span>
          <input class="champ" name="portrait" type="url" value="${echapper(entite.portrait || '')}" placeholder="https://…">
        </label>
      </div>
      <label class="etiquette" style="margin-top:10px">Plan en cours <span class="indice">ce qu'il prépare, où il en est</span>
        <textarea class="champ champ--zone" name="plan" rows="3">${echapper(entite.plan || '')}</textarea>
      </label>
    </fieldset>`;
}

export function formulaireStatBloc(entite) {
  const lignes = CHAMPS_STATBLOC.filter((c) => !c.zone);
  const zones = CHAMPS_STATBLOC.filter((c) => c.zone);
  return `
    <details class="groupe groupe--pliable" ${zones.some((c) => entite[c.cle]) ? 'open' : ''}>
      <summary class="registre-titre">Stat block <span class="indice">rempli par l'import, tout est modifiable</span></summary>
      <div class="grille-saisie" style="margin-top:10px">
        ${lignes.map((c) => `
          <label class="etiquette etiquette--serree">${c.libelle}
            <input class="champ" name="${c.cle}" value="${echapper(entite[c.cle] || '')}">
          </label>`).join('')}
      </div>
      ${zones.map((c) => `
        <label class="etiquette" style="margin-top:12px">${c.libelle}
          <textarea class="champ champ--zone" name="${c.cle}" rows="4" placeholder="Une capacité par ligne : Nom. Description">${echapper(entite[c.cle] || '')}</textarea>
        </label>`).join('')}
    </details>`;
}

// ------------------------------------------------------------- joueur

/** Race, classe, PV actuels, inventaire, notes du joueur — sur une fiche Joueur. */
export function blocJoueur(entite) {
  if (entite.type !== 'joueur') return '';
  const lignes = CHAMPS_JOUEUR.filter((c) => !c.zone && entite[c.cle] !== undefined && entite[c.cle] !== '');
  const zones = CHAMPS_JOUEUR.filter((c) => c.zone && entite[c.cle]);
  return `
    <section class="statbloc">
      <dl class="statbloc-lignes">
        ${lignes.map((c) => `<div class="statbloc-ligne"><dt>${c.libelle}</dt><dd>${echapper(entite[c.cle])}${c.cle === 'pv_actuel' && entite.pv_max ? ` <span class="indice">/ ${echapper(entite.pv_max)}</span>` : ''}</dd></div>`).join('')}
        <div class="statbloc-ligne"><dt>Fiche joueur</dt><dd><a class="lien-fiche" href="joueur.html" target="_blank" rel="noopener">joueur.html</a> <span class="indice">— le joueur y modifie PV, inventaire et notes</span></dd></div>
      </dl>
      ${zones.map((c) => `
        <div class="statbloc-zone">
          <h3 class="registre-titre">${c.libelle}</h3>
          <div class="notes">${echapper(entite[c.cle]).replace(/\n/g, '<br>')}</div>
        </div>`).join('')}
    </section>`;
}

export function formulaireJoueur(entite) {
  if (entite.type !== 'joueur') return '';
  const lignes = CHAMPS_JOUEUR.filter((c) => !c.zone);
  const zones = CHAMPS_JOUEUR.filter((c) => c.zone);
  return `
    <fieldset class="groupe">
      <legend class="registre-titre">Joueur <span class="indice">les champs marqués ✎ sont aussi modifiables par le joueur</span></legend>
      <div class="grille-saisie">
        ${lignes.map((c) => `
          <label class="etiquette etiquette--serree">${c.libelle}${c.joueur ? ' ✎' : ''}
            <input class="champ" name="${c.cle}" type="${c.nombre ? 'number' : 'text'}" value="${echapper(entite[c.cle] || '')}">
          </label>`).join('')}
      </div>
      ${zones.map((c) => `
        <label class="etiquette" style="margin-top:12px">${c.libelle}${c.joueur ? ' ✎' : ''}
          <textarea class="champ champ--zone" name="${c.cle}" rows="4">${echapper(entite[c.cle] || '')}</textarea>
        </label>`).join('')}
    </fieldset>`;
}
