# La landing page — référence & feuille de route

> ⚠️ Nom de fichier volontairement SANS date : le scan
> `stripe-api-version-ssot.regression.test.ts` faux-positive sur tout nom
> `…-AAAA-MM-JJ.md` cité depuis un fichier source (piège déjà payé deux fois).
>
> Ce document est LA référence de la page d'accueil (`/`) : ce qu'elle est, les
> invariants qui la tiennent, ce qu'il reste à créer, ce qu'il faut modifier, et
> ce qui a été refusé et ne doit pas être re-proposé. Il complète
> `docs/LANDING-SECTION-COLLECTIONS.md` (la décision figée de la section
> Collections) sans le dupliquer. Les règles citées nomment leur test : c'est le
> test, pas ce fichier, qui fait autorité.

## 1. Le brief, et pourquoi il gouverne tout

- Synclune vend des **bijoux créatifs et colorés, faits main** — **pas de la
  joaillerie précieuse** (SSOT `shared/constants/brand.ts`, détail
  `docs/BUSINESS.md`). Toute direction artistique bâtie sur le métal précieux, la
  gravure ou le « luxe discret » est le contre-pied du brief — erreur déjà
  commise une fois, ne pas la refaire.
- **Une seule personne** (Léane), ~20 commandes/mois visées : chaque section
  ajoutée est une surface de plus à maintenir seule. Une section ne se justifie
  que si elle porte un **rôle** que la page ne porte pas encore.
- Concept directeur : **« L'étal continue »** (harmonisation du 2026-08-05). La
  page est un déroulé continu ; les sections se séparent par un filet
  (`border-t`), jamais par des bandes à fonds pleins alternés.
- Verdict de direction acté (ré-audit du premier écran, 76/100, 2026-08-05) :
  **l'étal EST la hero**. Sur un catalogue de pièces uniques, la marchandise est
  l'argument — une bande pleine hauteur dépenserait le pixel le plus cher sur une
  promesse. Ce qu'une hero classique porte en plus est distribué aux sections
  suivantes : **orientation** → Collections, **réassurance** → FAQ, **signature**
  → footer.

## 2. État des lieux — ce que la page rend aujourd'hui

`app/(shop)/(home)/page.tsx` est un Server Component **synchrone** (aucun `await`
au niveau page, pas de `loading.tsx` — assumé). Navbar, `<main>`, footer et
bottom-nav mobile viennent du layout `app/(shop)/layout.tsx`, pas de la page.

| #   | Section                                                             | Rôle                                                                                                                                                                                                                                       |
| --- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 0   | `HomepageStructuredData` (Suspense)                                 | JSON-LD `@graph` unique ; repli `<StructuredData includeHomepageSchemas />` sans produits — deux `<script>` streamés, un seul survit dans le DOM final                                                                                     |
| 1   | **L'étal** — `_components/etal/etal-section.tsx`                    | Premier écran : `h1` (LCP mobile) + les 5 créations les plus récentes (`getProducts` sur-alloué de +3, `sortSoldOutLast` pour garantir de l'achetable) + carte « Voir toutes les créations » → `/produits`                                 |
| 2   | **Collections** — `_components/collections/collections-section.tsx` | Orientation « Choisis ton univers » : 4 collections (`getCollections`, `products-descending` + `hasProducts`), CTA → `/collections`. Décision : `docs/LANDING-SECTION-COLLECTIONS.md`                                                      |
| 3   | **Atelier** — `_components/atelier/atelier-section.tsx`             | Récit « Viens voir l'atelier » (2026-08-05) : portrait polaroid sticky ≥ lg, confidence, 4 étapes ancrées `#atelier-step-<id>` (SSOT `shared/constants/atelier-content.ts`). Décision & cible visuelle : `docs/LANDING-SECTION-ATELIER.md` |
| 4   | **FAQ** — `_components/faq/faq-section.tsx`                         | Réassurance « Des questions ? » : 5 groupes / 11 questions (SSOT `shared/constants/faq-items.tsx`), cible de la 308 `/aide` → `/#faq`, carte « Écris-moi » sticky ≥ lg                                                                     |
| —   | Footer (layout)                                                     | Signature « — Léane » (la SEULE de la page), navigation, contact, rail légal                                                                                                                                                               |

