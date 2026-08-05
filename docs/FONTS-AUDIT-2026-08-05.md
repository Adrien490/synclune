# Audit typographique — 2026-08-05

> État des lieux du système `Fraunces / Figtree / Sacramento` (SSOT `shared/styles/fonts.ts`)
> au regard du brief de marque, et candidats de remplacement. Le choix final se fait sur le
> **spécimen comparatif** (artifact — URL en fin de document, 8 systèmes). La migration
> éventuelle est un chantier séparé, listé en fin de document.
>
> **Révision (2ᵉ passe, même jour — audit contradictoire, 66/100 pour la v1)** : citations
> prix/`tabular-nums` du §1 corrigées (les deux étaient fausses) ; la table des candidats
> gagne les colonnes italique/tnum/poids — l'absence d'italique concernait les **4** displays
> candidates, pas seulement S1 ; les 4 scripts S1–S4 reproduisent le défaut mesurable reproché
> à Sacramento (x-height) ; 3 systèmes S5–S7 ajoutés (recherche élargie sourcée) ; frictions
> complétées (CSP, Stripe Elements, corrections optiques Fraunces-spécifiques…) ; le « filet »
> du contrat d'exactitude annoncé en v1 **n'existe pas** (il ne vérifie jamais un nom de
> police). Provenance des mesures : `font-data.json` de Next 16.3.0, blocs `/* latin */` de
> l'API css2 (UA Chrome), tables OpenType lues par fontTools sur les TTF upstream.
>
> **✅ S5 IMPLÉMENTÉ (même jour)** : `fonts.ts` porte désormais Winky Sans / Onest / Kalam
> (les 12 frictions ci-dessous traitées ; italiques display conservées — préchargé
> 78 220 o, +10 832 vs Fraunces, arbitrage documenté dans `fonts.ts`). Le filet de la
> friction 5 existe : `test/contract/fonts-docs-parity.contract.test.ts`.
>
> **Passe de complétude (même jour)** : `font-light` 300 clampé sous S2/S4 (dont le h1 LCP) ;
> italique display = 5 sites (4 mega-menus oubliés), italique corps = ~28 fichiers (pas
> « rare ») ; Winky Sans hors table capsize (pas de fallback métrique) ; boîtes de ligne des
> scripts chiffrées ; PDF fiscaux vérifiés **sans** police de marque (et à garder ainsi —
> hash 10 ans) ; l'`@import` email requalifié en question RGPD.

## Le brief, rappel

Synclune vend des **bijoux créatifs et colorés, faits main** — la marque exprime la
créativité joyeuse de Léane (SSOT `shared/constants/brand.ts`, `docs/BUSINESS.md`).
**« Bijoux » ≠ « joaillerie précieuse »** : toute direction typographique « luxe discret »,
gravure ou métal précieux est le contre-pied du brief (erreur déjà commise le 2026-07-27
avec des propositions Bodoni Moda / Pinyon Script / Marcellus — à ne pas refaire).

## Constats sur le trio actuel

### 1. Fraunces (`--font-display`) — le registre n'est pas le bon, et elle coûte cher

- **Registre** : serif « Old Style » aux terminaisons organiques — littéraire, patrimonial,
  éditorial. C'est précisément la voix de la joaillerie de caractère, pas celle d'un bijou
  coloré assemblé à la main. Elle est belle, mais elle raconte la mauvaise histoire.
