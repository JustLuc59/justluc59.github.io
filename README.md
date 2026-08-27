# MJ Codex

Notes de campagne reliées entre elles. Site statique sur GitHub Pages, données dans un Google Sheet.
Pas de build, pas de npm : tu modifies un fichier, tu pousses, c'est en ligne.

---

## 1. Le Google Sheet

1. Crée un Google Sheet vide.
2. **Extensions → Apps Script**. Supprime le contenu par défaut, colle tout `apps-script/Code.gs`.
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

- Fiches typées : PNJ, lieu, faction, objet, quête, session, joueur
- Liens orientés et nommés entre fiches (« habite à », « membre de »…), visibles des deux côtés
- Recherche plein texte, filtres par type
- Graphe du réseau, avec mise en avant des voisins de la fiche ouverte

## Où modifier quoi

| Je veux… | Fichier |
|---|---|
| Ajouter un type de fiche ou changer les couleurs | `js/config.js` → `TYPES` |
| Ajouter des types de liens suggérés | `js/config.js` → `TYPES_DE_LIEN` |
| Changer la palette ou les polices | `css/style.css` → `:root` |
| Ajouter un champ à une fiche | `apps-script/Code.gs` → `ONGLETS.entites`, puis `js/views/fiche.js` |
| Modifier la liste de gauche | `js/views/liste.js` |
| Modifier le graphe | `js/views/graphe.js` |
| Ajouter une action serveur | `apps-script/Code.gs` → `ACTIONS` |

Ajouter un type de fiche ne demande qu'une ligne dans `TYPES` : filtres, formulaire et graphe se mettent à jour tout seuls.

Après toute modification de `Code.gs`, il faut **redéployer** (Déployer → Gérer les déploiements → crayon → Version : Nouvelle version).

## Comment c'est organisé

```
index.html          structure de la page
css/style.css       tout le style
js/config.js        réglages : types, liens, connexion
js/api.js           appels réseau vers Apps Script
js/store.js         état central — seul endroit qui modifie les données
js/views/           une vue par fichier, chacune s'abonne au store
apps-script/        le code à coller dans le Sheet
```

Le principe : les vues ne se parlent jamais entre elles. Elles appellent une fonction du store, le store prévient tout le monde, chaque vue se redessine. Pour ajouter un panneau, écris un `monterMachin(racine)` qui fait `store.abonner(rendre)`.

## Limites connues

- Apps Script met 1 à 2 secondes par écriture. Sensible, mais pas gênant en session.
- Pas de gestion de conflit si deux personnes écrivent en même temps sur la même fiche : la dernière écriture gagne.
- Quotas Google gratuits : largement au-dessus d'un usage de table.
- Au-delà de ~500 fiches, le graphe devient dense : filtre par type avant de l'ouvrir.
