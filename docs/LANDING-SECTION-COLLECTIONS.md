# La prochaine section de la landing — 2026-08-05

> ⚠️ Nom de fichier volontairement SANS date, parce que ce document est cité depuis
> `page.tsx` et `collections-section.tsx` : un nom `…-AAAA-MM-JJ.md` dans un commentaire de
> code ressemble à une version d'API Stripe. Le scan
> `stripe-api-version-ssot.regression.test.ts` écarte désormais les extensions de fichier
> connues (`md` incluse), donc le piège est neutralisé — la convention reste par prudence,
> plus par nécessité.

> Analyse et recommandation pour **une** nouvelle section de contenu sur `/`, demandée le
> 2026-08-05. Ce document tranche le « quoi » et fixe les invariants du « comment » ; il ne
> contient aucune spécification pixel — le design passe par le pipeline habituel
> (`docs/prompts/DESIGN-ARTIFACT-PROMPT.md`), comme l'étal et le bloc titre avant lui.
> Les règles citées nomment leur test : c'est le test, pas ce fichier, qui fait autorité.
>
> **✅ IMPLÉMENTÉ (même jour)** : section « Choisis ton univers » dans
> `app/(shop)/(home)/_components/collections/` (section + grille + carte + squelettes),
> branchée entre l'étal et la FAQ dans `page.tsx`. La carte n'est PAS le `CollectionCard`
> du méga-menu (composant client `NavigationMenuLink`) mais une carte serveur ; la requête
> reprend les critères mécaniques du méga-menu (`products-descending` + `hasProducts`,
> 4 cartes) ; aucun JSON-LD émis, conformément aux invariants. Tests :
> `collections-section.test.tsx`.
>
> ⚠️ **La carte a changé de silhouette le 2026-08-06 — ce document ne fait plus autorité
> sur son anatomie.** Elle rendait un **média carré unique** dans l'enveloppe
> `CARD_SURFACE_POLAROID`, ce que les § 3 et § 5 de [`COLLECTION-CARD.md`](COLLECTION-CARD.md)
> interdisaient tous les deux. Le désaccord — déclaré des deux côtés et laissé ouvert le temps
> d'être tranché — **a été tranché en faveur de la doctrine**, après avoir rendu en navigateur
> les quatre silhouettes candidates de son § 5. Motif : hors ratio et squiggle, la carte était
> une carte produit (même enveloppe, même inclinaison, mêmes gouttières au pixel, même titre),
> et une différence de ratio 4/5 contre 1/1 ne se perçoit pas au défilement sous la grille de
> cinq `ProductCard` du hero qui la précède immédiatement.
>
> La carte porte désormais la silhouette **S2 « la pile décalée »** : trois tirages papier
> chevauchés et de guingois, qui se redressent au survol et au focus — la même que le carnet
> des séries de `/collections`, à l'échelle d'une carte. Elle a été retenue contre trois autres
> parce qu'elle est la seule à n'emprunter **aucune forme** au décor du premier écran (le
> présentoir dépense déjà la grappe, la goutte et le cabochon) : son vocabulaire est le papier
> photo, pas le bijou. `CARD_SURFACE_POLAROID` et `CARD_TILT` ont quitté l'enveloppe — ce sont
> les tirages qui les portent. **Ce qu'une carte collection doit montrer se lit désormais
> uniquement dans `COLLECTION-CARD.md`** ; ce document ne dit plus que _où_ la section va et
> _combien_ de cartes elle montre.

## Le brief, rappel

Synclune vend des **bijoux créatifs et colorés, faits main** — pas de la joaillerie
précieuse (SSOT `shared/constants/brand.ts`, détail `docs/BUSINESS.md`). Micro-entreprise
d'une seule personne, ~20 commandes/mois visées : chaque section ajoutée est une surface de
plus à maintenir seule, donc une section ne se justifie que si elle porte un **rôle** que
la page ne porte pas encore.

Le concept directeur de la landing est **« L'étal continue »** (harmonisation du
2026-08-05) : pas de bandes pleines à fonds alternés, la page est un déroulé continu où
les sections se séparent par un filet (`border-t`), pas par des blocs.

## État des lieux — ce que la page porte déjà

La landing a été vidée le 2026-08-03 (copie atelier sauvegardée dans
`docs/atelier-story.md`) puis reconstruite section par section. Aujourd'hui,
`app/(shop)/(home)/page.tsx` rend exactement :

| #   | Section                                          | Rôle porté                                                                                                                                                                 |
| --- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **L'étal** (`_components/hero/hero-section.tsx`) | Premier écran : `h1` + LCP + les 5 créations les plus récentes (sur-allocation +3 et `sortSoldOutLast` pour garantir de l'achetable) + carte « Voir toutes les créations » |
| 2   | **FAQ** (`_components/faq/faq-section.tsx`)      | **Réassurance** : livraison, retours, entretien — 5 groupes, 11 questions (SSOT `shared/constants/faq-items.tsx`), cible de la redirection 308 `/aide` → `/#faq`           |
| —   | Footer (layout)                                  | Signature « — Léane », colonnes de navigation, rail légal                                                                                                                  |

