/** Page Sorts : la bibliothèque SRD + sorts perso, filtres à gauche, fiche au centre. */

import { demarrerMJ } from '../mj.js';
import { monterBibliotheque } from '../views/sorts.js';

const { rafraichir } = demarrerMJ({ actif: 'sorts' });

monterBibliotheque(document.querySelector('#panneau-sorts'), document.querySelector('#panneau-sort'));

// Les fiches du codex servent au tracker de combat (« Depuis le codex »).
rafraichir();
