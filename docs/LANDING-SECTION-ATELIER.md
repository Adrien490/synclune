# La section atelier — la direction visuelle, dessinée à neuf — 2026-08-06

> Nom de fichier volontairement SANS date — cohérence avec les deux autres
> docs LANDING. (Correctif 2026-08-06 : la justification d'origine — le scan
> `stripe-api-version-ssot.regression.test.ts` faux-positiverait sur un nom
> daté cité depuis un fichier source — est périmée, son filtre
> `FILE_EXTENSION_SUFFIXES` écarte désormais `md`/`mdx`.)

> **v2 (2026-08-06, même jour que la v1).** La v1 cadrait des retouches de la
> section livrée le 2026-08-05 ; sur demande explicite, ce document repart de
> zéro : **l'implémentation actuelle de
> `app/(shop)/(home)/_components/atelier/atelier-section.tsx` est un socle
> JETABLE, pas une contrainte** — disposition, grille des notes, rail et tests
> de structure peuvent tomber. Ne survivent que les invariants listés au
> § Le socle. Par décision utilisateur, ce document porte **la direction
> visuelle elle-même** (d'ordinaire le rôle d'un artifact du pipeline
> `docs/prompts/DESIGN-ARTIFACT-PROMPT.md`) ; le pipeline reste le bon outil
> pour la maquette de vérification au moment d'implémenter. Les règles citées
> nomment leur test : c'est le test, pas ce fichier, qui fait autorité.

## Le brief, rappel

Synclune vend des **bijoux créatifs et colorés, faits main** — pas de la
joaillerie précieuse (SSOT `shared/constants/brand.ts`, détail `BUSINESS.md`).
L'atelier est la section-récit de `/` : la seule avec un visage humain, la
seule qui raconte au lieu de vendre — ni CTA, ni compteur, ni réassurance
(tout ça vit ailleurs). Ordre de lecture de la page : accroche (étal) →
orientation (collections) → **récit (atelier)** → réassurance (FAQ) →
signature (footer).

Le « meilleur visuel possible » se juge sur UN critère : est-ce que la section
donne à voir **le geste de fabrication** — la main de Léane — mieux que ne le
ferait un paragraphe ? Et il se juge dans les conditions réelles : **les
photos n'existent pas encore** (le portrait `IMAGES.FOUNDER` répond 404 chez
UploadThing, et les 4 scènes d'atelier n'ont jamais été shootées). Une
direction dont la beauté dépend d'assets absents n'est pas une direction,
c'est un pari.

## L'état de départ — audit sur rendu navigateur réel (2026-08-06)

La section livrée le 2026-08-05 a été auditée **au rendu réel** le même jour
que cette v2 (dev server, captures Playwright au viewport — jamais `fullPage`
seule, `animation-timeline: view()` y rend les sections à `opacity: 0` —,
scrolls `behavior: "instant"`, largeurs SSOT 390/768/1280 de
`e2e/constants.ts`, passe `reducedMotion: "reduce"`, mesures
`getBoundingClientRect`). Ce constat est **la note avant** : il dit ce que la
refonte quitte, ce qu'elle doit conserver, et il chiffre ce que jsdom ne voit
pas. Chemins cités sans numéro de ligne, délibérément (les ancres
`fichier:ligne` dérivent).

### Note : 11/20 en l'état

**La composition était juste, mais la pièce maîtresse de la seule section
humaine de la page est un cadre vide** — et depuis la purge des rubans, les
quatre notes n'avaient plus pour toute encre qu'un cercle pâle de 38 px. La
section fonctionnait (structure, a11y, SEO impeccables) mais desservait : une
photo cassée dans la section qui construit la confiance produit l'inverse de
son rôle.

| Jauge                    | /20 | Le fait qui la fixe                                                                      |
| ------------------------ | --- | ---------------------------------------------------------------------------------------- |
| Direction artistique     | 12  | Vocabulaire papier juste ; zéro accent dans le processus, portrait mort                  |
| Hiérarchie & composition | 13  | `h2`/`h3`/`<ol>` propres ; rangée 1 asymétrique, gouttière morte mobile                  |
| UX / parcours            | 14  | Récit clair, ancres OK ; rien d'interactif à rater (assumé)                              |
| Responsive               | 13  | Empilement correct ; ~131 px de vide à droite du polaroid à 390                          |
| Accessibilité            | 16  | Ornements `aria-hidden`, `<ol>` porteur d'ordre, replis reduced-motion vérifiés          |
| Technique                | 14  | SSOT bi-consommée, zéro JS — mais URL morte **publiée** dans le `@graph`, aucun fallback |

### Ce que le rendu confirme, et ce que la direction en fait

1. **P1 — le portrait est mort, sans filet.** `IMAGES.FOUNDER` : 404 direct
   (curl) ET au rendu (`img.naturalWidth === 0`). À 1280 : cadre blanc
   ~362×476 px, glyphe d'image cassée + alt en haut à gauche, légende
   « C'est moi, Léane ! » sous un cadre vide ; à 390, idem sur 247 px. L'URL
   morte est publiée dans `Person` et `HowTo.image` du `@graph`.
   → **La plaque dessinée de la pièce 2** ; le swap reste
   `shared/constants/images.ts` (lot 3a).