Le ré-audit du premier écran (76/100, 2026-08-05) a posé le diagnostic qui guide ce choix :
l'étal est la bonne hero (« sur un catalogue de pièces uniques, la marchandise EST
l'argument »), mais une hero porte aussi **la confiance et l'orientation**. La FAQ, ajoutée
depuis, couvre la confiance. **Le trou restant est l'orientation** : le seul chemin vers le
catalogue depuis `/` est « Voir toutes les créations » — rien ne présente les _univers_
(Pokémon, Van Gogh…) qui sont pourtant la structure éditoriale du catalogue et l'expression
la plus directe de la créativité de Léane.

## Candidats

| Candidat                     | Verdict                | Pourquoi                                                                                                                                                                                                                                                                                                                                                                                    |
| ---------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Collections**              | ✅ **Retenu**          | Comble le trou d'orientation ; données live déjà en place ; zéro dépendance externe. Détail ci-dessous.                                                                                                                                                                                                                                                                                     |
| Atelier / histoire de Léane  | ⏸️ **Section d'après** | Le bon candidat n°2 (différenciateur « fait main à Nantes »), mais **bloqué deux fois** : les photos sont des placeholders (`TODO(photos-atelier)` dans `docs/atelier-story.md`) et la copie sauvegardée **vouvoie** alors que tout le site tutoie — elle est à réécrire, pas à recopier (`checkout-voice-tutoiement.regression.test.ts` verrouille la voix). Cf. § « La section d'après ». |
| Bandeau réassurance à icônes | ❌ Refusé              | Refus mémorisé (2026-05) : ne pas re-proposer. La réassurance vit dans la FAQ et les pages légales.                                                                                                                                                                                                                                                                                         |
| Newsletter / waitlist        | ❌ Refusé              | Waitlist refusée à l'audit landing du 2026-06-25. De plus, **il n'existe plus aucun émetteur marketing** dans le code : en re-créer un exige le triptyque budget partagé + en-têtes RFC 8058 + opt-out persisté (cf. `CLAUDE.md` § Emails) — un chantier, pas une section.                                                                                                                  |
| Avis clients                 | ❌ Impossible          | Le système d'avis a été **supprimé** le 2026-07-30 (tables comprises).                                                                                                                                                                                                                                                                                                                      |
| « Table de Léane »           | ❌ Refusé              | Concept déjà proposé et refusé — ne pas re-proposer.                                                                                                                                                                                                                                                                                                                                        |

## Recommandation : une section « Collections »

### Rôle

**Orientation.** Donner au visiteur qui n'accroche pas sur les 5 créations de l'étal un
second chemin d'entrée : par univers. C'est aussi la section qui montre l'étendue du
catalogue sans l'énumérer — l'étal dit « voici les dernières », les collections disent
« voici les mondes ».

### Placement

**Entre l'étal et la FAQ.** L'ordre de lecture devient : accroche produit (étal) →
orientation (collections) → réassurance (FAQ) → signature (footer). Mettre les collections
sous la FAQ les enterrerait sous du contenu de fin de parcours ; au-dessus de l'étal est
exclu (l'étal est le premier écran, verrouillé par son budget vertical mobile — la marge
n'est que de **13,1 px**, cf. audit du 2026-08-05).

### Contenu (esquisse — le design se fait en artifact)

- Titre `h2` dans le langage du shell « L'étal continue » (même famille que le `h2` de la
  FAQ : filet haut, accent `HandDrawnRail`, pas de `PageHeader` — il est réservé à
  legal/admin).
- **2 à 4 cartes collection** + un lien de sortie vers `/collections`. La brique visuelle
  existe (`CollectionCard`, déjà auditée 2×) ; les `CollectionChapters` pleine largeur de
  `/collections` sont **trop lourds pour la landing** — c'est la page dédiée qui raconte,
  la landing oriente.
- Aucune stat, aucun compteur **de section** : pas de « X collections » en tête de bloc
  (le compte streamé est le pattern de la page dédiée, pas de la landing).
  ⚠️ **À ne pas confondre avec le compteur PAR CARTE** (« 12 créations »), qui est au
  contraire prescrit : c'est l'un des deux nombres qui distinguent une carte collection
  d'une carte produit (`docs/COLLECTION-CARD.md` § 4). Les deux ont porté le même mot
  « compteur » dans deux documents voisins — ce n'est pas la même chose.

> **Ce que la carte doit porter est fixé ailleurs.** Ce document dit **où** la section va et
> **combien** de cartes elle montre ; `docs/COLLECTION-CARD.md` dit ce qu'une carte
> collection **est**. ✅ Les deux étaient en désaccord jusqu'au 2026-08-06 (média carré unique
> contre « au moins deux visuels ») ; le désaccord est **tranché en faveur de la doctrine**,
> et la carte porte la silhouette S2 « la pile décalée » — cf. l'encart en tête de ce fichier.

