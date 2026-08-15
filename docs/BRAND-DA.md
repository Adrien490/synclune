# BRAND-DA.md — Direction artistique, le lexique complet

> **Provenance** : direction artistique dictée par Léane le 2026-08-06, reconstruite depuis la
> boutique Etsy réelle (ses univers : Grands raisins, Mini raisins, Tableaux, Enfance, Pluie, Nuit
> étoilée, Nénuphar, Personnalisation, Arc-en-ciel). C'est cette architecture de boutique qui révèle
> la DA — pas la page d'accueil actuelle du site, ni le catalogue de démonstration (cf. § Les mots à
> ne PAS mettre au centre).
>
> **Ce document est du vocabulaire, pas une charte technique.** Il dit ce que la marque EST et avec
> quels mots en parler. Les tokens, composants et règles d'implémentation restent régis par
> `CLAUDE.md` § Conventions UI ; le résumé opérationnel — celui qui
> change un arbitrage de design — vit dans `CLAUDE.md` § « Direction artistique — lexique de
> marque ». Ici, le détail.
>
> **Un verrou tient ce document honnête.**
> `test/contract/brand-lexicon.contract.test.ts` applique son lexique aux surfaces d'identité du
> code (cf. § Où vit la copie de marque dans le code). ⚠️ Le second verrou,
> `test/contract/claude-md-accuracy.contract.test.ts` — qui vérifiait les affirmations mécaniques
> de ce fichier (chemins cités, sections de `CLAUDE.md` référencées, exports nommés) — a été
> supprimé au lot 0 de la migration lean (2026-08-14) : il serait devenu menteur dès le lot
> suivant. Les chemins cités ici ne sont donc plus vérifiés par personne jusqu'au lot 9
> (cf. `docs/MIGRATION-PROMPTS.md`). Dernière synchronisation manuelle avec le
> dépôt : 2026-08-08.

## Sommaire

L'ADN en une phrase · Les six territoires artistiques · Le vocabulaire des formes · Matières et
sensations visuelles · La palette chromatique · Maximalisme miniature et joyeux · Le registre
stylistique · Le nom des pièces · L'univers photographique · Le ton éditorial · Où vit la copie de
marque dans le code · Les valeurs de marque implicites · Les adjectifs, par monde · Les mots à ne
PAS mettre au centre · Les symboles identitaires, par potentiel distinctif · Le logo ·
Territoires de moodboard · Répertoire de mots-clés et expressions SEO.

## L'ADN en une phrase

**Des bijoux-sculptures miniatures, colorés et narratifs, entre jardin fantastique, ciel étoilé,
peinture naïve et souvenirs d'enfance.**

Synclune n'est pas seulement une marque de bijoux artisanaux : c'est un **univers de petits objets
merveilleux à porter**, construit sur la couleur, la lumière, le mouvement, l'accumulation et
l'imaginaire.

Deux formulations de référence, à préférer aux anciennes :

- **Longue** — « Synclune crée à Nantes des bijoux miniatures, colorés et expressifs, inspirés par
  les fruits, la pluie, les tableaux, le ciel et les souvenirs d'enfance. Peintes ou assemblées à la
  main, ses créations transforment gouttes de verre, couleurs et petits motifs en objets merveilleux
  à porter. »
- **Courte** — « **Des petits mondes colorés à porter.** »

⚠️ **Ce qui a été retiré et pourquoi.** « Des bijoux artisanaux, colorés et poétiques » (et sa
variante « Création artisanale de bijoux colorés, originaux et poétiques ») est **juste mais
interchangeable** : n'importe quelle boutique de bijoux peut la signer. Le noyau lexical à défendre
est désormais **couleur (polychromie) + goutte + récit + fait main + miniature + Nantes**. Ce
retrait est APPLIQUÉ, pas seulement conseillé : `test/contract/brand-lexicon.contract.test.ts`
échoue si une formule interchangeable (« avec amour », « colorés et poétiques », « occasions
spéciales »…) revient dans une surface d'identité.

## Les six territoires artistiques

Ce sont les six mondes d'où sortent les pièces. Ils ne sont pas des « thèmes de collection
marketing » : ils sont lisibles dans les noms des bijoux existants (Green Grape Necklace, Starry
Night Ring, Rainbow Drop Necklace, Orange Grape Curls, Water Lilies, Rain Loops).

### A. Le jardin fantastique

Le territoire le plus reconnaissable de Synclune.

- **Motifs** : raisins, grappes, feuilles, fruits, fleurs, tournesols, nénuphars, jardin,
  végétation, pétales, baies, vigne, nature miniature.