2. **P2 — quatre notes, même meuble.** Seule encre par étape : le cercle de
   38 px au trait 2 px, en tokens pastel ; tilt ±0,5° quasi illisible
   (décalage de coin ~2,9 px sur 329 px de carte). La lavande de la salle
   n'atteignait jamais le processus (unique consommateur du wash : la
   confidence). → **Le fil, les perles et les vignettes** (pièce 4).
3. **P2 — le métronome, vérifié côte à côte** (captures des trois blocs titre
   à 1280) : seule la couleur d'un trait de 12 px distingue les ouvertures.
   → **Le fil, seul** (pièce 4) — le surligneur mono sur les `h2` a été
   abandonné le 2026-08-06 (héros-seul, cf. § Refusé) : la charge
   anti-métronome repose entièrement sur la colonne vertébrale.
4. **P3 — rangée 1 asymétrique dès `sm`** : note 1 = 168 px, notes 2-4 =
   144 px (la copie d'`idea` prend une ligne de plus à 1280), décroché sous
   la note 2 (`items-start`). → **Sans objet en colonne unique** — mais si la
   copie d'`idea` reste la plus longue, c'est elle qui fixera le rythme des
   segments du fil : à re-regarder au lot 4.
5. **P3 — gouttière morte mobile** : figure de 247 px sur 390 → ~131 px de
   vide à droite (37 % de la largeur). → **Tranché (A4, 2026-08-06)** : le
   tirage se centre sous `lg` — l'alternative « axe gauche meublé » est
   morte.
6. **P3 — divergence de grammaire d'arrivée entre voisines** : rail
   `inView` (atelier, FAQ) contre `animated={false}` (Collections), et
   `.enter-inview` absent du bloc titre Collections. → **Les rails restent**
   (surligneur héros-seul, décision du 2026-08-06) : la parité se corrige au
   lot 1, se re-vérifie au lot 4.
7. **P3 — zéro assertion E2E** sur la section. → **Lot 4.**

### Ce que le rendu valide, et que la refonte doit conserver

- **La confidence** : fond mesuré `oklab(0.972 …)` — le consommateur du lavis
  est vivant, le papier lavé + rotation 0,4° + `shadow-paper` est la pièce la
  plus réussie de la section. La v2 la garde (pièce 3) : ne pas la « refaire ».
- **Le sticky du portrait** : vivant à 1280 (pin à 104 px =
  `--navbar-height-static` + 1,5 rem, course ~230 px puis relâche — courte
  car la colonne droite n'était qu'un peu plus haute). La colonne enfilée de
  la v2 **allonge cette course** : c'est un argument mesuré en sa faveur, à
  re-mesurer au lot 4.
- **Les replis** : passe `reducedMotion: "reduce"` verte au rendu — tout
  visible, traits secs, aucune information perdue. La direction ajoute des
  tracés : la même passe fait partie du lot 4.
- **Hiérarchie, ordre des encres, voix** : conformes au rendu (un `h2`, un
  `h3`, pas de `h4`, `<ol>` ancré, rose → lavande → menthe → soleil,
  tutoiement partout, une seule signature sur la page).

**Un garde-fou hérité de l'audit pour le fil** (la direction retenue ici est
une variante de celle que l'audit avait jugée la plus risquée) : le découpage
en **segments courts et indépendants dans une gouttière fixe** est précisément
ce qui neutralise le risque identifié — un fil qui viserait des cercles à
travers des hauteurs de contenu variables se recalibrerait à chaque retouche
de copie. **Critère d'échec à conserver au lot 2** : si un segment doit être
retouché parce qu'une description a changé de longueur, le montage est
mauvais — les segments doivent être indifférents à la hauteur des notes.

### Non vérifié, dit franchement

- L'état **nominal** du polaroid (photo qui charge) n'a jamais été observé —
  toute projection de note avec photo est une déduction.
- L'audit a noté l'implémentation du 2026-08-05 **avant** cette v2 : la
  direction « fil » n'existe qu'en description, aucun rendu n'en a été jugé.
- Le seed visible dans les captures voisines (~48 produits) est de la
  joaillerie précieuse — le contre-brief ; il n'a pesé sur aucun arbitrage.

## Le socle — ce qui survit à la page blanche

Court, fermé, non négociable :

- **La SSOT de contenu** `shared/constants/atelier-content.ts` — les 4 étapes
  (`idea` / `materials` / `assembly` / `finishing`), le `HowTo`, le point de
  swap `ATELIER_IMAGE`. Elle est bi-consommée : le nœud `HowTo` du `@graph`
  (`shared/components/structured-data.tsx`) ancre ses steps sur les `id`
  réels `#atelier-step-<id>` — renommer un `id` casse des ancres publiées.
- **Zéro JSON-LD local, zéro deuxième `<script>`**
  (`catalogue-single-breadcrumb.regression.test.ts`) ; l'`ItemList` d'une
  galerie photo n'existe que si chaque photo a un `contentUrl` distinct.
- **L'accent de salle est la lavande** (`data-accent="lavender"`) et il doit
  garder au moins un consommateur de surface (`bg-(--section-wash)`).
  Précision (2026-08-06) : seule la **liste** des 4 accents est SSOT navbar
  (`app/(shop)/(home)/_components/navbar/navbar-section.ts`) —
  `resolveNavbarSection` rend `rose` sur `/`, l'attribution lavande ← atelier
  est une décision de section (la lavande était le seul accent que la landing
  n'avait pas revendiqué).
- **Le contrat des accents** (`app/styles/section-accents.css`) : les tokens
  de marque ne touchent que des **surfaces** et des **tracés SVG décoratifs**
  (1,5–2,5:1 — illisibles en encre de texte).
- **Les invariants de page** (`LANDING-PAGE.md` § 3) : aucun séparateur entre
  sections (2026-08-06), plafond `max-w-6xl`, copie au tutoiement, une seule
  signature « — Léane » (le footer), entrées below-fold en famille
  `*-inview`, pas de token de couleur dans une prop d'animation Motion.
- **La hiérarchie sémantique** : un `h2`, un `h3` pour le processus, pas de
  `h4` sur des items non interactifs, l'ordre des étapes porté par un `<ol>`.

Tout le reste — grille, rail, disposition, nombre de colonnes, tests de
structure — est **révisable** par la direction ci-dessous.

## Les directions explorées

| Direction                 | Idée                                                                                                        | Verdict                                                                                                                                           |
| ------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| A « L'atelier illustré »  | Une vignette dessinée à la main par étape, dans l'encre de l'étape                                          | ✅ **Absorbée dans B** — les vignettes deviennent les perles du fil                                                                               |
| B « Le fil de l'atelier » | Le processus enfilé comme un collier : un fil dessiné descend la section, chaque étape est une perle dessus | ✅ **RETENUE** — détail ci-dessous                                                                                                                |
| C « La table de papiers » | Différencier les 4 notes par la matière (kraft, quadrillé, bord déchiré)                                    | ⏸️ En réserve — c'est le registre scrapbook qui a déjà saturé (purge des rubans du 2026-08-06) ; à ne rouvrir que si B, rendue, manque de matière |
| D « Photos d'abord »      | Mosaïque de tirages, le récit en légendes                                                                   | ❌ **Bloquée** — les photos n'existent pas ; c'est le lot photos de B qui en héritera                                                             |

## La direction : « Le fil de l'atelier »

**Le concept en une phrase** : un bijou Synclune, c'est des perles enfilées
une à une — la section fait pareil : un **fil dessiné à la main** descend le
récit, et chaque étape du processus est une **perle** posée dessus, à son
encre de marque, dans l'ordre du geste (rose → lavande → menthe → soleil).

Le fil n'est pas un décor : c'est le **mécanisme** de la section. Il remplace
tout ce que la purge du 2026-08-06 a retiré (rubans, filet) par UN motif qui
appartient en propre au sujet — aucune autre section de la page n'a de
colonne vertébrale, et c'est ce qui casse le « métronome » diagnostiqué par
l'audit de la landing du 2026-08-06 (les trois sections s'ouvrant par un
gabarit strictement identique).

### Les pièces, dans l'ordre de lecture

1. **Le bloc titre** — `h2` « Viens voir l'atelier », `HandDrawnRail` lavande
   **conservé** : ⚠️ **le surligneur `BrushHighlight` reste exclusif au `h1`
   du héros** (décision utilisateur du 2026-08-06 — la déclinaison mono sur
   les `h2` de section, part atelier de la reco page « Le surligneur passe »,
   est abandonnée ; cf. § Refusé). Conséquences : le bloc titre garde la
   grammaire de page « `h2` + rail » (`LANDING-PAGE.md` § 3, plus rien à y
   amender), et **c'est le fil seul qui porte la charge anti-métronome** de
   la section. Reste à corriger la divergence d'arrivée entre voisines (rail
   `inView` ici et FAQ contre `animated={false}` chez Collections, constat
   n° 6 de l'état de départ) — elle ne meurt plus avec les rails. Chapô
   conservé (≤ 46ch).
2. **Le portrait polaroid** — l'ancre humaine, conservée dans son principe :
   cadre `CARD_SURFACE_POLAROID` + grain `.polaroid-paper`, légende cursive,
   **l'unique ruban `MaskingTape` de la section** (la photo est littéralement
   scotchée). Sticky ≥ `lg` en colonne gauche — et le fil rallonge la colonne
   droite (colonne unique, cf. pièce 4), donc la course sticky s'allonge : le
   portrait **accompagne la lecture** au lieu de se figer après un écran.
   ⚠️ **L'état sans photo est une pièce de design, pas un `onError`** : tant
   que `IMAGES.FOUNDER` est mort (404 re-vérifié le 2026-08-06), le cadre
   rend une **plaque dessinée** — fond `--section-wash`, tracé main levée
   (cercle ou cœur de `shared/components/hand-drawn/paths.ts`), légende
   cursive qui assume l'attente. L'absence devient une note d'atelier, plus
   jamais un trou blanc publié avec son alt.
