/**
 * Coquille commune aux pages (Codex, Graphe, Sorts).
 *
 * Chaque page appelle `demarrerMJ({ actif, extras })` puis monte son propre
 * contenu. La barre du haut, la boîte de connexion, le bandeau et le tracker
 * de combat sont construits ici pour n'exister qu'à un seul endroit.
 *
 * Le mode démo est mémorisé le temps de l'onglet (sessionStorage) : passer
 * d'une page à l'autre ne le fait pas retomber.
 */

import * as api from './api.js';
import * as store from './store.js';
import * as combat from './combat-store.js';
import { DEMO } from './demo.js';
import { monterCombat } from './views/combat.js';

const PAGES = [
  { id: 'codex',  libelle: 'Codex',  lien: 'index.html' },
  { id: 'graphe', libelle: 'Graphe', lien: 'graphe.html' },
  { id: 'sorts',  libelle: 'Sorts',  lien: 'sorts.html' },
];

const CLE_DEMO = 'mj-codex:demo';

/**
 * @param {string} actif  identifiant de la page en cours (voir PAGES)
 * @param {Array}  extras boutons propres à la page, insérés avant « Combat » : { id, libelle, plein }
 * @returns {{ annoncer: Function, rafraichir: Function }}
 */
export function demarrerMJ({ actif, extras = [] }) {
  construireEntete(actif, extras);
  construireDialogueConnexion();

  const bandeau = document.querySelector('#bandeau');
  function annoncer(message, ton = 'erreur') {
    bandeau.textContent = message;
    bandeau.className = message ? `bandeau bandeau--${ton}` : 'bandeau';
  }

  combat.restaurer();
  monterCombat(document.querySelector('#panneau-combat'));

  // ------------------------------------------------------------- barre

  document.querySelector('#combat').onclick = () => combat.ouvrir();
  document.querySelector('#recharger').onclick = () => rafraichir();
  document.querySelector('#ouvrir-connexion').onclick = () => ouvrirConnexion();
  document.querySelector('#essayer').onclick = () => {
    sessionStorage.setItem(CLE_DEMO, '1');
    store.chargerDemo(structuredClone(DEMO));
    annoncer('Mode démo : rien n’est envoyé au Sheet.', 'info');
  };

  store.abonner((etat) => {
    document.querySelector('#etat-demo').hidden = !etat.demo;
  });

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

  // ------------------------------------------------------------- connexion

  const dialogue = document.querySelector('#connexion');
  const formulaire = document.querySelector('#form-connexion');

  function ouvrirConnexion() {
    const reglages = api.lireReglages();
    formulaire.url.value = reglages.url;
    formulaire.cle.value = reglages.cle;
    dialogue.showModal();
  }

  formulaire.onsubmit = async (e) => {
    e.preventDefault();
    api.ecrireReglages({ url: formulaire.url.value.trim(), cle: formulaire.cle.value.trim() });
    sessionStorage.removeItem(CLE_DEMO);
    store.oublierCache(); // on change de Sheet : la copie locale ne vaut plus rien
    dialogue.close();
    await rafraichir();
  };
  document.querySelector('#fermer-connexion').onclick = () => dialogue.close();

  // ------------------------------------------------------------- chargement

  async function rafraichir() {
    if (sessionStorage.getItem(CLE_DEMO)) {
      store.chargerDemo(structuredClone(DEMO));
      annoncer('Mode démo : rien n’est envoyé au Sheet.', 'info');
      return;
    }
    if (!api.estConfiguree()) {
      annoncer('Aucun Sheet connecté. Ouvre Connexion, ou clique sur Démo pour essayer.', 'info');
      return;
    }
    // La copie locale s'affiche tout de suite ; le Sheet est relu derrière.
    const dejaAffiche = store.restaurerCache();
    try {
      annoncer(dejaAffiche ? 'Synchronisation avec le Sheet…' : 'Lecture du Sheet…', 'info');
      await store.charger();
      annoncer('', 'info');
    } catch (err) {
      annoncer(dejaAffiche ? `${err.message} Les données affichées sont la dernière copie locale.` : err.message);
    }
  }

  return { annoncer, rafraichir };
}

/** Identifiant de fiche passé dans l'URL : index.html?fiche=e12 */
export function ficheDemandee() {
  return new URLSearchParams(location.search).get('fiche');
}

// ------------------------------------------------------------- construction

function construireEntete(actif, extras) {
  document.querySelector('#entete').innerHTML = `
    <header class="barre">
      <a class="marque" href="index.html">MJ<span>Codex</span></a>
      <nav class="nav">
        ${PAGES.map((p) => `<a class="nav-lien ${p.id === actif ? 'nav-lien--actif' : ''}" href="${p.lien}">${p.libelle}</a>`).join('')}
      </nav>
      <span id="etat-demo" class="etiquette-demo" hidden>démo</span>
      <div class="barre-actions">
        ${extras.map((b) => `<button class="bouton ${b.plein ? 'bouton--plein' : ''}" id="${b.id}">${b.libelle}${b.compte ? ` <span id="${b.id}-compte" class="marque-compte" hidden></span>` : ''}</button>`).join('')}
        <button class="bouton" id="combat">Combat <span id="combat-compte" class="marque-compte" hidden></span></button>
        <button class="bouton" id="recharger">Recharger</button>
        <button class="bouton" id="essayer">Démo</button>
        <button class="bouton" id="ouvrir-connexion">Connexion</button>
      </div>
    </header>
    <p id="bandeau" class="bandeau" role="status" aria-live="polite"></p>`;
}

function construireDialogueConnexion() {
  document.body.insertAdjacentHTML('beforeend', `
    <section class="combat" id="panneau-combat" aria-label="Combat en cours" hidden></section>
    <dialog id="connexion" class="dialogue">
      <form id="form-connexion" class="dialogue-corps">
        <h2>Connexion au Sheet</h2>
        <p class="indice">Ces deux valeurs restent dans ce navigateur. Elles ne sont jamais envoyées ailleurs qu’à ton Apps Script.</p>
        <label class="etiquette">URL de déploiement
          <input class="champ" name="url" type="url" placeholder="https://script.google.com/macros/s/…/exec" required>
        </label>
        <label class="etiquette">Clé partagée
          <input class="champ" name="cle" type="password" placeholder="la valeur de CLE_PARTAGEE" required>
        </label>
        <div class="fiche-actions">
          <button class="bouton bouton--plein" type="submit">Connecter</button>
          <button class="bouton" type="button" id="fermer-connexion">Fermer</button>
        </div>
      </form>
    </dialog>`);
}
