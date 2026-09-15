/**
 * Calendrier de campagne (page Calendrier).
 * Gauche : la date du jour et les commandes pour avancer. Centre : le mois en
 * grille, les événements dedans. Clic sur un jour : ajouter un événement.
 */

import { CALENDRIER } from '../config.js';
import * as store from '../store.js';
import * as cal from '../calendrier.js';
import { pastille } from './pastille.js';
import { echapper } from './liste.js';

export function monterCalendrier(racineCommandes, racineMois, { signalerErreur }) {
  // Le mois affiché ; démarre sur aujourd'hui dès que les données arrivent.
  let vue = null;             // { mois, annee }
  let dernierAujourdhui = null; // pour recadrer la vue quand la date du jour change
  let jourOuvert = null;      // date dont on édite les événements
  let evenementEnEdition = null;

  function aujourdhui() {
    return cal.lireDate(store.lire().reglages.aujourdhui);
  }

  function evenementsDuJour(date) {
    return store.lire().evenements
      .filter((v) => cal.memeJour(cal.dateDe(v), date))
      .sort((a, b) => (a.titre || '').localeCompare(b.titre || '', 'fr'));
  }

  // ------------------------------------------------------------- commandes (gauche)

  function rendreCommandes() {
    const auj = aujourdhui();
    const aVenir = store.lire().evenements
      .map((v) => ({ v, n: cal.numeroAbsolu(cal.dateDe(v)) }))
      .filter((x) => x.n >= cal.numeroAbsolu(auj))
      .sort((a, b) => a.n - b.n)
      .slice(0, 8);

    racineCommandes.innerHTML = `
      <div class="liste-tete">
        <p class="plan-libelle">Aujourd'hui</p>
        <p class="date-du-jour">${echapper(cal.formater(auj, { semaine: true }))}</p>
        <div class="rangee" style="margin-top:10px">
          <button class="bouton" data-avancer="-1" title="Reculer d'un jour">−1</button>
          <button class="bouton bouton--plein" data-avancer="1">+1 jour</button>
          <button class="bouton" data-avancer="7">+7</button>
        </div>
        <form class="rangee" data-form="avancer" style="margin-top:8px">
          <input class="champ champ--mini" name="n" type="number" placeholder="jours" aria-label="Nombre de jours">
          <button class="bouton" type="submit">Avancer</button>
          <button class="bouton" type="button" data-action="voir-aujourdhui">Voir</button>
        </form>
      </div>
      <div class="liste-tete">
        <p class="plan-libelle">À venir</p>
        ${aVenir.length ? `<ul class="registre-liste">${aVenir.map(({ v }) => `
          <li class="evenement-ligne" data-aller-jour='${JSON.stringify(cal.dateDe(v))}'>
            <span class="evenement-quand">${echapper(cal.ecartTexte(cal.dateDe(v), auj))}</span>
            <span class="evenement-titre">${echapper(v.titre)}</span>
            <span class="indice">${echapper(cal.formater(cal.dateDe(v)))}</span>
          </li>`).join('')}</ul>` : `<p class="vide">Rien de prévu. Clique sur un jour pour ajouter un événement.</p>`}
      </div>`;

    racineCommandes.querySelectorAll('[data-avancer]').forEach((b) => {
      b.onclick = () => avancer(Number(b.dataset.avancer));
    });
    racineCommandes.querySelector('[data-form="avancer"]').onsubmit = (e) => {
      e.preventDefault();
      const n = Number(e.target.n.value);
      if (n) avancer(n);
      e.target.reset();
    };
    racineCommandes.querySelector('[data-action="voir-aujourdhui"]').onclick = () => {
      const auj = aujourdhui();
      vue = { mois: auj.mois, annee: auj.annee };
      jourOuvert = auj;
      rendreMois();
    };
    racineCommandes.querySelectorAll('[data-aller-jour]').forEach((li) => {
      li.onclick = () => {
        const d = JSON.parse(li.dataset.allerJour);
        vue = { mois: d.mois, annee: d.annee };
        jourOuvert = d;
        rendreMois();
      };
    });
  }

  async function avancer(n) {
    const nouvelle = cal.ajouterJours(aujourdhui(), n);
    await protege(() => store.ecrireReglage('aujourdhui', JSON.stringify(nouvelle)));
  }

  // ------------------------------------------------------------- mois (centre)

  function rendreMois() {
    const auj = aujourdhui();
    if (!vue) vue = { mois: auj.mois, annee: auj.annee };
    const moisDef = CALENDRIER.mois[vue.mois];
    const semaine = CALENDRIER.joursSemaine;
    const premier = { jour: 1, mois: vue.mois, annee: vue.annee };
    const decalage = ((cal.numeroAbsolu(premier) % semaine.length) + semaine.length) % semaine.length;

    const cases = [];
    for (let i = 0; i < decalage; i++) cases.push('<div class="jour jour--vide"></div>');
    for (let j = 1; j <= moisDef.jours; j++) {
      const date = { jour: j, mois: vue.mois, annee: vue.annee };
      const evts = evenementsDuJour(date);
      const classes = [
        'jour',
        cal.memeJour(date, auj) ? 'jour--aujourdhui' : '',
        cal.memeJour(date, jourOuvert) ? 'jour--ouvert' : '',
        cal.numeroAbsolu(date) < cal.numeroAbsolu(auj) ? 'jour--passe' : '',
      ].join(' ');
      cases.push(`
        <button class="${classes}" data-jour="${j}">
          <span class="jour-numero">${j}</span>
          ${evts.slice(0, 3).map((v) => `<span class="jour-evenement">${echapper(v.titre)}</span>`).join('')}
          ${evts.length > 3 ? `<span class="indice">+${evts.length - 3}</span>` : ''}
        </button>`);
    }

    racineMois.innerHTML = `
      <div class="mois-tete">
        <button class="bouton" data-mois="-1">←</button>
        <h2 class="mois-titre">${echapper(moisDef.nom)} <span class="compte">${vue.annee}</span></h2>
        <button class="bouton" data-mois="1">→</button>
        <span class="indice">${moisDef.jours} jours</span>
      </div>
      <div class="semaine-tete">${semaine.map((s) => `<span>${echapper(s.slice(0, 3))}</span>`).join('')}</div>
      <div class="grille-mois" style="--colonnes:${semaine.length}">${cases.join('')}</div>
      ${jourOuvert ? panneauJour(jourOuvert) : ''}`;

    racineMois.querySelectorAll('[data-mois]').forEach((b) => {
      b.onclick = () => {
        let mois = vue.mois + Number(b.dataset.mois);
        let annee = vue.annee;
        if (mois < 0) { mois = CALENDRIER.mois.length - 1; annee -= 1; }
        if (mois >= CALENDRIER.mois.length) { mois = 0; annee += 1; }
        vue = { mois, annee };
        rendreMois();
      };
    });
    racineMois.querySelectorAll('[data-jour]').forEach((b) => {
      b.onclick = () => {
        jourOuvert = { jour: Number(b.dataset.jour), mois: vue.mois, annee: vue.annee };
        evenementEnEdition = null;
        rendreMois();
        racineMois.querySelector('.panneau-jour')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      };
    });
    brancherPanneauJour();
  }

  // ------------------------------------------------------------- un jour

  function panneauJour(date) {
    const evts = evenementsDuJour(date);
    const auj = aujourdhui();
    const fiches = store.lire().entites.slice().sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
    const brouillon = evenementEnEdition || { titre: '', note: '', fiche: '' };

    return `
      <section class="panneau-jour">
        <header class="fiche-tete">
          <div>
            <h3 class="fiche-nom" style="font-size:20px">${echapper(cal.formater(date, { semaine: true }))}</h3>
            <p class="fiche-resume">${echapper(cal.ecartTexte(date, auj))}</p>
          </div>
          <div class="fiche-actions">
            ${cal.memeJour(date, auj) ? '' : `<button class="bouton" data-action="definir-aujourdhui">Définir comme aujourd'hui</button>`}
            <button class="bouton" data-action="fermer-jour">Fermer</button>
          </div>
        </header>

        ${evts.length ? `<ul class="registre-liste">${evts.map((v) => {
          const fiche = v.fiche ? store.entiteParId(v.fiche) : null;
          return `
          <li class="lien evenement">
            <span class="evenement-titre">${echapper(v.titre)}</span>
            ${fiche ? `<a class="lien-cible" href="index.html?fiche=${encodeURIComponent(fiche.id)}">${pastille(fiche.type)}<span>${echapper(fiche.nom)}</span></a>` : ''}
            ${v.note ? `<span class="lien-note">${echapper(v.note)}</span>` : ''}
            <button class="bouton bouton--mini" data-modifier="${v.id}">Modifier</button>
            <button class="lien-retirer" data-retirer="${v.id}" title="Supprimer">×</button>
          </li>`; }).join('')}</ul>` : `<p class="vide">Rien ce jour-là.</p>`}

        <form class="ajout-evenement" data-form="evenement">
          <h4 class="registre-titre">${brouillon.id ? 'Modifier l’événement' : 'Ajouter un événement'}</h4>
          <input class="champ" name="titre" placeholder="Pleine lune, arrivée de la caravane, échéance…" value="${echapper(brouillon.titre)}" required>
          <input class="champ" name="note" placeholder="Précision (optionnel)" value="${echapper(brouillon.note)}">
          <select class="champ" name="fiche">
            <option value="">— aucune fiche liée —</option>
            ${fiches.map((f) => `<option value="${f.id}" ${f.id === brouillon.fiche ? 'selected' : ''}>${echapper(f.nom)}</option>`).join('')}
          </select>
          <div class="fiche-actions" style="margin-left:0">
            <button class="bouton bouton--plein" type="submit">${brouillon.id ? 'Enregistrer' : 'Ajouter'}</button>
            ${brouillon.id ? `<button class="bouton" type="button" data-action="annuler-edition">Annuler</button>` : ''}
          </div>
        </form>
      </section>`;
  }

  function brancherPanneauJour() {
    const panneau = racineMois.querySelector('.panneau-jour');
    if (!panneau) return;

    panneau.querySelector('[data-action="fermer-jour"]').onclick = () => { jourOuvert = null; evenementEnEdition = null; rendreMois(); };

    const definir = panneau.querySelector('[data-action="definir-aujourdhui"]');
    if (definir) definir.onclick = () => protege(() => store.ecrireReglage('aujourdhui', JSON.stringify(jourOuvert)));

    panneau.querySelectorAll('[data-retirer]').forEach((b) => {
      b.onclick = () => { if (confirm('Supprimer cet événement ?')) protege(() => store.supprimerEvenement(b.dataset.retirer)); };
    });
    panneau.querySelectorAll('[data-modifier]').forEach((b) => {
      b.onclick = () => { evenementEnEdition = store.lire().evenements.find((v) => v.id === b.dataset.modifier); rendreMois(); };
    });
    const annuler = panneau.querySelector('[data-action="annuler-edition"]');
    if (annuler) annuler.onclick = () => { evenementEnEdition = null; rendreMois(); };

    panneau.querySelector('[data-form="evenement"]').onsubmit = async (e) => {
      e.preventDefault();
      const champs = Object.fromEntries(new FormData(e.target));
      const ok = await protege(() => store.enregistrerEvenement({
        ...(evenementEnEdition || {}),
        ...champs,
        jour: jourOuvert.jour, mois: jourOuvert.mois, annee: jourOuvert.annee,
      }));
      if (ok) evenementEnEdition = null;
    };
  }

  async function protege(action) {
    try { await action(); return true; }
    catch (err) { signalerErreur(err.message); return false; }
  }

  function rendre() {
    // Quand la date du jour change (chargement, avance), la vue se recadre dessus.
    const texte = store.lire().reglages.aujourdhui || '';
    if (texte !== dernierAujourdhui) {
      dernierAujourdhui = texte;
      const auj = aujourdhui();
      vue = { mois: auj.mois, annee: auj.annee };
    }
    rendreCommandes();
    rendreMois();
  }

  store.abonner(rendre);
  rendre();
}
