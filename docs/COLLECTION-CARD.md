# COLLECTION-CARD.md — la carte collection, recommandations d'affichage

> **Ce que fixe ce document** : ce qu'une carte collection doit **montrer**, dans quel ordre, avec
> quelles données, et ce qui doit la distinguer d'une carte produit. Il vaut pour les trois surfaces
> du storefront qui en rendent une (landing, `/collections`, méga-menu).
>
> **Ce qu'il ne fait PAS** :
>
> - **Il n'impose aucun motif décoratif.** Le vocabulaire dessiné à la main existe et reste
>   disponible (`shared/components/hand-drawn/paths.ts`), mais l'identité de cette carte ne doit pas
>   en dépendre : la carte produit occupe déjà ce registre, et un second ornement posé **en série**
>   sature — c'est exactement ce qui a fait retirer le `MaskingTape` de quatre surfaces le
>   2026-08-05. L'identité de la carte collection est **structurelle**, pas ornementale. Les quatre
>   silhouettes du § 5 sont des **compositions**, pas des ornements : c'est la distinction que ce
>   document défend.
> - **Il ne prend pas l'implémentation actuelle pour référence.** Les composants existants sont trois
>   dérivés successifs de la carte produit ; la doctrine est écrite contre `docs/BRAND-DA.md` et
>   contre les données réellement disponibles, pas contre eux. Il **mesure** en revanche l'écart —
>   § 11, ajouté à l'audit du 2026-08-06 : une doctrine qui ne dit pas de combien le code s'en écarte
>   n'est pas actionnable.
>
> Le lexique de marque fait autorité : `docs/BRAND-DA.md` (détail) et `CLAUDE.md` § « Direction
> artistique — lexique de marque » (résumé opérationnel). Les règles d'interface citées nomment leur
> test : c'est le test, pas ce fichier, qui fait autorité.
>
> **Deux écarts de forme, délibérés.** (1) Les sections sont **numérotées** — aucun autre doc de
> direction visuelle ne le fait, mais celui-ci s'auto-référence une dizaine de fois et le tableau
> d'écart du § 11 renvoie section par section. (2) Il porte des **schémas ASCII** (§ 4, § 5, § 7),
> premiers du dossier `docs/`. Ils vivent dans des blocs `code` sans langage : Prettier n'y touche
> pas, alors qu'il reflowerait le même dessin posé en texte courant. Ne pas les « nettoyer ».
>
> **Audité le 2026-08-06** contre le rendu réel : sept affirmations corrigées, l'écart au code
> chiffré (§ 11). Le document est sous le filet de `test/contract/claude-md-accuracy.contract.test.ts`
> — tout chemin qu'il cite doit exister.

## 1. Pourquoi ce document

`modules/products/components/product-card.tsx` porte une direction artistique explicite et écrite —
le tirage polaroid : cadre blanc, photo insérée au ratio 4/5, légende dessous, inclinaison alternée
**par index de grille** (`CARD_TILT` — une pose statique, pas un mouvement : c'est écrit sur la
constante, et c'est pour ça qu'elle ne porte pas de `motion-safe:`), trait dessiné sous le titre. On
sait ce qu'une carte produit **est**.

Rien d'équivalent n'existe pour la collection. Elle est rendue par trois composants distincts, chacun
dérivé de la carte produit au moment où il a été écrit, sans document qui dise ce qu'une carte
collection doit porter ni pourquoi. Résultat prévisible : elle ressemble à une carte produit qui
aurait perdu son prix.

Or ce ne sont pas deux variantes du même objet. **Une carte produit montre UN objet ; une carte
collection doit montrer un ENSEMBLE.** Tout ce qui suit découle de cette phrase.

## 2. Ce qu'une carte collection doit dire

Quatre questions, dans l'ordre où elles se posent dans une grille :

| Question              | Ce qui y répond                       | Source de la donnée                                        |
| --------------------- | ------------------------------------- | ---------------------------------------------------------- |
| C'est quel monde ?    | le **nom** de la collection           | `Collection.name`                                          |
| À quoi ça ressemble ? | **plusieurs** visuels empruntés       | `products[].product.skus[].images[]`                       |
| Combien de pièces ?   | le **compteur** de créations publiées | `_count.products` (filtré `PUBLIC` + `deletedAt: null`)    |
| À partir de combien ? | la **fourchette d'entrée**            | `getCollectionPriceRanges` (jamais le payload de la liste) |

Une carte produit répond « combien **ça** coûte ». Une carte collection répond « combien il y en
a » et « à partir de combien ». C'est la différence de nature entre les deux objets, et c'est ce
qui doit se voir en premier.

## 3. Le principe directeur : la pluralité

Trois faits du dépôt fondent la recommandation centrale, et aucun n'est écrit ailleurs.

**1. Une collection n'a aucune image à elle.** Le modèle `Collection` (`prisma/schema.prisma`) ne
porte que `id`, `name`, `slug`, `description`, `status`, ses dates et sa relation `products`. Il n'y
a pas de champ visuel, et il n'y en aura pas — ce serait un champ de plus à remplir pour une
opératrice unique. **Une carte collection emprunte donc toujours ses visuels à ses produits : elle
compose, elle n'illustre pas.**

**2. Le payload de liste porte déjà jusqu'à quatre visuels.** `GET_COLLECTIONS_SELECT`
(`modules/collections/constants/collection.constants.ts`) charge
`take: COLLECTION_CHAPTER_PRINT_COUNT + 1` produits, et `extractCollectionImages`
(`modules/collections/utils/collection-images.utils.ts`) les déduplique **par produit** — pas par URL
d'image — précisément pour préserver la diversité visuelle quand plusieurs pièces partagent un même
mockup. Une carte qui n'en affiche qu'un jette une donnée déjà payée et se donne la silhouette d'une
carte produit.

