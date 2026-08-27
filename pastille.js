import { TYPES } from '../config.js';

/** Carré coloré portant le sigle du type. Utilisé dans la liste et la fiche. */
export function pastille(type) {
  const def = TYPES[type] || { sigle: '?', couleur: '#8E99A6', libelle: type || 'Inconnu' };
  return `<span class="pastille" style="--teinte:${def.couleur}" title="${def.libelle}">${def.sigle}</span>`;
}
