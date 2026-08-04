# Atelier story — copie sauvegardée avant refonte de la landing

> Sauvegarde du 2026-08-03, avant suppression des sections de la page d'accueil
> (refonte landing à venir). Source : `app/(shop)/(home)/_components/atelier-section/`
> (fichiers `atelier-content.ts`, `process-steps.ts`, `polaroid-config.ts`,
> `atelier-section.tsx`, `atelier-stats.tsx`). L'historique git conserve les
> composants complets (dernier commit avant retrait).

## Titre de section

- **Titre** : Mon _atelier_ (le mot « atelier » en italique, entouré d'un cercle
  dessiné à la main `HandDrawnAccent`, couleur `var(--primary)`)
- **Sous-titre** : Là où chaque bijou prend vie, un geste à la fois.

## La confidence (texte principal)

**Intro** (révélée mot à mot via `SplitTextCSS`) :

> Je vais vous faire une confidence.

**Paragraphes** :

> Lorsque j'ai commencé à créer des bijoux, c'était juste pour moi. Une véritable
> passion est née de ce passe-temps, grandissant au fil des ans.

> J'ai créé des bijoux pour ma famille, puis pour des amies, des amies d'amies…
> Et c'est ainsi que l'atelier Synclune est né ! Rien de tout cela n'était prévu,
> pourtant cela sonne aujourd'hui comme une évidence.

> Chaque bijou que vous retrouverez ici est une extension de la passion que
> j'éprouve lorsque je travaille sur mes créations. Chaque couleur, forme, ligne
> est pensée et choisie avec soin, pour donner vie à une pièce unique.

**Signature** : — Léane (tiret dessiné en SVG puis nom révélé, soulignement rose
dessiné à la main — même accent que le « colorés » du footer)

## Le processus créatif (timeline, 4 étapes)

1. **D'abord, une idée** — Une couleur dans la rue, un motif sur un tissu, un
   rêve… Je laisse l'inspiration venir, sans forcer.
2. **Le choix du matériel** — Chaque élément est choisi avec soin dans mon
   atelier.
3. **La cuisson et l'assemblage** — Chaque bijou possède un processus de
   fabrication différent, donnant naissance à des pièces uniques.
4. **La touche finale** — Je polis et vérifie chaque détail, puis je place le
   bijou dans une pochette, avec amour.

## Stats atelier (bande de chiffres)

Affichée seulement à partir de 4 créations publiées (`ATELIER_STATS_MIN_PRODUCTS`),
comptes live (`getPublicProductCount` / `getPublicCollectionCount`) :

- **N** créations uniques
- **N** collection(s)
- **100 %** faits main à Nantes

## Galerie polaroid (scènes illustrées, en attente des vraies photos)

| Id          | Caption (manuscrite)        | Alt prévu pour la photo                           |
| ----------- | --------------------------- | ------------------------------------------------- |
| hands       | Les mains dans les perles ! | Mains de Léane assemblant un bijou                |
| materials   | Mes petits trésors          | Perles et matériaux colorés Synclune              |
| inspiration | L'inspiration du jour       | Carnet d'inspiration de Léane, créatrice Synclune |
| workspace   | Mon coin créatif            | Vue de l'atelier Synclune                         |

## Image héro de la section (masquée en attendant les vraies photos)

- **Alt** : L'atelier de création Synclune, où chaque bijou prend vie
- **URL (UploadThing)** :
  `https://x1ain1wpub.ufs.sh/f/nyHesfTydKuSeQyF8C1jtfJpdXPZs5OLTYnRUHcmrCx7wNWq`
  (même asset que le portrait FOUNDER — placeholder en attendant les photos)

## SEO — schémas JSON-LD portés par la section

- **HowTo** « Comment je crée vos bijoux » : « De l'inspiration à la finition,
  découvrez les étapes de création de bijoux artisanaux en plastique fou peints
  à la main. » — totalTime PT3H ; supplies : plastique fou, peinture acrylique,
  vernis de protection, supports de bijoux (crochets, chaînes, fermoirs), perles
  décoratives ; tools : pinceaux fins, four ménager, outils d'assemblage
  (pinces, anneaux) ; 4 steps = les 4 étapes de la timeline.
- **Article** (dans `StructuredData`, retiré avec la section) : headline
  « L'histoire de Léane, créatrice de bijoux artisanaux Synclune », author =
  `#founder`, about = Brand Synclune « Bijoux artisanaux faits main en France ».

## TODO(photos-atelier) — plan de swap conservé

Le jour où les vraies photos arrivent (atelier + 4 scènes polaroid) :

1. Déposer les photos dans public/ ou UploadThing.
2. Remplacer les illustrations polaroid par des `<Image>` (les `label` ci-dessus
   sont les alts prêts).
3. Réactiver l'image héro de la section.
4. Ré-injecter le ItemList JSON-LD de la galerie avec un `imageUrl` distinct par
   polaroid (schema retiré tant que les 4 `contentUrl` pointaient vers la même
   image — signal SEO trompeur).