- **Mots-clés** : fruité · botanique · organique · végétal · luxuriant · gourmand · juteux · floral ·
  jardin imaginaire · nature fantastique · serre enchantée · fruits précieux · grappe sculpturale ·
  herbier pop · végétation miniature.

Les raisins ne sont **jamais** traités de façon réaliste ou rustique : ce sont des **grappes de
lumière**, faites de gouttes translucides assemblées en volume. Les feuilles vertes servent de
ponctuation figurative — c'est elles qui rendent le motif immédiatement lisible.

### B. Le ciel cosmique et nocturne

Le nom même de la marque contient la lune, et la collection Nuit étoilée installe l'imaginaire.

- **Motifs** : lune, phases de la lune, étoiles, ciel nocturne, crépuscule, constellation,
  tourbillons, halos, soleil, lumière dans la nuit, paysages nocturnes.
- **Mots-clés** : céleste · lunaire · cosmique · astral · nocturne · étoilé · onirique · mystérieux ·
  crépusculaire · galaxie miniature · nuit enchantée · ciel peint · lumière astrale · talisman
  céleste.

La bague inspirée de _La Nuit étoilée_ ramène une scène picturale entière — ciel tourbillonnant,
architecture, profondeur — dans un petit cabochon ovale : un **tableau portable**.

### C. L'arc-en-ciel liquide

L'arc-en-ciel n'est pas un motif graphique plaqué : il est **matérialisé par des gouttes
translucides en séquence**.

- **Mots-clés** : arc-en-ciel · spectre chromatique · dégradé · multicolore · couleur liquide ·
  rivière de couleurs · gouttes de lumière · bonbons translucides · verre coloré · chromatisme
  joyeux · accumulation colorée · palette kaléidoscopique.

Le collier Arc-en-ciel tient par la **répétition** de petites gouttes et l'alternance souple
rose → orange → jaune → vert → turquoise → bleu → violet. La chaîne dorée apporte une structure
chaude sans neutraliser les couleurs.

### D. La pluie, l'eau et les larmes joyeuses

La goutte est une **forme-signature** (cf. § Les symboles identitaires).

- **Registres** : goutte de pluie · larme · rosée · eau · ruissellement · cascade · rivière ·
  mouvement · pendule · perle liquide · éclaboussure · pluie magique.

Dans les boucles _Raindrops – Eyes_, des yeux peints sont prolongés de gouttes bleues et violettes
suspendues à des hauteurs différentes. L'objet se tient entre le bijou, le dessin animé, l'ex-voto
et le petit **mobile cinétique**.

### E. La peinture miniature

L'axe **le plus distinctif** de la marque — bien plus que « bijou fait main », qui ne distingue rien.

- **Mots-clés** : tableau à porter · peinture miniature · cabochon peint · bijou pictural ·
  micro-paysage · art portable · œuvre miniature · peinture naïve · touche visible · motif peint à
  la main · petit tableau · bijou d'artiste.

Les créations peintes convoquent Van Gogh, les Nymphéas, les tourbillons, le paysage, le soleil, les
aplats et les tracés **laissés visibles**. Les pièces sont dessinées, peintes, cuites, puis
assemblées une à une.

### F. L'enfance et l'objet affectif

La collection Enfance, les yeux illustrés, les couleurs franches, le petit présentoir jaune décoré
d'un chiffre 5 : un registre très personnel.

- **Mots-clés** : enfance · souvenir · nostalgie joyeuse · dessin naïf · jouet · breloque ·
  porte-bonheur · objet trouvé · trésor d'enfance · collection personnelle · boîte à bijoux ·
  imaginaire enfantin · spontanéité · innocence · fantaisie domestique.

⚠️ **Ce n'est pas une esthétique « enfantine »** au sens d'un produit pour enfants. C'est une
**réactivation adulte de la liberté graphique de l'enfance** : yeux surdimensionnés, couleurs
primaires, petits symboles, formes immédiatement identifiables, et **aucune peur du « trop »**.

## Le vocabulaire des formes

- **Formes récurrentes** : goutte · larme · grappe · amas · bouquet · feuille · pétale · œil · cil ·
  cabochon ovale · cabochon rond · médaillon · boucle · anneau · créole · pendentif · pampille ·
  frange · cascade · chaîne · ruban · cercle · halo · spirale · tourbillon · vague · rayon ·
  constellation.
- **Principes de composition** : répétition · accumulation · série · dégradé · symétrie imparfaite ·
  pendaison · superposition · assemblage · multiplication · variation · rythme · mouvement ·
  balancement · effet de grappe · effet de frange · effet de rivière.

