# Audit « librairies design » — 2026-08-07

> **Verdict : n'installer aucune librairie design.** La couche visuelle du dépôt est déjà en
> avance sur ce que ces librairies vendent (reveals et progression au scroll en CSS natif, View
> Transitions natives, système de tracés à la main maison, grain `feTurbulence`, tokens OKLCH à
> contrastes mesurés), et la trajectoire assumée du projet est de **retirer** du JS de la couche
> visuelle. Le déficit de beauté est réel — il est **d'application**, pas d'outillage (§ 6).
>
> Quatorze dossiers évalués (une vingtaine de paquets), métadonnées npm relevées sur le registre le
> jour de l'audit. Seule évolution défendable : le bump `motion@12 → 13`, qui est de la
> **maintenance**, pas du design.
>
> Ce document existe pour rendre le verdict **opposable**. La question a déjà été tranchée une fois
> sans laisser de trace : `components.json` déclare les registries `@magicui`, `@react-aria` et
> `@aceternity` — configurés, jamais utilisés. Sans écrit, elle se re-pose de zéro.
>
> Le § 5 dit à quelles conditions chaque dossier se rouvre. Un audit qui ne le dit pas se périme en
> interdit permanent.

## 1. Verdict

|                              |                                                                                                                                                      |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **À installer**              | rien                                                                                                                                                 |
| **À mettre à jour**          | `motion@12.42.2 → 13.0.0` — aucun breaking change hors Styled Components / Emotion, absents ici. Maintenance, à faire dans une passe de dépendances. |
| **Dossiers laissés ouverts** | 4, avec leur signal de réouverture (§ 5)                                                                                                             |

## 2. Les trois contraintes qui bornent tout ajout

Elles précèdent le catalogue, parce qu'elles suffisent à elles seules à écarter la moitié des
candidats.

**2.1 — Budgets bundle, appliqués en CI** (`.size-limit.json`) : First Load JS partagé **120 kB
gzip**, Homepage 80 kB, fiche produit 80 kB, catalogue 80 kB, collections 70 kB, checkout 130 kB,
admin 200 kB. Un paquet de 30 kB gzip sur le chemin partagé consomme le quart du budget global.

**2.2 — Supply chain durcie** (`pnpm-workspace.yaml`) : `minimumReleaseAge: 10080` (7 jours),
`trustPolicy: no-downgrade`, `onlyBuiltDependencies` en allowlist. Le précédent qui fait
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

## 3. Inventaire — ce qui est déjà couvert

| Besoin                           | Déjà couvert par                                                                                                                                                 |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Reveals au scroll                | **CSS natif** `animation-timeline: view()` — `app/styles/entrance.css`                                                                                           |
| Progression / parallax au scroll | **CSS natif** `animation-timeline: scroll()` — `app/styles/atelier-thread.css`, `scroll-fade.css`, `.shelf-materialize` (`components.css`)                       |
| Transitions de page              | **View Transitions natives** — `@view-transition` dans `app/styles/pwa.css`, `viewTransitionName` nommés (navbar, pied de page, paiement, carte → fiche produit) |
| Animation d'interaction          | `motion@12`, `LazyMotion` + `domMax`, SSOT `MOTION_CONFIG` (9 springs nommés, easings alignés sur les tokens `--ease-*`)                                         |
| Dessin SVG à la main             | `shared/components/hand-drawn/paths.ts`, `creations.ts`, `HandDrawnAccent` en `pathLength={1}` + draw CSS (`@keyframes hand-draw`)                               |
| Grain / texture papier           | `feTurbulence` en data-URI (`.polaroid-paper` 0,035 · `.bottom-bar-paper` 0,03, `mix-blend-mode: multiply`), `--shadow-paper` calibré au ΔL                      |
| Nombres animés                   | `AnimatedNumber` — `shared/components/animations/animated-number.tsx`                                                                                            |
| Carrousel · lightbox · zoom      | `embla-carousel-react` (+ autoplay) · `yet-another-react-lightbox` · `pinch-zoom.tsx`                                                                            |
| Placeholders image               | `thumbhash` + pipeline UploadThing complet, `blurDataUrl` persisté                                                                                               |
| Primitives UI                    | 50 composants shadcn **sur Base UI** v1.6                                                                                                                        |
| Icônes                           | Phosphor, entrée `/ssr`, 104 icônes distinctes                                                                                                                   |
| Couleur                          | tokens OKLCH, `[data-accent]` à 4 accents, bandes ΔE-normalisées, contrastes mesurés et verrouillés par tests de régression                                      |

