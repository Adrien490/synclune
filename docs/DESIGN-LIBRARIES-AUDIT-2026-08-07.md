# Audit « librairies design » — 2026-08-07, révisé et étendu le 2026-08-08

> **Verdict : n'installer aucune librairie design.** La couche visuelle du dépôt est déjà en
> avance sur ce que ces librairies vendent (reveals et progression au scroll en CSS natif, View
> Transitions natives, système de tracés à la main maison, grain `feTurbulence`, tokens OKLCH à
> contrastes mesurés), et la trajectoire assumée du projet est de **retirer** du JS de la couche
> visuelle. Le déficit de beauté est réel — il est **d'application**, pas d'outillage (§ 6).
>
> Vingt-trois dossiers évalués en deux vagues — quatorze le 2026-08-07 (§ 4), neuf le 2026-08-08
> (§ 4 bis), soit près de quarante paquets — métadonnées npm relevées sur le registre aux dates
> d'audit. Seule évolution défendable : le bump `motion@12 → 13`, qui est de la **maintenance**,
> pas du design — et qui attend son tour : publiée le 2026-08-05, la 13.0.0 est refusée par notre
> propre `minimumReleaseAge` (7 jours) **jusqu'au 2026-08-12**. C'est le durcissement qui
> fonctionne, pas un obstacle.
>
> Ce document existe pour rendre le verdict **opposable**. La question a déjà été tranchée une fois
> sans laisser de trace : `components.json` déclare les registries `@magicui`, `@react-aria` et
> `@aceternity` — configurés, jamais utilisés (revérifié par grep le 2026-08-08 : zéro usage).
> Sans écrit, elle se re-pose de zéro.
>
> Le § 2.4 donne la grille qui juge tout candidat FUTUR sans rouvrir le débat ; le § 5 dit à
> quelles conditions chaque dossier fermé se rouvre. Un audit qui ne dit ni l'un ni l'autre se
> périme en interdit permanent.

## 1. Verdict

|                              |                                                                                                                                                                                                                                                                                                         |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **À installer**              | rien                                                                                                                                                                                                                                                                                                    |
| **À mettre à jour**          | `motion@12.42.2 → 13.0.0` — un seul breaking change (retrait de la dépendance optionnelle `@emotion/is-prop-valid`, absente ici ; changelog vérifié à la source). ⚠️ Publiée le 2026-08-05 : `minimumReleaseAge` la refuse avant le **2026-08-12**. Maintenance, à faire dans une passe de dépendances. |
| **Dossiers laissés ouverts** | 6, avec leur signal de réouverture (§ 5)                                                                                                                                                                                                                                                                |

## 2. Les trois contraintes qui bornent tout ajout

Elles précèdent le catalogue, parce qu'elles suffisent à elles seules à écarter la moitié des
candidats.

**2.1 — Budgets bundle, appliqués en CI** (`.size-limit.json`) : First Load JS partagé **120 kB
gzip**, Homepage 80 kB, fiche produit 80 kB, catalogue 80 kB, collections 70 kB, checkout 130 kB,
admin 200 kB. Un paquet de 30 kB gzip sur le chemin partagé consomme le quart du budget global.

**2.2 — Supply chain durcie** : `minimumReleaseAge: 10080` (7 jours) et `trustPolicy:
no-downgrade` dans `pnpm-workspace.yaml` ; l'allowlist `onlyBuiltDependencies` (sharp, prisma,
`@sentry/cli`) vit dans `package.json` (`pnpm.onlyBuiltDependencies`). Le précédent qui fait
jurisprudence n'est pas théorique : le **CLI shadcn a été refusé** (+152 paquets pour un unique
fichier CSS) et `scroll-fade.css` a été **vendoré** à la place, avec sa procédure de
resynchronisation. La question « ajouter, ou recopier 200 lignes ? » a donc déjà une réponse dans
ce dépôt.

**2.3 — La trajectoire est soustractive.** Ce n'est pas une préférence, c'est l'historique :

