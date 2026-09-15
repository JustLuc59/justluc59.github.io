/** Page Calendrier : la date du monde, les événements, l'avance du temps. */

import { demarrerMJ } from '../mj.js';
import { monterCalendrier } from '../views/calendrier.js';

const { annoncer, rafraichir } = demarrerMJ({ actif: 'calendrier' });

monterCalendrier(
  document.querySelector('#panneau-commandes'),
  document.querySelector('#panneau-mois'),
  { signalerErreur: annoncer }
);

rafraichir();