**La DA repose sur la multiplication de petits éléments**, jamais sur une grosse pierre centrale ni
sur une forme métallique minimaliste. C'est le principe le plus transposable à l'interface : une
série, une cadence, une variation — pas un gros bloc unique.

## Matières et sensations visuelles

- **Matières réelles** : perles de verre · verre coloré · résine · acrylique · plastique · plastique
  fou · acier inoxydable · chaîne métallique · tissu · ruban effet velours · peinture · cabochon ·
  petites breloques · feuilles translucides.
- **Textures** : transparent · translucide · brillant · irisé · nacré · pailleté · glossy · poli ·
  lisse · bombé · vitré · velouté · satiné · métallique · peint · texturé à la main.
- **Effets lumineux** : reflet · scintillement · transparence colorée · lumière traversante ·
  brillance humide · éclat de verre · iridescence · luminosité sucrée · effet gemme · effet bonbon ·
  éclat solaire · miroitement.

Les gouttes orange photographiées au soleil deviennent presque lumineuses : elles évoquent à la fois
le verre soufflé, le sirop, le bonbon et la petite pierre précieuse — **sans jamais chercher à
imiter la joaillerie**.

⚠️ **Deux gardes, dans deux directions opposées :**

- **« Uniquement quand c'est vrai pour la pièce. »** Une matière ou une texture ne se pose sur une
  fiche produit que si le bijou la porte réellement. C'est du vocabulaire, pas un habillage.
- **Irisé, pailleté, translucide décrivent les BIJOUX, jamais l'interface.** Traduits en paillettes,
  en verre dépoli ou en dégradé nacré dans l'UI, ils retombent dans le décoratif gratuit (limite
  déjà posée dans `docs/prompts/DESIGN-ARTIFACT-PROMPT.md`).

## La palette chromatique

- **Dominantes** : rose bonbon · rose poudré · magenta · fuchsia · rouge cerise · orange mandarine ·
  orange sanguine · jaune citron · jaune soleil · vert pomme · vert feuille · vert bouteille ·
  turquoise · cyan · bleu ciel · bleu cobalt · bleu nuit · lilas · violet · prune.
- **Couleurs de structure** : doré chaud · argenté · rose gold · noir velours · vert sombre.
- **Type de palette** : saturée · franche · **polychrome** · chaude et froide simultanément ·
  contrastée · sucrée · lumineuse · joyeuse · non naturaliste · parfois irisée.

Elle ne repose **pas** sur des neutres sophistiqués ni sur des couleurs terreuses. Même quand un
vert sombre apparaît, il est employé avec un rose poussiéreux ou un doré très visible.

**Combinaisons particulièrement Synclune** :

| Combinaison                                      | Registre              |
| ------------------------------------------------ | --------------------- |
| Orange translucide + vert feuille + doré         | jardin fruité, grappe |
| Vert irisé + noir velours + rose poudré          | nuit, écrin           |
| Bleu cobalt + blanc + vert + doré                | ciel peint, tableau   |
| Rose fuchsia + jaune soleil + touches pailletées | pop, dopamine         |
| Arc-en-ciel translucide + chaîne dorée           | rivière de gouttes    |
| Bleu turquoise + violet + blanc + doré           | pluie, eau            |

⚠️ **Pont vers le code — ne pas confondre les deux palettes.** Celle ci-dessus décrit **les
bijoux** ; l'interface, elle, n'a que **quatre accents tokenisés** : `--primary` (le rose de marque),
`--color-brand-lavender`, `--color-brand-mint`, `--color-brand-sun`, exposés par section via
`[data-accent="rose|lavender|mint|sun"]` (`app/styles/section-accents.css`, valeurs dans
`app/globals.css`). **Ne pas créer un token par couleur de bijou** : le critère d'admission des
variables CSS (≥ 2 consommateurs, ou coordination JS ↔ CSS, ou test qui la verrouille) est dans
`CLAUDE.md` § Conventions UI. La polychromie de la DA se joue donc par la **rotation des accents
d'une section à l'autre** et par la couleur des visuels produits — pas par vingt variables.

⚠️ **Troisième garde, chromatique : le pastel de marque ne porte pas de glyphe.** À 1,5–2,5:1 de
contraste, lavande, menthe et soleil peignent des aplats, des traits et des motifs — ils n'écrivent
pas (WCAG). « Écrire en couleur » est le premier réflexe qu'un lexique polychrome déclenche, et
c'est la transposition la plus souvent ratée ; quand le rose doit être LU et pas seulement vu,
c'est `--color-brand-rose-strong` (la version encre) qui écrit.

## Maximalisme miniature et joyeux

