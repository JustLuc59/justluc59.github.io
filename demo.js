/** Petit bac à sable pour essayer l'appli avant de brancher le Sheet. */

export const DEMO = {
  entites: [
    { id: 'e1', type: 'lieu', nom: 'Val-Brumeux', resume: 'Bourg minier au pied des Crocs', tags: 'ville, départ', notes: 'Brouillard permanent depuis l’effondrement de la mine haute.' },
    { id: 'e2', type: 'pnj', nom: 'Maëlle Vertepierre', resume: 'Aubergiste du Sanglier Boiteux', tags: 'alliée', notes: 'Ancienne éclaireuse. Sait où passe la contrebande.' },
    { id: 'e3', type: 'pnj', nom: 'Corvin Sarre', resume: 'Contremaître de la mine', tags: 'suspect', notes: 'Ferme la mine basse « pour raisons de sécurité ». Ment.' },
    { id: 'e4', type: 'faction', nom: 'Compagnie du Creuset', resume: 'Consortium minier de la capitale', tags: 'antagoniste', notes: 'Rachète les concessions après chaque « accident ».' },
    { id: 'e5', type: 'quete', nom: 'Les disparus de la mine basse', resume: 'Quatre mineurs manquent à l’appel', tags: 'principale', notes: 'Récompense annoncée : 200 po. La vraie récompense est ce qu’ils trouveront en bas.' },
    { id: 'e6', type: 'joueur', nom: 'Ilyra', resume: 'Rôdeuse elfe, joueuse : Sarah', tags: 'groupe', notes: '' },
    { id: 'e7', type: 'session', nom: 'Session 3', resume: 'Arrivée à Val-Brumeux', tags: '', notes: 'Le groupe a passé la nuit à l’auberge.' },
  ],
  relations: [
    { id: 'r1', source: 'e2', cible: 'e1', type: 'habite à', note: '' },
    { id: 'r2', source: 'e3', cible: 'e1', type: 'habite à', note: '' },
    { id: 'r3', source: 'e3', cible: 'e4', type: 'membre de', note: 'Payé en douce depuis deux ans' },
    { id: 'r4', source: 'e5', cible: 'e1', type: 'situé dans', note: '' },
    { id: 'r5', source: 'e5', cible: 'e2', type: 'quête donnée par', note: '' },
    { id: 'r6', source: 'e6', cible: 'e2', type: 'rencontré par', note: 'Session 3, à l’auberge' },
    { id: 'r7', source: 'e2', cible: 'e7', type: 'apparaît en', note: '' },
  ],
};