**3. Elle porte deux nombres que la carte produit n'a pas** : le compteur de créations publiées et la
fourchette d'entrée agrégée. Ce sont les deux seuls signaux qui disent l'**étendue** d'un ensemble.

**Recommandation** : montrer **au moins deux visuels**, jamais un seul. Une photo unique dans un
cadre est le langage de la carte produit ; l'employer pour une collection annonce un objet là où il y
a une série, et rend les deux familles de cartes indiscernables au scan sur une page qui rend les
deux (la landing).

### Corollaire A — une collection sans photo est un état NORMAL

Puisque les visuels sont empruntés, ils peuvent manquer : collection publiée dont aucun produit n'a
de média `IMAGE`, ou collection qui vient d'être créée. Ce n'est pas une erreur à masquer, c'est un
état à dessiner (cf. § 7).

### Corollaire B — le visuel de tête est un choix ÉDITORIAL, pas un tirage au sort

`Collection` n'a pas d'`isFeatured` (refus assumé, cf. `docs/LANDING-SECTION-COLLECTIONS.md` — ne pas
le re-proposer), **mais `ProductCollection` en a un** : Léane peut épingler une pièce comme vitrine
d'une collection (action `modules/collections/actions/set-featured-product.ts`, protégée par une
contrainte unique partielle en base). Tous les selects de collection trient déjà
`orderBy: [{ isFeatured: "desc" }, { addedAt: "desc" }]`.

**Recommandation** : le premier visuel de la carte est **celui-là**, toujours. Ne jamais mélanger cet
ordre, ne jamais randomiser, ne jamais trier par date brute — c'est le seul levier éditorial dont la
carte dispose, et il est déjà branché.

## 4. La hiérarchie d'affichage

```
╔═══════════════════════════════════════╗  ← racine de la CARTE : data-accent={slug}
║                                       ║    (jamais sur la section — § 6)
║   ┌─────────┐  ┌─────┐  ┌─────┐       ║
║   │   [1]   │  │ [2] │  │ [3] │  ←4.1 ║    ordre isFeatured d'abord · alt=""
║   └─────────┘  └─────┘  └─────┘       ║    2 à 4 visuels — jamais UN seul
║                                       ║
║   Pluie de printemps           ←4.2   ║    font-display · porte le lien étiré ::after
║   ~~~~~~~~~~~~~~~~~~~                 ║    SquiggleUnderline drawn — posé AU REPOS
║                                       ║
║   12 créations                 ←4.3   ║    COLLECTION_TEXTS.PRODUCT_COUNT
║   À partir de 14 €             ←4.4   ║    getCollectionPriceRanges (jamais le payload)
║   Des gouttes de verre souf…   ←4.5   ║    line-clamp-2 · facultatif
║                                       ║
╚═══════════════════════════════════════╝  ← surface --section-wash · encre --foreground
```

| #   | Élément                    | Rôle                                                   | Obligatoire         | Garde                                                                                 |
| --- | -------------------------- | ------------------------------------------------------ | ------------------- | ------------------------------------------------------------------------------------- |
| 1   | **Les visuels** (2 à 4)    | dire la série et son registre chromatique              | oui, s'il y en a    | ordre `isFeatured` d'abord ; `alt=""` (décoratifs, cf. § 8)                           |
| 2   | **Le nom**                 | la récompense de lecture — c'est le monde qu'on promet | oui                 | `font-display`, porte le lien étiré                                                   |
| 3   | **Le compteur**            | l'étendue : « 12 créations »                           | oui\*               | `COLLECTION_TEXTS.PRODUCT_COUNT` — « créations », jamais « articles » ni « produits » |
| 4   | **La fourchette d'entrée** | le ticket d'entrée : « à partir de 14 € »              | si la donnée existe | `getCollectionPriceRanges` uniquement ; la ligne s'omet si absente                    |
| 5   | **La description**         | la voix de Léane, quand elle a écrit quelque chose     | non                 | `Text` sans borne en base → clamp obligatoire, 2 lignes                               |

\* **« Obligatoire » vaut partout où le payload porte la donnée** — ce n'est pas une échappatoire,
c'est une frontière à connaître. Le méga-menu ne rend aujourd'hui ni compteur ni fourchette parce que
`NavItemChild` (`shared/constants/navigation.ts`) ne les transporte pas : c'est un chantier de
données, pas un arbitrage de design, et la condition de levée est d'étendre ce type. Tant qu'il n'est
pas fait, l'exemption est **nommée** (§ 11) plutôt que tacite — une prescription qu'une surface viole
en silence cesse d'être lue par les deux autres.

**Pas de bouton d'appel à l'action.** La carte entière **est** le lien. Un « Découvrir » posé à
l'intérieur double la cible, ajoute un second lien vers la même URL dans l'arbre d'accessibilité, et
entre en conflit avec le lien étiré (`::after`) qui couvre déjà la carte.

**Ce qu'on n'affiche pas** : le statut (une carte visible est publique par construction — les data
fns forcent `status: PUBLIC` pour tout appelant non-admin), les dates, et le mot « Collection » en
sur-titre. Ce dernier a été retiré le 2026-08-05 : sur une page intitulée « Les collections », dans
une grille où toutes les cartes en sont une, il ne discrimine rien tout en occupant la ligne la plus
contrainte de la carte. Il ne survit que comme **repli** quand le compteur est indisponible
(`COLLECTION_TEXTS.CARD_EYEBROW_FALLBACK`), pour ne pas désaligner la carte de ses voisines.

## 5. La silhouette

