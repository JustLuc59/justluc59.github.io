/**
 * MJ Codex — API Google Sheets
 * ---------------------------------------------------------------
 * À coller dans Extensions > Apps Script depuis TON Google Sheet.
 * Voir README.md pour les étapes de déploiement.
 *
 * Le Sheet contient 2 onglets, créés automatiquement par initialiser() :
 *   entites   : id | type | nom | resume | notes | tags | maj | … (voir ONGLETS)
 *   relations : id | source | cible | type | note | maj
 */

// Change cette valeur par une phrase à toi. Elle est demandée par l'appli.
const CLE_PARTAGEE = 'change-moi-avant-de-deployer';

// Code donné aux joueurs pour joueur.html. Il ne permet que de lire sa propre
// fiche et d'y modifier les champs listés dans CHAMPS_JOUEUR_MODIFIABLES.
// Ce n'est pas un mot de passe : quelqu'un qui l'a peut lire toutes les fiches
// de type joueur. Ne mets rien de secret dans une fiche joueur.
const CODE_JOUEUR = 'change-moi-aussi';

const CHAMPS_JOUEUR_MODIFIABLES = ['pv_actuel', 'inventaire', 'notes_joueur'];

const ONGLETS = {
  // Les colonnes de combat sont volontairement placées APRÈS 'maj' :
  // relancer initialiser() sur un Sheet déjà rempli ne décale alors rien.
  entites: [
    'id', 'type', 'nom', 'resume', 'notes', 'tags', 'maj',
    'niveau', 'ca', 'pv_max',
    'force', 'dexterite', 'constitution', 'intelligence', 'sagesse', 'charisme',
    // Vilains
    'menace', 'statut', 'plan', 'portrait',
    // Rencontres : "idMonstre:nb;idMonstre:nb"
    'composition',
    // Stat block
    'taille', 'categorie', 'alignement', 'pv_des', 'vitesse', 'jets_sauvegarde',
    'competences', 'sens', 'langues', 'resistances', 'immunites', 'vulnerabilites',
    'immunites_etats', 'capacites', 'actions', 'actions_bonus', 'reactions',
    'actions_legendaires',
    // Joueurs
    'race', 'classe', 'pv_actuel', 'inventaire', 'notes_joueur',
  ],
  relations: ['id', 'source', 'cible', 'type', 'note', 'maj'],
  // Calendrier : un événement par ligne. `fiche` = id d'une fiche liée (optionnel).
  evenements: ['id', 'jour', 'mois', 'annee', 'titre', 'note', 'fiche', 'maj'],
  // Réglages divers, une paire clé/valeur par ligne (ex. : date du jour).
  reglages: ['cle', 'valeur'],
};

/** Crée les onglets et les en-têtes s'ils n'existent pas. À lancer une fois. */
function initialiser() {
  const classeur = SpreadsheetApp.getActive();
  Object.keys(ONGLETS).forEach(function (nom) {
    let onglet = classeur.getSheetByName(nom);
    if (!onglet) onglet = classeur.insertSheet(nom);
    const entetes = ONGLETS[nom];
    onglet.getRange(1, 1, 1, entetes.length).setValues([entetes]).setFontWeight('bold');
    onglet.setFrozenRows(1);
  });
  return 'Onglets prêts.';
}

// ---------------------------------------------------------------
// Point d'entrée unique
// ---------------------------------------------------------------

function doPost(e) {
  let requete;
  try {
    requete = JSON.parse(e.postData.contents);
  } catch (err) {
    return reponse({ ok: false, erreur: 'Requête illisible.' });
  }

  let action;
  if (requete.cle === CLE_PARTAGEE) action = ACTIONS[requete.action];
  else if (requete.cle === CODE_JOUEUR) action = ACTIONS_JOUEUR[requete.action];
  else return reponse({ ok: false, erreur: 'Clé refusée.' });

  if (!action) {
    return reponse({ ok: false, erreur: 'Action inconnue : ' + requete.action });
  }

  // Verrou : évite deux écritures simultanées qui s'écrasent.
  const verrou = LockService.getScriptLock();
  verrou.waitLock(20000);
  try {
    return reponse({ ok: true, donnees: action(requete.contenu || {}) });
  } catch (err) {
    return reponse({ ok: false, erreur: String(err && err.message ? err.message : err) });
  } finally {
    verrou.releaseLock();
  }
}

