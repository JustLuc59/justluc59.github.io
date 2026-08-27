/** Colonne centrale : la fiche de l'entité sélectionnée. */

import { TYPES, TYPES_DE_LIEN } from '../config.js';
import * as store from '../store.js';
import { pastille } from './pastille.js';
import { echapper } from './liste.js';

let enEdition = false;

export function monterFiche(racine, { signalerErreur }) {
  function rendre(etat) {
    const entite = store.entiteParId(etat.selection);

    if (!entite) {
      enEdition = false;
      racine.innerHTML = `
        <div class="vide vide--grand">
          <p>Choisis une fiche à gauche, ou crée-en une.</p>
        </div>`;
      return;
    }

    racine.innerHTML = enEdition ? gabaritFormulaire(entite) : gabaritLecture(entite);
    enEdition ? brancherFormulaire(racine, entite) : brancherLecture(racine, entite);
  }

  // ------------------------------------------------------------- lecture

  function gabaritLecture(entite) {
    const liens = store.liensDe(entite.id);
    return `
      <article class="fiche">
        <header class="fiche-tete">
          ${pastille(entite.type)}
          <div>
            <h2 class="fiche-nom">${echapper(entite.nom || 'Sans nom')}</h2>
            <p class="fiche-resume">${echapper(entite.resume || '')}</p>
          </div>
          <div class="fiche-actions">
            <button class="bouton" data-action="modifier">Modifier</button>
            <button class="bouton bouton--danger" data-action="supprimer">Supprimer</button>
          </div>
        </header>

        ${entite.tags ? `<p class="tags">${entite.tags.split(',').map((t) =>
          `<span class="tag">${echapper(t.trim())}</span>`).join('')}</p>` : ''}

        ${entite.notes ? `<div class="notes">${echapper(entite.notes).replace(/\n/g, '<br>')}</div>` : ''}

        <section class="registre">
          <h3 class="registre-titre">Liens <span class="compte">${liens.length}</span></h3>
          ${liens.length ? `<ul class="registre-liste">${liens.map(ligneDeLien).join('')}</ul>`
                         : `<p class="vide">Aucun lien. Relie cette fiche à une autre ci-dessous.</p>`}
          ${gabaritAjoutLien(entite)}
        </section>
      </article>`;
  }

  function ligneDeLien({ relation, sens, autre }) {
    const fleche = sens === 'sortant' ? '▸' : '◂';
    return `
      <li class="lien lien--${sens}">
        <span class="lien-type">${fleche} ${echapper(relation.type || 'lié à')}</span>
        <button class="lien-cible" data-aller="${autre.id}">
          ${pastille(autre.type)}<span>${echapper(autre.nom)}</span>
        </button>
        ${relation.note ? `<span class="lien-note">${echapper(relation.note)}</span>` : ''}
        <button class="lien-retirer" data-retirer="${relation.id}" title="Retirer ce lien">×</button>
      </li>`;
  }

  function gabaritAjoutLien(entite) {
    const cibles = store.lire().entites
      .filter((e) => e.id !== entite.id)
      .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));

    if (!cibles.length) return `<p class="vide">Crée une deuxième fiche pour pouvoir tisser des liens.</p>`;

    return `
      <form class="ajout-lien" data-form="lien">
        <input class="champ" name="type" list="types-de-lien" placeholder="habite à…" required>
        <datalist id="types-de-lien">
          ${TYPES_DE_LIEN.map((t) => `<option value="${t}">`).join('')}
        </datalist>
        <select class="champ" name="cible" required>
          ${cibles.map((c) => `<option value="${c.id}">${echapper(c.nom)}</option>`).join('')}
        </select>
        <input class="champ" name="note" placeholder="Précision (optionnel)">
        <button class="bouton bouton--plein" type="submit">Relier</button>
      </form>`;
  }

  function brancherLecture(racine, entite) {
    racine.querySelector('[data-action="modifier"]').onclick = () => {
      enEdition = true;
      rendre(store.lire());
    };

    racine.querySelector('[data-action="supprimer"]').onclick = async () => {
      if (!confirm(`Supprimer « ${entite.nom} » et ses liens ?`)) return;
      await protege(() => store.supprimerEntite(entite.id));
    };

    racine.querySelectorAll('[data-aller]').forEach((bouton) => {
      bouton.onclick = () => store.selectionner(bouton.dataset.aller);
    });

    racine.querySelectorAll('[data-retirer]').forEach((bouton) => {
      bouton.onclick = () => protege(() => store.supprimerRelation(bouton.dataset.retirer));
    });

    const formulaire = racine.querySelector('[data-form="lien"]');
    if (formulaire) {
      formulaire.onsubmit = async (e) => {
        e.preventDefault();
        const champs = Object.fromEntries(new FormData(formulaire));
        await protege(() => store.enregistrerRelation({
          source: entite.id,
          cible: champs.cible,
          type: champs.type,
          note: champs.note,
        }));
      };
    }
  }

  // ------------------------------------------------------------- édition

  function gabaritFormulaire(entite) {
    return `
      <form class="fiche fiche--formulaire" data-form="entite">
        <label class="etiquette">Nom
          <input class="champ" name="nom" value="${echapper(entite.nom || '')}" required autofocus>
        </label>
        <label class="etiquette">Type
          <select class="champ" name="type">
            ${Object.entries(TYPES).map(([cle, t]) =>
              `<option value="${cle}" ${cle === entite.type ? 'selected' : ''}>${t.libelle}</option>`).join('')}
          </select>
        </label>
        <label class="etiquette">Résumé <span class="indice">une ligne, visible dans la liste</span>
          <input class="champ" name="resume" value="${echapper(entite.resume || '')}">
        </label>
        <label class="etiquette">Tags <span class="indice">séparés par des virgules</span>
          <input class="champ" name="tags" value="${echapper(entite.tags || '')}">
        </label>
        <label class="etiquette">Notes
          <textarea class="champ champ--zone" name="notes" rows="10">${echapper(entite.notes || '')}</textarea>
        </label>
        <div class="fiche-actions">
          <button class="bouton bouton--plein" type="submit">Enregistrer</button>
          <button class="bouton" type="button" data-action="annuler">Annuler</button>
        </div>
      </form>`;
  }

  function brancherFormulaire(racine, entite) {
    const formulaire = racine.querySelector('[data-form="entite"]');

    racine.querySelector('[data-action="annuler"]').onclick = () => {
      enEdition = false;
      rendre(store.lire());
    };

    formulaire.onsubmit = async (e) => {
      e.preventDefault();
      const champs = Object.fromEntries(new FormData(formulaire));
      const ok = await protege(() => store.enregistrerEntite({ ...entite, ...champs }));
      if (ok) {
        enEdition = false;
        rendre(store.lire());
      }
    };
  }

  /** Exécute une action et affiche l'erreur au lieu de casser l'appli. */
  async function protege(action) {
    try {
      await action();
      return true;
    } catch (err) {
      signalerErreur(err.message);
      return false;
    }
  }

  store.abonner(rendre);
  rendre(store.lire());
}

/** Ouvre la fiche en mode édition (utilisé par « Nouvelle fiche »). */
export function passerEnEdition() {
  enEdition = true;
}
