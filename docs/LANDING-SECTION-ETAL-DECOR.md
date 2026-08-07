# Le décor de l'étal — 8 pistes pour remplacer la constellation

> **⚠️ DOCUMENT D'HISTOIRE, plus d'état courant.** Les huit pistes ci-dessous ont
> toutes été écartées, la piste A (« La guirlande ») comprise — elle a été
> implémentée le 2026-08-06 puis remplacée le jour même par **« Le présentoir »**
> (`app/(shop)/(home)/_components/hero/hero-creations.tsx`, sa scène dans
> `shared/components/hand-drawn/creations.ts`, ses tracés dans `CREATION_PATHS`, sa
> suite `hero-creations.test.tsx`).
>
> **Ce que ce document a raté, et qui vaut plus que ses huit pistes** : elles
> cherchaient toutes le bon MOTIF DÉCORATIF (fil d'étoiles, phases de lune,
> guirlande, fanions, semis, lavis…) alors que le problème n'était pas le choix du
> motif mais sa CLASSE. Quatre décors successifs — constellation, phases,
> guirlande, et six des pistes ci-dessous — proposaient des glyphes de 26–28 px
> sans détail intérieur, qui disent une ambiance céleste pastel et que n'importe
> quelle boutique de bijoux pourrait signer. Le classement de `docs/BRAND-DA.md`
> le disait déjà : la grappe (#1), la goutte (#2), le tableau peint (#3) et l'œil
> (#4) passent avant la lune (#9). Le décor tenant ne décore pas — **il montre ce
> que la marque fabrique**.
>
> Ce qui SURVIT de ce document, et qu'il faut relire avant de retoucher le décor :
> le § « Invariants transverses » (couleur, mécanique, refus actés) est intact et
> fait toujours autorité. Le reste est de l'archive.
>
> ⚠️ Les chemins des pistes non retenues citent `hero-constellation.tsx` et
> `hero-garland.tsx`, qui n'existent plus.

> Document de travail technique (2026-08-06). Chemins cités sans numéro de ligne,
> délibérément (les ancres `fichier:ligne` dérivent — même règle que les
> autres docs LANDING). Les règles citées nomment leur test : c'est le test,
> pas ce fichier, qui fait autorité.

## Le brief

Le principe **constellation** (lune + fil + 5 étoiles + étincelle dans le vide
`lg` sous le chapô) ne convainc pas — malgré la recoloration « La lune rosit »
du 2026-08-06 (lune `fill-primary`, soleil cerné, départ avancé à 480 ms,
scintillement). Ce n'est pas une question de réglage : c'est le motif « fil
d'étoiles » lui-même qui est remis en cause.

La direction vient de Léane, verbatim :

> « Oh ouiii si c'est rose et dans la DA cœur étoile lune ça va me plaire »

Donc : **rose** en couleur dominante, motifs **cœur / étoile / lune**. Deux de
ces trois motifs (étoile, lune) sont déjà dans les motifs identitaires du
lexique de marque (`CLAUDE.md` § Direction artistique) ; le **cœur** n'y est
pas — la citation de Léane le légitime, **l'ajouter au lexique si une piste
cœur est retenue**.

## La baseline — ce qu'on remplace

`app/(shop)/(home)/_components/hero/hero-constellation.tsx`, monté en dernier
enfant de `hero-heading.tsx`, `hidden lg:block` + `lg:mt-auto`. L'ancrage bas
tient par `lg:self-stretch` sur la cellule titre de `hero-section.tsx`
(exception **unique** à l'`items-start` de la grille, documentée) +
`lg:flex-col lg:h-full` sur le wrapper d'`HeroHeading`. Le SVG est rendu en
`max-w-md` (~448 px) pour un `viewBox` de 440 — échelle **~1:1**, une unité de
tracé vaut un pixel rendu.

Sous `lg`, rien — et il n'y a **plus de marge mobile à préserver** : le bloc
CTA « Mes dernières créations » (2026-08-06) a déjà cédé la promesse « une
pièce entière au-dessus de la flottaison » (~68 px consommés là où il restait
13,1 px, arbitrage documenté dans `hero-heading.tsx` et acté par
`e2e/shop-mobile.spec.ts`). La règle pour toute piste mobile n'est donc pas
« rester sous X px » mais **zéro hauteur de FLUX ajoutée** : positionnement
absolu, ou encre logée dans une boîte de ligne existante (hauteur ≤
line-height).

Mécanique actuelle, éprouvée et à conserver pour toute piste dessinée :

- **Départ à 480 ms** = départ du brush (`SKY_DELAY_MS = RAIL_STROKE_COUNT ×
STROKE_STAGGER_MS`, SSOT `storefront-heading.tsx`). ⚠️ Retour user acté
  (« apparaît trop tard ») : ne pas re-proposer le « 6ᵉ temps » à 1 280 ms.
- **Décor vivant** : boucle `sky-twinkle` — la keyframe et la coupe
  reduced-motion vivent dans `app/styles/entrance.css` (opacité 1 → 0,55,
  4 200 ms) ; le déphasage 650 ms/élément est `TWINKLE_STAGGER_MS`, côté
  composant. ⚠️ Deuxième retour user acté (« sentiment de manquer ») : ne pas
  proposer un décor figé. La classe vit sur un `<g>` **enveloppe**, jamais sur
  l'élément `hand-draw-load` — deux `animation` ne se cumulent pas.
- **Allumage au passage de la pointe** : délai d'un élément posé sur le fil =
  `THREAD_DELAY + (fraction d'abscisse − 1) × 0,6 × durée` — la phase fill
  démarre quand la pointe du tracé atteint son abscisse.
- Tests : bloc constellation de
  `app/(shop)/(home)/_components/hero/__tests__/hero-section.test.tsx`
  (fill-primary, cerne + `pathLength` du soleil, graisses ∈ SSOT, délais
  croissants, 6 `g.sky-twinkle`). **À réécrire avec le remplaçant, pas à
  supprimer** — chaque piste dit ce qu'il en reste.

## Invariants transverses (valent pour toutes les pistes)

**Couleur — il n'y a pas de token « rose » à inventer :**

- Le rose de marque **EST** `--primary` (oklch 0.86, **1,6:1** sur le papier) :
  un aplat cerné d'encre, une surface — jamais un trait fin porté seul, jamais
  une information. La grammaire sanctionnée est celle de `BrushHighlight` et
  de la lune actuelle : _l'encre dessine, la couleur remplit_.
- Le rose **lisible** (traits, contours) est `--color-brand-rose-strong`
  (oklch 0.55 0.16 340.78, utilisé par les prix). Pour un trait décoratif il
  est même très sombre — à doser, ou à réserver aux petits formats.
- Bonus structurel : la section étal ne pose aucun `data-accent`, donc
  `--section-accent` **vaut déjà `--primary`** (cascade
  `app/styles/section-accents.css`). Un décor qui consomme
  `var(--section-accent)` est rose sans nouveau token — et le critère
  d'admission des variables CSS (`theme-token-consumers.regression.test.ts`)
  interdit d'en créer un pour un seul usage.
- `--color-glow-pink` (oklch 0.86 0.1 341 / 0.4) existe pour halos/nappes.

**Mécanique :**

- La section est **above-fold** : `hand-draw-load` + `--hand-delay`
  (animation au montage). Jamais `hand-draw-inview` / `view()` ici — et un
  `delay` n'a de toute façon aucun sens sur une timeline `view()`.
- `pathLength={1}` **obligatoire** sur tout élément strié — y compris les
  `<circle>` : sans lui, `stroke-dasharray` se compte sur la circonférence
  réelle et rend un anneau **pointillé** au lieu d'un trait qui se dessine.
- `strokeDasharray: "1 2"` inline (période 3) — à l'offset 1 de la classe, le
  dash suivant peindrait un point parasite via le cap arrondi (cf.
  `brush-highlight.tsx`).
- Graisses = crans **nommés** de `HAND_DRAWN_STROKES` (fin 1,5 / trait 2 /
  marqueur 2,5 / pinceau 5) — verrouillé par test, pas de valeur libre.
- Décoratif pur : `aria-hidden`, `pointer-events-none`,
  `contrast-more:hidden forced-colors:hidden` ; reduced-motion rend le tracé
  « déjà sec » (géré par `entrance.css`, fill compris via
  `--hand-fill-opacity`).
- Un SVG dont `width×height` ne suit pas le ratio du `viewBox` est
  **letterboxé** — hauteur toujours dérivée du ratio (modèle
  `hand-drawn-accent.tsx`).

**Refus actés à ne pas re-proposer :** `BrushHighlight` héros-seul (le
surligneur reste exclusif au h1) · pas de cursor-follow · pas de MaskingTape
par item de grille · pas de 5ᵉ section · pas de chevron scroll-cue.

**Assets réutilisables :**

- `shared/components/hand-drawn/paths.ts` — `ACCENT_SHAPE_PATHS` contient
  déjà **`star` (50×50) et `heart` (50×50)** ; le croissant de lune vit en
  littéral dans `hero-constellation.tsx`
  (`M46 84 Q38 52 62 40 Q50 62 58 86 Q42 92 46 84`) — le remonter dans la
  SSOT si plusieurs surfaces le consomment.
- `shared/components/animations/hand-drawn-accent.tsx` —
  `<HandDrawnAccent variant="star|heart|arrow|circle" color inView delay />`,
  hauteur dérivée du ratio, replis inclus.

---

## Piste A — « La guirlande » ⭐ recommandée

**Concept.** Le fil ne relie plus des points : il **suspend** des motifs. Une
guirlande dessinée à la main — cœur, étoile, lune, étoile, cœur — accrochée
dans le ciel de l'étal, comme une guirlande de fanions au-dessus d'un étal de
marché. C'est la réponse littérale à la phrase de Léane : rose ✓, cœur ✓,
étoile ✓, lune ✓ — et la métaphore colle mieux à « l'étal » que la nuit
étoilée.

**Ce qu'on verrait.** Le trait d'encre trace d'abord le fil qui ondule
(légèrement détendu entre deux points d'accroche, comme une vraie guirlande),
puis chaque motif suspendu se dessine au passage de la pointe et **rosit** —
contour encre, aplat `--primary` révélé par la phase fill. La lune garde son
statut de pièce maîtresse (le plus grand motif, Syn-**clune**), le cœur et
l'étoile alternent en plus petit. Après l'entrée, les motifs respirent en
boucle (twinkle existant).

- **Portée** : même emplacement (`lg` seulement, `lg:mt-auto`), même ancrage.
- **Mécanique** : re-skin de `hero-constellation.tsx`. Les `<circle>` des
  étoiles deviennent des `<path>` fermés (réutiliser `star`/`heart` de
  `ACCENT_SHAPE_PATHS` translatés/réduits, + le croissant existant), chacun
  `hand-draw-load` + `fill-primary` + `--hand-fill-opacity: 1`, délai calé
  par `starStyle(cx)` inchangé. Encre : `stroke-brand-lavender` conservée
  (c'est la grammaire « l'encre dessine, la couleur remplit » — le rose est
  dans les aplats), **ou** bascule `stroke-brand-rose-strong` si l'utilisateur
  veut une encre rose ; les deux tiennent le contraste, la première est plus
  cohérente avec le reste de la page (rail, brush, fil de l'atelier).
- **Fichiers** : `hero-constellation.tsx` (renommage possible en
  `hero-garland.tsx`), bloc de test correspondant, éventuellement `paths.ts`
  (lune promue en SSOT). `sky-twinkle` conservé tel quel.
- **Coût** : ~½ journée. Le plus bas des huit — toute la mécanique (ancrage,
  délais, twinkle, replis, tests) survit ; seuls les motifs changent.
- **Risques** : les paths `star`/`heart` de la SSOT sont dessinés pour 50×50 —
  l'échelle du SVG étant ~1:1 (cf. baseline), les réduire à ~12–18 unités les
  rend à ~12–18 px : vérifier qu'ils restent lisibles (sinon redessiner des
  variantes simplifiées ; un cœur à cette taille doit être un cœur au premier
  coup d'œil). ⚠️ Deux détails de tracé : `star` est un polygone en commandes
  `L` — ses pointes exigent `strokeLinejoin="round"`, que la constellation ne
  pose PAS (elle n'a que `strokeLinecap`, ses tracés étant tout en courbes) ;
  et au cran `fin` (1,5) sur un motif de 14 px, l'encre pèse ~10 % de la
  hauteur du glyphe — c'est le bon cran, ne pas descendre en dessous des crans
  nommés pour « alléger ».
- **Ce que l'implémentation a tranché autrement** (2026-08-06) : les motifs ont
  été posés à **26–28 px**, pas 12–18 — 26 est le plancher de lisibilité
  CONSTATÉ au navigateur sur la frise des phases, et la question « un cœur
  reste-t-il un cœur ? » se tranchait là. Un rôle, un cran : motifs au cran
  **`trait`** (2), fil au cran **`fin`** (1,5). Et l'encre n'a pas basculé au
  rose — c'est bien `stroke-brand-lavender` qui dessine, `--primary` qui remplit.
- **Pourquoi elle a été remplacée le jour même** : ce plancher de 26 px est
  précisément l'aveu. Un motif qui doit être ÉNORME pour rester lisible est un
  motif VIDE — il n'a aucun intérieur à montrer. Les pièces du présentoir font
  40 à 60 px et portent 8 à 12 formes chacune : la lecture à deux niveaux (une
  silhouette de loin, des créations de près) est impossible avec un glyphe, quelle
  que soit sa taille. **Ne pas chercher le plancher de lisibilité d'un motif :
  chercher un motif qui a un dedans.**

## Piste B — « La grande lune au cœur »

**Concept.** Moins, mais mieux : on supprime le principe « fil d'étoiles »
(précisément ce qui ne plaît pas) et on ne garde que **la lune**, agrandie en
pièce unique du ciel, avec un petit cœur-étincelle à sa pointe. La marque
dessine sa lune, une fois, en grand — et le cœur signe.

**Ce qu'on verrait.** Un grand croissant de guingois (~2,5× l'actuel) qui se
dessine en un seul geste dès 480 ms et rosit en `--primary`, cerné d'encre.
À sa pointe supérieure, un petit cœur au trait qui se dessine juste après et
scintille en boucle — seul élément vivant, la lune immobile sert de point
d'ancrage (même logique que l'actuel « lune et fil immobiles exprès »).

- **Portée** : même emplacement `lg`. Option : une déclinaison miniature du
  cœur près du CTA à tous les viewports (voir piste E, combinables).
- **Mécanique** : simplification de `hero-constellation.tsx` — 2 tracés au
  lieu de 3 + 5 cercles. Croissant redessiné plus grand (nouveau path,
  mêmes courbes de guingois), cran `trait` ; cœur = `ACCENT_SHAPE_PATHS.heart`
  réduit, cran `fin`, `<g class="sky-twinkle">`. `starStyle` et les délais
  d'abscisse disparaissent (plus de fil).
- **Fichiers** : `hero-constellation.tsx`, bloc de test (fortement réduit).
- **Coût** : ~½ journée.
- **Risques** : un seul motif doit tenir 532×206 px de vide — si le dessin est
  trop petit le blanc redevient le P2 de l'audit (« zone morte »), trop grand
  il concurrence le h1. À maquetter avant d'implémenter. Ne coche que 2 cases
  de Léane sur 3 (cœur ✓, lune ✓, étoile ✗) — sauf à garder l'étincelle
  4 pointes actuelle en étoile filante.

## Piste C — « Le semis » (fond animé, tous viewports)

**Concept.** Le seul des cinq qui donne quelque chose au **mobile** (la
constellation est invisible sous `lg` depuis le début) : un semis discret de
mini cœurs / étoiles / lunes en rose pâle, dispersé derrière toute la section
comme un papier peint d'atelier — le motif du papier cadeau de Léane.

**Ce qu'on verrait.** Une dizaine de motifs de 10–16 px, `fill-primary` à
faible alpha (~0,25–0,35 — en dessous, le rose 1,6:1 disparaît ; l'alpha
exact se règle à l'œil au navigateur), semés dans les **marges et
inter-colonnes** de la grille, jamais sous les polaroids. Apparition en fondu
au montage (`enter-load`), puis 3–4 d'entre eux respirent en `sky-twinkle`
très déphasé. Positions **fixes, choisies à la main** — pas de
`Math.random()` (le seeded random de `shared/utils` existe si besoin, mais un
semis composé se règle mieux qu'un semis tiré).

- **Portée** : toute la section, tous viewports (densité réduite sous `md` :
  4–5 motifs max, le budget vertical mobile est serré et l'écran étroit).
- **Mécanique** : nouveau composant `hero-scatter.tsx` — un SVG absolu
  `inset-0 -z-10` dans le `<section>` (qui est déjà `relative` ou le
  devient), `preserveAspectRatio="xMidYMid slice"` **ou** des motifs
  positionnés en `%` dans un SVG `width/height 100%` ; `aria-hidden`,
  `pointer-events-none`, replis contrast/forced-colors. Pas de `hand-draw`
  (des dizaines de tracés simultanés = bruit) : fondu simple.
- **Fichiers** : `hero-section.tsx` (montage), nouveau composant, test de
  structure (le semis ne doit pas introduire de nœud entre la grille et ses
  cellules — `hero-grid` émet un fragment exprès).
- **Coût** : 1 journée avec les allers-retours de composition au navigateur.
- **Risques** : le plus élevé des huit. (1) Bruit derrière un étal dont les
  polaroids sont déjà chargés — la landing vient de purger ses décors en
  série (rubans, séparateurs) et « la structure est suffisante » est un
  verdict acté ; un papier peint mal dosé rejoue ce qu'on vient d'enlever.
  (2) Un motif qui affleure sous une carte au mauvais viewport fait sale —
  il faut vérifier aux 3 largeurs SSOT. (3) CLS nul à vérifier (absolu,
  aucun flux). À ne retenir que si le « rien sur mobile » pèse vraiment.

## Piste D — « Le lavis qui respire » (nappe rose) — pour mémoire, déconseillée

**Concept.** Pas de dessin : une **nappe de lumière rose** (`--color-glow-pink`)
qui dérive très lentement dans le coin du bloc titre, comme un lavis
d'aquarelle pas encore sec.

**Ce qu'on verrait.** Un halo flou (`blur` large, alpha 0,4 du token) derrière
le titre et le vide `lg`, animé en boucle très lente (60–90 s, translation +
scale de quelques %, compositor-only), coupé reduced-motion.

- **Portée** : cellule titre, tous viewports possibles.
- **Pourquoi elle est là** : c'est la seule piste « fond animé » sans motif,
  la plus douce — et « rose » est littéralement sa matière.
- **Pourquoi elle est déconseillée** : la direction « lavis » a déjà été
  écartée à l'audit hero du 2026-08-06 (« rejoue le terrain du halo » — la
  page a déjà ses `--section-glow`, en rajouter un animé au premier écran
  brouille la hiérarchie). Et elle ne coche **aucun** des trois motifs de
  Léane : pas de cœur, pas d'étoile, pas de lune. Ne la retenir qu'en
  **complément** d'une piste à motifs, jamais seule.

## Piste E — « Les trois signes en ponctuation » (accents, tous viewports)

**Concept.** Plutôt qu'un tableau dans le vide, les trois motifs deviennent
de la **ponctuation dessinée** aux points chauds du bloc titre — sur le modèle
« note en marge » validé sur la section atelier. Petits, donc visibles à tous
les viewports — à condition de respecter la règle « zéro hauteur de flux » de
la baseline : l'étoile et le cœur doivent vivre **dans les boîtes de ligne
existantes** (inline, hauteur ≤ line-height du chapô / du bloc CTA) ou en
absolu dans une marge, jamais dans un wrapper qui ajoute sa propre rangée.

**Ce qu'on verrait.** Trois `HandDrawnAccent` : une petite **étoile** qui
ponctue la fin du chapô (dans la marge droite, comme un astérisque de
carnet) ; un **cœur** près du CTA « Voir toutes les créations » (le geste
« fait avec amour ») ; une **lune** en signature dans le coin bas de la
cellule titre à `lg` (elle continue d'habiter le vide, en plus discret).
Encre `brand-rose-strong` au cran `fin`, fill `--primary` sur la lune seule.
Chacun se dessine à un temps propre (480 / 600 / 720 ms) puis un seul — le
cœur — respire en boucle.

- **Portée** : étoile + cœur à tous les viewports, lune `lg` seulement.
- **Mécanique** : composition pure — `<HandDrawnAccent variant="star" />` et
  `variant="heart"` existent déjà ; seule la lune demande un variant
  `moon` à ajouter à `ACCENT_SHAPE_PATHS` (promotion du croissant existant).
  Le composant accepte `delay` avec `inView={false}` — exactement le mode
  above-fold requis. `HeroConstellation` est supprimé, `lg:self-stretch` et
  `lg:mt-auto` aussi (plus d'ancrage bas à tenir) — **ou** conservés si la
  lune reste ancrée en bas.
- **Fichiers** : `hero-heading.tsx`, `paths.ts` (+ le type du variant dans
  `hand-drawn-accent.tsx`), suppression d'`hero-constellation.tsx`, tests.
- **Coût** : ~½ journée.
- **Risques** : trois accents dispersés peuvent lire « confetti » là où la
  guirlande lit « composition » ; le chapô a déjà un `HandDrawnAccent`
  `arrow` près du h2 — quatre gestes dans un seul bloc titre, c'est la limite
  haute. Et le vide `lg` de 532×206 px redevient partiellement nu (le P2
  de l'audit d'origine).

## Piste F — « Les phases de la lune »

**Concept.** La marque s'appelle Syn-**clune** : au lieu d'un fil qui relie
des points, le ciel raconte **le cycle de sa lune**. Une frise de quatre
phases dessinées main — croissant fin, demi-lune, **pleine lune**, croissant
inversé — qui se dessinent de gauche à droite comme une bande de carnet ; la
pleine lune, pièce centrale, **rosit** en `--primary`. Une petite étoile
scintille au-dessus du premier croissant, un petit cœur clôt la frise (les
trois motifs de Léane sont là, la lune en majesté).

**Ce qu'on verrait.** Quatre disques/croissants de guingois, cernés d'encre
lavande, espacés régulièrement dans le vide. L'entrée est une lecture : chaque
phase se dessine 120 ms après la précédente (la cadence `SKY_STAGGER_MS`
existante), la pleine lune se remplit de rose en fin de tracé. Après l'entrée,
seuls l'étoile et le cœur respirent (`sky-twinkle`) — les lunes, immobiles,
restent le point d'ancrage (même logique que l'actuel).

- **Portée** : même emplacement `lg`, même ancrage.
- **Mécanique** : re-skin d'`hero-constellation.tsx`. Le fil et `starStyle`
  disparaissent (plus d'abscisse à traverser) : les délais redeviennent de
  simples index × `SKY_STAGGER_MS` — la mécanique se **simplifie**. Quatre
  nouveaux tracés fermés à dessiner (le croissant existant fournit le premier
  et, en miroir, le dernier) ; étoile = `ACCENT_SHAPE_PATHS.star` réduit,
  cœur = `heart` réduit.
- **Fichiers** : `hero-constellation.tsx` (renommage possible en
  `hero-moon-phases.tsx`), bloc de test, éventuellement `paths.ts`.
- **Coût** : ½–1 j (le dessin des deux phases intermédiaires est le vrai
  travail — une demi-lune de guingois lisible à ~28 px ne se réussit pas du
  premier coup).
- **Risques** : une rangée de quatre ronds régulièrement espacés peut lire
  « pastilles de stepper » au lieu de « phases » — les croissants doivent être
  francs et les axes légèrement désalignés pour rester du dessin. Et la
  métaphore est céleste, pas marchande : c'est la piste la plus **marque**
  (Syn-clune dessine son cycle), là où A est la plus **étal**. Les deux sont
  légitimes ; c'est un choix de territoire, à trancher par Léane.

## Piste G — « Les fanions de l'étal »

**Concept.** La version **littérale** de la guirlande : un fil détendu porte
4–5 **fanions triangulaires** dessinés main — la guirlande de fête d'un stand
de marché. Les fanions alternent aplat `--primary` et papier nu ; sur les
fanions nus, un mini-motif au trait (cœur, étoile, croissant).

**Ce qu'on verrait.** Le même fil ondulé que la piste A, mais ce qui pend est
géométrique et festif : des triangles aux pointes arrondies, un peu de
travers, qui se dessinent au passage de la pointe puis se remplissent (les
roses) ou révèlent leur motif intérieur (les nus). Twinkle sur 2–3 fanions.

- **Portée** : même emplacement `lg`, même ancrage.
- **Mécanique** : celle de la piste A à l'identique (fil + `starStyle` par
  abscisse de fanion) ; les fanions sont des tracés fermés `fill-primary`
  alternés, les motifs intérieurs des paths au cran `fin`.
- **Fichiers** : les mêmes que A.
- **Coût** : ~1 j — plus de tracés que A (fanion + motif intérieur par
  position), et la composition demande des allers-retours.
- **Risques** : la densité d'encre la plus haute des pistes dessinées. Dans
  206 px de haut, un fanion fait ~24–30 px et son motif intérieur ~10–12 px —
  la limite basse de lisibilité constatée sur les vignettes du fil de
  l'atelier (~40 px rendus). La variante « fanions sans motifs intérieurs »
  retombe à rose ✓ / motifs ✗. Si A lit déjà « marché », G n'ajoute que du
  bruit : ne la préférer à A que si la maquette de A paraît trop vide.

## Piste H — « D'un seul trait »

**Concept.** La réponse la plus directe au rejet du « fil d'étoiles » : le fil
ne relie plus les motifs, **il les devient**. Un unique tracé cursif — sans
lever la plume — dessine un cœur, file, boucle une étoile, file encore et
s'achève en croissant de lune, qui rosit. La signature manuscrite du premier
écran : trois signes, un geste.

**Ce qu'on verrait.** Une ligne d'encre lavande qui court dans le vide et
forme les trois motifs au passage, comme un mot écrit en attaché. Le tracé
prend le temps de s'écrire (~2 traits de durée), puis un aplat `--primary`
s'allume sous le croissant final. L'étincelle 4 pointes existante reste en
satellite et porte seule le twinkle (un motif pris dans le tracé ne peut pas
scintiller indépendamment — c'est le même `<path>`).

- **Portée** : même emplacement `lg`, même ancrage.
- **Mécanique** : un seul `<path>` ouvert `hand-draw-load` (durée : un
  multiple des crans `HAND_DRAWN_DURATIONS_MS`, pas une valeur libre) + un
  tracé fermé `fill-primary` superposé sous la lune, dont le délai cale la
  phase fill sur la fin de l'écriture (la formule d'allumage existante, avec
  fraction = 1). `starStyle` et la boucle d'étoiles disparaissent.
- **Fichiers** : `hero-constellation.tsx` (renommage possible en
  `hero-signature.tsx`), bloc de test (fortement réduit), `entrance.css`
  intact.
- **Coût** : ~1 j, presque entièrement dans le **dessin** : une cursive à
  trois motifs qui reste lisible et « de la même main » que le reste du dépôt
  demande des itérations (c'est un tracé original, rien à réutiliser de la
  SSOT).
- **Risques** : tout repose sur la qualité d'un seul path — raté, il lit
  « gribouillis » ; réussi, c'est la piste la plus poétique des huit. Un seul
  long tracé = un seul tempo d'entrée, pas d'allumage progressif (l'œil suit
  la plume, ce qui compense). À ne tenter qu'avec une maquette avant tout
  code.

---

## Comparatif

| Piste                  | Rose               | Cœur/Étoile/Lune | Mobile | Vide `lg` traité | Coût  | Risque                                                    |
| ---------------------- | ------------------ | ---------------- | ------ | ---------------- | ----- | --------------------------------------------------------- |
| **A. Guirlande**       | aplats `--primary` | ✓ ✓ ✓            | ✗      | ✓                | ½ j   | faible (lisibilité des motifs réduits)                    |
| B. Grande lune au cœur | aplat + trait      | ✓ ✗ ✓            | ✗      | ✓ (à doser)      | ½ j   | moyen (échelle du motif unique)                           |
| C. Semis               | fills pâles        | ✓ ✓ ✓            | **✓**  | indirect         | 1 j   | **élevé** (bruit, re-décore ce qu'on a purgé)             |
| D. Lavis               | nappe glow         | ✗ ✗ ✗            | ✓      | ✓                | ½ j   | déconseillée seule (terrain du halo)                      |
| E. Ponctuation         | traits + 1 aplat   | ✓ ✓ ✓            | **✓**  | partiel          | ½ j   | moyen (4ᵉ geste dans le bloc titre)                       |
| F. Phases de la lune   | 1 aplat central    | ✓ ✓ ✓✓           | ✗      | ✓                | ½–1 j | moyen (lecture « stepper » ; territoire marque vs marché) |
| G. Fanions             | aplats alternés    | ✓ ✓ ✓ (petits)   | ✗      | ✓                | 1 j   | moyen-élevé (densité d'encre, motifs à ~10 px)            |
| H. D'un seul trait     | 1 aplat final      | ✓ ✓ ✓            | ✗      | ✓                | 1 j   | moyen (tout tient sur UN path réussi)                     |

**Lecture du tableau.** Trois familles : les pistes de **vide `lg`** (A, B, F,
G, H — même emplacement, même ancrage, du re-skin), les pistes **tous
viewports** (C, E — et C est la seule déconseillée d'office), et D qui n'est
qu'un complément. Aucune piste seule ne coche « 3 motifs + mobile + vide `lg`
traité » : c'est pour ça que la recommandation est un plan en deux temps, pas
une piste.

## Recommandation — un plan en deux temps

**Temps 1 (le remplacement) : piste A « La guirlande »** — ½ journée. C'est
la piste qui coche les trois motifs de Léane **et** garde tout l'acquis
(ancrage bas, chronologie 480 ms, allumage au passage de la pointe, twinkle,
replis, l'essentiel des tests) pour le coût d'un re-skin. La métaphore est
même plus juste que la constellation : une guirlande au-dessus d'un étal,
c'est du vocabulaire de marché, pas de planétarium.

_Challenger sérieux_ : **F « Les phases de la lune »** si Léane préfère le
territoire marque (Syn-clune) au territoire marché — même coût, mécanique
plus simple, mais deux tracés neufs à réussir. **H** est la carte « coup de
cœur » : ne la tenter que maquette en main. B, G restent des replis ; C et D
ne sont pas des temps 1.

**Temps 2 (optionnel, le mobile) : E allégé** — le **cœur seul** près du CTA
« Voir toutes les créations », à tous les viewports, dans une boîte de ligne
existante (zéro hauteur de flux). Un signe posé vaut mieux qu'un papier
peint (C). À ne faire **qu'après** validation du temps 1 au navigateur : si
la guirlande suffit, ne pas décorer pour décorer — la landing vient de purger
ses décors en série, et « la structure est suffisante » est un verdict acté.

Si une piste cœur est retenue : **ajouter « cœur » aux motifs identitaires du
lexique de marque** (`CLAUDE.md` § Direction artistique) dans le même commit.

## Protocole de vérification (avant de fermer le chantier)

Dans l'ordre, en réutilisant les pièges déjà payés (mémoire de session
2026-08-06) :

1. **Maquette d'abord si le doute est visuel** — pipeline
   `docs/prompts/DESIGN-ARTIFACT-PROMPT.md` (lisibilité des motifs réduits
   pour A/G, dessin des phases pour F, cursive pour H). Une piste dessinée se
   juge sur un rendu, pas sur ce doc.
2. **Tests réécrits, pas supprimés** : le bloc constellation
   d'`hero-section.test.tsx` se transpose au remplaçant (aplat `--primary`
   présent, graisses ∈ `HAND_DRAWN_STROKES`, délais croissants, `<g>`
   `sky-twinkle` en enveloppe, `pathLength={1}` sur tout élément strié).
3. **Navigateur, viewport `lg`** (1280×800) : entrée à 480 ms pendant le
   brush, allumage au passage de la pointe, twinkle déphasé. ⚠️ Tout
   screenshot de la landing est recouvert par la bannière cookies : seeder
   `localStorage["cookie-consent"]` au format persist Zustand
   (`{ state: { accepted, consentDate, policyVersion: 1 }, version: 0 }`)
   via `addInitScript` — la fermer au clic est fragile.
4. **Replis** : `prefers-reduced-motion` (décor « déjà sec », fill compris via
   `--hand-fill-opacity`), `contrast-more` et `forced-colors` (masqué), et —
   pour une piste tous-viewports — les 3 largeurs SSOT + vérification qu'aucune
   hauteur de flux n'a bougé sous `lg`.
5. **`pnpm validate`** avant PR, comme partout.