Synclune n'est pas minimaliste. Mais ce n'est pas non plus un maximalisme baroque ou luxueux. Le bon
terme est **maximalisme miniature et joyeux** : les pièces cumulent gouttes, couleurs, feuilles,
motifs peints et chaînes pendantes **tout en gardant une échelle portable**. Le bijou est visible,
mobile et expressif sans être visuellement lourd.

Mots-clés : statement jewelry · bijou manifeste · bijou conversation · bijou-sculpture ·
maximalisme joyeux · maximalisme romantique · maximalisme miniature · accumulation délicate ·
ornement ludique · pièce expressive.

## Le registre stylistique

**Très proche de la DA** — utilisable sans réserve :
whimsical jewelry · bijoux fantaisie d'artiste · dopamine accessories · bijoux pop · bijoux arty ·
bijoux naïfs · bijoux figuratifs · bijoux narratifs · bijoux sculpturaux · bijoux colorés · bijoux
maximalistes · bijoux ludiques · bijoux inspirés de la nature · bijoux peints à la main.

**Compatible en second niveau** — juste, mais pas au centre :
kitsch chic · camp doux · folk art · craftcore · kidcore adulte · fairycore coloré · romantic
maximalism · surreal jewelry · wearable art · art-to-wear · curiosités contemporaines · cabinet de
merveilles pop.

**Sur certaines pièces seulement** — jamais généralisé à la marque :
art nouveau · céleste · botanique · floral · fruitcore · rainbowcore · vintage fantaisie · rétro ·
psychédélique doux · bohème coloré.

⚠️ La fiche Etsy de la bague Nuit étoilée est classée « Art nouveau » : c'est vrai **de cette
pièce**, et insuffisant pour décrire la marque.

## Le nom des pièces

Les créations portent des noms **anglais** (Green Grape Necklace, Starry Night Ring, Rainbow Drop
Necklace, Rain Loops…) : héritage de la boutique Etsy et de son audience internationale — et
surtout, ces noms fonctionnent comme des **titres d'œuvres**, pas comme des libellés de catalogue.
La coexistence avec un site français-only (`CLAUDE.md` § Conventions : UI text French) se règle
ainsi : le nom propre reste tel quel, tout le reste de la fiche (description, matières, CTA) est en
français et tutoie. Ne pas traduire les noms existants — « Collier Raisin Vert » perdrait le titre
sous lequel la pièce est déjà connue et référencée — et ne pas introduire de nommage français
partiel qui fabriquerait deux registres. ⚠️ Convention **relevée sur l'existant**, pas dictée : à
confirmer avec Léane avant d'en faire une règle de création pour les pièces futures.

## L'univers photographique

La photo produit n'est ni froide ni luxueuse : elle est **vivante, personnelle et domestique**.