**Absents, et assumés** : aucune librairie de graphiques (les sparklines ont été retirées,
SIMPLIFICATION Lot 4 — il ne reste que `modules/dashboard/constants/chart-styles.ts`, résiduel) ;
aucun 3D, WebGL, canvas de rendu, ni système de particules. Les deux seuls `<canvas>` du dépôt
sont du traitement d'image hors écran (`compress-image.ts`, `use-video-thumbnail.ts`).

## 4. Les quatorze dossiers

| Candidat                                                 | Verdict | Raison                                                                                                                                                                                                                                                                                                                                                                             |
| -------------------------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **MagicUI · Aceternity · Kokonut · Spell UI**            | ❌      | Esthétique « SaaS sombre, glassmorphism, spectacle » — contre-brief exact. `BRAND-DA.md` : « irisé, pailleté, translucide décrivent les BIJOUX, jamais l'interface ». Les registries `@magicui` et `@aceternity` sont déjà déclarés dans `components.json` et délibérément inutilisés.                                                                                             |
| **`@paper-design/shaders-react`**                        | ❌      | 401 kB dépaquetés (803 kB pour le cœur), WebGL, version `0.0.78`. Ses mesh gradients irisés tombent sous la garde ci-dessus, mot pour mot.                                                                                                                                                                                                                                         |
| **`lenis`**                                              | ❌❌    | Interpole une fausse position de défilement. Casse `position: sticky`, `IntersectionObserver`, `scroll-snap` **et les CSS scroll-driven animations** — c'est-à-dire toute la couche reveal/progression décrite au § 3. Régression architecturale, pas un arbitrage de goût.                                                                                                        |
| **`gsap` 3.15**                                          | ❌      | Gratuit depuis 2025, MorphSVG et SplitText inclus, zéro dépendance — mais c'est un **second runtime d'animation** à côté de Motion, et son ScrollTrigger ferait doublon avec `animation-timeline` natif.                                                                                                                                                                           |
| **`flubber`**                                            | ⚠️      | Le **seul vrai manque de capacité** (§ 5). Dernière publication **2018**, 6 dépendances (`d3-array`, `d3-polygon`, `earcut`, `topojson-client`, `svg-path-properties`, `svgpath`). Contre `minimumReleaseAge` et `trustPolicy`.                                                                                                                                                    |
| **`@number-flow/react`**                                 | ⚠️      | Odomètre chiffre-par-chiffre, réellement plus joli que le spring actuel ; 24 kB, MIT, SSR et `prefers-reduced-motion` gérés. Mais c'est un **remplacement** d'`AnimatedNumber` — composant délibéré (repli statique sous reduced-motion, absence assumée de région live parce que Motion réécrit le `textContent` à chaque frame) — et le gain se limite aux KPI admin `featured`. |
| **`canvas-confetti`**                                    | ⚠️      | Générique : tous les SaaS le font. « Maximalisme **miniature** » appelle une pluie de **gouttes** maison (`CREATION_PATHS.drop` + `AnimatePresence`), pas des confettis achetés.                                                                                                                                                                                                   |
| **`@formkit/auto-animate`**                              | ❌      | Motion + `AnimatePresence` couvrent déjà les listes.                                                                                                                                                                                                                                                                                                                               |
| **`@lottiefiles/dotlottie-react`**                       | ❌      | 492 kB, et le moteur est en **WASM** : exigerait `wasm-unsafe-eval` dans le `script-src` de la CSP (`next.config.ts`), qu'on ne relâche pas pour de la décoration. Suppose en outre un motion designer.                                                                                                                                                                            |
| **`culori`**                                             | ❌      | 1 082 kB. Les couleurs sont statiques dans `globals.css` ; Tailwind v4 embarque déjà culori **au build**, et `color-mix(in oklab, …)` couvre le runtime — c'est exactement ce que fait `section-accents.css`.                                                                                                                                                                      |
| **`recharts` · Tremor · visx**                           | ❌      | 7 278 kB dépaquetés pour recharts. Les graphiques ont été retirés volontairement (SIMPLIFICATION Lot 4) et ne concernent pas la vitrine.                                                                                                                                                                                                                                           |
| **`react-medium-image-zoom` · `react-inner-image-zoom`** | ❌      | `yet-another-react-lightbox` et `pinch-zoom.tsx` sont en place et intégrés au thème (`.synclune-lightbox`).                                                                                                                                                                                                                                                                        |
| **`tailwindcss-motion` et plugins texture**              | ❌      | Tailwind v4 + `tw-animate-css` + le grain `feTurbulence` maison couvrent le besoin. La v4 a par ailleurs internalisé les gradients coniques/radiaux et les container queries.                                                                                                                                                                                                      |
| **`motion-plus-react`** (payant)                         | ❌      | Ticker, Cursor, `AnimateNumber`, `splitText`. Aucun ne sert la DA ; `splitText` (+0,7 kB) serait le seul tentant, pour un effet typographique dont la landing n'a pas besoin.                                                                                                                                                                                                      |