- **Aucune feature numérale** : la table GSUB de Fraunces ne porte que `kern`/`liga`/`rvrn` —
  ni `tnum`, ni `pnum`. Conséquences en production :
  - les **prix de la fiche produit sont composés en `font-display`**
    (`modules/products/components/product-price-display.tsx:83,121`) — aucun alignement
    tabulaire possible tant que la display n'expose pas `tnum` ;
  - les **totaux du panier ont dû être SORTIS de Fraunces** le 2026-08-04
    (`modules/cart/components/cart-sheet-footer.tsx:68-74`, verrouillé par
    `cart-sheet-footer.test.tsx:226-232` : Δ mesuré **16,14 px** entre « 111,11 € » et
    « 888,88 € » à 24 px — identique avec et sans `tabular-nums` — contre **0,00 px** pour
    Figtree ; le spécimen live mesure 19,55 px, même conclusion) ;
  - deux autres sites documentent le contournement : `shared/components/gallery/counter.tsx:25`
    et `app/admin/_components/admin-menu-sheet.tsx:787-788` ;
  - le compteur de l'étal (`modules/products/components/etal-card.tsx:249`) porte un
    `tabular-nums` **inopérant** sous `font-display` (ce n'est pas un prix, mais il danse).
- **Poids sur le chemin LCP** : woff2 `latin` préchargé de **67 388 B** (axes `opsz`+`wght` ;
  artefact `.p.woff2` du build courant — 67 468 B était la mesure de l'époque WONK).
  Sans `opsz` elle tomberait à 36 560 B ; avec SOFT+WONK elle remonterait à 120 800 B.
  C'est la seule police préchargée, pour le h1 de l'étal qui porte le LCP mobile.
- Reliquat incohérent : `app/admin/(dashboard)/_components/section-heading.tsx:45` applique
  `sm:italic` à du `font-display` — Fraunces a une vraie italique, mais voir friction 7 :
  presque aucune candidate n'en a.

### 2. Figtree (`--font-sans`) — correcte, interchangeable

Lisible, bien dessinée (`tnum` ✓, italiques ✓, 20 184 B latin), et sans aucun caractère de
marque : c'est la sans par défaut de centaines de sites. Le corps de texte est l'endroit où
la personnalité peut s'exprimer à faible coût (le fallback email est déjà `system-ui`, donc
zéro resync `emails/`). Toute remplaçante doit préserver l'acquis : **`tnum` effectif**
(feature OU chasse tabulaire par défaut — voir la nuance Hanken/Nunito plus bas).

### 3. Sacramento (`--font-cursive`) — élégante, pas personnelle — et c'est mesurable

Script **monoline** régulier, registre « faire-part de mariage » : élégant et froid.
L'intention documentée est « petit mot dans le colis » (`fonts.ts`) — une écriture
manuscrite spontanée y colle mieux qu'une calligraphie apprêtée.

Le chiffre derrière l'impression : **x-height 306/1000 em, ratio x-height/cap-height 0,40** —
la plus basse de toutes les polices mesurées ici. À 1,5 rem, les minuscules font ~7 px de
haut : c'est ça, le rendu « apprêté et minuscule ». Critère pour toute remplaçante :
**ratio xH/capH ≥ ~0,6** (Kalam 0,71, Shadows Into Light 0,95).

### 4. Divers

- `emails/email-colors.ts:88` mentionne encore « Fraunces (display serif **Soft+Wonk**) » —
  axes retirés de `fonts.ts`, commentaire périmé (idem l'en-tête `:58-59`).
- `emails/_components/email-layout.tsx:37` : URL Google Fonts en dur
  (`Fraunces:opsz,wght@9..144,400` + `Sacramento`), désynchronisable en silence de `fonts.ts`.
- **`EMAIL_FONT_FAMILY.cursive` est mort** (`emails/email-colors.ts:66`) : zéro consommateur —
  seuls `.body` et `.display` sont lus. L'`@import` ci-dessus télécharge donc Sacramento
  pour aucun style d'email. À purger lors de la migration (ou avant).

## Cartographie des usages

| Classe                | Occurrences | Fichiers | Diffusion                                                                                       |
| --------------------- | ----------- | -------- | ----------------------------------------------------------------------------------------------- |
| `font-display`        | 113         | 89       | surtout indirecte, via `shared/components/ui/{card,dialog,alert-dialog,sheet,drawer,empty}.tsx` |
| `font-cursive`        | 32          | 17       | concentrée : `logo.tsx`, headings storefront, signatures « — Léane », `error.tsx` paiement      |
| `font-sans` explicite | 2 réels     | 2        | `page-header.tsx`, `ui/kbd.tsx` — le reste hérite du `<body>`                                   |

Point clé : les **classes ne changent pas** lors d'une migration (les variables
`--font-display`/`--font-sans`/`--font-cursive` restent les mêmes, pass-through
`app/globals.css:292-294`) — seuls `fonts.ts`, `app/layout.tsx`, `app/global-error.tsx` et
les périphériques listés plus bas bougent.

## Systèmes candidats (spécimen)

Tous sur Google Fonts (contrainte `next/font/google` — doublée par la CSP
`font-src 'self'` de `next.config.ts:96` : une police non self-hostée serait bloquée).

Poids = woff2 `latin` que Next self-host avec sa config par défaut (`wght` seul pour les
variables, sauf mention). **it.** = vraie italique dessinée. **tnum** = alignement tabulaire
effectif des chiffres (feature `tnum`, ou chasse tabulaire par défaut, noté « déf. »).

| #       | Display             | it.   | tnum | Poids        | Corps             | it. | tnum  | Signature               | xH/capH  | Registre                                                                                           |
| ------- | ------------------- | ----- | ---- | ------------ | ----------------- | --- | ----- | ----------------------- | -------- | -------------------------------------------------------------------------------------------------- |
| S0 réf. | Fraunces            | ✓     | ✗    | 67 388 B     | Figtree           | ✓   | ✓     | Sacramento              | 0,40     | actuel                                                                                             |
| S1      | Bricolage Grotesque | ✗     | ✓    | 41 236 B¹    | Hanken Grotesk    | ✓   | déf.² | Ms Madi                 | 0,52     | grotesque expressive — **déjà validé le 2026-07-27** (build vert), jamais commité (worktree perdu) |
| S2      | Gabarito            | ✗     | ✓    | 34 320 B     | Schibsted Grotesk | ✓   | ✓     | Borel³                  | —        | géométrique arrondie, chaleureuse, joyeuse                                                         |
| S3      | Space Grotesk       | ✗     | ✓    | **22 320 B** | Instrument Sans   | ✓   | ✓     | Mansalva⁴               | 0,55     | studio 2026, quirky-technique                                                                      |
| S4      | Baloo 2             | ✗     | ✓    | 33 056 B     | Nunito Sans       | ✓   | déf.² | La Belle Aurore⁵        | 0,55     | coloré assumé, rondeur artisanale                                                                  |
| **S5**  | **Winky Sans**      | **✓** | ✗    | ~36 Ko       | **Onest**         | ✗   | ✓     | **Kalam**               | **0,71** | « Encre et papier » — mot d'encre joyeux, adulte                                                   |
| **S6**  | **Funnel Display**  | ✗     | ✓    | **~17 Ko**   | **Funnel Sans**   | ✓   | ✓     | **Architects Daughter** | 0,65     | « Studio Funnel » — scandinave en mouvement, imbattable LCP                                        |
| **S7**  | **Fredoka**⁶        | ✗     | ✗    | ~29 Ko       | **Rubik**         | ✓   | ✓     | **Delicious Handrawn**  | 0,59     | « Bijou pop » — cute and cosy 2026 assumé                                                          |

¹ **Conditionnel** : 41 236 B sans l'axe `opsz`. En le déclarant (comme la config Fraunces
actuelle) : **76 868 B, soit +9 480 B par rapport à Fraunces** — le gain s'inverse. Avec
`opsz`+`wdth` : 131 312 B. Le « −26 232 B » de la v1 supposait `wght` seul, sans le dire.
² Hanken Grotesk et Nunito Sans **n'ont pas la feature `tnum`**, mais leurs chiffres sont
**tabulaires par défaut** (Δ = 0 vérifié à toutes les graisses, € compris — 560/1000 em et
600/1000 em). `tabular-nums` y est un no-op inoffensif : les prix s'alignent quand même et
le test `cart-sheet-footer` resterait vert. Un « tnum : non » sec aurait disqualifié à tort.
³ **Borel : descender −1,014 em** (plus profond que le cadratin) → boîte de ligne ~2 em,
risque de clipping sur le logo et les signatures.
⁴ **Mansalva : 53 644 B** — 2,3× Sacramento, plus lourd que n'importe quel corps candidat,
pour un usage `--font-cursive` présent sur 17 fichiers dont la navbar (`logo.tsx`).
⁵ **La Belle Aurore n'a NI GSUB NI GPOS** — zéro crénage, zéro ligature. Son poids record
(17 776 B) vient de ce vide ; à taille display, l'absence de kerning se voit. Et sa boîte de
ligne fait **~1,85 em** (asc 1,077 / desc −0,775) — presque le cas Borel.
⁶ Fredoka apporte un 2ᵉ axe `wdth 75–125` (compresser les titres français longs sans
seconde famille).

