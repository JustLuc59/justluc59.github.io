/**
 * Page joueur (joueur.html). Pensée pour un téléphone.
 *
 * Trois écrans : rejoindre (adresse + code), choisir son personnage, la fiche.
 * N'importe ni store.js ni api.js : rien ici ne connaît la clé du MJ.
 */

import { CARACS, CHAMPS_JOUEUR, modificateur, signe } from '../config.js';
import { lireDate, formater } from '../calendrier.js';
import { DEMO } from '../demo.js';
import * as api from '../joueur-api.js';
import { echapper } from '../views/liste.js';

const racine = document.querySelector('#joueur');
let fiche = null;
let aujourdhui = '';
let demo = false;

// ------------------------------------------------------------- écrans

function ecranRejoindre(message = '') {
  const reglages = api.lireReglages();
  racine.innerHTML = `
    <section class="joueur-carte">
      <h1 class="marque">MJ<span>Codex</span> <span class="indice">— joueur</span></h1>
      <p class="indice">Ton MJ t'a donné une adresse et un code. Ils restent dans ce téléphone.</p>
      ${message ? `<p class="bandeau bandeau--erreur">${echapper(message)}</p>` : ''}
      <form data-form="rejoindre">
        <label class="etiquette">Adresse
          <input class="champ" name="url" type="url" value="${echapper(reglages.url)}" placeholder="https://script.google.com/macros/s/…/exec" required>
        </label>
        <label class="etiquette">Code joueur
          <input class="champ" name="code" type="password" value="${echapper(reglages.code)}" required>
        </label>
        <div class="fiche-actions" style="margin-left:0">
          <button class="bouton bouton--plein" type="submit">Rejoindre</button>
          <button class="bouton" type="button" data-action="demo">Voir une démo</button>
        </div>
      </form>
    </section>`;

  racine.querySelector('[data-form="rejoindre"]').onsubmit = async (e) => {
    e.preventDefault();
    api.ecrireReglages({ url: e.target.url.value.trim(), code: e.target.code.value.trim(), id: '' });
    demo = false;
    await ecranChoisir();
  };
  racine.querySelector('[data-action="demo"]').onclick = () => {
    demo = true;
    ecranChoisir();
  };
}

