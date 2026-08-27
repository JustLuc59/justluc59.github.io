/** Tracker de combat. Panneau qui recouvre l'appli pendant la bagarre. */

import { TYPES, CONDITIONS, signe } from '../config.js';
import * as store from '../store.js';
import * as combat from '../combat-store.js';
import { pastille } from './pastille.js';
import { echapper } from './liste.js';

export function monterCombat(racine) {
  function rendre(etat) {
    racine.hidden = !etat.ouvert;
    if (!etat.ouvert) return;

    racine.innerHTML = `
      <div class="combat-tete">
        <div class="compteur">
          <span class="compteur-libelle">Round</span>
          <span class="compteur-valeur">${etat.round}</span>
        </div>
        <div class="combat-tours">
          <button class="bouton" data-action="precedent">← Précédent</button>
          <button class="bouton bouton--plein" data-action="suivant">Tour suivant →</button>
        </div>
        <div class="combat-tete-fin">
          <button class="bouton" data-action="initiatives">Lancer les initiatives</button>
          <button class="bouton bouton--danger" data-action="vider">Fin du combat</button>
          <button class="bouton" data-action="fermer">Fermer</button>
        </div>
      </div>

      ${etat.combattants.length
        ? `<ol class="combat-liste">${etat.combattants.map((c, i) => ligne(c, i === etat.tour)).join('')}</ol>`
        : `<p class="vide vide--grand">Aucun combattant. Ajoute-les ci-dessous.</p>`}

      ${gabaritAjout()}
    `;

    brancher(racine);

    // Garde le combattant actif visible quand la liste est longue.
    racine.querySelector('.combattant--actif')?.scrollIntoView({ block: 'nearest' });
  }

  // ------------------------------------------------------------- lignes

  function ligne(c, actif) {
    const part = c.pvMax ? Math.max(0, Math.min(1, c.pv / c.pvMax)) : 0;
    const seuil = part === 0 ? 'mort' : part <= 0.33 ? 'critique' : part <= 0.66 ? 'entame' : 'sain';

    return `
      <li class="combattant ${actif ? 'combattant--actif' : ''} combattant--${seuil}" data-id="${c.id}">
        <input class="init" type="number" value="${c.initiative ?? ''}" placeholder="—"
               data-champ="initiative" aria-label="Initiative de ${echapper(c.nom)}">

        <span class="combattant-identite">
          ${pastille(c.type)}
          ${c.entiteId
            ? `<button class="combattant-nom lien-fiche" data-fiche="${c.entiteId}">${echapper(c.nom)}</button>`
            : `<span class="combattant-nom">${echapper(c.nom)}</span>`}
          <span class="dex" title="Modificateur de Dextérité">DEX ${signe(c.modDex)}</span>
        </span>

        <span class="ca" title="Classe d'armure">CA ${c.ca || '—'}</span>

        <span class="pv">
          <span class="jauge"><span class="jauge-plein" style="width:${part * 100}%"></span></span>
          <input class="pv-champ" type="number" value="${c.pv}" data-champ="pv" aria-label="PV de ${echapper(c.nom)}">
          <span class="pv-max">/ ${c.pvMax || '—'}</span>
        </span>

        <span class="degats">
          <input class="champ champ--mini" type="number" min="1" placeholder="0" data-montant>
          <button class="bouton bouton--mini bouton--danger" data-action="degats">Dégâts</button>
          <button class="bouton bouton--mini" data-action="soins">Soins</button>
        </span>

        <button class="bouton bouton--mini" data-action="etats">États</button>
        <button class="lien-retirer" data-action="retirer" title="Retirer du combat">×</button>

        ${c.conditions.length
          ? `<span class="etats-actifs">${c.conditions.map((e) =>
              `<button class="tag tag--actif" data-etat="${echapper(e)}">${echapper(e)} ×</button>`).join('')}</span>`
          : ''}

        <div class="etats-choix" hidden>
          ${CONDITIONS.map((e) => `<button class="tag ${c.conditions.includes(e) ? 'tag--actif' : ''}" data-etat="${echapper(e)}">${echapper(e)}</button>`).join('')}
        </div>
      </li>`;
  }

  // ------------------------------------------------------------- ajout

  function gabaritAjout() {
    const fiches = store.lire().entites
      .filter((e) => (TYPES[e.type] || {}).combat)
      .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));

    return `
      <div class="combat-ajout">
        <form class="combat-ajout-bloc" data-form="fiche">
          <h3 class="registre-titre">Depuis le codex</h3>
          ${fiches.length ? `
            <div class="rangee">
              <select class="champ" name="entite" required>
                ${fiches.map((e) => `<option value="${e.id}">${echapper(e.nom)} — ${TYPES[e.type].libelle}</option>`).join('')}
              </select>
              <input class="champ champ--mini" name="nb" type="number" min="1" value="1" aria-label="Nombre">
              <button class="bouton bouton--plein" type="submit">Ajouter</button>
            </div>`
          : `<p class="vide">Aucune fiche de type PNJ, Monstre ou Joueur pour l’instant.</p>`}
        </form>

        <form class="combat-ajout-bloc" data-form="libre">
          <h3 class="registre-titre">Sur le pouce</h3>
          <div class="rangee">
            <input class="champ" name="nom" placeholder="Bandit" required>
            <input class="champ champ--mini" name="ca" type="number" placeholder="CA" aria-label="Classe d'armure">
            <input class="champ champ--mini" name="pvMax" type="number" placeholder="PV" aria-label="Points de vie">
            <input class="champ champ--mini" name="nb" type="number" min="1" value="1" aria-label="Nombre">
            <button class="bouton bouton--plein" type="submit">Ajouter</button>
          </div>
        </form>
      </div>`;
  }

  // ------------------------------------------------------------- branchements

  function brancher(racine) {
    const action = (nom, fonction) => {
      racine.querySelectorAll(`[data-action="${nom}"]`).forEach((bouton) => {
        bouton.onclick = () => fonction(bouton.closest('[data-id]')?.dataset.id, bouton);
      });
    };

    action('suivant', () => combat.suivant());
    action('precedent', () => combat.precedent());
    action('fermer', () => combat.fermer());
    action('initiatives', () => combat.lancerInitiatives(true));
    action('vider', () => { if (confirm('Vider le combat en cours ?')) combat.vider(); });
    action('retirer', (id) => combat.retirer(id));

    action('etats', (id, bouton) => {
      const choix = bouton.closest('.combattant').querySelector('.etats-choix');
      choix.hidden = !choix.hidden;
    });

    action('degats', (id, bouton) => appliquerPv(id, bouton, -1));
    action('soins', (id, bouton) => appliquerPv(id, bouton, +1));

    function appliquerPv(id, bouton, sens) {
      const champ = bouton.closest('.degats').querySelector('[data-montant]');
      const montant = Math.abs(Number(champ.value));
      if (montant) combat.ajusterPv(id, sens * montant);
    }

    // Saisie directe de l'initiative ou des PV.
    racine.querySelectorAll('[data-champ]').forEach((champ) => {
      champ.onchange = () => {
        const id = champ.closest('[data-id]').dataset.id;
        const valeur = champ.value === '' ? null : Number(champ.value);
        combat.modifier(id, { [champ.dataset.champ]: valeur });
        if (champ.dataset.champ === 'initiative') combat.trier();
      };
    });

    racine.querySelectorAll('[data-etat]').forEach((bouton) => {
      bouton.onclick = () => combat.basculerCondition(
        bouton.closest('[data-id]').dataset.id, bouton.dataset.etat
      );
    });

    racine.querySelectorAll('[data-fiche]').forEach((bouton) => {
      bouton.onclick = () => { store.selectionner(bouton.dataset.fiche); combat.fermer(); };
    });

    const depuisFiche = racine.querySelector('[data-form="fiche"]');
    if (depuisFiche) depuisFiche.onsubmit = (e) => {
      e.preventDefault();
      const champs = Object.fromEntries(new FormData(depuisFiche));
      const entite = store.entiteParId(champs.entite);
      if (entite) combat.ajouterDepuisFiche(entite, Math.max(1, Number(champs.nb) || 1));
    };

    const libre = racine.querySelector('[data-form="libre"]');
    libre.onsubmit = (e) => {
      e.preventDefault();
      const champs = Object.fromEntries(new FormData(libre));
      combat.ajouterLibre({ ...champs, nb: Math.max(1, Number(champs.nb) || 1) });
      libre.reset();
      libre.nb.value = 1;
    };
  }

  combat.abonner(rendre);
  store.abonner(() => { if (combat.lire().ouvert) rendre(combat.lire()); });
  rendre(combat.lire());
}