### Ce que la v1 ne montrait pas

- **Italique display : seule Fraunces en a une.** Le ⚠️ de la v1 sur S1 vaut aussi pour
  Gabarito, Space Grotesk et Baloo 2 (`styles: ["normal"]` dans font-data.json) — tout
  `italic` y devient un faux-oblique synthétisé. Sur S5–S7, seule Winky Sans en a une.
- **Les 4 displays candidates S1–S4 règlent le défaut tnum de Fraunces** (feature vérifiée,
  Δ = 0 sur les dix chiffres) — l'argument le plus transverse en faveur d'une migration,
  jamais énoncé en v1.
- **Les 4 scripts S1–S4 reproduisent le défaut de Sacramento** : Ms Madi 0,52, Mansalva 0,55,
  La Belle Aurore 0,55 de ratio xH/capH (Sacramento 0,40), Borel à part (descender). La v1
  proposait de remplacer Sacramento par des polices qui ont son problème.
- **Réduire la plage `wght` ne réduit RIEN** : `wght@100..900` et `wght@300..800` renvoient
  le même fichier. Le seul levier de poids est le choix des **axes** déclarés. Corollaire
  Nunito Sans : son `opsz` va de 6 à 12 (défaut 12) — à 17 px il est épinglé au défaut,
  le déclarer coûterait +50 288 B pour zéro rendu.
