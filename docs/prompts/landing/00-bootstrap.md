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

⚠️ **Retour d'expérience (série d'août 2026)** : l'outil `browser` exige l'app desktop pen.dev
lancée, et l'import a échoué aux DEUX tentatives, app comprise. La description ci-dessous est donc,
de fait, la source de la chrome — elle a été alignée sur le code le 2026-08-17 (audit du dossier)
et doit le rester : toute divergence constatée dans le code (libellés de nav, mentions du pied)
gagne sur ce texte.

⚠️ **L'import donne la STRUCTURE, pas la direction artistique.** Le site actuel est l'état d'avant
la refonte : reprends-en l'ossature, les libellés et les composants ; ne reprends pas ses partis pris
visuels s'ils contredisent l'univers chargé.

## Ce que le fichier doit contenir quand tu rends la main

**Le système, en variables nommées** — toutes celles de `synclune-systeme.md`, sans en inventer ni
en omettre, plus une planche `00-systeme/styles` qui les rend lisibles d'un coup d'œil.

**Deux planches d'accent, et c'est un livrable, pas une illustration** (ajouté le 2026-08-19).
Le système bicolore rose/or de `synclune-systeme.md` **remplace** la rotation d'accents du code
(lavande / menthe / soleil, `[data-accent]`, `app/styles/section-accents.css`) : c'est un choix de
design, pas un état de fait, et il bloque le passage en code tant qu'il n'est pas tranché. Ne le
tranche pas, **rends-le arbitrable** — deux planches côte à côte, `00-systeme/accents-bicolore` et
`00-systeme/accents-rotation`, montrant chacune la même séquence de six bandeaux de section (une
bande par section, son accent en aplat, un titre et un bouton dessus) :

- **bicolore** : rose → or → rose → or → rose → or, les tokens de `synclune-systeme.md` ;
- **rotation** : les accents du code réel — `--color-brand-lavender`, `-mint`, `-sun` — plus le
  rose `--primary`, dans la rotation que `section-accents.css` applique déjà.

Sous chaque planche, deux lignes : ce que la direction gagne, ce qu'elle coûte. **Recalcule les
contrastes des deux** depuis les hex : si la rotation ne peut pas écrire, dis-le, c'est un
argument. Le reste du tour, et toute la série, part du **bicolore** — la planche rotation existe
pour que l'arbitrage se prenne sur pièce le jour où Léane le prend, pas pour ouvrir une variante
de travail.

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

- **Barre haute sticky** — « Synclune » · Les créations · Les collections (les deux libellés du
  code, `shared/constants/navigation.ts`) · Rechercher · Favoris · Panier (avec badge). ⚠️ Nav
  desktop **visible, jamais derrière un burger** : cachée, son usage tombe de 48 % à 27 % et la
  navigation devient 39 % plus lente.
- **Barre basse mobile fixe, 56 px** (3,5 rem — la zone de sécurité iOS s'y ajoute sur les
  téléphones à encoche) — **cinq onglets** : Accueil · Créations · Rechercher · Favoris · Panier
  (le jeu du code, verrouillé par `e2e/shop-mobile.spec.ts` — la première version de ce prompt en
  décrivait quatre, corrigé le 2026-08-17).
- **Pied de page** — signature de marque + 4 colonnes (Boutique · La marque · Aide · Légal).
  ⚠️ C'est une **surface de conformité** autant que de navigation : coordonnées du **médiateur de la
  consommation** (obligation française depuis 2016 — celui du code,
  `shared/constants/consumer-law.ts` : **CNPM - MÉDIATION DE LA CONSOMMATION, 27 avenue de la
  Libération, 42400 Saint-Chamond, cnpm-mediation-consommation.eu** — ne pas en inventer un autre),
  CGV, mentions légales, **rétractation 14 jours**, « Fait main à Nantes », « TVA non applicable,
  art. 293 B du CGI » — tout cela visible et lisible.
  ⛔ **Aucun lien vers la plateforme européenne de règlement des litiges** : fermée le 20 juillet
  2025. C'est le défaut de conformité le plus répandu du e-commerce français, précisément parce
  qu'il consiste à ne rien faire.

**Les frames vides**, à ces noms et ces dimensions exactement — c'est l'adressage dont se servent
les tours suivants :

```
00-systeme/styles   00-systeme/composants   00-systeme/chrome
00-systeme/accents-bicolore   00-systeme/accents-rotation
01a-divergence/piste-a   390 × 844   (les trois frames du tour 1a, vides)
01a-divergence/piste-b   390 × 844
01a-divergence/piste-c   390 × 844
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

`get_screenshot` des frames système et des deux planches d'accent, puis **crée `NOTES.md`**
(format dans la conduite) avec ce que les tours suivants doivent savoir : le **motif unique** que
tu tiens et pourquoi lui, l'**alternance d'accents** section par section, ce que tu comptes
**dessiner** plutôt que photographier, et ce que l'import a ramené ou pas.

**Crée aussi `ETAT.md`** — l'état courant en ≤ 80 lignes (motif, accents, mesures qui font
autorité, arbitrages ouverts, pièges d'outillage). C'est lui que le script injectera aux tours
suivants ; le carnet, lui, ne sera plus lu qu'en cas de doute. Le premier arbitrage à y inscrire
est celui des deux planches d'accent.

Dis-moi la même chose en trois lignes, puis rends la main.