L'enjeu n'est pas décoratif : sur la landing, la grille des créations et celle des collections sont
**co-visibles**. Si les deux cartes ont la même géométrie, le visiteur lit vingt objets au lieu de
« cinq objets, puis quatre mondes ».

- **Ne pas reprendre la géométrie de la carte produit** : un cadre, une fenêtre unique au ratio 4/5,
  une légende sous la photo. C'est la signature du tirage polaroid, elle est prise.
- **Mobiliser les principes de composition du lexique**, pas un ornement (`docs/BRAND-DA.md` § Le
  vocabulaire des formes) : **répétition, série, accumulation, superposition, symétrie imparfaite,
  rythme**. « La DA repose sur la multiplication de petits éléments » — une carte collection est
  l'endroit du site où cette phrase se transpose le plus littéralement : plusieurs cellules, un
  chevauchement, une cadence. La géométrie **dit** la série ; c'est ce qui remplace l'ornement.
- **Attention au geste partagé** : l'inclinaison alternée (`CARD_TILT`,
  `shared/components/card-surface.constants.ts`) et le trait sous le titre (`SquiggleUnderline`) sont
  **communs** aux deux familles de cartes. Les réemployer tels quels est légitime — c'est la
  cohérence du storefront — mais alors ils ne **distinguent** rien : la distinction doit reposer
  entièrement sur la composition des visuels et sur les deux nombres. ⚠️ Aucun des deux n'est une
  affordance de survol : `CARD_TILT` est une **pose statique** (d'où l'absence de `motion-safe:` sur
  la constante), et sur les deux cartes collection le squiggle est posé **au repos** via `drawn`
  depuis le 2026-08-06 — la cover étant « le premier produit de la série », quatre séries voisines
  peuvent rendre quatre photos très proches, et l'encre teintée était le seul différenciateur…
  caché derrière le hover. Sur un bijou le squiggle reste une affordance de survol ; ici c'est
  l'identité de la porte, elle ne se mérite pas.
- **Le mouvement, lui, tient en une ligne** : `motion-safe:can-hover:hover:-translate-y-1`, plus la
  bordure et l'ombre de `CARD_SURFACE_HOVER` / `CARD_SURFACE_FOCUS`. La liste de transition nomme
  **`translate,rotate`**, jamais `transform` (§ 12) ; `motion-reduce:transition-colors` retire le
  déplacement sans retirer le retour d'état.
- **Densité** : la carte collection porte plus de texte utile qu'une carte produit (nom + deux
  nombres + description facultative). À largeur de colonne égale, elle doit être **plus haute**, pas
  plus serrée. Comprimer la légende pour tenir la hauteur d'une carte produit revient à retirer
  précisément ce qui fait la différence entre les deux. Ordre de grandeur, à 250 px de colonne : la
  carte produit tient sur un média `aspect-4/5` + deux lignes ; la carte collection demande une
  bande de visuels **plus basse** qu'un 4/5 (les vignettes sont petites, § 9) mais **trois** lignes
  de légende — le budget se déplace de la photo vers le texte, il ne s'ajoute pas.

### Les quatre silhouettes candidates

Aucune n'ajoute d'ornement : ce sont quatre **compositions**, chacune adossée à un principe nommé de
`docs/BRAND-DA.md` § « Le vocabulaire des formes ». C'est la réponse structurelle au premier point de
ce paragraphe — on distingue par la géométrie, pas par un motif.

```
S1 — LA MOSAÏQUE                S2 — LA PILE DÉCALÉE
┌──────────────────────────┐    ┌──────────────────────────┐
│ ┌───────────┐ ┌───┐┌───┐ │    │  ┌──────┐                │
│ │           │ │ 2 ││ 3 │ │    │  │  1   │                │
│ │     1     │ └───┘└───┘ │    │  │   ┌──┴───┐            │
│ │           │ ┌───┐      │    │  └───┤  2   │            │
│ │           │ │ 4 │      │    │      │   ┌──┴───┐        │
│ └───────────┘ └───┘      │    │      └───┤  3   │        │
│                          │    │          │      │        │
│                          │    │          └──────┘        │
├──────────────────────────┤    ├──────────────────────────┤
│ Pluie de printemps       │    │ Pluie de printemps       │
│ 12 créations · dès 14 €  │    │ 12 créations · dès 14 €  │
└──────────────────────────┘    └──────────────────────────┘
accumulation · assemblage       superposition · symétrie imparfaite
```

```
S3 — LA BANDE FILANTE           S4 — LA GRAPPE
┌──────────────────────────┐    ┌──────────────────────────┐
│ ┌────┐┌────┐┌────┐┌────┐ │    │      ┌────────┐          │
│ │ 1  ││ 2  ││ 3  ││ 4  │ │    │      │   1    │          │
│ └────┘└────┘└────┘└────┘ │    │      └───┬────┘          │
│                          │    │        ┌─┴──┐            │
├──────────────────────────┤    │        │ 2  │ ┌────┐     │
│ Pluie de printemps       │    │        └────┘ │ 3  │     │
│ 12 créations · dès 14 €  │    │               └─┬──┘     │
└──────────────────────────┘    │                ┌┴───┐    │
                                │                │ 4  │    │
                                │                └────┘    │
                                ├──────────────────────────┤
                                │ Pluie de printemps       │
                                │ 12 créations · dès 14 €  │
                                └──────────────────────────┘
série · rythme                  effet de grappe · pendaison
(la plus compacte)
```