- **`font-light` (300) est CLAMPÉ sous S2 et S4.** Quatre sites composent du
  `font-display font-light`, dont les DEUX h1 du storefront — `etal-heading.tsx:78`
  (le h1 qui porte le LCP), `storefront-heading.tsx:221`, `etal-card.tsx:249`,
  `collection-chapter.tsx:167`. Gabarito et Baloo 2 commencent à **400** : le navigateur
  écrête au min de l'axe, sans avertissement — le hero perdrait sa graisse légère.
  Couvrent le 300 : Fraunces (100), Bricolage (200), Space Grotesk, Winky Sans,
  Funnel Display, Fredoka. Aucun usage >700 dans le repo (rien à clamper en haut).
- **Winky Sans est absente de la table capsize de Next 16.3.0**
  (`next/dist/server/capsize-font-metrics.json`) → pas d'`adjustFontFallback` possible :
  le fallback affiché pendant le chargement n'est pas compensé métriquement (CLS potentiel
  sur tout usage non préchargé). Les 8 autres familles S5–S7 y figurent. À re-vérifier à
  chaque upgrade Next — la table suit les ajouts Google Fonts avec retard.
- **Boîtes de ligne des scripts** (asc−desc, /em) : Kalam **1,59** (desc −0,531, comparable
  à Mansalva 1,58) · Architects Daughter 1,39 · Delicious Handrawn 1,20 · Sacramento 1,46 ·
  Ms Madi 1,32 · La Belle Aurore 1,85 · Borel 2,00. Un script plus « haut » que Sacramento
  agrandit les blocs signature — et le skeleton de `StorefrontHeading` ment déjà de ~40 px
  sur la signature (audit du même jour) : re-mesurer la parité skeleton après migration.