- **Supports et décors observés** : buste en velours rose · fond de maison ou d'atelier · jardin
  flouté · lumière naturelle · main tatouée · manucure artistique · oreille en gros plan ·
  présentoir illustré jaune (chiffre 5, formes de cœur et d'étoile) · objets personnels visibles à
  l'arrière-plan.
- **Traitements** : porté · suspendu · en macro · au soleil · sur un buste · dans un environnement
  réel · faible profondeur de champ.
- **Mots-clés** : photo spontanée · lumière du jour · soleil direct · macro bijou · atelier vivant ·
  décor domestique · proximité · authenticité · main de créatrice · peau réelle · mouvement ·
  reflets naturels · douceur rose · arrière-plan flou · mise en scène ludique.

Le **buste rose** revient comme un support presque identitaire. Les mains tatouées et les ongles
décorés prolongent l'idée d'une créatrice au style très affirmé. Le présentoir jaune illustré porte
l'artisanat ludique jusque dans la mise en scène.

⚠️ **Corollaire pour le site** : une **banque d'images générique** est le contre-pied de cet
univers. Les visuels Unsplash du jeu de données de démonstration (`prisma/seed.ts`) ne racontent
personne — ils sont un remplissage de développement, pas une référence photographique.

## Le ton éditorial

Direct · chaleureux · personnel · enthousiaste · accessible · affectueux · informel · généreux —
enthousiaste **sans agressivité commerciale**.

Les descriptions de Léane emploient la **première personne**, des phrases simples, des emojis, et un
répertoire symbolique récurrent : la lune, les fleurs, l'arc-en-ciel, les fruits, les étoiles, les
cœurs (🌙 ✨ 🌈 🍇 🍊 💐 📍 🥰 ❤️). Elle insiste sur l'assemblage manuel, sur Nantes, sur la
personnalisation, et sur la possibilité de lui écrire directement (« c'est moi qui lis, c'est moi qui
réponds »).

⚠️ **Trois gardes de transposition :**

- **Le site tutoie** (`CLAUDE.md` § Voix). Le « je » de Léane reste ; le « vous » ne revient pas.
- **La copie éditoriale historique de l'atelier était intégralement au VOUVOIEMENT.** Si tu en
  récupères une formulation, c'est une réserve de copie, pas un texte prêt à poser : la repasser au
  tutoiement fait partie du travail de reprise.
- **Les emojis d'Etsy ne sont pas un feu vert pour l'UI.** Ils appartiennent à une conversation de
  vendeuse à cliente ; l'interface porte le même registre par le **trait dessiné à la main**
  (`shared/components/hand-drawn/paths.ts`, `shared/components/animations/hand-drawn-accent.tsx` —
  `MaskingTape` a été supprimé le 2026-08-08 avec les derniers rubans en série, ne le cite plus), pas
  par des glyphes de clavier.

## Où vit la copie de marque dans le code

Le pont entre ce lexique et le code : les surfaces où la marque se décrit, scannées par
`test/contract/brand-lexicon.contract.test.ts`. Une dérive y est invisible à l'œil — elle vit dans
les `<meta>`, les nœuds JSON-LD et l'onglet du navigateur, jamais dans l'interface ; c'est là que
six chaînes off-brand ont été trouvées d'un coup (audit du 2026-08-06).

- **Identité** — la marque s'y DÉCRIT ; les mots bannis ET les formules interchangeables y font
  échouer le test : `shared/constants/brand.ts` (`BRAND`), `shared/constants/seo-config.ts`
  (`BUSINESS_INFO` + les trois schémas JSON-LD), `shared/constants/root-metadata.ts` (le repli OG
  hérité par toute page) et les metadata de la home (`app/(shop)/(home)/page.tsx`).
- **Éditorial** — Léane y PARLE, à la première personne ; seuls les mots bannis s'y appliquent :
  `shared/constants/atelier-content.ts` (`ATELIER_STEPS`, `ATELIER_HOWTO`). « Avec amour » y est
  légitime : c'est un geste raconté, pas un positionnement.

Toute nouvelle SSOT de copie de marque se déclare dans `IDENTITY_SURFACES` ou `EDITORIAL_SURFACES`
du test — la FAQ supprimée le 2026-08-08 devra y revenir avec sa refonte, sinon elle se réécrira
sans filet lexical.

## Les valeurs de marque implicites

- **Créativité libre** — la création part d'une couleur, d'un motif, d'un tissu ou d'un rêve, pas
  d'un plan de tendances.
- **Singularité** — petites quantités, pièces peintes ou assemblées une à une, personnalisation
  possible.
- **Proximité** — « c'est moi qui lis, c'est moi qui réponds » : il n'y a qu'elle, et ça se dit.
- **Joie visible** — les avis parlent spontanément de couleur, de lumière, de scintillement et de
  bonheur.
- **Imperfection précieuse** — la valeur vient de la trace humaine, du geste, des variations, du
  non-reproductible ; pas d'une perfection industrielle.

## Les adjectifs, par monde

- **Noyau** : coloré · artisanal · fait main · unique · original · joyeux · ludique · expressif ·
  singulier · lumineux · fantaisiste · pictural · narratif · créatif · audacieux · vivant · mobile ·
  chaleureux · personnel.
- **Monde poétique** : onirique · céleste · lunaire · étoilé · merveilleux · enchanté · rêveur ·
  magique · poétique · imaginaire · mystérieux · contemplatif · délicat · romantique.
- **Monde pop** : pétillant · vitaminé · acidulé · gourmand · sucré · bonbon · fruité · éclatant ·
  funky · rétro · décalé · espiègle · naïf · spontané · exubérant.
- **Monde matériel** : translucide · irisé · pailleté · brillant · glossy · chatoyant · velouté ·
  texturé · suspendu · sculptural · accumulé · assemblé · peint · poli.
- **Monde affectif** : intime · nostalgique · tendre · réconfortant · solaire · généreux · libre ·
  sincère · sensible · attachant · porte-bonheur · mémorable.

⚠️ **Sur « girly ».** Le mot a servi de mot-pivot du lexique jusqu'au 2026-08-06 ; il est depuis
**rétrogradé en registre secondaire** — il décrit une part de la marque (le rose, le tendre, le
bonbon), pas son centre, qui est la **polychromie narrative**. Il n'est pas interdit et reste juste
dans les commentaires de code qui l'emploient
(`modules/media/constants/product-fallback-image.constants.ts`) ; simplement, une direction jugée
« girly » sans être colorée, narrative et un peu décalée ne coche rien. Le garde qui va avec tient
toujours : **girly ≠ mièvre** — c'est le décalé et le naïf assumé qui empêchent le rose de virer
princesse.

## Les mots à ne PAS mettre au centre

Ces termes peuvent décrire une pièce isolée, mais **brouillent l'identité** dès qu'ils deviennent le
cœur du discours :

minimaliste · sobre · discret · intemporel · quiet luxury · classique · épuré · neutre · monochrome ·
joaillerie fine · luxe froid · cérémonie · mariage chic · pierre précieuse · premium · prestige ·
sophistication silencieuse · élégance conventionnelle.

Cette liste est APPLIQUÉE : `test/contract/brand-lexicon.contract.test.ts` scanne les surfaces du
§ Où vit la copie de marque dans le code et échoue sur chacun de ces termes, avec deux
élargissements assumés (« luxe froid » y devient « luxe », « joaillerie fine » y devient
« joaillerie ») et une assertion de parité : un terme ajouté ici sans y être couvert fait échouer
le test.

⚠️ **Le second univers du site n'est PAS la DA.** Le catalogue actuellement en base présente une
gamme beaucoup plus générique — collections Mariage, Fêtes, Best Sellers, pièces en plaqué or, argent,
perles naturelles ou Swarovski, des noms comme « Bague Triple Anneau » ou « Bracelet Tennis Cristal »,
et des visuels issus d'une banque d'images. Cet univers vient du **jeu de données de démonstration**
(`prisma/seed.ts`, ~19 visuels de banque d'images, 2 mentions Swarovski, plusieurs « plaqué or ») : il
ressemble à un catalogue de démo, pas à la boutique de Léane. **Ne jamais s'en servir comme
référence de DA, ni y lire un signal de positionnement.** C'est l'erreur de brief la plus coûteuse du
projet, et elle a déjà produit des propositions à jeter (`CLAUDE.md` § Direction artistique).

## Les symboles identitaires, par potentiel distinctif

Par ordre de distinctivité décroissante :

1. La grappe de raisin translucide
2. La goutte colorée
3. Le petit tableau peint à porter
4. L'œil qui pleure des gouttes de couleur
5. L'arc-en-ciel déconstruit
6. Le ciel étoilé
7. La feuille verte
8. Le cabochon ovale
9. La lune
10. Le présentoir illustré artisanal
11. Le tourbillon peint
12. La chaîne dorée chargée d'une multitude de pampilles

**La goutte est le signe graphique transversal de la marque** : elle est le raisin, la pluie, la
larme, la rosée et le collier arc-en-ciel. Elle relie tous les territoires sans les uniformiser —
c'est le meilleur candidat au rôle de glyphe de marque.

État du dépôt (re-vérifié le 2026-08-08), utile avant de « proposer un motif » : l'étincelle et le
nœud ont un tracé dessiné à la main dans `ATELIER_THREAD_PATHS`
(`shared/components/hand-drawn/paths.ts` — `drop`, `heat` et `bow` en ont été RETIRÉS le
2026-08-06 : la goutte se prend désormais dans `CREATION_PATHS`, et le ruban n'a plus de tracé) ;
le cœur, l'étoile, le cercle et la flèche vivent dans `ACCENT_SHAPE_PATHS` — **pas la lune**, qui
n'a aucun tracé dans le fichier (le trio cœur·étoile·lune y est ponctuation, pas sujet) ; et **le gisement le plus
distinctif a été ouvert** — la goutte, la grappe (via la baie), la feuille, l'anneau, la créole,
le cabochon peint, la volute et la touche de peinture, plus l'arc-en-ciel (via la séquence de
gouttes), vivent dans `CREATION_PATHS`, posés par `shared/components/hand-drawn/creations.ts` et
consommés par la carte de partage (`shared/components/og/og-marks.ts`, qui importe la scène au
lieu d'en recopier les poses). ⚠️ L'œil et le cil n'y sont PLUS : la refonte de fidélité produit
du 2026-08-06 les a retirés avec les créations inventées qu'ils composaient (leurs tracés restent
dans l'historique git) — les boucles Raindrops – Eyes n'ont plus de tracé à réemployer. En cas de
doute, **c'est `shared/components/hand-drawn/paths.ts` qui fait foi, pas ce paragraphe** (il a déjà
dérivé une fois, deux jours durant) ; la géométrie est verrouillée par
`shared/components/animations/__tests__/hand-drawn-accent-aspect-ratio.regression.test.ts` (boîtes)
et `shared/components/hand-drawn/__tests__/creations-scene.test.ts` (points d'accroche du cordon).

⚠️ **La scène a quitté le premier écran le 2026-08-07** (`hero-creations.tsx` supprimé) : elle y
mettait un DESSIN de bijoux à côté de PHOTOS de bijoux — le même sujet rendu deux fois, dont la
version qui prouve le moins. Le critère qui en sort, et qui vaut pour toute proposition de décor :
**on dessine ce qu'on ne peut pas photographier** (l'atelier, le geste, le meuble, un état vide),
jamais ce qui est photographié 40 px plus loin. Les tracés, eux, restent employés là où ce critère
tient : la carte de partage et la section atelier. ⚠️ La FAQ en faisait partie (une touche de
peinture `CREATION_PATHS.dab` par famille de question) ; la section a été supprimée le 2026-08-08,
à refaire — c'est un emploi à re-viser, il tenait exactement le critère.

Reste sans tracé, et c'est ce qu'il faut viser ensuite : le **présentoir illustré**. La chaîne
chargée de pampilles, elle, est couverte depuis la refonte du 2026-08-06 : le collier arc-en-ciel
de la scène est précisément une chaîne dorée bordée d'une multitude de gouttes.

⚠️ Une direction mobilise **UN** motif tenu jusqu'au bout, jamais des étoiles saupoudrées partout.
La scène du présentoir montre comment tenir la règle SANS s'appauvrir : quatre familles y
coexistent, mais trois d'entre elles sont faites de la MÊME goutte (le raisin, la pluie, la larme).
Le motif unique n'est pas le nombre de formes, c'est l'unité de vocabulaire.

## Le logo

Un cœur crème dessiné au feutre, un **5** en découpe rose, deux étincelles blanches, sur un disque
`--primary`. Le dessin est de Léane ; il reprend son **présentoir d'atelier** (cf. § L'univers
photographique : « présentoir illustré jaune (chiffre 5, formes de cœur et d'étoile) ») — le logo
dessine un objet réel, pas un moodboard.

**Le glyphe est un 5, et c'est ASSUMÉ** (décision du 2026-08-15, après l'audit logo). Il s'est
appelé « l'initiale » pendant deux mois sur l'hypothèse d'un « S » de Synclune — hypothèse écartée :
cinq lecteurs indépendants lisaient « 5 », ce document lui-même écrivait « chiffre 5 ». Ne pas
« corriger » le tracé vers un S. ⚠️ **Reste à faire, et c'est à Léane** : raconter l'histoire du 5
(page atelier, à-propos…) — un chiffre assumé porte une marque (précédent : N°5), un chiffre muet
laisse chaque visiteur inventer sa réponse. Le nom, lui, est porté par le **wordmark** (Kalam,
`LogoWordmark`), jamais par le mark seul.

**Exception documentée à la doctrine des motifs** : la § Symboles identitaires classe la goutte
meilleur glyphe et range le cœur en ponctuation — le logo, lui, est cœur + étoiles en sujet. Ce
n'est pas une contradiction à « corriger » : le logo **prédate** la doctrine et dessine un objet
réel de l'atelier. La doctrine gouverne les décors et les directions à venir ; le logo est un fait
de marque. Aucun futur audit ne doit rejouer ce conflit.

Règles de lockup et d'usage (SSOT d'implémentation : `shared/components/logo.tsx`,
`logo-mark.tsx`, `logo-mark.paths.ts`) :

- **Encre** : le tracé est `--logo-ink` (brun chaud, jeton de `globals.css`) — jamais
  `--foreground` (bleu-noir), les confondre refroidit le dessin. En lockup (mark + wordmark),
  le wordmark prend AUSSI `--logo-ink` : une seule encre chaude. Seul, il reste `--foreground`.
- **Étincelles** : `sparkles="escaping"` est réservé à la **navbar** (la devanture) ; toutes les
  autres surfaces gardent le rond parfait du défaut.
- **Tailles** : le mark complet vit de 28 à 96 px (reflet à partir de 40 px). En dessous de
  ~24 px, on ne réduit pas le disque : on sert la **variante micro** (carré plein recadré sur le
  cœur, traits épaissis, sans reflet) — c'est le favicon, et toutes les icônes carrées (iOS, MS,
  splash) en sortent. Un favicon est une synecdoque du logo, pas sa réduction homothétique.