- les wrappers d'entrée (`Fade` / `Reveal` / `Stagger`) sont passés de `motion/react` à du CSS
  zéro-JS, zéro hydratation — « le gain TBT dominant de l'audit perf » ;
- `ScrollFade` a perdu ~120 lignes de `ResizeObserver` + rAF pour `animation-timeline` ;
- `hero-creations.tsx`, les sparklines du tableau de bord, `CursorGlow` et `SectionHalo` ont été
  supprimés.

Ajouter une librairie d'animation reviendrait à racheter en JS ce qui vient d'être payé pour en
sortir.

**2.4 — Grille d'admission pour tout candidat futur.** Six questions, dans cet ordre ; un seul
« non » ferme le dossier, et chaque dossier des § 4 / § 4 bis tombe sur au moins une :

1. **DA** — le rendu sert-il un des six territoires de `BRAND-DA.md`, ou tombe-t-il sous la garde
   « irisé, pailleté, translucide décrivent les bijoux, jamais l'interface » ?
2. **Redondance** — la capacité existe-t-elle déjà en CSS natif ou dans l'inventaire § 3 ?
3. **Trajectoire** — ajoute-t-il du JS runtime à la couche visuelle (§ 2.3) ?
4. **CSP** — exige-t-il WASM, eval, un worklet ou du WebGL, donc un relâchement du `script-src`
   de `next.config.ts` ?
5. **Budget** — son poids gzip tient-il dans le plafond `.size-limit.json` de la route visée,
   mesuré par `pnpm size` (pas estimé depuis la taille dépaquetée) ?
6. **Supply chain** — version < 7 jours, provenance absente, dépendances transitives non
   maintenues ?

Et si tout passe : le précédent `scroll-fade.css` reste la voie par défaut — **vendorer vaut
souvent mieux qu'ajouter**.

## 3. Inventaire — ce qui est déjà couvert

| Besoin                           | Déjà couvert par                                                                                                                                                 |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Reveals au scroll                | **CSS natif** `animation-timeline: view()` — `app/styles/entrance.css`                                                                                           |
| Progression / parallax au scroll | **CSS natif** `animation-timeline: scroll()` — `app/styles/atelier-thread.css`, `scroll-fade.css`, `.shelf-materialize` (`components.css`)                       |
| Transitions de page              | **View Transitions natives** — `@view-transition` dans `app/styles/pwa.css`, `viewTransitionName` nommés (navbar, pied de page, paiement, carte → fiche produit) |
| Animation d'interaction          | `motion@12`, `LazyMotion` + `domMax`, SSOT `MOTION_CONFIG` (8 springs nommés, easings alignés sur les tokens `--ease-*`)                                         |
| Toasts                           | `sonner@2` — `shared/components/ui/toaster.tsx`, SSOT `shared/utils/toast.ts`, pastille mobile réglée par le spring `toast` de `MOTION_CONFIG`                   |
| Dessin SVG à la main             | `shared/components/hand-drawn/paths.ts`, `creations.ts`, `HandDrawnAccent` en `pathLength={1}` + draw CSS (`@keyframes hand-draw`)                               |
| Grain / texture papier           | `feTurbulence` en data-URI (`.polaroid-paper` 0,035 · `.bottom-bar-paper` 0,03, `mix-blend-mode: multiply`), `--shadow-paper` calibré au ΔL                      |
| Nombres animés                   | `AnimatedNumber` — `shared/components/animations/animated-number.tsx`                                                                                            |
| Carrousel · lightbox · zoom      | `embla-carousel-react` (+ autoplay) · `yet-another-react-lightbox` · `pinch-zoom.tsx`                                                                            |
| Placeholders image               | `thumbhash` + pipeline UploadThing complet, `blurDataUrl` persisté                                                                                               |
| Primitives UI                    | 50 composants shadcn **sur Base UI** v1.6                                                                                                                        |
| Icônes                           | Phosphor, entrée `/ssr`, 124 icônes distinctes (relevé 2026-08-08, en hausse avec la refonte landing en cours)                                                   |
| Couleur                          | tokens OKLCH, `[data-accent]` à 4 accents, bandes ΔE-normalisées, contrastes mesurés et verrouillés par tests de régression                                      |