### S5–S7 — recherche élargie (2ᵉ passe)

Ancrage tendance 2026 (Creative Bloq, Envato, Fontfabric) : « cute and cosy », scripts
expressifs, italiques en rôle principal — « more personality, more craft, more joy » ; le
« handmade » comme signal d'authenticité. Exactement le brief.

- **S5 « Encre et papier » — Winky Sans / Onest / Kalam.** Le meilleur fit de registre :
  Winky Sans (Typofactur, 2024) est décrite comme « the sober, grown-up cousin of Comic
  Sans » — informelle et personnelle sans être puérile, **structurellement incapable de lire
  « luxe »**, 300–900 variable **avec vraies italiques** (la tendance « italics as leading
  role »), encore peu vue (~146 k req/j = distinctive). Onest est la plus chaude des sans à
  `tnum` vérifié, **plus légère que Figtree** (~13 Ko), xH 527/1000. Kalam est le seul
  script manuscrit de Google Fonts cumulant x-height exploitable (0,71) **et trois vraies
  graisses** (300/400/700), ~13 Ko. Total latin ~62 Ko vs ~111 Ko actuels.
- **S6 « Studio Funnel » — Funnel Display / Funnel Sans / Architects Daughter.** La
  superfamille de Kristian Möller × NORD ID (Stockholm) : fûts volontairement décalés
  « pour le sens du mouvement ». Funnel Display = **~17 Ko, la display la plus légère
  mesurée** (−50 Ko sur le chemin LCP vs Fraunces), `tnum` ✓. Funnel Sans assortie
  (`tnum` ✓, italiques ✓). Architects Daughter en note spontanée (~12 Ko).
- **S7 « Bijou pop » — Fredoka / Rubik / Delicious Handrawn.** L'incarnation du courant
  « cute and cosy » : Fredoka ronde et douce avec son axe `wdth`, Rubik aux coins adoucis
  (`tnum` ✓, italiques ✓, très éprouvée), Delicious Handrawn étroite et discrète. Le plus
  « packaging coloré » des huit — à juger sur pièce : c'est aussi le plus proche du risque
  « enfantin ».

### Alternates par slot (si un système plaît « sauf un slot »)

- **Display** : Grandstander (100–900 + italiques, xH/capH 0,82 — la plus « friendly »,
  ~41 Ko) · Petrona (100–900 + italiques, serif chaleureuse NON littéraire — si on veut
  rester serif, ~35 Ko) · Gluten (axe `slnt` −13…13 = vraie pente variable, ~47 Ko).
  **Rejetées** : Instrument Serif et Kalnia (registre luxe/mode — disqualifiant par brief) ;
  Unbounded (chasse moyenne 600 — les titres français débordent) ; Young Serif (une seule
  graisse — pas de hiérarchie par graisse) ; Winky Rough (~136 Ko — contours texturés,
  disqualifiée LCP) ; Quicksand/Comfortaa (datées) ; Outfit/Sora (le même « correcte,
  interchangeable » que Figtree).
- **Corps** (tnum effectif non négociable) : Plus Jakarta Sans (~12 Ko, italiques, xH 536 —
  la polyvalente) · Karla (~13 Ko, italiques + `onum`/`lnum`, la plus « quirky ») · Asap
  (~15 Ko, italiques + axe `wdth` 75–125, utile aux libellés français longs).
  **Disqualifiées sur tnum** (ni feature ni chasse tabulaire) : Urbanist, Lexend,
  Albert Sans, Mulish, Rethink Sans, Wix Madefor Text, IBM Plex Sans. **Register-wrong**
  malgré tnum : Inter, Public Sans, Geist (SaaS/gouvernemental/techy).