- **Déclinaisons raster** : TOUTES générées par `pnpm generate:brand-icons`
  (`scripts/generate-brand-icons.ts`) depuis la SSOT vectorielle — jamais d'export manuel
  (verrouillé par `brand-icons-manifest.regression.test.ts`). Les surfaces bitmap (emails,
  JSON-LD) servent `/logo.png` ; `public/logo.webp` est la pièce d'origine peinte par Léane,
  conservée comme référence de provenance, plus servie nulle part.
- ⚠️ **Le fichier source de Léane n'existe pas dans le dépôt** : les chemins sont une
  vectorisation du raster. Le jour où son vectoriel arrive, il remplace `logo-mark.paths.ts`
  et tout le reste se régénère.

## Territoires de moodboard

**En français** : bijoux fruits translucides · bijoux raisins colorés · bijoux peints à la main ·
peinture miniature sur bijou · bijoux arc-en-ciel artisanaux · bijoux maximalistes joyeux · bijoux
naïfs colorés · bijoux yeux surréalistes · bijoux gouttes de verre · accessoires dopamine · cabinet
de curiosités coloré · bijoux jardin fantastique · bijoux ciel étoilé · art portable artisanal ·
bijoux fantaisie sculpturaux.

**En anglais** : whimsical handmade jewelry · colorful statement jewelry · translucent fruit jewelry
· glass grape earrings · rainbow drop necklace · miniature painted jewelry · naive art jewelry ·
celestial folk jewelry · surreal eye earrings · dopamine dressing accessories · playful maximalist
jewelry · wearable miniature painting · candy colored jewelry · romantic maximalism accessories ·
whimsical botanical jewelry · kitsch art jewelry · colorful charm jewelry · art-to-wear jewelry.

