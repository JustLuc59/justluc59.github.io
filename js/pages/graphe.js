/** Page Graphe : la carte mentale en plein écran, avec filtres et volet de lecture. */

import { TYPES } from '../config.js';
import * as store from '../store.js';
import { demarrerMJ } from '../mj.js';
import { monterGraphe } from '../views/graphe.js';
import { pastille } from '../views/pastille.js';
import { echapper } from '../views/liste.js';

const { rafraichir } = demarrerMJ({
  actif: 'graphe',
  extras: [{ id: 'recentrer', libelle: 'Recentrer' }],
});

// ------------------------------------------------------------- outils (gauche)

const outils = document.querySelector('#panneau-outils');
outils.innerHTML = `
  <div class="liste-tete">
    <input class="champ" id="chercher-noeud" type="search" placeholder="Trouver une fiche" aria-label="Trouver une fiche">
    <p class="indice" style="margin:10px 0 4px">Types affichés</p>
    <div class="filtres filtres--colonne" id="types" role="group" aria-label="Types affichés">
      ${Object.entries(TYPES).map(([cle, t]) => `
        <button class="filtre filtre--type" data-type="${cle}" aria-pressed="true">
          ${pastille(cle)} ${t.libelle} <span class="ligne-liens" data-compte="${cle}"></span>
        </button>`).join('')}
    </div>
    <p class="indice" style="margin-top:14px">Clique sur un nœud pour le mettre en avant. Double-clic : ouvre la fiche dans le codex.</p>
  </div>`;

outils.querySelector('#types').addEventListener('click', (e) => {
  const bouton = e.target.closest('.filtre--type');
  if (!bouton) return;
  bouton.setAttribute('aria-pressed', String(bouton.getAttribute('aria-pressed') !== 'true'));
  graphe.filtrerTypes(typesActifs());
});

function typesActifs() {
  return [...outils.querySelectorAll('.filtre--type[aria-pressed="true"]')].map((b) => b.dataset.type);
}

const champ = outils.querySelector('#chercher-noeud');
champ.addEventListener('change', () => {
  const terme = champ.value.trim().toLowerCase();
  if (!terme) return;
  const trouvee = store.lire().entites.find((e) => (e.nom || '').toLowerCase().includes(terme));
  if (trouvee) { store.selectionner(trouvee.id); graphe.centrerSur(trouvee.id); }
});

// ------------------------------------------------------------- graphe (centre)

const graphe = monterGraphe(document.querySelector('#panneau-graphe'), {
  auDoubleClic: (id) => { location.href = `index.html?fiche=${encodeURIComponent(id)}`; },
});
document.querySelector('#recentrer').onclick = () => graphe.recentrer();

// ------------------------------------------------------------- volet (droite)

const volet = document.querySelector('#panneau-volet');

function rendreVolet(etat) {
  Object.keys(TYPES).forEach((cle) => {
    const compte = outils.querySelector(`[data-compte="${cle}"]`);
    if (compte) compte.textContent = etat.entites.filter((e) => e.type === cle).length || '';
  });

  const entite = store.entiteParId(etat.selection);
  if (!entite) {
    volet.innerHTML = `<div class="vide vide--grand"><p>Clique sur un nœud pour voir sa fiche ici.</p></div>`;
    return;
  }
  const liens = store.liensDe(entite.id);
  volet.innerHTML = `
    <article class="fiche fiche--volet">
      <header class="fiche-tete">
        ${pastille(entite.type)}
        <div>
          <h2 class="fiche-nom">${echapper(entite.nom || 'Sans nom')}</h2>
          <p class="fiche-resume">${echapper(entite.resume || '')}</p>
        </div>
      </header>
      <a class="bouton bouton--plein" href="index.html?fiche=${encodeURIComponent(entite.id)}">Ouvrir dans le codex</a>
      ${entite.notes ? `<div class="notes">${echapper(entite.notes).replace(/\n/g, '<br>')}</div>` : ''}
      <section class="registre">
        <h3 class="registre-titre">Liens <span class="compte">${liens.length}</span></h3>
        ${liens.length ? `<ul class="registre-liste">${liens.map(({ relation, sens, autre }) => `
          <li class="lien lien--${sens}">
            <span class="lien-type">${sens === 'sortant' ? '▸' : '◂'} ${echapper(relation.type || 'lié à')}</span>
            <button class="lien-cible" data-aller="${autre.id}">${pastille(autre.type)}<span>${echapper(autre.nom)}</span></button>
            ${relation.note ? `<span class="lien-note">${echapper(relation.note)}</span>` : ''}
          </li>`).join('')}</ul>` : `<p class="vide">Aucun lien.</p>`}
      </section>
    </article>`;

  volet.querySelectorAll('[data-aller]').forEach((b) => {
    b.onclick = () => { store.selectionner(b.dataset.aller); graphe.centrerSur(b.dataset.aller); };
  });
}

store.abonner(rendreVolet);
rendreVolet(store.lire());

rafraichir();
