/**
 * Colonne de droite : le réseau.
 * Cytoscape est chargé depuis un CDN dans index.html (variable globale `cytoscape`).
 */

import { TYPES } from '../config.js';
import * as store from '../store.js';

export function monterGraphe(racine) {
  if (typeof cytoscape === 'undefined') {
    racine.innerHTML = `<div class="vide vide--grand">
      <p>Le graphe n’a pas pu se charger. Vérifie ta connexion, puis recharge la page.</p>
    </div>`;
    return;
  }

  const reseau = cytoscape({
    container: racine,
    minZoom: 0.2,
    maxZoom: 2.5,
    style: [
      {
        selector: 'node',
        style: {
          'background-color': 'data(couleur)',
          'label': 'data(nom)',
          'color': '#E4E7EB',
          'font-family': 'Karla, sans-serif',
          'font-size': 11,
          'text-valign': 'bottom',
          'text-margin-y': 6,
          'width': 18,
          'height': 18,
          'border-width': 0,
          'transition-property': 'width height border-width opacity',
          'transition-duration': '140ms',
        },
      },
      {
        selector: 'node.actif',
        style: { width: 28, height: 28, 'border-width': 3, 'border-color': '#F2F4F7', 'font-size': 13 },
      },
      { selector: 'node.efface', style: { opacity: 0.25 } },
      {
        selector: 'edge',
        style: {
          'width': 1,
          'line-color': '#4A5462',
          'target-arrow-color': '#4A5462',
          'target-arrow-shape': 'triangle',
          'arrow-scale': 0.7,
          'curve-style': 'bezier',
          'label': 'data(type)',
          'font-family': 'JetBrains Mono, monospace',
          'font-size': 8,
          'color': '#8E99A6',
          'text-rotation': 'autorotate',
          'text-background-color': '#1B2027',
          'text-background-opacity': 1,
          'text-background-padding': 2,
        },
      },
      { selector: 'edge.voisine', style: { 'line-color': '#C9A227', 'target-arrow-color': '#C9A227', width: 2, color: '#C9A227' } },
      { selector: 'edge.efface', style: { opacity: 0.15 } },
    ],
  });

  reseau.on('tap', 'node', (e) => store.selectionner(e.target.id()));

  let signaturePrecedente = '';

  function rendre(etat) {
    const signature = signatureDesDonnees(etat);

    // On ne reconstruit (et ne relance la mise en place) que si les données changent.
    if (signature !== signaturePrecedente) {
      signaturePrecedente = signature;
      reseau.elements().remove();
      reseau.add([
        ...etat.entites.map((e) => ({
          data: { id: e.id, nom: e.nom || 'Sans nom', couleur: (TYPES[e.type] || {}).couleur || '#8E99A6' },
        })),
        ...etat.relations
          .filter((r) => etat.entites.some((e) => e.id === r.source) && etat.entites.some((e) => e.id === r.cible))
          .map((r) => ({ data: { id: r.id, source: r.source, target: r.cible, type: r.type || '' } })),
      ]);
      reseau.layout({
        name: 'cose',
        animate: false,
        nodeRepulsion: 9000,
        idealEdgeLength: 110,
        padding: 30,
      }).run();
    }

    surligner(etat.selection);
  }

  /** Met en avant la fiche sélectionnée et ses voisines directes. */
  function surligner(id) {
    reseau.elements().removeClass('actif voisine efface');
    if (!id) return;

    const noeud = reseau.getElementById(id);
    if (!noeud.length) return;

    const voisinage = noeud.closedNeighborhood();
    reseau.elements().difference(voisinage).addClass('efface');
    voisinage.edges().addClass('voisine');
    noeud.addClass('actif');
  }

  function signatureDesDonnees(etat) {
    return (
      etat.entites.map((e) => e.id + e.nom + e.type).join('|') +
      '#' +
      etat.relations.map((r) => r.id + r.source + r.cible + r.type).join('|')
    );
  }

  store.abonner(rendre);
  rendre(store.lire());

  // Le graphe doit se recalculer quand le panneau change de taille.
  new ResizeObserver(() => reseau.resize()).observe(racine);
}
