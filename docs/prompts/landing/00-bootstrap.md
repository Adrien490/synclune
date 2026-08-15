# Tour 0 — Bootstrap

> Ce tour ne dessine **aucune section**. Il pose ce dont les huit suivants dépendent : le système,
> les composants, les frames vides. C'est le tour le plus important de la série.

## Avant d'écrire le moindre nœud

Découvre ce que Pencil te donne — `get_app_state` (schéma inclus), puis `get_guidelines()` et le
guide **« Landing Page »** s'il existe. Dis-moi quel style ou UI kit disponible est le plus proche
de l'univers Synclune, et ce que tu en gardes : on part de là plutôt que de zéro.

Les deux fichiers de contexte font autorité. En cas de conflit avec ton intuition de style, ils
gagnent.

## Le site existe déjà — importe-le plutôt que de le redessiner

La boutique tourne en local. **Ne redessine pas de mémoire ce que tu peux importer** : l'outil
`browser` charge une page réelle et la reproduit en calques Pencil éditables, et chaque nœud importé
porte dans son champ `context` le nom du composant de code dont il vient. C'est ce qui rend le
chemin design → code praticable ensuite.

```
browser({ action: "load-page", url: "http://localhost:3000" })
browser({ action: "import-to-canvas", target: "query", querySelector: "header" })
browser({ action: "import-to-canvas", target: "query", querySelector: "footer" })
```

Importe **la barre haute, la barre basse mobile et le pied de page**, puis range-les dans
`00-systeme/chrome`. Vise le sélecteur précis plutôt que `full-page` : un import de page entière
ramène trop et se range mal.

⚠️ **Si le serveur ne répond pas ou si l'outil `browser` n'est pas disponible ici, dessine la chrome
d'après la description ci-dessous et signale-le** — ce n'est pas un motif de blocage.

⚠️ **L'import donne la STRUCTURE, pas la direction artistique.** Le site actuel est l'état d'avant
la refonte : reprends-en l'ossature, les libellés et les composants ; ne reprends pas ses partis pris
visuels s'ils contredisent l'univers chargé.

## Ce que le fichier doit contenir quand tu rends la main

**Le système, en variables nommées** — toutes celles de `synclune-systeme.md`, sans en inventer ni
en omettre, plus une planche `00-systeme/styles` qui les rend lisibles d'un coup d'œil.

**Cinq composants**, dans `00-systeme/composants` :

- **`bouton`** — `primaire` (rose plein) · `secondaire` (contour encre) · `discret` (texte seul),
  × `défaut` · `survol` · `focus` · `désactivé`. Un libellé passe à la ligne plutôt que de déborder.
- **`carte-produit`** — `disponible` · `derniere-piece` · `piece-unique` · `vendu`. Elle porte
  toujours photo, nom, **prix TTC** et **variantes de couleur visibles sans clic** (les testeuses
  disent que c'est ce qui leur évite d'ouvrir des fiches qu'elles rejetteront), plus un favori.
  Ni étoile, ni note, ni avis, ni promo inventée.
  ⚠️ `vendu` **doit mener quelque part** — une pièce proche, ou la commande personnalisée. 30 % des
  visiteuses quittent le site entier en tombant sur un produit indisponible : marqué clairement,
  mais jamais un mur.
- **`carte-collection`** — `avec-visuels` · `sans-visuel`.
  ⚠️ Une carte produit montre **un objet**, une carte collection un **ensemble** : la collection
  n'a pas d'image propre, elle emprunte **2 à 4 visuels à ses produits**. Et `sans-visuel` doit
  tenir debout seul — une collection vide est un cas normal, pas une erreur.
- **`accordeon-question`** — `fermé` · `ouvert`, cible tactile pleine largeur.
- **`puce-type`** — un tracé au trait 1,5 + un libellé.

**La chrome**, réutilisée par toutes les frames :

- **Barre haute sticky** — « Synclune » · Boutique · Collections · À propos · Recherche · Favoris ·
  Panier (avec badge). ⚠️ Nav desktop **visible, jamais derrière un burger** : cachée, son usage
  tombe de 48 % à 27 % et la navigation devient 39 % plus lente.
- **Barre basse mobile fixe, 56 px** (3,5 rem — la zone de sécurité iOS s'y ajoute sur les
  téléphones à encoche) — Accueil · Boutique · Favoris · Panier.
- **Pied de page** — signature de marque + 4 colonnes (Boutique · La marque · Aide · Légal).
  ⚠️ C'est une **surface de conformité** autant que de navigation : coordonnées du **médiateur de la
  consommation** (obligation française depuis 2016), CGV, mentions légales, **rétractation 14
  jours**, « Fait main à Nantes », « TVA non applicable, art. 293 B du CGI » — tout cela visible et
  lisible.
  ⛔ **Aucun lien vers la plateforme européenne de règlement des litiges** : fermée le 20 juillet
  2025. C'est le défaut de conformité le plus répandu du e-commerce français, précisément parce
  qu'il consiste à ne rien faire.

**Les frames vides**, à ces noms et ces dimensions exactement — c'est l'adressage dont se servent
les tours suivants :

```
00-systeme/styles   00-systeme/composants   00-systeme/chrome
01-hero/desktop        1440    01-hero/mobile        390 × 844
02-creations/desktop   1440    02-creations/mobile   390
03-collections/desktop 1440    03-collections/mobile 390
04-types/desktop       1440    04-types/mobile       390
05-atelier/desktop     1440    05-atelier/mobile     390
06-faq/desktop         1440    06-faq/mobile         390
07-partage/carte       1200 × 630
07-partage/cookies     390 × 844
08-assemblage/desktop  1440    08-assemblage/mobile  390
```

## Rendu

`get_screenshot` des frames système, puis **crée `NOTES.md`** (format dans la conduite) avec ce que
les huit tours suivants doivent savoir : le **motif unique** que tu tiens et pourquoi lui,
l'**alternance d'accents** section par section, ce que tu comptes **dessiner** plutôt que
photographier, et ce que l'import a ramené ou pas.

Dis-moi la même chose en trois lignes, puis rends la main.