const ACTIONS = {
  /** Renvoie tout le contenu du classeur. */
  charger: function () {
    return {
      entites: lire('entites'),
      relations: lire('relations'),
      evenements: lireSiExiste('evenements'),
      reglages: lireReglages(),
    };
  },

  enregistrerEvenement: function (contenu) {
    return enregistrer('evenements', contenu, 'v');
  },

  supprimerEvenement: function (contenu) {
    supprimer('evenements', contenu.id);
    return { id: contenu.id };
  },

  /** Écrit une valeur de réglage (ex. : { cle: 'aujourdhui', valeur: '{"jour":3,...}' }). */
  ecrireReglage: function (contenu) {
    const feuille = onglet('reglages');
    const index = indexDeLigne(feuille, contenu.cle);
    const ligne = [contenu.cle, contenu.valeur == null ? '' : String(contenu.valeur)];
    if (index === -1) feuille.appendRow(ligne);
    else feuille.getRange(index, 1, 1, 2).setValues([ligne]);
    return { cle: contenu.cle, valeur: ligne[1] };
  },

  /** Crée ou met à jour une entité. */
  enregistrerEntite: function (contenu) {
    return enregistrer('entites', contenu, 'e');
  },

  supprimerEntite: function (contenu) {
    supprimer('entites', contenu.id);
    // On nettoie les relations orphelines.
    lire('relations')
      .filter(function (r) { return r.source === contenu.id || r.cible === contenu.id; })
      .forEach(function (r) { supprimer('relations', r.id); });
    return { id: contenu.id };
  },

  enregistrerRelation: function (contenu) {
    return enregistrer('relations', contenu, 'r');
  },

  supprimerRelation: function (contenu) {
    supprimer('relations', contenu.id);
    return { id: contenu.id };
  },
};

/** Ce que les joueurs peuvent faire avec CODE_JOUEUR. Rien d'autre. */
const ACTIONS_JOUEUR = {
  /** Liste des personnages joueurs, pour choisir le sien. */
  listerJoueurs: function () {
    return lire('entites')
      .filter(function (e) { return e.type === 'joueur'; })
      .map(function (e) { return { id: e.id, nom: e.nom, resume: e.resume }; });
  },

  /** Une fiche joueur complète, plus la date du jour. */
  lireJoueur: function (contenu) {
    const fiche = lire('entites').filter(function (e) { return e.id === contenu.id && e.type === 'joueur'; })[0];
    if (!fiche) throw new Error('Fiche introuvable.');
    return { fiche: fiche, aujourdhui: lireReglages().aujourdhui || '' };
  },

  /** Met à jour les seuls champs autorisés d'une fiche joueur. */
  majJoueur: function (contenu) {
    const fiche = lire('entites').filter(function (e) { return e.id === contenu.id && e.type === 'joueur'; })[0];
    if (!fiche) throw new Error('Fiche introuvable.');
    CHAMPS_JOUEUR_MODIFIABLES.forEach(function (cle) {
      if (contenu.champs && contenu.champs[cle] != null) fiche[cle] = String(contenu.champs[cle]);
    });
    return enregistrer('entites', fiche, 'e');
  },
};

// ---------------------------------------------------------------
// Accès au Sheet
// ---------------------------------------------------------------

/** Comme lire(), mais renvoie [] si l'onglet n'existe pas encore. */
function lireSiExiste(nom) {
  return SpreadsheetApp.getActive().getSheetByName(nom) ? lire(nom) : [];
}

/** L'onglet reglages sous forme d'objet { cle: valeur }. */
function lireReglages() {
  const objet = {};
  lireSiExiste('reglages').forEach(function (ligne) { objet[ligne.cle] = ligne.valeur; });
  return objet;
}

function onglet(nom) {
  const feuille = SpreadsheetApp.getActive().getSheetByName(nom);
  if (!feuille) throw new Error("Onglet manquant : " + nom + ". Lance initialiser().");
  return feuille;
}

/** Lit un onglet entier et renvoie un tableau d'objets. */
function lire(nom) {
  const feuille = onglet(nom);
  const lignes = feuille.getDataRange().getValues();
  const entetes = lignes.shift();
  return lignes
    .filter(function (ligne) { return ligne[0] !== ''; })
    .map(function (ligne) {
      const objet = {};
      entetes.forEach(function (cle, i) { objet[cle] = String(ligne[i] == null ? '' : ligne[i]); });
      return objet;
    });
}

/** Crée la ligne si l'id est vide, sinon écrase la ligne existante. */
function enregistrer(nom, contenu, prefixe) {
  const feuille = onglet(nom);
  const entetes = ONGLETS[nom];
  const enregistrement = Object.assign({}, contenu);

  enregistrement.id = enregistrement.id || prefixe + '_' + Utilities.getUuid().slice(0, 8);
  enregistrement.maj = new Date().toISOString();

  const ligne = entetes.map(function (cle) { return enregistrement[cle] == null ? '' : enregistrement[cle]; });
  const index = indexDeLigne(feuille, enregistrement.id);

  if (index === -1) feuille.appendRow(ligne);
  else feuille.getRange(index, 1, 1, entetes.length).setValues([ligne]);

  return enregistrement;
}

function supprimer(nom, id) {
  const feuille = onglet(nom);
  const index = indexDeLigne(feuille, id);
  if (index !== -1) feuille.deleteRow(index);
}

/** Numéro de ligne (1-indexé) d'un id, ou -1. */
function indexDeLigne(feuille, id) {
  const ids = feuille.getRange(1, 1, Math.max(feuille.getLastRow(), 1), 1).getValues();
  for (let i = 1; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) return i + 1;
  }
  return -1;
}

function reponse(objet) {
  return ContentService.createTextOutput(JSON.stringify(objet))
    .setMimeType(ContentService.MimeType.JSON);
}