| Silhouette            | Principe `BRAND-DA` | Visuels | « série » au scan | Landing ~250 px | Menu ~215 px | Sources / section | Risque                                                              |
| --------------------- | ------------------- | ------- | ----------------- | --------------- | ------------ | ----------------- | ------------------------------------------------------------------- |
| S1. Mosaïque          | accumulation        | 4       | ✓ ✓               | ✓ (serré)       | ✓ en place   | 16                | faible — mais la cellule 1 domine, retombe vers « photo + miettes » |
| S2. Pile décalée      | superposition       | 3       | ✓ ✓               | ✓               | ✗ (< 90 px)  | 12                | moyen — le chevauchement mange 20-30 % de chaque photo              |
| **S3. Bande filante** | **série · rythme**  | **4**   | **✓ ✓ ✓**         | **✓**           | **✓**        | **16**            | **faible — la plus lisible ; risque inverse : la tiédeur**          |
| S4. Grappe            | effet de grappe     | 4       | ✓ ✓               | ✓ (haute)       | ✗ (hauteur)  | 16                | moyen — la plus fidèle, mais désaligne les bas de carte en grille   |

**Lecture du tableau.** Deux familles : celles qui tiennent aux **trois** largeurs (S1, S3) et celles
qui exigent de la place (S2, S4). S3 est la seule où aucune cellule ne prend le dessus — c'est la
phrase de `BRAND-DA.md` (« la multiplication de petits éléments ») transposée sans ornement, et son
seul risque est la tiédeur, que la rotation d'accents du § 6 corrige. S4 est la plus fidèle à la
marque — la grappe **est** la goutte, signe transversal — mais sa hauteur variable désaligne une
grille de quatre. S1 est déjà le bento du méga-menu, donc éprouvée, au prix d'une hiérarchie interne
qui rejoue « une photo + des miettes », soit exactement la silhouette de carte produit qu'on fuit.

**Arbitré le 2026-08-06, après avoir rendu les quatre en navigateur : S2 sur la landing et
`/collections` ; le méga-menu garde son bento (S1).**

