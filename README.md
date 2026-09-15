# MJ Codex

Notes de campagne reliées entre elles. Site statique sur GitHub Pages, données dans un Google Sheet.
Pas de build, pas de npm : tu modifies un fichier, tu pousses, c'est en ligne.

---

## 1. Le Google Sheet

1. Crée un Google Sheet vide.
2. **Extensions → Apps Script**. Supprime le contenu par défaut, colle tout `Code.gs`.
3. En haut du fichier, remplace `CLE_PARTAGEE` par une phrase à toi.
4. Sélectionne la fonction `initialiser` dans le menu déroulant, **Exécuter**. Autorise l'accès quand Google le demande (l'avertissement « application non vérifiée » est normal : c'est ton propre script, clique sur *Paramètres avancés* puis *Accéder à…*).
   → Les onglets `entites` et `relations` apparaissent dans le Sheet.
5. **Déployer → Nouveau déploiement → Application web**
   - Exécuter en tant que : **moi**
   - Qui a accès : **Tout le monde**
6. Copie l'URL qui se termine par `/exec`.

> « Tout le monde » est obligatoire pour qu'un site statique puisse appeler le script. C'est la clé partagée qui protège l'accès — d'où l'importance de la changer.

## 2. Le site

1. Nouveau dépôt GitHub, pousse le contenu de ce dossier à la racine.
2. **Settings → Pages → Source : Deploy from a branch**, branche `main`, dossier `/ (root)`.
3. Ouvre l'URL, clique **Connexion**, colle l'URL `/exec` et ta clé.

L'URL et la clé restent dans ton navigateur. **Ne les mets jamais dans `config.js` si ton dépôt est public.**

Le bouton **Démo** charge un jeu d'exemple en mémoire pour essayer sans rien brancher.

---

## Ce que fait l'appli

- Fiches typées : PNJ, monstre, joueur, lieu, faction, objet, quête, session, rencontre
- Liens orientés et nommés entre fiches (« habite à », « membre de »…), visibles des deux côtés
- Recherche plein texte, filtres par type
- Graphe du réseau, avec mise en avant des voisins de la fiche ouverte
- Tracker de combat : initiative, PV, états, tours
- **Registre des vilains** : toute fiche PNJ ou Monstre qui porte un rang de menace (sbire, lieutenant, némésis, seigneur) apparaît en carte, avec statut, plan en cours et réseau de sbires (liens « sbire de », « lieutenant de », « sert »)
- **Import de stat block** : colle un bloc du SRD (français ou anglais), la fiche Monstre se remplit — CA, PV, caracs, sens, capacités, actions… — et s'ouvre en édition
- **Rencontres** : une fiche de type Rencontre compose des monstres × nombre, calcule la difficulté 5e d'après les fiches Joueur (niveau), et envoie tout le monde dans le tracker en un clic

## Comment ça s'utilise

- **Vilain** : ouvre un PNJ ou un Monstre → Modifier → bloc « Vilain » → choisis un rang. Relie ses sbires avec un lien « sbire de » ou « sert » vers lui : ils apparaissent sur sa carte.
- **Import** : bouton Importer, colle le stat block, Créer la fiche. Ce qui n'est pas reconnu finit dans « Capacités » — corrige puis Enregistrer.
- **Rencontre** : Nouvelle fiche → type Rencontre → Modifier. La difficulté n'apparaît que si tes fiches Joueur ont un niveau. « Lancer le combat » ajoute les monstres et les joueurs au tracker.

## Où modifier quoi

| Je veux… | Fichier |
|---|---|
| Ajouter un type de fiche ou changer les couleurs | `js/config.js` → `TYPES` |
| Ajouter des types de liens suggérés | `js/config.js` → `TYPES_DE_LIEN` |
| Changer la palette ou les polices | `css/style.css` → `:root` |
| Ajouter un champ à une fiche | `Code.gs` → `ONGLETS.entites`, puis `js/views/fiche.js` |
| Ajouter un chiffre de combat ou une ligne de stat block | `js/config.js` → `CHAMPS_COMBAT` / `CHAMPS_STATBLOC` **et** `ONGLETS.entites` |
| Changer les rangs de menace ou les statuts | `js/config.js` → `RANGS_MENACE`, `STATUTS_VILAIN` |
| Changer quels liens font un sbire | `js/config.js` → `LIENS_SBIRE` |
| Apprendre au parseur une nouvelle étiquette (« Réactions », « Speed »…) | `js/statbloc.js` → `ETIQUETTES` / `SECTIONS` |
| Modifier les tables 5e (PX, seuils) | `js/regles.js` |
| Modifier le registre des vilains | `js/views/vilains.js` |
| Modifier le constructeur de rencontres | `js/views/rencontre.js` |
| Modifier le tracker | `js/views/combat.js` et `js/combat-store.js` |
| Modifier la liste de gauche | `js/views/liste.js` |
| Modifier le graphe | `js/views/graphe.js` |
| Ajouter une action serveur | `Code.gs` → `ACTIONS` |

Ajouter un type de fiche ne demande qu'une ligne dans `TYPES` : filtres, formulaire et graphe se mettent à jour tout seuls.

Après toute modification de `Code.gs`, il faut **redéployer** (Déployer → Gérer les déploiements → crayon → Version : Nouvelle version).

## Comment c'est organisé

```
index.html          structure de la page
css/style.css       tout le style
js/config.js        réglages : types, liens, connexion
js/api.js           appels réseau vers Apps Script
js/store.js         état central — seul endroit qui modifie les données
js/combat-store.js  état du combat en cours (jamais écrit dans le Sheet)
js/regles.js        tables 5e : PX par FP, seuils, difficulté — fonctions pures
js/statbloc.js      lecture d'un stat block collé → objet fiche — fonction pure
js/views/           une vue par fichier, chacune s'abonne au store
  fiche.js            la fiche ; délègue à statbloc.js (vilain, stats) et rencontre.js
  vilains.js          registre des vilains (panneau qui recouvre l'appli)
Code.gs             le code à coller dans le Sheet
```

Le principe : les vues ne se parlent jamais entre elles. Elles appellent une fonction du store, le store prévient tout le monde, chaque vue se redessine. Pour ajouter un panneau, écris un `monterMachin(racine)` qui fait `store.abonner(rendre)`.

## Mise à jour depuis la version « combat »

Nouvelles colonnes dans `Code.gs`, ajoutées **après** les existantes : relancer `initialiser()` sur un Sheet déjà rempli ajoute les colonnes vides sans décaler tes données.

1. Remplace `Code.gs` par la nouvelle version (garde ta `CLE_PARTAGEE`).
2. Lance `initialiser()`.
3. **Déployer → Gérer les déploiements → crayon → Version : Nouvelle version.** Sans ça, l'ancienne version continue de tourner et les nouveaux champs ne seront pas enregistrés.
4. Remplace les fichiers du site (voir la liste des fichiers modifiés dans le commit).

## Limites connues

- Apps Script met 1 à 2 secondes par écriture. Sensible, mais pas gênant en session.
- Pas de gestion de conflit si deux personnes écrivent en même temps sur la même fiche : la dernière écriture gagne.
- Quotas Google gratuits : largement au-dessus d'un usage de table.
- Au-delà de ~500 fiches, le graphe devient dense : filtre par type avant de l'ouvrir.
- Le parseur de stat block est une heuristique : les formats exotiques (tableaux copiés depuis un PDF, blocs 2024 avec colonnes) demandent une relecture.
- La difficulté de rencontre suit la table du DMG 2014 (PX ajustés par multiplicateur). C'est un ordre de grandeur, pas une garantie.
