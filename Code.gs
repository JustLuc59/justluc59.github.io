/**
 * MJ Codex — API Google Sheets
 * ---------------------------------------------------------------
 * À coller dans Extensions > Apps Script depuis TON Google Sheet.
 * Voir README.md pour les étapes de déploiement.
 *
 * Le Sheet contient 2 onglets, créés automatiquement par initialiser() :
 *   entites   : id | type | nom | resume | notes | tags | maj
 *   relations : id | source | cible | type | note | maj
 */

// Change cette valeur par une phrase à toi. Elle est demandée par l'appli.
const CLE_PARTAGEE = 'change-moi-avant-de-deployer';

const ONGLETS = {
  entites: ['id', 'type', 'nom', 'resume', 'notes', 'tags', 'maj'],
  relations: ['id', 'source', 'cible', 'type', 'note', 'maj'],
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

  if (requete.cle !== CLE_PARTAGEE) {
    return reponse({ ok: false, erreur: 'Clé refusée.' });
  }

  const action = ACTIONS[requete.action];
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
    return { entites: lire('entites'), relations: lire('relations') };
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

// ---------------------------------------------------------------
// Accès au Sheet
// ---------------------------------------------------------------

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