- **Signature** : Shadows Into Light (xH/capH **0,95** — le script le plus lisible mesuré,
  ~15 Ko, ascendante 1175 → line-height généreux) · Patrick Hand (0,71, ~13 Ko, très sûre) ·
  Caveat (la référence, mais ~51 Ko et omniprésente) · Shantell Sans (300–800 + axes
  BNCE/INFM + italiques — la plus expressive, ~45 Ko) · Playwrite FR Moderne (la cursive
  scolaire française, 100–400 — identitaire, mais ⚠️ pas de `subsets` nommés dans
  font-data.json → `preload: false` obligatoire, métriques verticales énormes, et re-risque
  de formalité façon Sacramento).
  **Disqualifiées** : Nanum Pen Script (**aucun accent français**) ; Marck Script (xH/capH
  0,41 — pire que Sacramento) ; Delius/Handlee/Gochi Hand/Neucha (latin seul, pas de
  `latin-ext` : à un glyphe du fallback).

### Recommandation (2ᵉ passe)

**S5 « Encre et papier » en premier choix** : c'est le seul système dont les trois slots
corrigent chacun le défaut **mesuré** de leur prédécesseur — registre display (littéraire →
encre joyeuse, avec italiques réelles — les 5 sites d'italique display survivent), tnum corps
conservé en plus léger, x-height script 0,40 → 0,71 avec de vraies graisses, et le
`font-light` 300 des h1 couvert. Concessions explicites, mesurées : Onest n'a pas d'italique
— **~28 fichiers** de corps italique rendraient en faux-oblique synthétisé (acceptable sur
une sans ; sinon Plus Jakarta Sans, italiques + tnum + 12 Ko) ; Winky Sans n'a pas `tnum`
(Δ live 11,04 px — acceptable : les totaux qui « dansent » sont déjà composés en sans, les
prix de fiche produit sont statiques ; si on veut le tnum jusque dans la display, S6) ; et
Winky Sans est **hors table capsize** → pas de fallback métrique ajusté (voir plus haut).
**S6 si le LCP domine** : préchargé ~17 Ko (−50 Ko vs Fraunces), tnum jusque dans la
display, superfamille cohérente — au prix d'un registre plus « studio » que « fait main ».
S7 est le pari le plus tranché — à ne retenir que si le spécimen convainc qu'il reste adulte.

Critères de jugement dans le spécimen : voix de marque (hero + signature), hiérarchie par
graisse, prix alignés (`tnum` — témoin S0 volontairement visible), lisibilité du corps à
17 px, poids du woff2 préchargé.

## Points de friction d'une migration (quel que soit le système retenu)

1. **Exports `next/font/google` à underscores** (`Bricolage_Grotesque`, `Winky_Sans`,
   `Funnel_Display`…) — une erreur de nom ne casse ni typecheck ni lint, elle sort en build
   error Turbopack `Unknown font` sans nommer la police fautive. Vérifier export/axes/poids
   dans `node_modules/next/dist/compiled/@next/font/dist/google/{index.d.ts,font-data.json}`.
2. **4 mocks navbar keyés par nom d'export Google** : `navbar-wrapper.test.tsx`,
   `user-menu.test.tsx`, `menu-sheet.test.tsx`, `desktop-nav.test.tsx` mockent
   `{ Figtree, Fraunces, Sacramento }` — à renommer d'un bloc (vérifié : ce sont les 4
   seuls mocks de `next/font` du dépôt).
