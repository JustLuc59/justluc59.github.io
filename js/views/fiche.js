/** Colonne centrale : la fiche de l'entité sélectionnée. */

import { TYPES, TYPES_DE_LIEN, CHAMPS_COMBAT, CARACS, modificateur, signe } from '../config.js';
import * as store from '../store.js';
import * as combat from '../combat-store.js';
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
    if (enEdition) brancherFormulaire(racine, entite);
    else brancherLecture(racine, entite);
  }

  // ------------------------------------------------------------- lecture

  function gabaritLecture(entite) {
    const liens = store.liensDe(entite.id);
    const combattant = (TYPES[entite.type] || {}).combat;

    return `
      <article class="fiche">
        <header class="fiche-tete">
          ${pastille(entite.type)}
          <div>
            <h2 class="fiche-nom">${echapper(entite.nom || 'Sans nom')}</h2>
            <p class="fiche-resume">${echapper(entite.resume || '')}</p>
          </div>
          <div class="fiche-actions">
            ${combattant ? `<button class="bouton" data-action="au-combat">Au combat</button>` : ''}
            <button class="bouton" data-action="modifier">Modifier</button>
            <button class="bouton bouton--danger" data-action="supprimer">Supprimer</button>
          </div>
        </header>

        ${entite.tags ? `<p class="tags">${entite.tags.split(',').filter((t) => t.trim()).map((t) =>
          `<span class="tag">${echapper(t.trim())}</span>`).join('')}</p>` : ''}

        ${combattant ? blocCombat(entite) : ''}

        ${entite.notes ? `<div class="notes">${echapper(entite.notes).replace(/\n/g, '<br>')}</div>` : ''}

        <section class="registre">
          <h3 class="registre-titre">Liens <span class="compte">${liens.length}</span></h3>
          ${liens.length ? `<ul class="registre-liste">${liens.map(ligneDeLien).join('')}</ul>`
                         : `<p class="vide">Aucun lien. Relie cette fiche à une autre ci-dessous.</p>`}
          ${gabaritAjoutLien(entite)}
        </section>
      </article>`;
  }

  /** Chiffres de combat + caractéristiques, affichés seulement si renseignés. */
  function blocCombat(entite) {
    const chiffres = CHAMPS_COMBAT.filter((c) => entite[c.cle]);
    const caracs = CARACS.filter((c) => entite[c.cle]);
    if (!chiffres.length && !caracs.length) return '';

    return `
      <section class="bloc-stats">
        ${chiffres.length ? `<div class="chiffres">${chiffres.map((c) => `
          <div class="chiffre">
            <span class="chiffre-libelle">${c.libelle}</span>
            <span class="chiffre-valeur">${echapper(entite[c.cle])}</span>
          </div>`).join('')}</div>` : ''}

        ${caracs.length ? `<div class="caracs">${caracs.map((c) => `
          <div class="carac">
            <span class="carac-libelle">${c.libelle}</span>
            <span class="carac-score">${echapper(entite[c.cle])}</span>
            <span class="carac-mod">${signe(modificateur(entite[c.cle]))}</span>
          </div>`).join('')}</div>` : ''}
      </section>`;
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

    const auCombat = racine.querySelector('[data-action="au-combat"]');
    if (auCombat) auCombat.onclick = () => {
      combat.ajouterDepuisFiche(entite, 1);
      combat.ouvrir();
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
    const combattant = (TYPES[entite.type] || {}).combat;

    return `
      <form class="fiche fiche--formulaire" data-form="entite">
        <label class="etiquette">Nom
          <input class="champ" name="nom" value="${echapper(entite.nom || '')}" required autofocus>
        </label>
        <label class="etiquette">Type <span class="indice">change le type pour faire apparaître les caractéristiques</span>
          <select class="champ" name="type" data-recharge>
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

        ${combattant ? `
          <fieldset class="groupe">
            <legend class="registre-titre">Combat</legend>
            <div class="grille-saisie">
              ${CHAMPS_COMBAT.map((c) => `
                <label class="etiquette etiquette--serree">${c.libelle}
                  <input class="champ" name="${c.cle}" type="number" value="${echapper(entite[c.cle] || '')}">
                </label>`).join('')}
            </div>
            <div class="grille-saisie grille-saisie--six">
              ${CARACS.map((c) => `
                <label class="etiquette etiquette--serree">${c.libelle}
                  <input class="champ" name="${c.cle}" type="number" min="1" max="30"
                         value="${echapper(entite[c.cle] || '')}" data-carac>
                  <span class="carac-mod carac-mod--apercu">${signe(modificateur(entite[c.cle]))}</span>
                </label>`).join('')}
            </div>
          </fieldset>` : ''}

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

    // Changer le type fait apparaître ou disparaître le bloc Combat, sans enregistrer.
    formulaire.querySelector('[data-recharge]').onchange = (e) => {
      const brouillon = { ...entite, ...Object.fromEntries(new FormData(formulaire)), type: e.target.value };
      racine.innerHTML = gabaritFormulaire(brouillon);
      brancherFormulaire(racine, brouillon);
    };

    // Le modificateur se met à jour pendant la saisie.
    formulaire.querySelectorAll('[data-carac]').forEach((champ) => {
      champ.oninput = () => {
        champ.parentElement.querySelector('.carac-mod--apercu').textContent =
          signe(modificateur(champ.value));
      };
    });

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