### JSON-LD

Émetteur unique : `shared/components/structured-data.tsx` — un seul `<script>`
contenant un `@graph`. Sur `/`, jusqu'à 8 nœuds : `Organization`, `WebSite`,
`LocalBusiness`, `Person` (fondatrice), `BreadcrumbList` (`#homepage-breadcrumb`),
`ItemList` (`#etal`, alimentée par **la même promesse** que la grille de l'étal),
`FAQPage` (`#faq`) et `HowTo` (`#atelier`, SSOT
`shared/constants/atelier-content.ts`, steps ancrés sur les `<li>` réels de la
section). La landing est la page la plus chargée du site en structured data —
et la seule à quatre nœuds conditionnels.

### Metadata

Export **statique** `metadata` dans `page.tsx` (pas de `generateMetadata`,
aucune donnée dynamique nécessaire) : `title.absolute`, description, 8 keywords,
`canonical: "/"`, OG (image `/opengraph-image` 1200×630) et Twitter. ⚠️ Les
trois descriptions (meta / OG / Twitter) sont trois variantes de copie écrites à
la main, dérivées d'aucune SSOT — cf. § 5.

### Couverture de tests

- Unit/RTL : `etal/__tests__/`, `collections/__tests__/`, `atelier/__tests__/`,
  `faq/__tests__/`.
- E2E : `e2e/seo.spec.ts` (metadata + `@graph` + FAQ), `e2e/performance.spec.ts`
  (LCP/CLS), `e2e/shop-mobile.spec.ts` (budget vertical), smoke
  `e2e/navigation.spec.ts` (navbar + étal + footer). ⚠️ **Aucune assertion E2E
  sur les sections Collections et Atelier** — cf. § 4.

## 3. Invariants — à respecter dans toute évolution

Chaque ligne nomme son verrou quand il existe.

### SEO / JSON-LD

- **Une seule `ItemList` et une seule `BreadcrumbList` par URL.** L'`ItemList`
  de l'accueil appartient à l'étal ; deux `ItemList` aux `numberOfItems`
  divergents laissent Google en choisir une arbitrairement
  (`catalogue-single-breadcrumb.regression.test.ts`).
- **Tout nouveau nœud rejoint le `@graph`** — jamais un `<script>` séparé.
  Précédents : l'absorption de `/aide` (`FAQPage`) et le `HowTo` de l'atelier
  (2026-08-05), tous deux nœuds du `@graph`. Un futur `Article` suivrait le
  même chemin.
- **La grille de l'étal et l'`ItemList` consomment la même promesse**, triée
  (`sortSoldOutLast`) AVANT le partage — réordonner dans la grille seule ferait
  annoncer à Google un ordre que la page ne rend pas (commentaire au call site
  dans `page.tsx`).
- Toute vignette passe par `pickPrimaryImage()`
  (`modules/products/services/product-display.service.ts`) — jamais
  `find(isPrimary) ?? images[0]`, qui a déjà mis un `.mp4` dans `<Image src>`.

### Performance / budget vertical

- **Budget vertical mobile : titre ET première création au-dessus de la ligne de
  flottaison à 390×844** (`e2e/shop-mobile.spec.ts`). Marge mesurée :
  **13,1 px** — moins d'une demi-ligne de chapô. Toute copie ajoutée au bloc
  titre se paie là.
- **Le porteur du LCP est le `h1` sur mobile** (la photo au-delà de `lg`) ; le
  préchargement de la police display est justifié par lui. Budgets :
  `e2e/performance.spec.ts` (porteur ∈ {H1, IMG}, CLS < 0.15).
- Le `h1` (et les `h2` de section) restent **hors de toute frontière
  `Suspense`** — le premier écran ne dépend d'aucun `await`.
- Animations d'apparition above-fold : famille `*-load`, jamais `*-inview`.
- Un squelette réserve la hauteur **mesurée** du contenu réel, et toute ligne
  retirée du bloc réel se retire aussi du squelette.

### Données / cache

- Les data fns sont appelées depuis la page avec **`{ isAdmin: false }`
  explicite** (`isAdmin()` lit `headers()`, interdit dans un scope
  `"use cache"`, et rendrait la page dynamique pour rien).
- Jamais de `select` Prisma inline : réutiliser les selects SSOT de
  `modules/*/constants/` (`catalogue-selects-schema-validity.regression.test.ts`).

### UI / copie (détail dans `docs/UI-CONVENTIONS.md`)

- Plafond storefront `max-w-6xl` ; breakpoints en rem (SSOT
  `shared/constants/breakpoints.ts`) ; `render` jamais `asChild` ; icônes
  Phosphor via `@phosphor-icons/react/ssr` avec `weight`.
- La copie **tutoie** — la mécanique de vérification existe
  (`checkout-voice-tutoiement.regression.test.ts`, transposable).
- **Une seule signature « — Léane » par page** : le footer la porte, aucune
  section n'en rajoute (décision du 2026-08-05).
- Accents de « salle » cohérents avec la navbar (SSOT
  `app/(shop)/(home)/_components/navbar/navbar-section.ts`) — ex. : la menthe
  pour Collections, le soleil pour la FAQ.
- Pas de couleur de token dans une prop d'animation Motion — tous les tokens
  sont des `oklch()` (`motion-animatable-colors.regression.test.ts`).
- Pas de `PageHeader` sur le storefront (réservé legal/admin) : le bloc titre
  d'une section est un `h2` dans le langage du shell (`h2` + `HandDrawnRail`).
- **Aucun séparateur entre les sections de la landing** (2026-08-06) : ni filet
  haut, ni bande à fond plein — seul le rythme vertical (`pt-12 lg:pt-16` +
  `pb-*` de section) les sépare. Le filet haut a existé jusqu'à cette date sur
  Collections, Atelier et FAQ ; il a été retiré, ne pas le reproposer.

## 4. Quoi CRÉER — feuille de route priorisée

### 4.1 Committer l'existant (préalable)

Les sections des 2026-08-04/05 (collections, atelier, FAQ, brush-highlight)
sont **commitées**. Reste, au 2026-08-06, le diff de la purge des séparateurs
et des rubans en série (`atelier-section.tsx`, `collections-section.tsx`,
`faq-section.tsx`, `shared/components/masking-tape.tsx`, ce document) — à
committer avant toute suite. ⚠️ L'index git est partagé entre sessions —
ajouts ciblés uniquement, jamais de `git add -A`.

### 4.2 La section Atelier — livrée, cible visuelle ouverte

**Livrée le 2026-08-05** (direction « L'établi de Léane », copie réécrite au
tutoiement dans `shared/constants/atelier-content.ts`), entre Collections et
FAQ, `HowTo` dans le `@graph`. La décision figée, l'état des lieux et la
feuille de route visuelle (portrait FOUNDER en 404 — le P1 de l'audit du
2026-08-06 —, part atelier du « surligneur passe », plan photos, refus) vivent
dans `docs/LANDING-SECTION-ATELIER.md` — ce document ne les duplique pas.

### 4.3 Tests E2E de la landing — le trou de couverture le plus net

Les tests E2E retirés au vidage du 2026-08-03 sont « à réintroduire avec la
nouvelle landing ». Le smoke et le SEO ont été partiellement recâblés, mais :

- **Aucune assertion sur la section Collections** (`collections-title` n'apparaît
  nulle part sous `e2e/`) : à ajouter au smoke (`e2e/navigation.spec.ts`) —
  présence du `h2`, des cartes, du CTA vers `/collections`.
- **L'atelier est arrivé sans sa part E2E** : présence `#atelier` au smoke +
  nœud `HowTo` dans `e2e/seo.spec.ts` — rattachée au lot 0 de
  `docs/LANDING-SECTION-ATELIER.md`.

### 4.4 Ancre sur la section Collections — ✅ fait (2026-08-06)

`id="collections"` + `scroll-mt` dérivé de `--navbar-height-static` sont posés
sur la section (même passe que la parité de la grammaire d'arrivée : rail
`inView` + `.enter-inview` sur le bloc titre, constat n° 6 de l'audit).
Les quatre sections sont adressables : `#etal`, `#collections`, `#atelier`,
`#faq`. L'ancre est publiée — c'est un contrat, ne plus la renommer.

## 5. Quoi MODIFIER — améliorations sur l'existant

- **Metadata → SSOT.** Les trois descriptions divergentes (meta / OG / Twitter)
  ne dérivent ni de `BRAND.description` (`shared/constants/brand.ts`) ni de
  `BUSINESS_INFO.description` (`shared/constants/seo-config.ts`). Soit les
  harmoniser sur une SSOT, soit acter par écrit (JSDoc au-dessus de `metadata`)
  que les trois variantes sont voulues — l'état actuel est un non-choix.
- **Rien entre la FAQ et le footer.** Constat, pas défaut : newsletter, waitlist
  et capture d'email sont **refusés** (§ 6), donc pas de « CTA final » classique.
  Si un bloc de sortie se justifie un jour, il devra trouver une autre forme —
  décision à prendre le moment venu, pas ici.

## 6. Refusé — ne pas re-proposer (liste fermée)

Chaque entrée a été proposée puis refusée (ou rendue impossible). Les re-proposer
coûte une session de re-litige pour le même verdict.

| Proposition                                        | Verdict, date                                                                                 |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Bandeau réassurance à icônes                       | ❌ Refusé (2026-05) — la réassurance vit dans la FAQ et les pages légales                     |
| Newsletter / waitlist / capture d'email            | ❌ Refusé (2026-06-25) — et plus aucun émetteur marketing n'existe (cf. `CLAUDE.md` § Emails) |
| Avis clients                                       | ❌ Impossible — système supprimé le 2026-07-30, tables comprises                              |
| « Table de Léane »                                 | ❌ Refusé                                                                                     |
| `Collection.isFeatured` (mise en avant éditoriale) | ❌ Refusé — le tri mécanique EST le choix                                                     |
| Seconde signature « — Léane » hors footer          | ❌ Refusé (2026-08-05)                                                                        |
| Seconde `ItemList` / second `<script>` JSON-LD     | ❌ Interdit (`catalogue-single-breadcrumb.regression.test.ts`)                                |
| Chevron scroll-cue sous la hero mobile             | ❌ Refusé                                                                                     |
| Effet cursor-follow sur la hero                    | ❌ Refusé                                                                                     |
| Décors de hero (formes flottantes…)                | ❌ Supprimés (2026-08-01)                                                                     |
| Bandes de sections à fonds pleins alternés         | ❌ Contraire au concept « L'étal continue »                                                   |
| Hero pleine hauteur remplaçant l'étal              | ❌ Tranché (audit 2026-08-05) — la marchandise est l'argument                                 |

## 7. Méthode de travail

- **Toute nouvelle section passe par le pipeline `docs/prompts/`**
  (DESIGN-ARTIFACT → implémentation → ré-audit), comme toutes celles qui
  existent. Ce document tranche le « quoi » ; le « comment » visuel se joue là.
- **Auditer sur un rendu navigateur réel**, pas seulement jsdom — plusieurs
  défauts de la landing (focus, halos, wrap de texte) étaient invisibles hors
  navigateur.
- ⚠️ **Ne pas calibrer la direction artistique sur le seed** : la base de dev
  contient ~48 produits seedés qui sont de la joaillerie précieuse — le
  contre-brief exact.
- `pnpm validate` avant toute PR ; les invariants du § 3 ont chacun leur test —
  un changement qui en fait rougir un se discute avec le test, pas contre lui.