## Répertoire de mots-clés et expressions SEO

**Répertoire de marque** : bijoux colorés · bijoux faits main · bijoux artisanaux · bijoux d'artiste
· art à porter · peinture miniature · cabochon peint · bijoux narratifs · bijoux sculpturaux ·
maximalisme miniature · maximalisme joyeux · dopamine jewelry · bijoux pop · bijoux naïfs · bijoux
ludiques · bijoux fruités · raisins translucides · grappe de verre · feuilles colorées · jardin
fantastique · bijoux botaniques · bijoux floraux · tournesol · nénuphar · nuit étoilée · bijoux
célestes · bijoux lunaires · ciel peint · bijoux arc-en-ciel · spectre chromatique · gouttes
colorées · rivière de verre · pluie magique · larmes de couleur · yeux surréalistes · nostalgie
d'enfance · trésor miniature · porte-bonheur · bijou conversation · bijou statement · perles de
verre · résine colorée · plastique fou · peinture à la main · acier inoxydable · chaîne dorée ·
velours rose · couleurs bonbon · couleurs acidulées · transparence · iridescence · paillettes ·
éclat · mouvement · cascade · accumulation · répétition · variation · pièce unique · petite série ·
personnalisation · atelier nantais · création libre · fantaisie contemporaine · artisanat pop ·
objet merveilleux.