3. **`app/global-error.tsx`** duplique le trio du root layout.
4. **Emails** : URL `@import` de `email-layout.tsx:37` + `EMAIL_FONT_FAMILY` de
   `emails/email-colors.ts` — si la display devient une grotesque, le fallback doit changer
   de **catégorie** (`Georgia…serif` → pile sans-serif), pas seulement de nom (Outlook
   Desktop ignore l'`@import` et ne rend que le fallback). Purger l'entrée `cursive` morte
   et l'en-tête `:58-59` au passage.
5. **Docs nommant le trio en dur** : `docs/prompts/REDESIGN-PROMPT.md` (1 site),
   `docs/prompts/DESIGN-ARTIFACT-PROMPT.md` (3), `docs/prompts/AUDIT-PROMPTS.md` (5, + des
   citations `fonts.ts` aux lignes 141/158/180 dont une **plage de lignes**
   `fonts.ts:32-39`), et le 4ᵉ fichier que la v1 ne nommait pas :
   **`docs/prompts/README.md:86`** — 10 sites logiques.
   ⚠️ **Le contrat `claude-md-accuracy.contract.test.ts` ne protège RIEN ici** : il ne
   couvre ni AUDIT-PROMPTS.md ni README.md, et surtout il ne vérifie que des **chemins de
   fichiers backtickés** — jamais un nom de police. Il passerait au vert avec « Fraunces »
   écrit partout après une migration. ✅ **Filet créé à la migration** :
   `test/contract/fonts-docs-parity.contract.test.ts` dérive les familles de `fonts.ts`
   et verrouille prompts + emails (liste `PAST_FAMILIES` à étendre à chaque migration).
6. **Tests nommant Fraunces/Figtree/Sacramento** : `desktop-nav.test.tsx:348`,
   `collection-card.test.tsx:370`, `cart-sheet-footer.test.tsx` (mesures tnum chiffrées),
   plus **3 oubliés en v1** : `etal-section.test.tsx:160`,
   `etal-section-structure.test.tsx:10`, `etal-card.test.tsx:156`. Les assertions de
   classes (`toContain("font-display")`) survivent, seuls titres/commentaires périment.
7. **Italique display : 5 sites, pas 1.** `section-heading.tsx:45` admin (`sm:italic`),
   plus **4 sites storefront dans les mega-menus** — `mega-menu-collections.tsx:131`,
   `mega-menu-creations.tsx:89,160`, `mega-menu-column.tsx:87` (sous-titres
   `font-display text-xs italic`). À retirer/repenser pour **tout** système sauf S5
   (seules Fraunces et Winky Sans ont une italique) — sinon faux-oblique synthétisé,
   silencieux. **Italique de CORPS : ~28 fichiers** (pages légales, cartes admin,
   `checkout-summary.tsx:164`…) — pas « rare » : un corps sans italique (Onest) y
   synthétiserait un faux-oblique partout ; acceptable sur une sans, mais c'est un choix
   à assumer, pas un non-sujet (sinon Plus Jakarta Sans).
8. **`e2e/performance.spec.ts`** : commentaires liant `preload: true/false` au LCP
   (`:4-13`, `:148-149`).
9. **Utilitaires custom** : tout utilitaire qui n'est pas une famille doit rester **hors du
   namespace `font-`** (tailwind-merge classe `font-<x>` inconnu en font-family et supprime
   le `font-display` voisin — bug invisible au lint/typecheck/tests). Vérifié : aucun
   utilitaire fautif aujourd'hui, et `cn()` est un `twMerge` nu sans config — le risque est
   réel et non gardé. La leçon n'est écrite qu'ici : la porter dans `docs/UI-CONVENTIONS.md`
   (sous contrat d'exactitude) lors de la migration.
10. **Corrections optiques Fraunces-spécifiques dans le code** (oubliées en v1) :
    `etal-heading.tsx:65` (crénage manuel calé sur le « D » de Fraunces) et
    `storefront-heading.tsx:105` (`-ml-[0.055em]` calé sur le « L ») sont **load-bearing
    sur la face** — à recalculer ou retirer. Idem les mesures px figées en commentaire :
    `squiggle-underline.tsx:56` (« ~45px en Fraunces text-lg »), `navbar-section.ts:58`
    (« ~105 px »), `navbar-wrapper.tsx:86`, `menu-sheet-nav-sections.tsx:67,383-384` —
    ~24 sites de prose nommant les polices en tout (grep `Fraunces|Figtree|Sacramento`
    hors tests/docs pour la liste exacte).
11. **Stripe Elements** : `modules/payments/constants/stripe-appearance.ts:38,60-61`
    documente pourquoi Figtree n'est PAS chargée dans l'iframe et fige `FONT_STACK` —
    raisonnement à re-valider avec la nouvelle sans.
12. **2ᵉ consommateur CSS de la sans** : `app/styles/components.css:228`
    (`font-family: var(--font-sans), system-ui, sans-serif;` sur le compteur lightbox) —
    hors `globals.css`, facile à rater.

## Surfaces vérifiées SANS impact (ne pas « les découvrir » à chaque passe)

- **PDF fiscaux (factures/avoirs)** : `render-invoice-pdf.ts` et les renderers d'avoir
  composent en **Helvetica intégrée de jsPDF** — aucune police de marque, zéro surface de
  migration. ⚠️ **Et ça doit le rester** : le PDF archivé est scellé par SHA-256 pour 10 ans
  (Art. L102 B LPF) — « brander » ces PDF changerait le rendu des régénérations de dépannage
  et n'a aucune valeur réglementaire. Toute envie de cohérence de marque s'arrête à la
  frontière fiscale.
- **`font-mono`** : pile système Tailwind, jamais chargée via `next/font` — aucun impact.
- **Graisses hautes** : aucun `font-extrabold`/`font-black` dans le repo — seuls les min
  d'axe (300) clampent, voir plus haut.
- **`e2e/smoke.spec.ts:41-44`** lit `getComputedStyle(document.body).fontFamily` mais
  n'asserte que `toBeTruthy()` — swap-safe.
- **`package.json`/lockfile** : aucune dépendance police (`@fontsource`, `next/font/local`,
  `.woff2` dans `public/` : néant). Tout passe par `next/font/google`.

## Analyse élargie (hors périmètre migration, à noter)

- **Les images OG ne portent aucune typo de marque** : `app/opengraph-image.tsx:35` et les
  3 routes OG dynamiques rendent en `fontFamily: "sans-serif"` Satori, sans option `fonts:`.
  Pas un blocage de migration (rien à resynchroniser), mais une incohérence de marque
  existante — chantier candidat une fois la nouvelle display choisie.
- **L'`@import` Google Fonts des emails est un appel distant chez le destinataire**
  (`email-layout.tsx:37`) : contrairement au storefront (self-hosted via `next/font`, CSP
  `font-src 'self'`), l'email fait requêter `fonts.googleapis.com` par le client mail —
  transmission d'IP à Google, la zone grise RGPD exacte du jugement allemand de 2022 sur les
  Google Fonts distants. En pratique la plupart des clients (Outlook, Gmail clippé) l'ignorent
  ou le proxifient, mais le retirer — avec l'entrée `cursive` morte — serait un double gain :
  conformité ET honnêteté (le rendu réel est déjà le fallback presque partout).
- **`.size-limit.json` n'a aucun budget police** alors que tout l'argumentaire LCP repose
  sur le poids du woff2 préchargé — un garde-fou « display préchargée ≤ N Ko » serait le
  pendant naturel de la migration.
- Le Δ tnum diffère selon l'environnement de mesure (16,14 px dans le test vitest, 19,55 px
  dans le spécimen navigateur, à 24 px) — les deux concluent pareil, ne pas « corriger »
  l'un avec l'autre.

## Spécimen

- Artifact (8 systèmes S0–S7, copie réelle, badges `document.fonts.check()`, Δ tnum live) :
  https://claude.ai/code/artifact/9d89505a-be34-413c-b8f7-3f75f6976770
- Précédent spécimen (6 systèmes, session du 2026-07-27) :
  https://claude.ai/code/artifact/305efaff-6b7b-419f-84b7-055c482d2728