⚠️ **Ce paragraphe recommandait S3, et c'était une erreur — instructive.** Le comparatif la cochait
« ✓ ✓ ✓ » sur la lisibilité de la série ; le rendu contredit la case. Quatre cellules égales dans les
234 px utiles d'une carte de landing, moins trois gouttières, font **55 px de côté** — 49 px au
méga-menu. À cette taille un bijou n'est plus une pièce mais une pastille de couleur, et la carte
devient une légende surmontée d'un bandeau décoratif. Le second motif est de marque : le risque que
S3 déclare elle-même — « la tiédeur » — est le mode d'échec que le lexique interdit nommément
(« jamais tiède » ; « c'est la **sobriété** qui doit se justifier »). Une direction dont le risque
déclaré est l'échec nommé de la marque ne peut pas être la recommandation par défaut.

**Pourquoi S2 l'emporte.** Elle ne ressemble à aucune carte produit — la superposition est un geste,
pas une grille —, elle mobilise deux principes nommés du lexique, et elle est la seule des quatre à
n'emprunter **aucune forme** au décor du premier écran : le présentoir dépense déjà la grappe, la
goutte et le cabochon peint, quand la pile ne parle que de papier photo. Son coût est réel et assumé :
à l'échelle d'une carte, le chevauchement est plus serré qu'à pleine largeur (cf. le tableau
d'empreinte de `collections-card.tsx`), et elle ne tient pas à 219 px — d'où le bento conservé au
méga-menu.

## 6. La couleur : un accent par collection

C'est le seul levier de polychromie tokenisé du dépôt, et une grille de collections est la surface où
il se lit le mieux.

- **L'accent est dérivé du slug**, pas saisi : `accentForSlug` / `dataAccentForSlug`
  (`modules/products/components/catalog-accents.constants.ts`) somme les unités de code du slug
  (`charCodeAt`, donc de l'UTF-16 — sans conséquence sur des slugs ASCII) et les répartit modulo 4
  sur les accents de marque (rose, lavande, menthe, soleil). Stable — le slug ne change pas, il porte
  l'URL indexée — et sans champ à remplir.
- **Ne jamais introduire un second hash.** La forme `data-accent` **dérive** de `accentForSlug` pour
  que la carte d'une collection et le rail de sa page fille ne puissent pas diverger. C'était le
  défaut relevé en 2026-08-05 : « la carte promet rose, la page fille répond menthe ».
- **`data-accent` se pose sur la racine de la CARTE**, pas sur la section. Posé sur la section, les
  quatre cartes prennent la même teinte et la grille redevient monochrome — l'inverse de l'intention.
  C'est aussi ce qui rend légitime le passage de `var(--section-accent)` à `SquiggleUnderline` : la
  variable se résout sur le `[data-accent]` **le plus proche**, donc sur la carte.
- **Ces accents sont des APLATS, jamais de l'encre.** Sur `--background` aucun des quatre ne dépasse
  2,63:1 : un nom de collection ou un chiffre peint en accent est illisible. Les surfaces
  disponibles, du plus léger au plus marqué : `--section-soft` (5 %, **6 % pour `sun`** — le jaune
  disparaît à 5 %, et le commentaire du fichier annonce encore « 5 % » pour les quatre),
  `--section-wash` (10 %), `--section-wash-strong` (18 %), `--section-band` (une bande pleine
  largeur, alphas volontairement inégaux car normalisés en ΔE : rose 18 %, sun 16 %, mint 12 %,
  lavender 11 % — cf. `app/styles/section-accents.css` et `section-band-contrast`). Le texte reste
  `--foreground` / `--muted-foreground`.
- **Le rose est l'ancre, pas la couleur de la grille.** Quatre cartes roses côte à côte ont manqué le
  brief : la polychromie de la marque se joue par la **rotation** d'accents. Si le rose doit être
  **lu** (et non vu), c'est `--color-brand-rose-strong`, le seul rose qui porte de l'encre.

## 7. Les états

| État                       | Condition                                                 | Affichage recommandé                                                                             |
| -------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| **Nominal**                | ≥ 2 visuels, compteur > 0                                 | la hiérarchie du § 4                                                                             |
| **Sans photo**             | produits publiés, mais aucun SKU actif avec média `IMAGE` | note d'atelier `CHAPTER_EMPTY_NOTE_NO_PHOTO` (« photos en chemin… »), **le compteur reste vrai** |
| **Sans produit publié**    | `_count.products === 0`                                   | `PRODUCT_COUNT_EMPTY` (« Bientôt ») + note `CHAPTER_EMPTY_NOTE` (« encore sur l'établi… »)       |
| **Survol / focus clavier** | —                                                         | strictement la même révélation dans les deux cas (§ 8)                                           |
| **Chargement**             | frontière `Suspense`                                      | squelette aux **dimensions mesurées** du rendu réel                                              |

```
NOMINAL                 SANS PHOTO              SANS PRODUIT PUBLIÉ
┌────────────────────┐  ┌────────────────────┐  ┌────────────────────┐
│ ┌──┐┌──┐┌──┐┌──┐   │  │ ┌ ─ ─ ─ ─ ─ ─ ─ ┐  │  │ ┌ ─ ─ ─ ─ ─ ─ ─ ┐  │
│ │▓▓││▓▓││▓▓││▓▓│   │  │                    │  │                    │
│ └──┘└──┘└──┘└──┘   │  │   photos en        │  │   encore sur       │
│                    │  │   chemin…          │  │   l'établi…        │
│                    │  │ └ ─ ─ ─ ─ ─ ─ ─ ┘  │  │ └ ─ ─ ─ ─ ─ ─ ─ ┘  │
├────────────────────┤  ├────────────────────┤  ├────────────────────┤
│ Pluie de printemps │  │ Pluie de printemps │  │ Pluie de printemps │
│ 12 créations       │  │ 12 créations       │  │ Bientôt            │
│ À partir de 14 €   │  │ À partir de 14 €   │  │ —                  │
└────────────────────┘  └────────────────────┘  └────────────────────┘
                        le compteur reste       PRODUCT_COUNT_EMPTY,
                        VRAI — la note ne le    et pas de fourchette
                        contredit pas           (aucun SKU actif)
```

**Lecture de la planche.** Les deux états vides ont deux libellés **parce que** la note ne doit jamais
contredire le compteur. Le milieu est le cas subtil : la collection a bien douze créations publiées,
elles n'ont simplement pas encore de photo — le compteur reste donc vrai, et seule la zone média
change de langage. C'est la différence entre « il n'y a rien » et « il n'y a pas encore d'image ».

Trois pièges déjà payés :

- **La note ne doit jamais contredire le compteur.** Afficher « 12 créations » au-dessus de « encore
  sur l'établi… » s'est produit : les deux états ci-dessus sont distincts et ont deux libellés
  distincts pour cette raison.
- **Pas de placeholder gris ni d'icône d'image cassée.** L'état vide est le seul moment où la surface
  n'a aucun geste artisanal si on la laisse par défaut ; le mot d'atelier en manuscrite décorative
  (`aria-hidden`) dans un cadre en pointillé est le langage retenu.
- **Le squelette ne se mesure pas : il CONSOMME la géométrie du rendu réel.** « Mesurer » est ce
  qu'on croyait suffire, et ça ne l'était pas — un squelette de chapitre a réservé 112 px pour
  ~202 px de contenu (description sur 4 lignes annoncée sur une, trait dessiné non réservé, `gap-3`
  contre des marges), soit ~90 px de saut par bande au swap du `<Suspense>`. Le correctif n'est pas
  un nombre plus juste, c'est un **contrat** : la géométrie est exportée du composant réel
  (`CHAPTER_TEXT_RESERVES`, `CHAPTER_PRINT_ROTATIONS` dans `collection-chapter.tsx`) et le squelette
  la consomme au lieu de la recopier. Chaque réserve est le **produit `font-size × line-height`** de
  l'élément réel, recalculé depuis la source par
  `modules/collections/components/__tests__/collection-skeleton-parity.regression.test.ts` — c'est ce
  qui empêche le contrat d'être tautologique. Le volet mesuré vit dans `e2e/performance.spec.ts`.

Il n'y a pas d'état « hors ligne » à dessiner : le refus de la PWA est définitif (2026-07-26).

## 8. Accessibilité

- **Un seul lien par carte**, étiré depuis le nom (`::after` couvrant la carte). Les vignettes ne
  sont **pas** des liens : elles pointeraient vers la même URL et multiplieraient les cibles
  identiques dans l'arbre d'accessibilité.
- **`alt=""` sur les visuels empruntés.** Ils illustrent la collection, ils ne la nomment pas — le
  nom du lien porte déjà l'information. Un `alt` par vignette produirait quatre descriptions
  successives de bijoux avant d'atteindre le nom de la collection.
- **Le compteur et la fourchette sont du TEXTE**, pas une pastille de couleur ni un badge seul
  (WCAG 1.4.1 : un état qui ne se distingue que par la couleur n'existe pas).
- **Survol ⇒ focus, sans exception** (WCAG 2.4.7). Toute affordance révélée au survol l'est au focus
  clavier, et la règle de focus ne se met **jamais** derrière `can-hover:` — c'est le **masquage**
  qu'on gate, pas la révélation, sinon l'élément reste cliquable en `opacity-0` sur iPad. Parité
  verrouillée par `shared/components/__tests__/hover-focus-parity.regression.test.ts`.
- **Pas de cue tactile de compensation** : l'absence de survol sur tactile est assumée (refus du
  2026-08-05) — le trait reste hover/focus seulement.
- **Structure de liste** : les cartes sont des `<li>` dans un `<ul>` nommé (`aria-label`), pour que
  le nombre de collections soit annoncé.

## 9. Images et budget

- **`pickPrimaryImage()`** (`modules/products/services/product-display.service.ts`) ou
  `extractCollectionImages` — **jamais** `find((i) => i.isPrimary) ?? images[0]`. Cette expression a
  déjà mis un `.mp4` dans un `<Image src>` et dans un `og:image` : vignette cassée **et**
  transformation `/_next/image` facturée. Quand elle rend `null`, l'appelant **omet** le champ.
- **`sizes` en px au-delà du plafond de conteneur.** Le storefront plafonne à `max-w-6xl` : au-delà,
  la carte ne grandit plus, alors qu'un `sizes` en `vw` continue de croître avec le viewport (`33vw`
  = 634 px à 1920 px pour une image qui en fait 165). L'arithmétique complète de
  `COLLECTION_IMAGE_SIZES_CARD` (`modules/collections/constants/image-sizes.constants.ts`) est le
  modèle à suivre pour toute nouvelle déclaration.
- **`quality` explicite** (`IMAGE_QUALITY`, `modules/media/constants/image-config.constants.ts`) : le
  défaut 75 n'existe pas dans `qualities: [65, 80]` et se résout aujourd'hui par arithmétique — un
  palier ajouté un jour ferait basculer les vignettes en silence, en facturant une variante de plus
  par source. Des vignettes de collection sont du domaine `THUMBNAIL` (65) — **à une exception
  près** : l'image de tête du bento du méga-menu passe en `STANDARD` (80) via
  `COLLECTION_IMAGE_QUALITY`, parce qu'elle est la seule vignette de collection assez grande pour que
  la compression se voie. Une composition qui promeut une cellule au rang d'image principale hérite
  de cet arbitrage ; une composition à cellules égales (§ 5, S3) reste entièrement en `THUMBNAIL`.
- **Un seul candidat LCP par page.** `preload` et `fetchPriority="high"` forment une **paire
  indissociable** et ne se posent que sur une seule image : `preload` seul donne un préchargement en
  priorité basse, et quatre images prioritaires se disputent la bande passante en 4G.
- ⚠️ **Le `take` du select est PARTAGÉ.** `COLLECTION_CHAPTER_PRINT_COUNT + 1` alimente à la fois les
  tirages de `/collections` et le bento du méga-menu. C'est donc un plafond **dur de 4 visuels** par
  carte, et le baisser casse le bento en silence.
- **Le coût croît avec le nombre de vignettes** : 4 visuels × 4 cartes = 16 sources transformées pour
  une seule section. Corollaire : vignettes petites (≤ 180 px, largeurs **fixes** par palier plutôt
  que fluides), et **pas de seconde image révélée au survol** par vignette — le calque secondaire de
  la carte produit se justifie sur une photo unique, pas multiplié par quatre.

## 10. Les trois contextes

| Surface                               | Emplacement                                   | Contrainte de place                                                    |
| ------------------------------------- | --------------------------------------------- | ---------------------------------------------------------------------- |
| **Landing** (« Choisis ton univers ») | `app/(shop)/(home)/_components/collections/`  | grille 2 colonnes en mobile, 4 à `lg` ; ~250 px par carte ; 4 cartes   |
| **`/collections`**                    | `modules/collections/components/collection-*` | bandes pleine largeur ; tirages à largeurs **fixes** 96 / 120 / 180 px |
| **Méga-menu desktop**                 | `app/(shop)/(home)/_components/navbar/`       | **~215 px** par carte ; survol seulement, pas de lecture longue        |

⚠️ **Les ~215 px du méga-menu se lisent sur le composant, pas sur le JSDoc de
`modules/collections/constants/image-sizes.constants.ts`**, qui annonce encore ~263 px : ce chiffre
suppose quatre colonnes, alors que le panneau en fait **trois** au plus (`grid-cols-3`, et
`getNavbarMenuData` demande `perPage: 3`). C'est la valeur périmée qui a été recopiée ici jusqu'à
l'audit du 2026-08-06 — quand deux sources se contredisent, celle qui rend fait foi.

**Ce qui ne varie jamais** : la hiérarchie du § 4, le vocabulaire (« créations », « À partir de »),
l'accent dérivé du slug, le lien unique, l'ordre `isFeatured` des visuels.

**Ce qui a le droit de varier** : le nombre de visuels (le plafond est dur à 4, cf. § 9 ; le plancher
est 2), la présence de la description, et l'orientation de la composition.

⚠️ **Ne pas déduire ces variations du code : elles ne suivent pas l'intuition.** C'est le méga-menu
qui montre **4** visuels et la seule des trois surfaces à afficher une description ; la landing en
montre **3** (depuis l'adoption de S2 le 2026-08-06) et aucune description. L'intuition « le menu est
petit, donc il en montre moins » était écrite ici et était fausse. Le détail chiffré est au § 11.

## 11. L'écart avec l'implémentation, chiffré

Le préambule le dit : ce document ne prend pas le code pour référence. Il doit en revanche **mesurer**
la distance, sans quoi la doctrine n'est pas actionnable et personne ne sait ce qui reste à faire.
Relevé du 2026-08-06, sur les sept exigences vérifiables du § 4 et du § 5.

| Exigence                        | Landing (`collections-card.tsx`) | `/collections` (`collection-chapter.tsx`) | Méga-menu (`mega-menu-collections.tsx`) |
| ------------------------------- | -------------------------------- | ----------------------------------------- | --------------------------------------- |
| ≥ 2 visuels (§ 3)               | ✓ 3 (S2)                         | ✓ 3                                       | ✓ 4                                     |
| Nom `font-display` + lien seul  | ✓                                | ✓                                         | ✗ **`text-sm` nu**                      |
| Compteur (§ 4.3)                | ✓                                | ✓                                         | ✗ **absent**                            |
| Fourchette d'entrée (§ 4.4)     | ✓                                | ✓                                         | ✗ **absente**                           |
| Description (§ 4.5, facult.)    | ✗ absente                        | ✓ `line-clamp-3`                          | ✓ `line-clamp-1`                        |
| Pas la géométrie polaroid (§ 5) | ✓ pile décalée                   | ✓ bande + tirages                         | ✓ bento                                 |
| `data-accent` sur la carte(§ 6) | ✓                                | ✓                                         | ✓                                       |
| **Conformité**                  | **6 / 7**                        | **6 / 7**                                 | **3 / 7**                               |

**Lecture du tableau.** La surface la plus visible est la moins conforme, et pas par négligence : la
carte de la landing reprend délibérément `CARD_SURFACE_POLAROID` avec un **média carré unique**,
arbitrage acté par `docs/LANDING-SECTION-COLLECTIONS.md` **avant** que ce document existe. Le § 3
(« au moins deux visuels ») et le § 5 (« ne pas reprendre la géométrie de la carte produit ») le
contredisent tous les deux. C'est donc un désaccord à **trancher**, pas un retard d'implémentation —
et le trancher veut dire choisir entre adopter une silhouette du § 5 ou amender ce document.

Les trois écarts n'ont pas la même nature, et c'est ce qui décide de l'ordre :

- **Landing, 1 visuel** — désaccord de doctrine. Le payload porte déjà jusqu'à 4 visuels
  (`extractCollectionImages` en rend autant que le `take` du select), donc rien ne manque
  techniquement : c'est une décision à prendre, et la S3 du § 5 est la proposition.
- **Méga-menu, ni compteur ni fourchette** — manque de **données**, pas de design. `NavItemChild`
  (`shared/constants/navigation.ts`) ne transporte ni `_count` ni fourchette ; l'exigence est donc
  suspendue jusqu'à ce que ce type soit étendu (§ 4, note ★). Ne pas « corriger » la carte sans
  toucher au payload : il n'y a rien à afficher.
- **Landing, pas de description** — sans conséquence. Le § 4.5 la donne pour facultative, et la
  contrainte de place à 250 px la rend peu utile. À laisser tel quel.

⚠️ **Ce tableau se périme.** Il porte une date pour ça. Le relever à nouveau coûte trois `grep` — le
nombre de visuels se lit sur l'appel à `extractCollectionImages`, le compteur sur
`COLLECTION_TEXTS.PRODUCT_COUNT`, la fourchette sur `PRICING.FROM_LABEL`.

## 12. Ce qu'il ne faut PAS faire

Chaque ligne a coûté quelque chose ; aucune n'est théorique.

- **Pas de `MaskingTape` par item.** Retiré le 2026-08-05 des quatre surfaces en série (carte
  produit, carte collection, tirages du méga-menu, chapitres) : la répétition saturait le storefront
  de rose. Le ruban est réservé aux accents **uniques** d'une surface.
- **Pas de prix dérivé du payload de la liste.** Il ne porte que 4 produits, sur leur SKU par défaut :
  une collection de vingt bijoux affichait un prix d'entrée **supérieur** au vrai, republié tel quel
  en `AggregateOffer`. La SSOT est `getCollectionPriceRanges`, agrégée sur tous les produits publiés
  et tous leurs SKUs actifs. `extractPriceRange` a été supprimé pour cette raison — ne pas le
  réintroduire sous un autre nom.
- **Pas de désaturation, pas de gris de séparation.** La couleur **est** l'argument de ces bijoux ;
  `grayscale` ou `saturate-*` est le contre-pied du brief, y compris pour un état inactif (un voile
  `bg-card` baisse la présence en conservant la teinte). Le `bg-muted` de séparation a par ailleurs
  déjà été refusé ailleurs sur le storefront.
- **Pas de préfixe « Collection · », pas de « · fait main ».** Retirés le même jour de deux cartes :
  une mention vraie de toutes les cartes ne discrimine rien et mange la ligne la plus contrainte.
- **Pas de cue tactile** pour compenser l'absence de survol (refus du 2026-08-05).
- **Pas d'`isFeatured` sur `Collection`** : refus assumé. Le choix des collections **affichées** est
  mécanique ; seul le produit **vitrine** d'une collection est éditorial (§ 3, corollaire B).
- **Aucun JSON-LD émis par la carte.** Il n'y a qu'une `ItemList` et qu'une `BreadcrumbList` par URL,
  et elles appartiennent à l'émetteur page-level. Verrouillé par
  `shared/components/__tests__/catalogue-single-breadcrumb.regression.test.ts`.
- **Aucune couleur de token dans une prop d'animation Motion** (`animate`, `initial`, `exit`,
  `while*`, objets `*Variants`) : tous nos tokens sont des `oklch()`, que Motion ne sait pas
  interpoler — la couleur **saute à la frame 1** et le défaut ne se voit qu'en console (et sous le
  nom `lab(…)`, pas `oklch`). Le correctif est de superposer des tracés aux couleurs statiques et
  d'animer leur `opacity`.
- **Une liste de transition qui nomme `translate,rotate`, jamais `transform`.** En Tailwind v4,
  `-translate-y-1` et `rotate-1` alimentent les propriétés CSS **autonomes** `translate` et `rotate` :
  une liste qui ne déclare que `transform` fait sauter le mouvement à la frame 1 pendant que
  l'ombre s'anime correctement. Dette connue sur une quarantaine de sites.
- **Pas de `<SheetClose>` / `<DrawerClose>` autour d'un `<Link>`** si la carte vit dans un panneau
  (méga-menu mobile) : `history.back()` annule le `router.push`, sans erreur visible.
- **`render`, jamais `asChild`** ; `data-open:`, jamais `data-[state=open]:` ; icônes Phosphor via
  `@phosphor-icons/react/ssr` avec `weight`, jamais `strokeWidth`.

## 13. Les données disponibles

| Donnée                    | Source exacte                                               | Garde                                                                            |
| ------------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Nom                       | `Collection.name` — `VarChar(100)`, unique                  | tient sur 2 lignes au pire ; ne jamais tronquer à 1 ligne sans clamp             |
| Lien                      | `Collection.slug` — `VarChar(100)`, unique                  | porte aussi l'accent (§ 6) et l'URL indexée : ne se recalcule pas                |
| Description               | `Collection.description` — `Text`, **nullable, sans borne** | clamp obligatoire ; la carte doit survivre à une description vide comme à 900 c. |
| Visuels (≤ 4)             | `extractCollectionImages(collection.products)`              | dédupliqués par produit ; peut rendre `[]` — état prévu (§ 7)                    |
| Produit vitrine           | `ProductCollection.isFeatured` via l'`orderBy` du select    | c'est le premier visuel, toujours                                                |
| Compteur                  | `_count.products` (filtré `PUBLIC` + `deletedAt: null`)     | libellé par `COLLECTION_TEXTS.PRODUCT_COUNT`                                     |
| Fourchette + `offerCount` | `getCollectionPriceRanges(ids)` — centimes                  | **une** requête agrégée pour toute la grille, jamais un fetch par carte          |

**Ce qui n'existe pas en base**, et qu'il ne faut donc pas dessiner : image propre à la collection,
couleur propre, ordre d'affichage éditorial des collections, mise en avant d'une collection, compteur
de vues, date de « nouveauté ». Une carte qui les suppose demande une migration Prisma **et** un
champ de plus à remplir pour une opératrice unique — c'est un chantier, pas un détail de carte.

⚠️ **Toute nouvelle donnée passe par un `select` de `modules/collections/constants/collection.constants.ts`.**
Jamais un `select` en ligne dans une fonction `data/` : un select invisible rate les migrations de
schéma, et `tsc` accepte silencieusement une clé inexistante dans un `select` — seul
`catalogue-selects-schema-validity.regression.test.ts` l'attrape.

## 14. Passer de ce document à une carte

Ce document dit la **cible**, pas la maquette. Le passage de relais est câblé :
`docs/prompts/DESIGN-ARTIFACT-PROMPT.md` produit les directions dessinées, puis
`docs/prompts/REDESIGN-PROMPT.md` les implémente. Les silhouettes du § 5 sont des **candidates
d'entrée** pour ce pipeline, pas des maquettes validées — elles disent la géométrie, pas les
proportions, ni les gouttières, ni le rendu réel.

Check-list de conformité d'une carte collection, à cocher sur la surface qu'on touche :

- [ ] **2 à 4 visuels**, jamais un seul — § 3
- [ ] Le **premier visuel** est celui de l'`orderBy` `isFeatured` du select, jamais un tri par date
      brute ni un tirage au sort — § 3, corollaire B
- [ ] `alt=""` sur chaque visuel, et **un seul lien** dans la carte — § 8
- [ ] **Compteur** en « créations », partout où le payload le porte — § 4.3
- [ ] **Fourchette** issue de `getCollectionPriceRanges`, jamais dérivée du payload de liste — § 4.4
- [ ] `data-accent` sur la **racine de la carte**, pas sur la section — § 6
- [ ] Les deux **états vides** ont leur libellé propre, et la note ne contredit pas le compteur — § 7
- [ ] Le **squelette consomme** la géométrie exportée du composant réel, il ne la recopie pas — § 7
- [ ] `sizes` à queue en **px** au-delà du plafond de conteneur, `quality` explicite — § 9
- [ ] La liste de transition nomme **`translate,rotate`**, jamais `transform` — § 12

## 15. Non vérifié, dit franchement

Ce qui n'a **pas** été observé au moment de l'audit du 2026-08-06, pour que personne ne le prenne
pour acquis :

- ~~**Aucune des quatre silhouettes du § 5 n'a été rendue en navigateur.**~~ **Levé le 2026-08-06** :
  les quatre ont été maquettées et mesurées, et le rendu a contredit une case du comparatif (cf. § 5).
  Enseignement à garder : les colonnes « tient à ~250 px / ~215 px » étaient des **déductions
  arithmétiques**, et l'arithmétique oubliait la rotation — la pile mesure ~2 px de plus que
  `3 × cadre − 2 × chevauchement`. Mesurer, ne pas dériver.
- **Le coût réel des variantes `/_next/image`** n'a pas été mesuré : « 16 sources par section » (§ 9)
  compte des sources, pas des transformations facturées — une même photo partagée par deux
  collections ne se transforme qu'une fois par `sizes` distinct.
- **Le rendu des états vides sur une vraie base** n'a pas été vu : le jeu de démonstration
  (`prisma/seed.ts`) n'est pas la DA, et aucune collection publiée sans photo n'a été observée.
- **La conformité du § 11 a été relevée par lecture de code**, pas par capture d'écran. Les comptes
  de visuels (1 / 3 / 4) sont sûrs — ils se lisent sur un `slice` — mais l'effet visuel qu'ils
  produisent côte à côte sur la landing n'a pas été jugé sur pièce.