**Expressions à privilégier en SEO** : « bijoux colorés faits main » · « bijoux de créatrice
française » · « bijoux faits main à Nantes » · « boucles d'oreilles colorées artisanales » · « bague
peinte à la main » · « bijoux inspirés de Van Gogh » · « bijoux arc-en-ciel artisanaux » · « cadeau
artisanal pour femme » · « bijou statement coloré » · « bijoux roses faits main » · « bijoux girly
originaux » (longue traîne d'un registre désormais secondaire, cf. ⚠️ « girly » au § Les adjectifs,
par monde) · « collier gouttes de verre » · « bijoux raisins » · « peinture miniature à porter ».

⚠️ **La règle « uniquement quand c'est vrai pour la pièce » vaut aussi pour le SEO** : une expression
descriptive (rose, cœur, arc-en-ciel, peint à la main) ne se pose sur une fiche que si le bijou l'est
réellement. Rappel de périmètre : il n'y a **pas** de `metaTitle`/`metaDescription` en base — le titre
SEO est dérivé du titre produit et du prix, la meta description est la description produit tronquée
(`CLAUDE.md` § Pas de `metaTitle` / `metaDescription` en base). Le vocabulaire ci-dessus se joue donc
dans la **copie produit elle-même**, pas dans un champ SEO séparé.

**Un exemple pour rendre le registre imitable** — la même pièce (le collier arc-en-ciel), deux
copies :

- ❌ « Collier artisanal fait main avec perles colorées. Un bijou original et poétique pour toutes
  les occasions. » Vrai, et signable par n'importe qui : aucun territoire, aucune matière réelle,
  aucun récit.
- ✅ « Une rivière de gouttes de verre translucides — rose, orange, jaune, vert, turquoise, bleu,
  violet — sur une chaîne dorée. L'arc-en-ciel se porte en collier, assemblé goutte à goutte dans
  l'atelier nantais de Léane. » Le territoire C tenu de bout en bout, des matières vraies, et les
  155 premiers caractères (la future meta description) portent déjà « gouttes de verre » et la
  séquence chromatique.