async function ecranChoisir() {
  racine.innerHTML = `<section class="joueur-carte"><p class="indice">Lecture des personnages…</p></section>`;
  let joueurs;
  try {
    joueurs = demo
      ? DEMO.entites.filter((e) => e.type === 'joueur').map((e) => ({ id: e.id, nom: e.nom, resume: e.resume }))
      : await api.appeler('listerJoueurs');
  } catch (err) {
    return ecranRejoindre(err.message);
  }

  racine.innerHTML = `
    <section class="joueur-carte">
      <h1 class="marque">Qui es-tu ?</h1>
      ${joueurs.length ? `<ul class="liste">${joueurs.map((j) => `
        <li class="ligne" data-id="${j.id}" tabindex="0">
          <span class="ligne-texte">
            <span class="ligne-nom">${echapper(j.nom)}</span>
            <span class="ligne-resume">${echapper(j.resume || '')}</span>
          </span>
        </li>`).join('')}</ul>` : `<p class="vide">Le MJ n'a pas encore créé de fiche Joueur.</p>`}
      <button class="bouton" data-action="changer-adresse" style="margin-top:14px">Changer d'adresse ou de code</button>
    </section>`;

  racine.querySelectorAll('[data-id]').forEach((li) => {
    li.onclick = () => { api.ecrireReglages({ id: li.dataset.id }); chargerFiche(); };
  });
  racine.querySelector('[data-action="changer-adresse"]').onclick = () => ecranRejoindre();
}

async function chargerFiche(silencieux = false) {
  const { id } = api.lireReglages();
  if (!silencieux) racine.innerHTML = `<section class="joueur-carte"><p class="indice">Lecture de ta fiche…</p></section>`;
  try {
    if (demo) {
      fiche = structuredClone(DEMO.entites.find((e) => e.id === id));
      aujourdhui = DEMO.reglages?.aujourdhui || '';
    } else {
      const donnees = await api.appeler('lireJoueur', { id });
      fiche = donnees.fiche;
      aujourdhui = donnees.aujourdhui;
    }
    ecranFiche();
  } catch (err) {
    signaler(err.message);
    if (!fiche) ecranChoisir();
  }
}

// ------------------------------------------------------------- la fiche

function ecranFiche(message = '') {
  const pvMax = Number(fiche.pv_max) || 0;
  const pv = fiche.pv_actuel === '' || fiche.pv_actuel == null ? pvMax : Number(fiche.pv_actuel);
  const part = pvMax ? Math.max(0, Math.min(1, pv / pvMax)) : 0;
  const seuil = part === 0 ? 'mort' : part <= 0.33 ? 'critique' : part <= 0.66 ? 'entame' : 'sain';
  const percPassive = 10 + modificateur(fiche.sagesse);
  const zones = CHAMPS_JOUEUR.filter((c) => c.joueur && c.zone);

  racine.innerHTML = `
    <header class="joueur-tete">
      <div>
        <h1 class="fiche-nom">${echapper(fiche.nom)}</h1>
        <p class="fiche-resume">${[fiche.race, fiche.classe, fiche.niveau ? `niveau ${fiche.niveau}` : ''].filter(Boolean).map(echapper).join(' · ') || echapper(fiche.resume || '')}</p>
      </div>
      <button class="bouton bouton--mini" data-action="actualiser" title="Relire la fiche">↻</button>
    </header>
    ${aujourdhui ? `<p class="joueur-date">${echapper(formater(lireDate(aujourdhui), { semaine: true }))}</p>` : ''}
    <p class="bandeau ${message ? 'bandeau--erreur' : ''}" data-bandeau>${echapper(message)}</p>

    <section class="joueur-carte joueur-pv combattant--${seuil}">
      <div class="joueur-pv-tete">
        <span class="chiffre-libelle">Points de vie</span>
        <span class="joueur-pv-valeur"><strong>${pv}</strong> / ${pvMax || '—'}</span>
      </div>
      <span class="jauge jauge--large"><span class="jauge-plein" style="width:${part * 100}%"></span></span>
      <div class="joueur-pv-boutons">
        <button class="bouton bouton--danger" data-pv="-5">−5</button>
        <button class="bouton bouton--danger" data-pv="-1">−1</button>
        <button class="bouton" data-pv="+1">+1</button>
        <button class="bouton" data-pv="+5">+5</button>
      </div>
      <div class="joueur-pv-boutons" style="margin-top:6px">
        <input class="champ champ--mini" type="number" min="1" placeholder="0" data-montant inputmode="numeric">
        <button class="bouton bouton--danger" data-action="degats">Dégâts</button>
        <button class="bouton" data-action="soins">Soins</button>
      </div>
    </section>

    <section class="joueur-carte">
      <div class="chiffres chiffres--joueur">
        <div class="chiffre"><span class="chiffre-libelle">CA</span><span class="chiffre-valeur">${echapper(fiche.ca || '—')}</span></div>
        <div class="chiffre"><span class="chiffre-libelle">Init.</span><span class="chiffre-valeur">${signe(modificateur(fiche.dexterite))}</span></div>
        <div class="chiffre"><span class="chiffre-libelle">Perc. passive</span><span class="chiffre-valeur">${fiche.sagesse ? percPassive : '—'}</span></div>
        <div class="chiffre"><span class="chiffre-libelle">Vitesse</span><span class="chiffre-valeur">${echapper(fiche.vitesse || '—')}</span></div>
      </div>
      <div class="caracs caracs--joueur">
        ${CARACS.map((c) => `
          <div class="carac">
            <span class="carac-libelle">${c.libelle}</span>
            <span class="carac-score">${echapper(fiche[c.cle] || '—')}</span>
            <span class="carac-mod">${fiche[c.cle] ? signe(modificateur(fiche[c.cle])) : ''}</span>
          </div>`).join('')}
      </div>
      ${fiche.jets_sauvegarde ? `<p class="joueur-ligne"><strong>JS</strong> ${echapper(fiche.jets_sauvegarde)}</p>` : ''}
      ${fiche.competences ? `<p class="joueur-ligne"><strong>Compétences</strong> ${echapper(fiche.competences)}</p>` : ''}
      ${fiche.langues ? `<p class="joueur-ligne"><strong>Langues</strong> ${echapper(fiche.langues)}</p>` : ''}
    </section>

    ${fiche.capacites ? `<section class="joueur-carte"><h2 class="registre-titre">Capacités</h2><div class="notes">${echapper(fiche.capacites).replace(/\n/g, '<br>')}</div></section>` : ''}

    ${zones.map((c) => `
      <section class="joueur-carte">
        <form data-form="zone" data-cle="${c.cle}">
          <h2 class="registre-titre">${c.libelle}</h2>
          <textarea class="champ champ--zone" name="valeur" rows="6" placeholder="Modifie et enregistre : le MJ le verra sur ta fiche.">${echapper(fiche[c.cle] || '')}</textarea>
          <button class="bouton bouton--plein bouton--mini" type="submit" style="margin-top:8px" hidden>Enregistrer</button>
        </form>
      </section>`).join('')}

    <p class="indice joueur-pied">
      <button class="bouton bouton--mini" data-action="changer-perso">Changer de personnage</button>
      ${demo ? 'Démo : rien n’est enregistré.' : ''}
    </p>`;

  brancherFiche();
}

function brancherFiche() {
  racine.querySelector('[data-action="actualiser"]').onclick = () => chargerFiche(true);
  racine.querySelector('[data-action="changer-perso"]').onclick = () => { fiche = null; ecranChoisir(); };

  racine.querySelectorAll('[data-pv]').forEach((b) => { b.onclick = () => ajusterPv(Number(b.dataset.pv)); });
  const montant = () => Math.abs(Number(racine.querySelector('[data-montant]').value)) || 0;
  racine.querySelector('[data-action="degats"]').onclick = () => { if (montant()) ajusterPv(-montant()); };
  racine.querySelector('[data-action="soins"]').onclick = () => { if (montant()) ajusterPv(montant()); };

  racine.querySelectorAll('[data-form="zone"]').forEach((form) => {
    const bouton = form.querySelector('button');
    form.valeur.oninput = () => { bouton.hidden = false; };
    form.onsubmit = async (e) => {
      e.preventDefault();
      await enregistrer({ [form.dataset.cle]: form.valeur.value });
    };
  });
}

async function ajusterPv(delta) {
  const pvMax = Number(fiche.pv_max) || Infinity;
  const actuel = fiche.pv_actuel === '' || fiche.pv_actuel == null ? Number(fiche.pv_max) || 0 : Number(fiche.pv_actuel);
  const nouveau = Math.max(0, Math.min(pvMax, actuel + delta));
  await enregistrer({ pv_actuel: String(nouveau) });
}

/** Envoie les champs modifiés et redessine. En démo, tout reste local. */
async function enregistrer(champs) {
  const avant = { ...fiche };
  Object.assign(fiche, champs);
  ecranFiche(demo ? '' : 'Enregistrement…');
  if (demo) return;
  try {
    const { id } = api.lireReglages();
    fiche = await api.appeler('majJoueur', { id, champs });
    ecranFiche();
  } catch (err) {
    fiche = avant;
    ecranFiche(err.message);
  }
}

function signaler(message) {
  const bandeau = racine.querySelector('[data-bandeau]');
  if (bandeau) { bandeau.textContent = message; bandeau.className = 'bandeau bandeau--erreur'; }
}

// ------------------------------------------------------------- démarrage

if (api.estConfiguree() && api.lireReglages().id) chargerFiche();
else if (api.estConfiguree()) ecranChoisir();
else ecranRejoindre();