## 5. Conditions de réouverture

Sans cette section, le document devient un interdit permanent — ce qu'aucun des quatre dossiers ne
mérite.

| Candidat                     | Signal qui rouvre le dossier                                                                                                                                                                                                                                                                                                                                                                                                    |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `flubber` ou un morpheur SVG | Une direction validée qui exige une **mutation continue** de la goutte entre les six territoires (« UN motif tenu jusqu'au bout »), et non un fondu croisé. ⚠️ Superposer deux tracés statiques et animer leur `opacity` rend ~90 % de l'effet — c'est déjà le pattern imposé par la règle « aucune couleur de token dans une prop Motion ». Chercher d'abord un paquet maintenu, ou vendorer, cf. précédent `scroll-fade.css`. |
| `@number-flow/react`         | Le retour d'une surface chiffrée large côté admin (réouverture des sparklines), où l'odomètre porterait plus de trois valeurs.                                                                                                                                                                                                                                                                                                  |
| Une librairie de graphiques  | Réouverture de la dataviz admin — dossier fermé par SIMPLIFICATION Lot 4. Le contrat de style `chart-styles.ts` survit et servirait de point de départ.                                                                                                                                                                                                                                                                         |
| Motion+ `splitText`          | Une direction typographique animée validée sur la landing. Aujourd'hui sans emploi.                                                                                                                                                                                                                                                                                                                                             |

## 6. Où est réellement le déficit

C'est la partie qui donne sa valeur au document : **aucun des quatre constats ci-dessous ne se
corrige par une dépendance.** `docs/prompts/DESIGN-ARTIFACT-PROMPT.md` les résume déjà en une
phrase — « à force d'éviter le luxe, on livre du rose pâle sur du blanc, propre et sans personne
dedans ».

### 6.1 — Aucune bande pleine largeur sur la landing

`--section-band` — le token construit et **normalisé en ΔE accent par accent** (18 / 11 / 12 / 16 %,
`app/styles/section-accents.css`) précisément pour qu'une section devienne une _salle colorée_ — n'a
que deux consommateurs de rendu, et **aucun sur `/`** : `modules/collections/components/collection-chapter.tsx`
(le carnet des séries) et `shared/components/cursor-pagination/storefront-pagination-band.tsx`.

⚠️ **Ce n'est pas un oubli, et il ne faut pas le corriger comme tel.** Chaque section de la landing
a écarté la bande explicitement, avec un motif écrit :

- la **FAQ** a remplacé la direction « E — L'échantillonnier » par « F — Le nuancier, au bon
  calibre » le 2026-08-06 : le lavis de famille sur les onze rangées a été jugé **trop fort**. La
  note ouverte prend `--section-wash-strong` (18 % uniformes, mélangé vers `--card`), et
  `faq-section.test.tsx` **verrouille** l'absence de `--section-band` ;
- la **carte collection** le dit dans sa doctrine : « la salle colorée (`--section-band`) est le
  langage **bande**, pas carte » ; elle peint ses tirages en `--section-wash`.

Les deux tokens ne sont pas interchangeables : `--section-band` se mélange vers `--background` (une
bande **posée sur la page**), `--section-wash-strong` vers `--card` (le **papier**). Le constat exact
n'est donc pas « le token est inutilisé » mais : **la landing n'exerce jamais le langage bande**, et
chaque refus pris isolément est bien argumenté. C'est le § 6.4 qui en est la lecture juste.

### 6.2 — Aucune photographie de marque

`IMAGES.FOUNDER` vaut `null` (`shared/constants/images.ts` — URL UploadThing en 404, revérifiée le
2026-08-06). Conséquence : la section atelier rend la plaque dessinée — un cœur de 96 px tient lieu
de portrait de Léane — et les nœuds `Person` / `HowTo` omettent leur champ `image`.

Tout l'univers photographique de `BRAND-DA.md` (buste de velours rose, mains tatouées, présentoir
illustré jaune, macro au soleil) est absent du site. `app/opengraph-image.tsx` porte le constat le
plus net du dépôt : « **C'est le seul visuel de la landing qui appartienne au dépôt.** »