### Données

- `getCollections(params, { isAdmin: false })` — le `status: PUBLIC` est **forcé** par la
  fonction pour tout appelant non-admin ; l'option `isAdmin: false` est **obligatoire** si
  l'appel se fait depuis un scope `"use cache"` (`isAdmin()` lit `headers()`, interdit là).
- Select : réutiliser un select existant de la SSOT
  `modules/collections/constants/collection.constants.ts` — **jamais de `select` inline**
  dans une fonction `data/` (`catalogue-selects-schema-validity.regression.test.ts`).
- ⚠️ **`Collection` n'a pas d'`isFeatured`** — c'est un refus assumé, ne pas le
  re-proposer. Le choix des collections affichées est donc mécanique : les N plus
  récentes (ou la liste complète si elle reste courte), pas une mise en avant éditoriale.
- Vignettes : toute image de collection/produit passe par `pickPrimaryImage()`
  (`modules/products/services/product-display.service.ts`) — jamais
  `find(isPrimary) ?? images[0]`, qui a déjà mis un `.mp4` dans `<Image src>`.

## Invariants à respecter à l'implémentation

Ce document les liste pour que l'implémentation ne les redécouvre pas ; chacun a son filet.

### JSON-LD

- **Aucun second `<script>` JSON-LD, aucune seconde `ItemList` sur `/`.** L'`ItemList` de
  l'accueil appartient à l'étal (nœud du `@graph` unique émis par
  `shared/components/structured-data.tsx`). Deux `ItemList` aux `numberOfItems` divergents
  sur une même URL laissent Google en choisir une arbitrairement
  (`catalogue-single-breadcrumb.regression.test.ts`). Si un nœud devait un jour s'ajouter
  pour les collections, il rejoint le `@graph` existant — précédent : l'absorption de
  `/aide`, dont le `FAQPage` est devenu un nœud du `@graph` et non un script séparé.
- Recommandation par défaut : **la section n'émet rien**. L'`ItemList` des collections
  appartient à `/collections`.

### UI (détail dans `docs/UI-CONVENTIONS.md`)

- Breakpoints en **rem** (SSOT `shared/constants/breakpoints.ts`), plafond storefront
  `max-w-6xl`, survol ⇒ focus (et gater le _masquage_, pas la révélation).
- `render`, jamais `asChild` ; `data-open:`, jamais `data-[state=open]:` ; icônes Phosphor
  via `@phosphor-icons/react/ssr` avec `weight`, jamais `strokeWidth`.
- **Une seule signature « — Léane » par page** : le footer la porte déjà — la section
  collections (et toute future section) n'en rajoute pas (décision du 2026-08-05).
- Pas de couleur de token dans une prop d'animation Motion (tous les tokens sont des
  `oklch()` — `motion-animatable-colors.regression.test.ts`).
- Animations d'apparition above-fold : famille `*-load`, pas `*-inview` (pattern posé par
  `StorefrontHeading`).
- Si la section ajoute un état de chargement : le squelette réserve la hauteur **mesurée**
  du contenu réel (précédent : squelette CollectionChapter à 112 px pour 202 px réels), et
  toute ligne retirée du bloc réel se retire aussi du squelette.

### Tests

- Les tests E2E retirés au vidage de la landing sont « **à réintroduire avec la nouvelle
  landing** » (note du 2026-08-03) : smoke `navigation.spec.ts` (assertions sections),
  test SEO home. Chaque section ajoutée est l'occasion d'en réintroduire la part qui la
  concerne.
- La copie de la section **tutoie** — vérifiable par la même mécanique que
  `checkout-voice-tutoiement.regression.test.ts`.

## La section d'après : l'atelier

À rouvrir **uniquement** quand ses deux bloqueurs tombent :

1. **Les vraies photos existent** — le plan de swap en 4 étapes est dans
   `docs/atelier-story.md` (`TODO(photos-atelier)`). Sans elles, la section reposerait sur
   un placeholder UploadThing, contre-productif pour une marque dont l'argument est le
   geste réel.
2. **La copie est réécrite au tutoiement** — le texte sauvegardé (confidence, 4 étapes du
   process, captions polaroid) vouvoie intégralement.

Ce qui l'attend déjà dans le code : les primitives génériques ont survécu au vidage
(`HandDrawnAccent`, `Fade`, `AnimatedNumber`, `SECTION_SPACING`, `--color-glow-*`,
`section-accents.css`) ; les composants supprimés (polaroids, stats, timeline) se
récupèrent dans l'historique git (dernier commit avant retrait, branche
`chore/v1-schema-simplification`). Les schémas `HowTo` et `Article` documentés dans
`atelier-story.md` devront, eux aussi, renaître comme **nœuds du `@graph`** — pas en
scripts séparés.