**Absents, et assumés** : aucune librairie de graphiques (les sparklines ont été retirées,
SIMPLIFICATION Lot 4 — il ne reste que `modules/dashboard/constants/chart-styles.ts`, résiduel) ;
aucun 3D, WebGL, canvas de rendu, ni système de particules. Les deux seuls `<canvas>` du dépôt
sont du traitement d'image hors écran (`modules/media/utils/compress-image.ts`,
`modules/media/hooks/use-video-thumbnail.ts`).

## 4. Première vague — les quatorze dossiers du 2026-08-07

| Candidat                                                 | Verdict | Raison                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| -------------------------------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **MagicUI · Aceternity · Kokonut · Spell UI**            | ❌      | Esthétique « SaaS sombre, glassmorphism, spectacle » — contre-brief exact. `BRAND-DA.md` : « irisé, pailleté, translucide décrivent les BIJOUX, jamais l'interface ». Les registries `@magicui` et `@aceternity` sont déjà déclarés dans `components.json` et délibérément inutilisés.                                                                                                                                                                                                    |
| **`@paper-design/shaders-react`**                        | ❌      | 427 kB dépaquetés (relevé 2026-08-08 — passée `0.0.78 → 0.0.79` en un jour : la version `0.0.x` dit l'instabilité), WebGL. Ses mesh gradients irisés tombent sous la garde ci-dessus, mot pour mot.                                                                                                                                                                                                                                                                                       |
| **`lenis`**                                              | ❌❌    | Interpole une fausse position de défilement. Casse `position: sticky`, `IntersectionObserver`, `scroll-snap` **et les CSS scroll-driven animations** — c'est-à-dire toute la couche reveal/progression décrite au § 3. Régression architecturale, pas un arbitrage de goût.                                                                                                                                                                                                               |
| **`gsap` 3.15**                                          | ❌      | Gratuit depuis 2025, MorphSVG et SplitText inclus, zéro dépendance — mais c'est un **second runtime d'animation** à côté de Motion, et son ScrollTrigger ferait doublon avec `animation-timeline` natif.                                                                                                                                                                                                                                                                                  |
| **`flubber`**                                            | ⚠️      | Le **seul vrai manque de capacité** (§ 5). Dernière publication **2018** (0.4.2, 2018-03-01), 6 dépendances (`d3-array`, `d3-polygon`, `earcut`, `topojson-client`, `svg-path-properties`, `svgpath`). ⚠️ Le blocage supply-chain est d'**esprit**, pas mécanique — `minimumReleaseAge` ne gate que les versions de moins de 7 jours (un paquet de 2018 passe), et `trustPolicy` compare à l'installé. Ce qui condamne : 8 ans sans mainteneur et 6 transitives que personne ne patchera. |
| **`@number-flow/react`**                                 | ⚠️      | Odomètre chiffre-par-chiffre, réellement plus joli que le spring actuel ; 25 kB dépaquetés, MIT, SSR et `prefers-reduced-motion` gérés. Mais c'est un **remplacement** d'`AnimatedNumber` — composant délibéré (repli statique sous reduced-motion, absence assumée de région live parce que Motion réécrit le `textContent` à chaque frame) — et le gain se limite aux KPI admin `featured`.                                                                                             |
| **`canvas-confetti`**                                    | ⚠️      | Générique : tous les SaaS le font. « Maximalisme **miniature** » appelle une pluie de **gouttes** maison (`CREATION_PATHS.drop` + `AnimatePresence`), pas des confettis achetés.                                                                                                                                                                                                                                                                                                          |
| **`@formkit/auto-animate`**                              | ❌      | Motion + `AnimatePresence` couvrent déjà les listes.                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **`@lottiefiles/dotlottie-react`**                       | ❌      | 504 kB dépaquetés, et le moteur est en **WASM** : exigerait `wasm-unsafe-eval` dans le `script-src` de la CSP (`next.config.ts`), qu'on ne relâche pas pour de la décoration. Suppose en outre un motion designer.                                                                                                                                                                                                                                                                        |
| **`culori`**                                             | ❌      | 1 108 kB dépaquetés. Les couleurs sont statiques dans `globals.css`, et `color-mix(in oklab, …)` couvre le runtime — c'est exactement ce que fait `section-accents.css`. (Correction 2026-08-08 : la première version de cet audit affirmait que Tailwind v4 « embarque culori au build » — faux, aucun paquet Tailwind installé n'en dépend ; l'argument tient sans.)                                                                                                                    |
| **`recharts` · Tremor · visx**                           | ❌      | 7 453 kB dépaquetés pour recharts 3.10. Les graphiques ont été retirés volontairement (SIMPLIFICATION Lot 4) et ne concernent pas la vitrine.                                                                                                                                                                                                                                                                                                                                             |
| **`react-medium-image-zoom` · `react-inner-image-zoom`** | ❌      | `yet-another-react-lightbox` et `pinch-zoom.tsx` sont en place et intégrés au thème (`.synclune-lightbox`).                                                                                                                                                                                                                                                                                                                                                                               |
| **`tailwindcss-motion` et plugins texture**              | ❌      | Tailwind v4 + `tw-animate-css` + le grain `feTurbulence` maison couvrent le besoin. La v4 a par ailleurs internalisé les gradients coniques/radiaux et les container queries.                                                                                                                                                                                                                                                                                                             |
| **`motion-plus-react`** (payant)                         | ❌      | Ticker, Cursor, `AnimateNumber`, `splitText`. Aucun ne sert la DA ; `splitText` (+0,7 kB) serait le seul tentant, pour un effet typographique dont la landing n'a pas besoin.                                                                                                                                                                                                                                                                                                             |

## 4 bis. Seconde vague — les neuf dossiers du 2026-08-08

Exploration élargie aux familles que la première vague n'avait pas couvertes : le dessin à la
main (la catégorie la plus proche de la marque sur le papier), les runtimes génératifs, les
alternatives aux paquets déjà installés et les registries « nouvelle vague ». Le verdict global
ne bouge pas.

| Candidat                                                                                    | Verdict | Raison                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------------------------------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`rough-notation` · `roughjs`**                                                            | ❌      | Sur le papier le candidat le plus proche de la marque (annotations dessinées : entourer, souligner, surligner). Mais c'est un **doublon** du système maison avec un ADN de trait étranger — RoughJS hachure et tremble, le trait maison est régulier à 1,5 (`paths.ts`) — et l'effet de dessin existe déjà (`pathLength={1}` + `@keyframes hand-draw`). Dernière publication 2022. Un mot à entourer se **dessine** dans `paths.ts`, il ne s'installe pas.                                                                                                                              |
| **`animejs` 4**                                                                             | ❌      | Réécriture 2025, MIT, 2 126 kB dépaquetés — même verdict que gsap, mot pour mot : **second runtime d'animation** à côté de Motion, et son module scroll refait `animation-timeline` natif.                                                                                                                                                                                                                                                                                                                                                                                              |
| **Rive (`@rive-app/react-canvas`)**                                                         | ❌      | L'alternative moderne à Lottie (state machines, fichiers plus légers, très actif). Tombe sous la **même double garde** que dotlottie : runtime **WASM** → `wasm-unsafe-eval` dans la CSP, et suppose un motion designer équipé de l'éditeur Rive. Aucun actif n'existe.                                                                                                                                                                                                                                                                                                                 |
| **Runtimes génératifs — `css-doodle` · `zdog` · `two.js` · `p5.js`**                        | ❌      | Patterns et pseudo-3D joueurs : l'esthétique peut flirter avec la DA (rond, naïf, coloré), mais c'est un runtime canvas/web-component pour de la décoration — racheter du JS visuel (§ 2.3). `zdog` est figé depuis 2022. Et la règle qui a sorti le présentoir du premier écran s'applique a fortiori : on ne dessine pas — encore moins on ne **génère** — ce qui est photographié à côté.                                                                                                                                                                                            |
| **`@tsparticles/react`**                                                                    | ❌      | L'absence de système de particules est un choix déjà inscrit au § 3. Même réponse qu'à `canvas-confetti` : si une pluie doit tomber un jour, c'est `CREATION_PATHS.drop` + `AnimatePresence`, en gouttes maison **comptées** — pas un émetteur générique.                                                                                                                                                                                                                                                                                                                               |
| **`swiper` · `keen-slider` · `photoswipe`**                                                 | ❌      | Remplacements latéraux d'embla et de `yet-another-react-lightbox`, installés et intégrés au thème (`.synclune-lightbox`). `swiper` pèse 3 697 kB dépaquetés ; migrer coûterait sans apporter une capacité nouvelle.                                                                                                                                                                                                                                                                                                                                                                     |
| **`next-view-transitions`**                                                                 | ❌      | Redondant : le dépôt est déjà sur les View Transitions **natives** (`@view-transition`, `pwa.css`) ; ce paquet est l'orchestration SPA d'avant leur support navigateur.                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **Registries « nouvelle vague » — Animate UI · React Bits · Motion Primitives · Motion UI** | ⚠️      | Plus proches du brief que MagicUI — joueurs, colorés, pas « SaaS sombre ». Mais ce sont des **registries shadcn** (du code source copié, pas une dépendance) bâtis sur Motion : du JS d'animation sur la couche visuelle, exactement ce dont la trajectoire sort (§ 2.3). Le précédent applicable est `scroll-fade.css` : UN composant précis au service d'une direction validée se **vendore** et s'aligne sur `MOTION_CONFIG` et les tokens — on n'adopte ni le registry ni son paquet. ⚠️ Le paquet npm `animate-ui` (0.0.4, 2022) est un homonyme sans rapport avec animate-ui.com. |
| **Spline (`@splinetool/react-spline`) et embeds 3D**                                        | ❌      | De la 3D WebGL temps réel pour une marque dont le sujet est la **miniature** photographiée et dessinée ; runtime lourd chargé côté client, aucun actif 3D n'existe, et le § 3 assume déjà « aucun 3D, WebGL ».                                                                                                                                                                                                                                                                                                                                                                          |

## 5. Conditions de réouverture

Sans cette section, le document devient un interdit permanent — ce qu'aucun des six dossiers ne
mérite.

| Candidat                                             | Signal qui rouvre le dossier                                                                                                                                                                                                                                                                                                                                                                                                    |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `flubber` ou un morpheur SVG                         | Une direction validée qui exige une **mutation continue** de la goutte entre les six territoires (« UN motif tenu jusqu'au bout »), et non un fondu croisé. ⚠️ Superposer deux tracés statiques et animer leur `opacity` rend ~90 % de l'effet — c'est déjà le pattern imposé par la règle « aucune couleur de token dans une prop Motion ». Chercher d'abord un paquet maintenu, ou vendorer, cf. précédent `scroll-fade.css`. |
| `@number-flow/react`                                 | Le retour d'une surface chiffrée large côté admin (réouverture des sparklines), où l'odomètre porterait plus de trois valeurs.                                                                                                                                                                                                                                                                                                  |
| Une librairie de graphiques                          | Réouverture de la dataviz admin — dossier fermé par SIMPLIFICATION Lot 4. Le contrat de style `chart-styles.ts` survit et servirait de point de départ.                                                                                                                                                                                                                                                                         |
| Motion+ `splitText`                                  | Une direction typographique animée validée sur la landing. Aujourd'hui sans emploi.                                                                                                                                                                                                                                                                                                                                             |
| Un composant d'un registry (Animate UI, React Bits…) | Une direction validée qui désigne **UN** composant précis. La voie est le vendoring à la `scroll-fade.css` (copie datée, adaptation aux tokens et à `MOTION_CONFIG`, procédure de resync) — jamais l'adoption du registry entier.                                                                                                                                                                                               |
| Rive / dotlottie                                     | Un actif d'animation réellement produit (motion designer), **ET** un arbitrage écrit acceptant `wasm-unsafe-eval` dans le `script-src` de la CSP — les deux, pas l'un.                                                                                                                                                                                                                                                          |

## 6. Où est réellement le déficit

C'est la partie qui donne sa valeur au document : **aucun des quatre constats ci-dessous ne se
corrige par une dépendance.** `docs/prompts/DESIGN-ARTIFACT-PROMPT.md` les résume déjà en une
phrase — « à force d'éviter le luxe, on livre du rose pâle sur du blanc, propre et sans personne
dedans ».

### 6.1 — Aucune bande pleine largeur sur la landing

> ⚠️ **Constat daté du 2026-08-07, partiellement périmé depuis le 2026-08-08** : les deux surfaces
> citées ci-dessous (la FAQ et la carte collection) ont été supprimées à la demande de Léane, pour
> être refaites. Le raisonnement est conservé parce que c'est LUI qui vaut — il documente pourquoi
> chaque refus de la bande était motivé, et il devra être re-tenu par les sections qui les
> remplaceront. Les noms de fichiers, eux, ne pointent plus rien.

`--section-band` — le token construit et **normalisé en ΔE accent par accent** (18 / 11 / 12 / 16 %,
`app/styles/section-accents.css`) précisément pour qu'une section devienne une _salle colorée_ —
n'avait déjà que deux consommateurs de rendu, et **aucun sur `/`** : le carnet des séries de
`/collections` (supprimé depuis) et
`shared/components/cursor-pagination/storefront-pagination-band.tsx` (revérifié le 2026-08-08 :
c'est désormais le seul).

⚠️ **Ce n'est pas un oubli, et il ne faut pas le corriger comme tel.** Chaque section de la landing
avait écarté la bande explicitement, avec un motif écrit :

- la **FAQ** avait remplacé la direction « E — L'échantillonnier » par « F — Le nuancier, au bon
  calibre » le 2026-08-06 : le lavis de famille sur les onze rangées avait été jugé **trop fort**.
  La note ouverte prenait `--section-wash-strong` (18 % uniformes, mélangé vers `--card`), et son
  test **verrouillait** l'absence de `--section-band` ;
- la **carte collection** le disait dans sa doctrine : « la salle colorée (`--section-band`) est le
  langage **bande**, pas carte » ; elle peignait ses tirages en `--section-wash`.

Les deux tokens ne sont pas interchangeables : `--section-band` se mélange vers `--background` (une
bande **posée sur la page**), `--section-wash-strong` vers `--card` (le **papier**). Le constat exact
n'était donc pas « le token est inutilisé » mais : **la landing n'exerce jamais le langage bande**,
et chaque refus pris isolément était bien argumenté. C'est le § 6.4 qui en est la lecture juste.

### 6.2 — Aucune photographie de marque

`IMAGES.FOUNDER` vaut `null` (`shared/constants/images.ts` — URL UploadThing en 404, revérifiée le
2026-08-08). Conséquence : la section atelier rend la plaque dessinée — un cœur de 96 px tient lieu
de portrait de Léane — et les nœuds `Person` / `HowTo` omettent leur champ `image`.

Tout l'univers photographique de `BRAND-DA.md` (buste de velours rose, mains tatouées, présentoir
illustré jaune, macro au soleil) est absent du site. `app/opengraph-image.tsx` porte le constat le
plus net du dépôt : « **C'est le seul visuel de la landing qui appartienne au dépôt.** »

C'est un problème d'**actif**, pas de code : aucune librairie ne le résout, et le pipeline d'image
(next/image, `thumbhash`, `blurDataUrl`, `sizes` centralisés) est prêt à les recevoir.

### 6.3 — Un seul motif tenu à l'échelle d'une section

Le fil de l'atelier est le seul endroit où un mécanisme — et non une décoration — porte une section
entière, et le seul où les quatre accents tournent _à l'intérieur_ d'une section pour se réunir dans
une chute (la pampille). Hero et pied de page sont des blocs uniques, alors que `BRAND-DA.md`
désigne « une série, une cadence, une variation » comme _le principe le plus transposable à
l'interface_.

### 6.4 — Une série de retraits sans remplacement

Quatre décors du premier écran, la signature « — Léane », les soulignés du pied de page, les accents
par onglet de la barre basse, six masking tapes. **Chaque retrait est individuellement bien
argumenté** — et plusieurs reposent sur des mesures (le décor du hero ne rendait pas sous 640 px et
laissait 32 à 42,5 px de papier mort à 1280/1440). Le cumul, lui, produit exactement l'échec que
`CLAUDE.md` nomme : « Une surface qui raconte Synclune en gris avec un filet de rose a manqué le
brief. »

Or `LANDING-BEST-PRACTICES.md` § 0.3 a déjà tranché la méthode : **« livrer des refontes cohérentes,
pas des micro-variantes »** — l'A/B testing étant _arithmétiquement_ indisponible à ce volume
(3,5 ans pour détecter +20 %), la prudence incrémentale ne s'achète rien. Un retrait mesuré qui ne
propose rien à la place n'est pas une refonte cohérente : c'est une micro-variante à signe négatif.

**C'est là qu'est le budget, pas dans `package.json`.**

## 7. Méthode

- **Dates** : relevé initial le 2026-08-07 ; révision, corrections et seconde vague (§ 4 bis) le
  2026-08-08.
- **Versions au moment de la révision** : `next@16.3.0`, `react@19.2.8`, `motion@12.42.2` installé
  (`13.0.0` publiée le 2026-08-05), `@base-ui/react@1.6.0`, `tailwindcss@4.3.3`,
  `@phosphor-icons/react@2.1.10`, `sonner@2.0.7`.
- **Métadonnées npm** relevées sur le registre via
  `npm view <pkg> version time.modified dist.unpackedSize license` — commande donnée pour que le
  prochain relevé soit comparable. Les tailles citées aux § 4 / § 4 bis sont des tailles
  **dépaquetées**, pas des poids gzip de bundle — elles servent à classer, pas à budgéter ; un
  budget se mesure avec `pnpm size`.
- **Changelog `motion@13.0.0` vérifié à la source** (CHANGELOG.md du dépôt motiondivision) : un
  seul breaking change, le retrait de la dépendance optionnelle `@emotion/is-prop-valid` au profit
  de `<MotionConfig isValidProp>` — sans effet ici (ni Styled Components ni Emotion).
- **État du dépôt** : vérifié par lecture directe de `package.json`, `.size-limit.json`,
  `pnpm-workspace.yaml`, `components.json`, `next.config.ts` (CSP, `optimizePackageImports`),
  `app/globals.css`, `app/styles/*.css`, `shared/styles/fonts.ts`,
  `shared/components/animations/` (dont `motion.config.ts`), `shared/components/hand-drawn/`,
  `shared/constants/images.ts` ; usage nul des registries `@magicui` / `@aceternity` et compte des
  icônes Phosphor revérifiés par grep le 2026-08-08.
- **Corrections apportées par la révision du 2026-08-08** — listées pour que la prochaine passe
  sache ce qui a déjà dérivé une fois : (1) springs nommés 9 → **8** ; (2) icônes distinctes
  104 → **124** ; (3) `onlyBuiltDependencies` vit dans `package.json`, pas `pnpm-workspace.yaml` ;
  (4) l'argument supply-chain contre `flubber` reformulé (blocage d'esprit, pas mécanique) ;
  (5) retrait de l'affirmation « Tailwind v4 embarque culori » (aucun paquet Tailwind installé
  n'en dépend) ; (6) gate `minimumReleaseAge` du bump motion explicité (installable à partir du
  2026-08-12) ; (7) tailles npm rafraîchies (`shaders-react` 0.0.79 / 427 kB, dotlottie 504 kB,
  culori 1 108 kB, recharts 7 453 kB) ; (8) `sonner` ajouté à l'inventaire § 3 (il manquait).
- **Non vérifié ici** : les budgets `pnpm size` n'ont pas été rejoués (aucun ajout à mesurer), et
  aucune mesure Lighthouse n'a été prise — cet audit ne porte que sur la décision d'ajouter ou non
  une dépendance.