C'est un problème d'**actif**, pas de code : aucune librairie ne le résout, et le pipeline d'image
(next/image, `thumbhash`, `blurDataUrl`, `sizes` centralisés) est prêt à les recevoir.

### 6.3 — Un seul motif tenu à l'échelle d'une section

Le fil de l'atelier est le seul endroit où un mécanisme — et non une décoration — porte une section
entière, et le seul où les quatre accents tournent _à l'intérieur_ d'une section pour se réunir dans
une chute (la pampille). Hero, FAQ et pied de page sont des blocs uniques, alors que `BRAND-DA.md`
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

- **Date** : 2026-08-07.
- **Versions au moment de l'audit** : `next@16.3.0`, `react@19.2.8`, `motion@12.42.2` installé
  (`13.0.0` publié), `@base-ui/react@1.6.0`, `tailwindcss@4.3.3`, `@phosphor-icons/react@2.1.10`.
- **Métadonnées npm** (version, licence, dépendances, taille dépaquetée, téléchargements
  hebdomadaires) relevées sur `registry.npmjs.org` et `api.npmjs.org` le jour de l'audit. Les tailles
  citées au § 4 sont des tailles **dépaquetées**, pas des poids gzip de bundle — elles servent à
  classer, pas à budgéter ; un budget se mesure avec `pnpm size`.
- **État du dépôt** : vérifié par lecture directe de `package.json`, `.size-limit.json`,
  `pnpm-workspace.yaml`, `components.json`, `next.config.ts` (CSP, `optimizePackageImports`),
  `app/globals.css`, `app/styles/*.css`, `shared/styles/fonts.ts`,
  `shared/components/animations/`, `shared/components/hand-drawn/`, `shared/constants/images.ts`.
- **Non vérifié ici** : les budgets `pnpm size` n'ont pas été rejoués (aucun ajout à mesurer), et
  aucune mesure Lighthouse n'a été prise — cet audit ne porte que sur la décision d'ajouter ou non
  une dépendance.