3. **La confidence** — les deux paragraphes sur papier `bg-(--section-wash)`
   (le consommateur **principal** du lavis — la plaque de la pièce 2 en
   devient un second, et le verrou du lot 2 doit viser les deux, pas « au
   moins un »), légèrement incliné. C'est sous ce papier que
   **le fil prend sa source** : le premier segment part du bord bas de la
   confidence vers la première perle — le récit se déverse dans le geste.
4. **Le processus enfilé** — le `<ol>` passe en **colonne unique plafonnée à
   ~36 rem** (A1 — la grille 2×2 actuelle meurt : quatre cartes identiques en
   grille, c'est un inventaire ; quatre perles sur un fil, c'est un geste qui
   avance ; et une note de ~34 rem porte 2-3 lignes de copie, la latte
   redevient une carte). Les ~10 rem restants à droite de la colonne sont
   **l'emplacement réservé des polaroids futurs** (« en regard des notes »,
   cf. § photos) — un vide nommé et destiné, pas subi. Le `h3` « Comment je
   crée tes bijoux » s'aligne sur le bord gauche des **cartes** (pas de la
   gouttière) : le segment source descend dans la gouttière, à gauche du
   `h3`, et ne barre jamais un titre (A2). Anatomie :
   - **le fil** : dans une gouttière fixe **≥ 3,5 rem** (A2 — souffle autour
     du cercle de 38 px) à gauche des notes, un segment SVG dessiné main
     **entre chaque perle**, en **mono-lavande** (A3, tranché 2026-08-06 —
     l'encre de salle ; ce sont les perles et vignettes qui portent la gamme
     quadri). **Deux formes de segment alternées** (A5 — un fil est un fil,
     sa variation vient de l'alternance, pas de quatre tracés uniques).
     Segments courts et indépendants (PAS un path unique étiré sur
     toute la hauteur : `preserveAspectRatio` déformerait le trait — c'est le
     piège letterboxing que verrouille
     `hand-drawn-accent-aspect-ratio.regression.test.ts`). Nouveaux tracés à
     déclarer dans la SSOT `shared/components/hand-drawn/paths.ts` (même
     main, viewBox + dimensions natives au même ratio).
   - **la perle** : le numéro encerclé main (`HandDrawnAccent`
     variant `circle`, existant) **à cheval sur le bord gauche de la carte,
     centré sur l'axe de la gouttière** (A2 — le fil passe dans cet axe,
     sous la perle : le collier est enfilé, pas longé), à l'encre de l'étape
     — chiffre en `--foreground`, cercle au token. C'est l'articulation
     conservée de l'existant : l'encre d'état des étapes reste le cercle.
   - **la vignette** : chaque note gagne un petit tracé main levée
     (~40 px, `aria-hidden`, encre de l'étape) qui illustre le geste —
     étincelle (l'idée), goutte/perle (le matériel), volute (la cuisson),
     nœud (la finition). Quatre nouveaux paths dans la même SSOT. C'est la
     direction A absorbée : la section est **dessinée**, pas photographiée —
     sa richesse ne dépend d'aucun asset distant.
   - **le nœud final** : après la quatrième note, le fil se termine par un
     petit nœud dessiné — le bijou est fini. Pas de CTA derrière (refus
     assumé : l'atelier ne vend pas).
5. **Rien d'autre.** Ni stats, ni galerie tant que les photos n'existent pas,
   ni signature.

### Mouvement

- **Le fil se dessine au scroll, segment par segment** : chaque segment est
  un **SVG distinct** portant `hand-draw-inview` (`app/styles/entrance.css`)
  — dessin CSS pur (`pathLength`), zéro JS client, la section reste un
  Server Component sans île. ⚠️ Mécanique dite honnêtement (correctif
  2026-08-06) : `hand-draw-inview` n'a **aucun stagger** (`--hand-delay`
  n'est lu que par `hand-draw-load`, inopérant sous `animation-timeline:
view()`) — chaque segment se dessine sur sa **propre** timeline `view()`,
  donc deux segments co-visibles à l'entrée du bloc se dessinent **en
  parallèle**, pas perle après perle. Le séquencement ne vient que de la
  position verticale des segments ; l'arbitrage (l'assumer, ou régler des
  `animation-range` par segment) est tranché à l'amendement A5 de l'audit
  ci-dessous. Corollaire ferme : deux segments dans un même SVG se
  dessineraient d'un seul geste — un SVG par segment, sans exception.
- Les notes gardent la cascade `enter-inview` (stagger 6 %/item, plafonné —
  le pattern des grilles voisines).
- **Replis dits ici, pas découverts en code** : `prefers-reduced-motion` et
  Safari ≤ 18 rendent fil, perles et vignettes **déjà secs** (le défaut des
  classes `hand-draw-*`) ; `forced-colors` / `contrast-more` : les tracés
  décoratifs se retirent, l'encre seule suffit (même philosophie que le
  surligneur du `h1`).

### Responsive

- **Mobile (< lg)** : portrait (non sticky, **centré** — A4, tranché
  2026-08-06 : l'axe gauche ne se justifiait que par le sticky, absent ici,
  et les 131 px de gouttière morte mesurés à 390 disparaissent) →
  confidence → le fil vertical, gouttière à gauche, notes sur la largeur
  restante. Le fil est le même — c'est une direction qui ne dégrade rien en
  petit viewport, elle y est même née (une colonne).
- **≥ lg** : la grille porteuse actuelle reste le bon squelette
  (`minmax(0,22rem)` portrait sticky / `minmax(0,1fr)` récit + fil) — c'est
  la DISPOSITION INTERNE de la colonne droite qui change (colonne unique
  enfilée au lieu de la grille 2×2).
- Aucun nouveau breakpoint ; tout seuil en rem (SSOT
  `shared/constants/breakpoints.ts`).

### Accessibilité / SEO — ce que la direction ne change PAS

Fil, perles, vignettes, nœud : tous `aria-hidden` — l'ordre et le contenu
sont portés par le `<ol>` et ses `<li>` ancrés, exactement comme aujourd'hui.
Le `HowTo` du `@graph` ne bouge pas d'une ligne (mêmes `id`, même SSOT). La
voix tutoie (mécanique de `checkout-voice-tutoiement.regression.test.ts`,
assertée par le test de la section).

### Le jour où les photos arrivent

Le fil est conçu pour les recevoir, pas pour leur céder la place : les
4 tirages de scène (`hands` / `materials` / `inspiration` / `workspace`, alts
prêts dans `atelier-story.md`, § `TODO(photos-atelier)`) s'insèrent comme
petits polaroids **en regard des notes**, scotchés au fil — les vignettes
dessinées restent (c'est la main de Léane, pas un placeholder). L'`ItemList`
de galerie ne revient qu'avec des `contentUrl` distincts (retirée en son
temps précisément parce que les 4 pointaient la même image). Et le portrait
réel remplace la plaque dessinée par le seul swap de
`shared/constants/images.ts`.

## L'audit de la direction sur papier — 13/20 (2026-08-06)

La direction ci-dessus a été auditée le jour même, **avant tout rendu**
(décision utilisateur : livrable doc, pas de maquette — le jugement visuel
reste une projection, comme le § « Non vérifié » l'assume déjà). Deux passes
croisées : une **vérification doc ↔ code** sur le working tree (chaque
affirmation technique confrontée au fichier qu'elle cite) et une **critique
adversariale** (faire échouer la direction, challenger autorisé). Les faits de
code sont vérifiés ; les faiblesses de composition sont des projections
arithmétiques sur les mesures de l'état de départ. Décision utilisateur
intégrée en cours d'audit : **le surligneur reste héros-seul** — elle éteint
deux écarts (a, f) et réécrit la pièce 1.

### Note : 13/20 sur papier

**Le concept est le bon — la conception avait quatre trous.** Deux points
au-dessus de l'implémentation condamnée, ce qui est juste : la métaphore est
la première de la page à appartenir en propre au produit. Mais pas un feu
vert : tels qu'écrits avant cet audit, les lots 0–2 auraient exécuté
fidèlement quatre indéterminations (F1–F4). La note se rejuge à la maquette
du lot M, pas avant.

| Jauge                    | /20 | Le fait qui la fixe                                                                                                                                                                                               |
| ------------------------ | --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Direction artistique     | 15  | Concept spécifique au bijou, anti-métronome, zéro asset distant — mais pari dessin non chiffré (F5) et encres du fil non arbitrées (F6)                                                                           |
| Hiérarchie & composition | 12  | Bandes maigres non traitées (F1), perle géométriquement hors fil (F2), jonction confidence → `h3` → fil non dessinée (F3)                                                                                         |
| UX / parcours            | 14  | Récit renforcé, sticky rallongé (argument mesuré) — mais budget vertical tablette ~doublé, non chiffré (F7)                                                                                                       |
| Responsive               | 12  | Le défaut mobile mesuré (131 px) reporté au lot 2, et le fil retire ~40 px de copie à 390 (F8)                                                                                                                    |
| Accessibilité            | 16  | Replis dits d'avance, ornements `aria-hidden`, `<ol>`/`HowTo` intacts — rien à reprocher sur papier                                                                                                               |
| Technique                | 11  | Métaphore assise sur un stagger inexistant (b), tests non couverts ou cassés passés sous silence (c, d), verrou du wash relâché sans le dire (e) ; (a) et (f), réels à l'audit, éteints depuis par « héros-seul » |

### Les faiblesses attaquées (F1–F9)

1. **F1 — les bandes maigres** (la plus grave). La colonne droite fait
   ~46 rem à `lg` (72 rem − 22 rem de portrait − 4 rem de gouttière de
   grille). Les copies font 88–113 caractères (`idea` ~113, la plus longue) :
   en pleine largeur, chaque note est une **latte de ~90–110 px de haut sur
   ~700 px de large, aux deux tiers vide à droite**, perle et vignette
   collées au bord gauche. C'est la gouttière morte mobile (37 % mesurés)
   **relogée sur desktop**, et à tablette c'est pire. « Notes pleine largeur
   de colonne » ne dit jamais ce qui habite cette largeur. → **A1.**
2. **F2 — la perle n'est pas sur le fil.** Le doc affirme « posé SUR le
   fil » ET « gouttière fixe ~2,5 rem à gauche des notes » : un cercle de
   38 px dans 40 px de gouttière n'a ~1 px de souffle de chaque côté ; et si
   la perle reste dans la carte (position actuelle), le fil court **à côté**
   du collier — la métaphore centrale est fausse au premier regard. Aucune
   des deux géométries n'était dessinée. → **A2.**
3. **F3 — la jonction n'est pas tracée.** Entre la confidence (source du
   fil) et le `<ol>` vit le `h3` « Comment je crée tes bijoux » : le segment
   source le traverse (un trait qui barre un titre = bruit), le contourne
   (la « gouttière fixe » ment) ou désaligne le `h3` — non arbitré. → **A2.**
4. **F4 — « s'enfiler » sans mécanisme.** `hand-draw-inview` n'a aucun
   stagger : des segments co-visibles à 1280 se dessinent en parallèle, pas
   perle après perle. Le doc vendait l'effet sans posséder son mécanisme.
   → **corrigé au § Mouvement ; arbitrage A5.**
5. **F5 — le pari photo remplacé par un pari dessin, non chiffré.** La
   direction D est disqualifiée d'une phrase juste, puis la B engage 8–9
   tracés neufs (segments + 4 vignettes + nœud + plaque) « de la même main »
   — alors que le corpus existant, c'est cercles, cœurs, soulignés. Une
   **volute à 40 px au trait 2 px** fait des spires de ~6 px pour 2 px
   d'encre : de la bouillie ; et « volute = cuisson » ne se décode qu'avec la
   légende (la vignette texture, elle n'informe pas). Si les tracés ratent,
   la section rate — même mode d'échec que le portrait 404, mais **non
   réparable par un upload**. Ni budget, ni critère de rejet. → **A5.**
6. **F6 — les encres du fil, non arbitrées.** Fil quadri descendant
   rose → lavande → menthe → soleil dans une salle **lavande** : le segment
   lavande posé près du wash lavande est le maillon redondant ; la finale
   **soleil** (l'encre la plus pâle, 1,5–2,5:1) arrive juste avant la FAQ…
   dont l'accent est soleil — passation jamais dessinée. Depuis
   « héros-seul », le fil est **l'unique porteur d'accent visible** de la
   section avec le rail : l'arbitrage compte double. → **A3.**
7. **F7 — le budget vertical n'est pas chiffré.** De `sm` à `lg`, la 2×2
   (~330 px de processus) devient une colonne de 4 notes + segments
   ≈ 550–700 px : la section-récit devient la plus longue de la page. La
   course sticky rallongée n'est un gain **que si F1 est résolue** — sinon
   c'est plus de temps d'exposition aux bandes maigres. → **chiffré ici,
   assumé si A1 passe ; re-mesure au lot 4.**
8. **F8 — le mobile, terrain « natal », cumule les deux vides.** Le pire
   défaut mesuré (131 px morts à droite du portrait, 37 % de 390) était
   reporté au lot 2, et la gouttière du fil retire ~40 px de plus à la copie
   (~310 px restants). Une v2 « page blanche » qui ne tranche pas sa vue la
   plus fréquente n'a pas fini de trancher. → **A4, tranché maintenant.**
9. **F9 — l'encre intra-note n'a presque pas augmenté depuis le 11/20.**
   Le P2 condamnait « seule encre : le cercle 38 px » ; la v2 le garde
   (rebaptisé perle) et ajoute une vignette de 40 px — de ~38 à ~80 px
   d'encre sur une latte de ~700 px, les segments vivant ENTRE les notes.
   C'est A1 (largeur plafonnée, polaroids futurs en regard) qui change la
   densité, pas les vignettes seules. → **A1 ; re-mesure au lot 4.**

### Les écarts doc ↔ code (a–h) — tous traités dans ce document

| Écart | Le fait vérifié (working tree)                                                                                                                                                                                                                                                                                  | Sort                                                                      |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| a     | `BrushHighlight` n'est pas « quadri-accents » : UN path, `stroke` en dégradé 4 stops, `id="etal-brush-gradient"` fixe (collision si monté 2×)                                                                                                                                                                   | **Éteint** — surligneur héros-seul, pièce 1 réécrite                      |
| b     | `hand-draw-inview` n'a aucun stagger ; `--hand-delay` n'est lu que par `hand-draw-load` ; deux segments dans un même SVG se dessinent d'un seul geste                                                                                                                                                           | **Corrigé** au § Mouvement ; arbitrage A5                                 |
| c     | `hand-drawn-accent-aspect-ratio.regression.test.ts` n'itère que sur `UNDERLINE_PATHS` + `ACCENT_SHAPE_PATHS` et exige l'échelle 1 (`width === vbWidth`) : un nouvel objet de paths ne serait **pas couvert** ; `isFilledVariant` est codé en dur sur `star`/`heart` (nouveaux tracés → `fill="none"`, conforme) | **Lot 0** : étendre l'itération du test aux nouveaux tracés               |
| d     | Aucun test n'asserte la grille 2×2 (le lot 2 est plus léger qu'annoncé), MAIS le test portrait exige `src === ATELIER_IMAGE` + `getByRole("img")` : la plaque dessinée le casse                                                                                                                                 | **Lot 2** : réécrire l'assertion portrait (deux états : photo / plaque)   |
| e     | La plaque sur `--section-wash` crée un 2ᵉ consommateur du lavis ; le verrou actuel (`querySelector` du wash) passerait même si la confidence perdait le sien                                                                                                                                                    | **Corrigé** pièce 3 + socle ; **lot 2** : asserter les DEUX consommateurs |
| f     | Le retrait du rail contredisait `LANDING-PAGE.md` § 3 (« bloc titre = `h2` + rail »), amendement non prescrit                                                                                                                                                                                                   | **Éteint** — le rail reste (héros-seul)                                   |
| g     | La justification du nom sans date était périmée (le scan filtre `md`/`mdx` via `FILE_EXTENSION_SUFFIXES`)                                                                                                                                                                                                       | **Corrigé** en-tête                                                       |
| h     | La lavande n'est pas issue de `resolveNavbarSection` (qui rend `rose` sur `/`) — seule la liste des 4 accents est SSOT navbar                                                                                                                                                                                   | **Corrigé** § socle                                                       |

### Les amendements (A1–A5)

- **A1 — plafonner la colonne enfilée.** Fil + notes tiennent dans
  ~**36 rem** (au lieu des ~46 rem de la colonne) ; les ~10 rem restants à
  droite sont **l'emplacement réservé des polaroids futurs** (« en regard des
  notes », déjà prévu au § photos) — un vide nommé et destiné, pas subi. Une
  note de ~34 rem porte ~2-3 lignes de copie : la latte redevient une carte.
- **A2 — trancher la géométrie, dessiner les jonctions.** La perle est
  **à cheval sur le bord gauche de la carte**, centrée sur l'axe de la
  gouttière, élargie à **≥ 3,5 rem** (souffle autour du cercle de 38 px) ; le
  fil passe dans cet axe, sous la perle. Le `h3` s'aligne sur le bord gauche
  des **cartes** (pas de la gouttière) : le segment source descend dans la
  gouttière, à gauche du `h3`, et ne barre jamais un titre. À dessiner à la
  maquette du lot M **avant** d'écrire le composant.
- **A3 — l'encre du fil** ✅ **TRANCHÉ (utilisateur, 2026-08-06) : fil
  mono-lavande, perles et vignettes quadri** — la salle garde UN accent
  (contrat de page), les étapes gardent leur gamme, le segment
  lavande-sur-lavande et la finale soleil pâle disparaissent, et la
  passation soleil → FAQ n'a plus à être dessinée. L'alternative (fil quadri)
  est morte avec cette décision — ne pas la re-proposer.
- **A4 — le mobile** ✅ **TRANCHÉ (utilisateur, 2026-08-06) : le tirage se
  centre sous `lg`** — l'axe gauche ne se justifie que par le sticky, qui
  n'existe pas sous `lg` ; la plaque dessinée meuble le cadre, pas la
  gouttière de 131 px. L'alternative (axe gauche meublé) est morte avec
  cette décision.
- **A5 — borner le pari dessin, assumer le mouvement.** (1) **Deux formes de
  segment** alternées, pas quatre uniques — un fil est un fil, et A3 ayant
  retenu le mono-lavande, sa variation vient de l'alternance des formes. (2) Critère
  de rejet AVANT intégration : un tracé illisible à 40 px en niveaux de gris
  est rejeté ; la **volute** est le candidat le plus risqué — prévoir un
  remplaçant (ex. trois traits de chaleur au-dessus d'un rond de four).
  (3) Mouvement : **assumer le dessin par-segment** (parallèle quand
  co-visibles) — pas de réglage d'`animation-range` par segment, qui
  violerait le critère d'échec hérité (indifférence à la hauteur des notes).
  Au scroll lent la séquence se lit ; au scroll rapide, le fil sec EST déjà
  la métaphore.

### Le challenger examiné — « La fiche recette de l'atelier »

Esquisse (challenger autorisé, hors liste Refusé) : la copie la nomme déjà
(« chaque bijou a sa propre recette ») et `ATELIER_HOWTO` **est** une recette
(supplies, tools, totalTime). Le `<ol>` vivrait dans **une seule carte-recette
dense** (papier `bg-card`, la confidence reste seule sur le wash), numéros
encerclés dans la gamme, 4 vignettes en marge — la direction A survivrait
avec 4 tracés au lieu de 8-9. Elle tue F1, F2, F3, F6 et F7 d'un coup.

**Le fil gagne quand même, amendé** : (1) c'est la seule direction
**spécifique au bijou** — enfiler des perles est littéralement le produit,
une recette est artisan-générique (confiture, savon, céramique) ; (2) c'est
la seule colonne vertébrale de la page — et depuis « héros-seul », le fil
porte **seul** la charge anti-métronome ; (3) elle absorbe les photos futures
sans se re-composer. Deux gros papiers empilés (confidence puis recette)
recréeraient en plus un métronome interne. **Mais sans A1–A5, la recette
serait le choix plus sûr** — si la maquette du lot M invalide A1 ou A2, c'est
elle qu'on rouvre, pas la grille 2×2.

### Ce que la critique valide

- Le **concept** : premier motif de la page qui appartient en propre au
  produit ; « la section est dessinée, pas photographiée » est la bonne
  réponse aux assets absents — à condition que A5 borne le pari dessin.
- La **plaque « sans photo » comme pièce de design** — la vraie leçon du
  11/20, conservée telle quelle.
- Les **replis dits d'avance** (reduced-motion, Safari ≤ 18, forced-colors),
  l'a11y et le SEO inchangés, le socle court et fermé, la liste Refusé
  intouchée.

## Lots d'implémentation

| Lot | Contenu                                                                                                                                                                                                                                                                                                                                                                                                                                   | Dépend de                        |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| M   | **Maquette de vérification** (pipeline `docs/prompts/`, Artifact — aucun fichier repo) : géométrie perle/fil/jonction (A2), densité de la colonne plafonnée (A1), candidats de tracés à ~40 px passés au **critère de rejet A5 en niveaux de gris**, fil mono-lavande contre le wash, vue 390 centrée (A4), état reduced-motion. **Checkpoint** : si elle invalide A1 ou A2, on rouvre le challenger « fiche recette », pas la grille 2×2 | rien (A3/A4 tranchés 2026-08-06) |
| 0   | Tracés SSOT : segments de fil (2 formes, A5, mono-lavande — A3), 4 vignettes, nœud — dans `shared/components/hand-drawn/paths.ts` ; **étendre l'itération de `hand-drawn-accent-aspect-ratio.regression.test.ts` aux nouveaux tracés** (écart c) ; seuls les tracés survivants du critère A5 de la maquette entrent                                                                                                                       | M                                |
| 1   | Parité de la grammaire d'arrivée des blocs titre : rail `inView` + `.enter-inview` sur les 3 sections (le surligneur reste héros-seul, décision 2026-08-06 — l'ancien lot 1 « surligneur mono » est abandonné)                                                                                                                                                                                                                            | rien                             |
| 2   | Refonte `atelier-section.tsx` : colonne enfilée **plafonnée (A1)**, perles à cheval (A2), vignettes, plaque « sans photo », mobile centré (A4) — **tests réécrits dans le même commit** (les verrous sémantiques survivent : h2/h3/pas-h4, `<li>` ancrés, voix, zéro lien, zéro JSON-LD ; **réécrire l'assertion portrait pour les deux états photo/plaque (écart d) et asserter les DEUX consommateurs du wash (écart e)**)              | M, 0, 1                          |
| 3   | Photos réelles : ré-upload portrait (action utilisateur, `shared/constants/images.ts`) puis tirages en regard (dans la réserve A1) + `ItemList` si `contentUrl` distincts                                                                                                                                                                                                                                                                 | assets                           |
| 4   | Ré-audit navigateur réel (sticky, dessin par-segment au scroll, budget vertical F7, densité F9, critère d'échec des segments) + part E2E : présence `#atelier` au smoke (`e2e/navigation.spec.ts`), nœud `HowTo` (`e2e/seo.spec.ts`)                                                                                                                                                                                                      | 2                                |

Le lot 3a (ré-upload du portrait) peut arriver à tout moment et n'attend
personne — mais depuis le lot 2, son absence n'est plus un défaut visible.

## Refusé — ne pas re-proposer

| Proposition                                                      | Verdict, date                                                                           |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Rubans `MaskingTape` par note / en série                         | ❌ Purge du 2026-08-06 — le fil les remplace                                            |
| Surligneur `BrushHighlight` sur les `h2` de section              | ❌ Décision utilisateur 2026-08-06 — le pinceau reste exclusif au `h1` du héros         |
| Filet séparateur, bande à fond plein (`--section-band`)          | ❌ Invariant page (2026-08-06)                                                          |
| Un path de fil UNIQUE étiré sur la hauteur                       | ❌ Letterboxing/déformation — segments indépendants (cf. Les pièces)                    |
| Signature « — Léane » dans la section                            | ❌ Le footer signe seul (2026-08-05)                                                    |
| CTA de sortie, stats, compteurs                                  | ❌ L'atelier raconte — précédents Collections et v1                                     |
| `h4` sur les titres d'étapes                                     | ❌ Items non interactifs d'une `<ol>`                                                   |
| `.polaroid-hover`, `SplitTextCSS`                                | ❌ Supprimés du repo — ne rien planifier dessus                                         |
| Galerie + `ItemList` sur asset unique                            | ❌ Signal SEO trompeur (retrait d'origine)                                              |
| Curseur-follow, chevron de scroll, micro-animation sans fonction | ❌ Refus transverses du pipeline (`docs/prompts/DESIGN-ARTIFACT-PROMPT.md` § gardefous) |

## Méthode

Maquette de vérification via le pipeline (`docs/prompts/`) **en lot M,
avant le lot 0** (décision 2026-08-06 — la géométrie A2 et le pari dessin A5
se jugent au rendu, pas en prose) ; audit
sur **rendu navigateur réel** (le sticky, le dessin au scroll et le 404 ne se
voient pas en jsdom) ; ⚠️ jamais calibrer sur le seed (~48 produits de
joaillerie précieuse — le contre-brief). `pnpm validate` avant toute PR.
