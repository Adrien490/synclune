# Prompt — Artifact de design (audit visuel + directions maquettées)

Prompt générique à copier-coller pour obtenir **une page d'aide à la décision** sur n'importe quelle surface
de Synclune : un audit noté, les défauts montrés à l'écran, et 3 à 4 directions **dessinées, pas décrites** —
publiée comme Artifact claude.ai.

**Usage** : copie le bloc `text` entier, colle-le, puis **tape le chemin de la cible sur la dernière ligne**,
après `CIBLE : `. Le champ est en fin de bloc exprès — collé en ligne de commande, le curseur y atterrit
tout seul, sans avoir à remonter dans le texte.

> Positionnement vs les autres catalogues : [`AUDIT-PROMPTS.md`](AUDIT-PROMPTS.md) couvre des **missions
> larges** par domaine ; [`prompts-audit-synclune.md`](prompts-audit-synclune.md) couvre des **audits notés
> /100**, rendus en rapport ; [`REDESIGN-PROMPT.md`](REDESIGN-PROMPT.md) **refond et implémente** une surface
> dans la session. Ce fichier-ci est **l'étape d'avant** : on ne touche à aucun fichier du repo, on produit
> une page qu'on regarde pour **choisir**. Une fois la direction arbitrée, on enchaîne avec
> `REDESIGN-PROMPT.md`, dont le bloc a cinq entrées faites pour recevoir cet artifact.
>
> **Pourquoi une page plutôt qu'un rapport.** Ce n'est pas une question de captures : le préambule UI/UX de
> `prompts-audit-synclune.md` en exige déjà, et il a raison. La différence est ailleurs — ces captures
> montrent **l'existant**, jamais ce qu'on propose à la place. Or une direction décrite en trois adjectifs
> (« épuré, artisanal, chaleureux ») est indiscernable de son contraire tant qu'elle n'est pas dessinée, et
> arbitrer entre quatre descriptions revient à tirer au sort. Ce prompt est le seul des quatre où **les
> propositions sont rendues**, pas seulement le diagnostic. Le coût de la maquette est le prix de l'arbitrage.
>
> **Précédents de référence**, dont ce format est la formalisation (étendue aux cibles qui ne sont pas des
> composants web, §2) : [Audit navbar — 4 directions](https://claude.ai/code/artifact/a3cb6528-d928-4ee1-aad3-a853e115e5b0)
> et [Audit footer — 4 directions](https://claude.ai/code/artifact/d9eb1197-6427-476b-a01b-9438a58df466),
> tous deux du 4 août 2026. **Ouvres-en un avant de commencer** : le niveau attendu s'y lit en trente
> secondes, là où le prompt met dix minutes à le décrire.
>
> **Si la cible n'a aucune dimension visible** (une Server Action, un cron, un schéma Prisma), ce prompt
> n'est pas le bon : prends `prompts-audit-synclune.md`. Ici, tout ce qui n'est pas dessiné est perdu.
>
> **Si la cible n'existe pas encore** (une page vidée en attente de refonte, une surface à créer), ce prompt
> reste le bon — mais bascule en mode « surface neuve », décrit au §5. C'est le cas de la landing
> (`app/(shop)/(home)/page.tsx`) depuis le 2026-08-03.
>
> ⚠️ **Les maquettes du §6 ne sont pas des composants de référence, et ne doivent jamais servir de tels.**
> Tout ce que le §6 prescrit est une divergence **volontaire** d'avec le rendu réel : hex littéraux au lieu
> des tokens, variables `--a-*` choisies pour être inconfondables, une pile système à la place de Winky Sans (la CSP
> d'un artifact bloque tout hôte externe), `zoom` sur une boîte de largeur fixe, plaques `inert` en `<div>`
> plutôt que de vrais interactifs, et des classes `.mk--bug` qui **reproduisent l'état cassé**. C'est ce qui
> en fait un bon support d'arbitrage, et ce qui les disqualifie comme échantillon. Si un catalogue de
> composants voyait le jour un jour, il serait alimenté par la sortie de `REDESIGN-PROMPT.md` — le composant
> réel implémenté —, jamais par ces plaques. Cf. `README.md` § « Un artifact de design n'est pas Claude Design ».
>
> **Ce que la plateforme Artifact permet, et ce qu'on n'utilise pas ici.** Un artifact publié peut être
> AI-powered (appeler Claude depuis la page), se brancher sur des serveurs MCP, ou persister de l'état entre
> sessions. **Aucune des trois n'a sa place dans cette page**, et c'est délibéré : un support d'arbitrage doit
> rendre exactement la même chose à chaque ouverture, y compris dans six mois quand on rouvrira le lien pour
> comprendre une décision. Le seul JavaScript admis est le **banc d'essai** du §5.4 — un sélecteur qui
> permute des directions déjà présentes dans le DOM. Un artifact est **privé par défaut** : le publier ne
> l'expose à personne, le partager est un geste séparé.

---

```text
Audite la surface que je désigne et publie le résultat en Artifact : une page d'aide à la décision, avec les
directions MAQUETTÉES. Tu ne modifies AUCUN fichier du repo dans cette session — le livrable est la page.
La cible est en DERNIÈRE LIGNE de ce message.

═══════════════════════════════════════════════════════════════════════════════
0 — LE CONTRAT
═══════════════════════════════════════════════════════════════════════════════
Une conviction argumentée et regardable, pas un catalogue d'options tièdes. Je dois pouvoir choisir en
scrollant la page, sans rien imaginer : ce qui est décrit est dessiné. Tu as carte blanche sur la direction
artistique ; le seul plafond est le goût, le brief de marque (§1) et les garde-fous (§8).

Quatre refus par avance :
- Ne me dis pas que c'est « déjà très bien » pour éviter de trancher. Si la surface est réellement juste,
  prouve-le critère par critère et propose la restauration ciblée qui la fait passer de bonne à excellente.
- Ne propose pas quatre variantes de la même idée. Si deux directions pouvaient coexister dans le même
  commit, ce n'en est qu'une.
- Ne maquette pas un rendu que le code ne pourrait pas produire. Chaque maquette doit être atteignable avec
  les tokens, composants et dépendances déjà dans le repo.
- N'invente aucun chiffre commercial. Pas de « + 2 000 clientes », pas de faux avis, pas de fausse note.
  C'est une boutique à ~20 commandes/mois : une preuve sociale inventée est un mensonge, et ça se voit.

Et un cinquième, qui est le mode d'échec réel de ce prompt : **le risque ici n'est pas d'aller trop loin,
c'est de livrer du propre et vide.** Je peux refuser une direction trop vive ; je ne peux pas deviner celle
que tu n'as pas osé dessiner.

═══════════════════════════════════════════════════════════════════════════════
1 — CE QU'EST SYNCLUNE (lis ça avant de dessiner quoi que ce soit)
═══════════════════════════════════════════════════════════════════════════════
**Ce qu'elle vend** : des bijoux **créatifs, colorés, faits main** — des pièces uniques, pas une gamme. Léane,
qui est seule derrière la boutique, décrit elle-même son point de départ ainsi : « une couleur dans la rue, un
motif sur un tissu, un rêve », et ses bijoux comme une extension de sa passion, où « chaque couleur, forme,
ligne est pensée et choisie avec soin » (`docs/atelier-story.md`). C'est ÇA le produit : de la couleur, de la
main, de la joie, et une personne.

⚠️ **Corollaire, et pas l'inverse : ce n'est PAS de la joaillerie précieuse** — ni or, ni pierres, ni « luxe
discret ». Toute direction bâtie sur le métal précieux, le noir et or, la gravure, le sérif de haute
joaillerie ou le minimalisme froid est le **contre-pied exact** du brief — même exécutée parfaitement, elle
est à jeter. C'est la donnée de marque la plus souvent mal comprise, et elle a déjà produit des propositions
jetées sur ce projet. Vise le **soin artisanal et la joie**, jamais le prestige. SSOT :
`docs/BUSINESS.md` § Positionnement, `shared/constants/brand.ts`,
`BUSINESS_INFO` (`shared/constants/seo-config.ts`).

🎨 **La couleur et la main sont le SUJET, pas la décoration.** C'est la partie du brief la plus sous-jouée :
à force d'éviter le luxe, on livre du rose pâle sur du blanc, propre et sans personne dedans. Une boutique de
bijoux colorés faits main qui ressemble à un template neutre a raté le brief aussi sûrement qu'une qui ferait
de la haute joaillerie.
- **La palette existe et elle est franche.** Quatre accents de marque, avec un récit :
  `[data-accent="rose|lavender|mint|sun"]` (`app/styles/section-accents.css`) exposent `--section-accent` /
  `--section-glow` / `--section-soft`. Le rose EST `--primary` (jamais dupliqué) ; les trois autres sont
  `--color-brand-{lavender,mint,sun}`, doublés de halos translucides `--color-glow-*`. Les valeurs exactes,
  et la règle de lisibilité qui va avec, sont au §6. Si ta maquette n'emploie que `--primary` et des gris,
  demande-toi si c'est de la retenue ou de la timidité.
- **Le geste à la main est la signature**, et il est déjà en SSOT : `HandDrawnAccent` et `HandDrawnUnderline`
  (`shared/components/animations/hand-drawn-accent.tsx`), `shared/components/squiggle-underline.tsx`,
  `shared/components/masking-tape.tsx`, `CARD_SURFACE_POLAROID` (`shared/components/card-surface.constants.ts` —
  c'est LUI qui porte le lift/tilt au survol), `.polaroid-paper` (`app/styles/components.css` — uniquement un
  `::before` de grain, pas de règle de base). ⚠️ `.polaroid-hover` a été SUPPRIMÉE le 2026-08-04, pierre
  tombale in-situ « ne pas réintroduire sans consommateur » — ne la cite pas. Ce vocabulaire dit « fait par
  quelqu'un » mieux que n'importe quel adjectif. Prolonge-le, tends-le, ou argumente contre — mais ne
  l'ignore pas : une ligne parfaitement droite là où le reste du site trace à la main est une rupture, pas
  une sobriété.
- **Les motifs identitaires sont un territoire, pas un décor** — SSOT `CLAUDE.md` § « Direction
  artistique — lexique de marque » (lis-la, elle porte aussi le vocabulaire émotionnel et les matières).
  Deux familles dominent, lisibles dans les noms mêmes des pièces (Starry Night Ring, Green Grape
  Necklace, Rainbow Drop Necklace, Water Lilies, Rain Loops) : le **ciel de nuit** — lune, étoiles,
  constellation ; le nom *Synclune* contient la lune, et une identité qui s'appelle comme ça sans jamais
  la dessiner laisse son meilleur motif à la concurrence — et le **jardin fruité** — grappes, fleurs,
  gouttes, arc-en-ciel. S'y ajoute une **filiation à l'art** que personne d'autre ne peut revendiquer :
  Starry Night Ring EST « La Nuit étoilée » de Van Gogh, Water Lilies, les Nymphéas de Monet — un
  registre narratif à part entière (la pièce raconte un tableau), et le pinceau va avec le trait : des
  cabochons sont **peints à la main**, le geste de la marque n'est pas que dessiné. C'est de la matière
  pour les registres du §4.1, les noms de directions et la copie : UN motif par direction, tenu
  jusqu'au bout, jamais des étoiles saupoudrées partout. Une direction qui ne mobilise ni la palette,
  ni le geste, ni un motif n'a que des gris pour raconter Synclune. En face, une limite délibérée :
  **irisé, pailleté, translucide décrivent les bijoux, jamais l'interface** — traduits en paillettes
  ou en verre dépoli, ils retombent dans le décoratif interdit au §4.8.
- **La voix est à la première personne.** Léane parle d'elle (« je », « mon atelier ») ; la copie tutoie la
  cliente. Un ton corporate impersonnel (« nos artisans », « notre maison ») est faux : il n'y a qu'elle.
  ⚠️ **Piège actif : `docs/atelier-story.md` est intégralement au VOUVOIEMENT** (« Chaque bijou que vous
  retrouverez ici… », « Je vais vous faire une confidence »), alors que le §8 et `CLAUDE.md` § Voix imposent
  le tutoiement partout. Le fichier est une réserve de copie, pas un texte prêt à poser : le §2 te demande le
  VRAI texte, et le prendre tel quel introduirait du vouvoiement dans la maquette. **Repasse-le au
  tutoiement** en gardant le « je » de Léane (« Chaque bijou que tu trouveras ici… »), et signale la bascule
  en légende. Ne le laisse pas en l'état sous prétexte que c'est une citation.
- **Le test** : si ta direction pouvait servir telle quelle à n'importe quelle boutique de bijoux, elle est
  ratée — pas parce qu'elle est laide, parce qu'elle ne raconte personne. Le noyau lexical contre lequel ce
  test se joue : **couleur + poésie + fantaisie + fait main + singularité + Nantes** (formule de référence :
  « Création artisanale de bijoux colorés, originaux et poétiques »). L'atelier est à Nantes et c'est une
  singularité, pas une mention légale — une direction peut s'en servir ; aucune n'a le droit de l'ignorer en
  inventant un ailleurs.

**L'échelle fait partie du brief, et elle t'ouvre des portes autant qu'elle en ferme.**
- ~20 commandes/mois, **une seule personne** (pas d'équipe technique), catalogue petit, B2C France + UE,
  en français, en euros.
- Ce que ça FERME : pas de compte client, pas d'avis, pas de recommandations personnalisées, pas de
  programme de fidélité, pas d'e-mail marketing, pas de FOMO chiffré. Ces surfaces ont été retirées
  (2026-07-30 → 08-04) — ne les réveille pas, même « en pointillé ».
- Ce que ça OUVRE, et qu'une grosse boutique ne peut pas se permettre : un traitement **éditorial pièce par
  pièce**, des photos grandes, un texte écrit à la main, une mise en page qui n'a pas à tenir 500 SKU. Une
  direction qui ressemble à un template Shopify a raté cette opportunité, pas seulement le style.
- L'admin n'est pas un back-office d'entreprise : c'est **l'outil de travail quotidien d'une personne**.
  Densité, rapidité de scan et absence de clics inutiles y valent mieux que l'élégance.

Voix : **tutoiement** partout (seule exception documentée : les messages d'erreur renvoyés par Stripe).
Copie en français, code en anglais.

═══════════════════════════════════════════════════════════════════════════════
2 — ADAPTE LE FORMAT À LA NATURE DE LA CIBLE
═══════════════════════════════════════════════════════════════════════════════
Identifie d'abord de quoi il s'agit, puis applique la colonne « maquette » correspondante. La structure de
page (§5) ne change pas ; c'est ce qu'on dessine qui change.

| Nature de la cible          | Ce que « maquette » veut dire ici                                              | Formats à montrer      | Le piège propre à cette nature                                                                      |
|-----------------------------|--------------------------------------------------------------------------------|------------------------|-----------------------------------------------------------------------------------------------------|
| Composant storefront        | HTML/CSS 1:1, dans son contexte immédiat                                       | 1280 · 768 · 390       | Le montrer seul : il ne vit jamais seul. Dessine ses voisins en gris.                                |
| Page ou section             | Idem + ce qui la précède et la suit (au moins en fantôme)                      | 1280 · 768 · 390       | Le hors-champ. Une section magnifique qui casse le rythme de la page est un échec.                   |
| **Parcours** (checkout, suivi de commande, tunnel) | Un **storyboard** : les N écrans côte à côte, les transitions, et les BRANCHES D'ÉCHEC | 390 d'abord, puis 1280 ; **+ sombre si le Payment Element est à l'écran** | Ne maquetter que le happy path. Le refus de carte est le chemin le plus fréquent en card-only. Et le Payment Element **bascule vraiment en sombre** (cf. §3) : le maquetter en clair seulement, c'est auditer la moitié du tunnel. |
| **Overlay** (sheet, drawer, dialog, alert-dialog, popover, menu) | L'overlay **ouvert sur son hôte**, avec le scrim et la géométrie réelle — jamais détouré | 390 **et** 1280 (la primitive change de forme entre les deux) | Le dessiner seul sur fond blanc. Tout son problème est le rapport à ce qu'il recouvre : hauteur occupée, lisibilité du dessous, empilement quand un second s'ouvre par-dessus. Montre au moins une fois l'état empilé. |
| Surface admin               | HTML/CSS, mais grille 1600 px sans `mx-auto`, densité réelle, 30+ lignes        | 1680 (montre le plafond) · 1280 (le cas courant) | Juger la beauté. C'est un outil : compte les clics et les allers-retours de l'œil. ⚠️ Ne dessine pas une grille de 1600 px dans une plaque de 1440 : à 1440 de viewport, `max-w-[100rem]` est plafonné **par le viewport**, et le plafond ne se voit jamais. |
| **E-mail transactionnel**   | Maquette en **tables**, largeur 600 px, pas de flex/grid, pas de `@media` fiable | 600 · 320, **clair ET sombre** | Gmail et Apple Mail **imposent** l'inversion sombre. Un e-mail non testé en sombre est à moitié audité. |
| **PDF facture / avoir**     | Une page A4 (210×297 mm) à l'échelle, mentions légales réelles                  | A4                     | Le rendu (`jspdf`) est **déterministe**, et l'archivage le scelle sous SHA-256 (`modules/orders/services/archive-invoice-pdf.service.ts`, Art. L102 B LPF). Toute proposition doit dire qu'elle ne s'applique qu'aux documents FUTURS, jamais aux archivés. |
| **Copie éditoriale** (CGV, mentions, FAQ de la landing, page atelier) | Une maquette **typographique** : mesure réelle, rythme vertical, respiration, ancrages — avec le VRAI texte | 1280 · 390             | Maquetter la mise en page sans écrire le texte. Ici la copie EST le design : une colonne magnifique remplie de faux paragraphes n'a rien prouvé. Et une page légale se scanne pour trouver une clause, elle ne se lit pas au fil. |
| Système transverse (design system, motion, icônes, états de formulaire) | Une **planche de spécimens** : chaque variante côte à côte, avant/après en regard | selon le système       | Montrer un exemplaire. La cohérence ne se juge qu'en série.                                          |
| **Matrice d'états** (vide, chargement, erreur, succès) | La matrice complète, pas un écran                              | celui de l'hôte        | Un skeleton qui n'a pas la géométrie exacte du contenu réel produit un saut de layout — dessine-les superposés. |

Si la cible relève de plusieurs lignes (ex. « le panier » = composant + parcours + états), traite-les toutes.
Une seule direction, dessinée à trois endroits, vaut mieux que trois directions dessinées une fois.

**Garde-fou de volume** : 4 directions × 3 formats × les états durs, c'est 30+ plaques écrites à la main —
personne ne les lira et tu les bâcleras toutes. Plafond : **une direction est dessinée à fond (tous les
formats de sa ligne + au moins un état dur), les autres au format principal seulement**, plus le banc d'essai
du §5.4 qui les met toutes à la même échelle. Celle qu'on dessine à fond n'est pas forcément celle qu'on
recommande — dis laquelle et pourquoi.

═══════════════════════════════════════════════════════════════════════════════
3 — ANCRAGE FACTUEL (avant toute critique)
═══════════════════════════════════════════════════════════════════════════════
Lis la cible, ses imports, ses voisins — puis le vocabulaire visuel déjà écrit dans le projet :
- `CLAUDE.md` pour les conventions, les invariants React 19 et le § Voix — **et surtout
  `docs/UI-CONVENTIONS.md`**, où le détail a été extrait : § Breakpoints (rem partout, jamais px) ·
  § Largeurs de contenu · § Survol vs focus · § Overlays · § Composition (`render`, jamais `asChild`) ·
  § « Un `animate-out` sans `fill-mode-forwards` est un bug ». `CLAUDE.md` n'en garde que dix puces : le
  _pourquoi_, les contre-exemples et les pièges de migration Radix → Base UI ne sont QUE dans
  `docs/UI-CONVENTIONS.md`. Ces cinq sections sont celles qui ont produit le plus de P0 sur ce projet.
- `docs/BUSINESS.md` (§ Positionnement, obligatoire) et `docs/atelier-story.md` si la surface porte de la
  copie éditoriale
- `app/globals.css` **et les sept feuilles qu'il importe** — attention à qui porte quoi. Les **classes** vivent
  dans les feuilles : `.enter-inview` et `.hand-draw-inview` (`app/styles/entrance.css`), `.animate-shimmer`
  et `.product-item` (`app/styles/animations.css`), `[data-accent]` et ses 4 valeurs
  (`app/styles/section-accents.css`), `.polaroid-paper` (`app/styles/components.css`) ;
  les trois dernières sont `app/styles/pwa.css`, `app/styles/scroll-fade.css` (fondus de défilement,
  ex-composant JS devenu CSS le 2026-08-05) et `app/styles/utilities.css`. Les **utilitaires et tokens**,
  eux, sont dans `app/globals.css` lui-même : `@utility focus-ring`, `@utility hover-halo`,
  `@utility shimmer-text`, l'échelle `--z-*`, les `--duration-*` (`fast 150ms`, `normal 200ms`, `slow 300ms`,
  `slower 500ms`) et les `--ease-*` (`spring`, `smooth-out`, `premium`).
- `shared/components/animations/motion.config.ts` — `MOTION_CONFIG` porte **7 durées** (`fast .15` ·
  `normal .2` · `collapse .28` · `slow .3` · `medium .35` · `emphasis .4` · `slower .5`), **5 easings** et
  **8 ressorts nommés** (`gentle`, `snappy`, `bouncy`, `list`, `bar`, `success`, `number`, `toast`)
- `shared/styles/fonts.ts`, `shared/components/ui/`, `shared/constants/breakpoints.ts`
- les données et contenus RÉELS de la cible — jamais de lorem, jamais de prix inventé. Si la base est vide
  ou indisponible, prends les libellés du seed ou du code, et dis-le en légende.
- `docs/KNOWN-ISSUES.md` si la cible touche le panier ou le checkout

Puis trois passes de mémoire, dans cet ordre :
1. `grep -rn "@regression" <dossier-cible> <dossiers-voisins>` — ciblé, pas le repo entier : **342 fichiers
   de test** en portent (re-mesuré le 2026-08-05 ; c'est un nombre qui bouge à chaque passe de tests, ne le
   crois pas au fichier près — il n'est là que pour te dissuader de grepper la racine).
   Chacun verrouille un bug déjà payé une fois, et devient une ligne de la section Garde-fous.
2. `grep -rn "<libellé accessible de la cible>" e2e/` — les noms accessibles pilotent des tests E2E. Toute
   direction qui renomme un libellé doit le dire.
3. `ls ~/.claude/projects/-Users-adrienpoirier-Projets-synclune/memory/` puis grep par sujet : cette surface
   a peut-être déjà été auditée, et un refus exprimé il y a deux mois n'est pas rejouable.

⚠️ N'utilise jamais un `find`/`grep` depuis la racine sans exclure `.claude/worktrees/` : ce dossier contient
une copie périmée du repo et fait « exister » tous les chemins morts.

**⚠️ Tu ne pourras peut-être pas VOIR la surface — sache-le avant de planifier, pas à la fin.** C'est le vrai
plafond de qualité de ce prompt, pas sa rédaction. Et ça pèse ici plus qu'ailleurs : la section `#actuel`
prétend montrer l'existant. Une plaque « existant » dessinée d'après le seul JSX est une reconstitution, pas
une observation — dis-le dans son `<figcaption>` si c'est le cas, sous peine de faire arbitrer sur une
prémisse fausse.
- La base de dev **n'a aucun produit `PUBLIC`**. Toute surface catalogue (PDP, `/produits`, `ProductCard`,
  collections, recherche) se rend donc **vide**.
- **Ne lance JAMAIS `pnpm seed` de toi-même** : il fait un wipe complet et refuse de tourner sans
  `SEED_ALLOW="true"`. Cette garde est délibérée. Si tu as besoin de données, **demande-les**.
- **Ce qui se rend quand même**, et qui suffit souvent : les **sept** pages de `app/(legal)/` (`/cgv`,
  `/mentions-legales`, `/informations-legales`, `/confidentialite`, `/cookies`, `/accessibilite`,
  `/retractation`), `/connexion`, et
  les **états vides** de `/panier` et `/favoris`. Un composant partagé — navbar, footer, overlay, bouton,
  champ de formulaire — s'observe parfaitement sur `/cgv`, qui ne dépend d'aucun produit. Cherche l'hôte le
  moins exigeant avant de conclure que c'est impossible.
- Pour l'admin, le projet Playwright **`authenticated-admin`** existe (state `e2e/.auth/admin.json`, produit
  par le projet `setup`, cf. `e2e/auth.setup.ts`). `playwright.config.ts` déclare `webServer` avec
  `reuseExistingServer` hors CI : lance `pnpm dev`, tes captures réutiliseront ce serveur.
- **Si vraiment rien ne se rend**, le repli est le CSS COMPILÉ, pas le JSX. ⚠️ Piège : le CSS compilé échappe
  les crochets **et les points** — chercher `lg:[&_>_div]:size-12` littéralement ne trouve rien et fait
  conclure à tort « la classe n'a pas compilé ».
- Et un scope `"use cache"` peut te servir du **HTML périmé en dev** : si une édition semble sans effet,
  redémarre le serveur avant de chercher un bug qui n'existe pas.

**Faits du projet — vérifiés le 2026-08-05. Ne les réinvente pas, ne les contredis pas ; mais si l'un
d'eux ne correspond plus à ce que tu lis dans le repo, LE REPO GAGNE — corrige-toi et signale la dérive
dans ta restitution (§9.4).** Ce bloc et les valeurs du §6 sont les seules choses de ce prompt qui
pourrissent ; un catalogue voisin s'est déjà retrouvé avec ~25 % de chemins morts faute de cette règle.

- Polices (SSOT `shared/styles/fonts.ts`) : **Winky Sans** (`--font-display`), **Onest** (`--font-sans`),
  **Kalam** (`--font-cursive`) — cette dernière est RÉSERVÉE au décoratif : jamais un prix, un libellé
  de formulaire, de la nav ou du body ; ni `font-bold` ni `italic`. Caveat et Bricolage n'existent pas ici.
- **Aucun thème sombre dans l'application** : pas de bloc `.dark`, pas de `next-themes`, aucun variant
  `dark:`. N'en invente pas un. **Deux exceptions, et elles sont réelles** — (a) le client e-mail, qui
  impose l'inversion (cf. §2) ; (b) **le Payment Element Stripe**, qui bascule pour de bon :
  `modules/payments/constants/stripe-appearance.ts` exporte `stripeAppearanceDark` (`theme: "night"`),
  sélectionné par `modules/payments/hooks/use-stripe-appearance.ts` sur `prefers-color-scheme: dark`.
  Si ta cible touche le tunnel de paiement, le rendu sombre existe et doit être maquetté.
- Le rose se référence par `--primary`, jamais en hex — dans le CODE. Dans les maquettes de l'artifact,
  c'est l'inverse (cf. §6).
- Pas de `useMemo` / `useCallback` / `React.memo` / `forwardRef`, et pas de `setState` dans un `useEffect`.
- `next/image` : la prop de préchargement est **`preload`** (booléen), que le repo traite en **paire
  indissociable avec `fetchPriority="high"`** — `preload` seul émet un hint en priorité BASSE qui ne
  précharge presque rien. `priority` a été RETIRÉE en Next 16 — si une direction justifie de précharger
  la photo d'ouverture, dis la paire `preload` + `fetchPriority`, jamais `priority`.
- Largeurs : storefront `max-w-6xl`, checkout `max-w-5xl`, admin `max-w-[100rem]` sans `mx-auto`. Un palier
  de colonnes en plus au-delà du plafond rétrécit les cartes au lieu d'ajouter de la place.
- Si la surface est commerciale, l'état **boutique fermée** existe et se gère
  (`modules/store-settings/services/store-closure-guard.ts`) — il fait partie des états durs du §4.6.

═══════════════════════════════════════════════════════════════════════════════
4 — LE NIVEAU D'EXIGENCE (c'est ici que se joue la différence entre correct et excellent)
═══════════════════════════════════════════════════════════════════════════════
**4.1 — Diverge avant de converger.** Cherche 8 à 10 pistes pour toi-même, puis n'en publie que 3 ou 4.
Fais-les diverger sur DEUX axes, pas un :
  · l'**ampleur** — rhabiller / recomposer / changer le modèle mental de la surface ;
  · le **registre** — quel geste artisanal ou quel motif identitaire (§1) porte la direction (le tirage
    papier, l'établi, la vitrine, le carnet, l'atelier en désordre rangé, le ciel de nuit, le jardin
    fruité…). Deux directions de même ampleur mais de même registre sont un doublon.
Au moins une direction doit être **plus risquée que ce que je demanderais spontanément** — et l'audace a une
couverture officielle : le lexique de marque (§1) assume « pop », « maximaliste », « statement ». Si les
quatre sont confortables, tu as sous-livré : je peux refuser une direction audacieuse, je ne peux pas
inventer celle que tu n'as pas montrée.

**4.2 — Un concept falsifiable avant les pixels.** Chaque direction s'ouvre sur UNE phrase qui pourrait être
fausse. Test : remplace « Synclune » par n'importe quelle autre boutique — si la phrase tient encore, elle
est vide, réécris-la. « Épuré et chaleureux » est vide. « La barre devient la tranche d'un tirage photo :
tout ce qui est cliquable est posé dessus, rien n'est dedans » est un concept.

**4.3 — Nomme des nombres.** Une direction qui ne cite aucune valeur est une ambiance, pas une direction.
Chacune doit dire, quand c'est pertinent : le ratio de son échelle typographique et les 3-4 tailles
réellement utilisées · la base de son rythme d'espacement · l'épaisseur de ses traits · le rayon · la durée
et la courbe de ses transitions (prises dans `MOTION_CONFIG`, pas inventées) · et toute correction optique
assumée (un alignement qui n'est pas mathématique parce qu'il ne se VOIT pas aligné).

**Sa palette en fait partie, et c'est le nombre le plus souvent omis** sur une marque dont le positionnement
EST la couleur. Chaque direction déclare : lesquels des quatre accents elle mobilise (rose, lavande, menthe,
soleil), en aplat ou en trait, et dans quel **rapport de surface** approximatif — « rose sur ~5 % de la
page, en soulignement seulement » et « un aplat menthe plein cadre derrière la grille » sont deux directions
différentes, pas deux nuances de la même. Rappel du §6 : ces accents portent des surfaces, jamais du texte.
Une direction qui ne nomme aucun accent choisit le rose par défaut — dis-le si c'est un choix, corrige-le si
c'est un oubli.

**4.4 — Un seul geste fort, tenu jusqu'au bout, bat trois effets tièdes.** Ce qui n'aide ni à lire, ni à
comprendre, ni à désirer : coupe-le, même si c'est joli. Casse une symétrie, contraste l'échelle typo, sors
de la grille, **ose la couleur** — mais une fois, et partout.

**4.5 — Les mots sont du design.** Chaque direction propose sa copie réelle (titres, libellés de boutons,
états vides), au tutoiement. « Découvrez notre collection » n'est pas de la copie, c'est un emplacement de
copie. Un bouton se nomme par ce qu'il fait pour la cliente. Le registre des mots est dans le lexique du §1
(joyeux, espiègle, poétique, solaire, féerique…) — pas dans le vocabulaire e-commerce générique. Et la même
règle que pour les chiffres : **ne cite une matière (résine, acrylique, acier, perles…) que si elle est
vraie pour la pièce montrée** — un libellé qui invente une matière est un faux au même titre qu'un prix
inventé (§0).

**4.6 — Tiens sur le contenu le plus laid, pas sur le plus beau.** Chaque direction doit survivre, et tu dois
le montrer au moins une fois : un titre de produit à 60 caractères · un prix à quatre chiffres · l'état vide ·
l'état chargement · l'erreur · la rupture de stock ET la promo en même temps · une seule ligne, et quarante.
Une maquette qui ne marche qu'avec « Collier Aurore — 38 € » ment.

**Et la PHOTO, qui est le contenu le plus laid de cette boutique-ci** — c'est l'angle mort structurel de ce
format, parce que le §6 simule les images en `linear-gradient` et qu'un dégradé est toujours propre, bien
cadré et du ratio qu'on a choisi. Léane photographie ses pièces elle-même : il n'y a ni studio, ni charte de
prise de vue, ni retouche systématique. Toute direction dont la beauté repose sur l'image doit donc être
montrée au moins une fois avec **une photo hostile**, simulée franchement : un fond qui n'est pas le blanc
des autres · une pièce claire sur fond clair (le bijou se perd, la carte semble vide) · un cadrage portrait
tombant dans une grille carrée · deux vignettes voisines dont les fonds ne s'accordent pas. Si ta direction
ne tient que sur une série homogène, dis-le dans son critère d'échec (§4.7) : c'est une dépendance à un
travail photo que personne n'a budgété.

**4.7 — Déclare ce qui tuerait ta direction.** Une ligne par direction : le critère d'échec. « Si Léane
trouve que ça fait fouillis, elle tombe » · « si le catalogue passe à 200 pièces, elle ne tient plus ».

**4.8 — Ne tombe pas dans tes propres défauts.** Ces réflexes-là sont les tiens, pas ceux du projet, et ils
sont interdits ici : dégradé violet/bleu · glassmorphism décoratif · « héro + trois cartes à icônes » ·
tout centrer · emoji en guise d'icône · `box-shadow: 0 4px 6px rgba(0,0,0,.1)` posée partout · un rayon
unique sur toutes les surfaces · le « premium » signifié par le noir et l'or (contre-brief absolu, cf. §1) ·
la police display employée pour le corps de texte · un espacement uniforme (le rythme plat est l'ennemi de
la hiérarchie) · une micro-animation sans fonction · un « badge de confiance » inventé.

═══════════════════════════════════════════════════════════════════════════════
5 — STRUCTURE DE LA PAGE (respecte cet ordre)
═══════════════════════════════════════════════════════════════════════════════
Une topbar sticky avec les ancres, puis 6 sections, puis un footer.

⚠️ **Si la cible n'existe pas encore** (page vidée en attente de refonte, surface à créer), deux sections
changent de nature — le reste est identique. Ne fabrique pas de faux défauts pour remplir le gabarit, et ne
saute pas les sections non plus :
- `#defauts` devient **`#contraintes`** : ce que la surface doit faire, ce que le reste du site lui impose
  déjà (langage visuel des voisins, invariants de cache, tests E2E qui la référencent), et ce que son
  absence coûte aujourd'hui. Mêmes pastilles P1/P2/P3, même exigence de `fichier:ligne`.
- `#actuel` devient **`#reference`** : les surfaces voisines qui donnent le vocabulaire, maquettées pour
  montrer ce dont la nouvelle page hérite — pas ses défauts à elle, puisqu'elle n'en a pas encore.
- La scorecard note alors **ce qu'on remplace ou le vide qu'on comble**, jamais un fantôme. Si l'ancienne
  version est dans l'historique git et que tu peux la lire, note-la et dis-le ; sinon, dis franchement que
  la note de départ est sans objet et n'en invente pas.

1. `#verdict` — eyebrow = le chemin de la cible + son poids réel (« 18 fichiers, ~1 900 lignes ») · un h1 qui
   est une **phrase de diagnostic**, pas un titre de dossier (« Le header est la dernière surface qui ne parle
   pas la langue de la boutique ») · un chapô qui dit où est vraiment le problème, souvent ailleurs qu'on
   l'attend · une **scorecard** : note globale /20 + 6 jauges — Direction artistique · Hiérarchie &
   composition · UX / parcours · Responsive · Accessibilité · Technique. Ces six axes sont fixes pour que
   deux scorecards restent comparables ; **une seule substitution est permise**, quand un axe n'a
   littéralement aucun sens pour la nature de la cible : PDF → `Responsive` devient `Impression &
   conformité` ; e-mail → `Compatibilité clients`. Substituer le deuxième axe, c'est se donner une bonne
   note en changeant l'examen. Calibrage, pour que la note veuille dire quelque chose : **20** = rien à
   ajouter ni retrancher · **17** = juste, sans signature · **14** = correct, avec un défaut qu'on remarque ·
   **11** = ça fonctionne et ça dessert · **8** = un utilisateur y renonce ou s'y trompe. (Cette échelle
   /20 note LA CIBLE. Le BARÈME /100 en fin de prompt note TON TRAVAIL — ne les confonds pas, et ne les
   affiche jamais côte à côte.) Puis un encadré **« Ce qui est déjà juste, et qu'aucune piste ne doit
   casser »**, cité précisément — ce n'est pas de la politesse, c'est la liste de ce que la refonte préservera.
2. `#defauts` — 4 à 7 défauts, chacun : pastille P1/P2/P3 · titre en langue naturelle · un paragraphe de
   mécanisme (pourquoi, techniquement) · un bloc **« Ce que ça donne : »** qui décrit ce que l'utilisateur
   voit ou subit · les `fichier:ligne` en puces monospace. Quand le mécanisme est spatial (empilement,
   alignement, débordement), un **schéma SVG inline en coupe** vaut mieux qu'un paragraphe.
3. `#actuel` — l'existant maquetté, aux formats de la ligne §2 qui te concerne, **avec ses défauts visibles**
   (une classe `.mk--bug` qui reproduit l'état cassé vaut trois paragraphes) et, si le défaut est un problème
   d'alignement, une annotation d'axes en pointillés.
4. `#directions` — 3 à 4 directions, **rangées par ampleur croissante d'engagement, pas par qualité**
   (dis-le). Chacune : une lettre · un **nom court et imagé** (« Le tirage », « La devanture », « L'établi »)
   — jamais « Option 1 » · une pastille de risque · une pastille de note visée /20 · le concept falsifiable
   (§4.2) · les nombres (§4.3) · **au moins une maquette**, plus une des états durs (§4.6) · deux colonnes
   « Ce que ça règle » / « Ce que ça ne règle pas » — ou « Pourquoi je la déconseille », franchement, quand
   c'est le cas · et le critère d'échec (§4.7).

   **Puis, en fin de section, le BANC D'ESSAI — c'est lui qui fait arbitrer.** Une même scène, strictement
   identique d'une direction à l'autre (mêmes libellés, mêmes prix, même largeur, même hauteur de plaque),
   rendue dans chacune des directions. Deux formes possibles : les plaques côte à côte si elles tiennent, ou
   **une plaque unique et un sélecteur** (`<input type="radio">` + CSS, ou 10 lignes de JS qui permutent une
   classe sur un conteneur — le contenu des N directions est déjà dans le DOM, on ne fait que le montrer).
   Sans ce banc, comparer A et D demande de scroller entre deux sections séparées par vingt plaques : on
   arbitre alors sur le souvenir, pas sur la comparaison. Ce sélecteur est le SEUL interactif réel autorisé
   dans la page (§6 : les maquettes, elles, restent `inert`) — il pilote le document, pas une maquette.
5. `#reco` — une seule recommandation, argumentée **contre** les autres (pourquoi pas A, pourquoi pas B),
   découpée en **lots livrables** dans un tableau `Lot | Contenu | Dépend de`. Le lot 0 regroupe les correctifs
   **indépendants de la direction** : ils se font quoi qu'il arrive. Termine par un encadré **« Ce que ça ne
   réglera pas, et que j'assume »** — si la note visée n'est pas 20, dis ce qui manque et pourquoi tu le laisses.
6. `#gardefous` — deux colonnes : « Refus déjà exprimés » (les miens, retrouvés dans la mémoire et les tests)
   et « Invariants techniques » (les `@regression`, les contraintes de cache, de breakpoints, de focus).
   C'est la section qui empêche la session d'implémentation suivante de re-payer un bug.

Footer : nature du document · chemin de la cible · date · **et l'aveu de ce que les maquettes ne rendent pas
fidèlement** (polices substituées, animations statiques, données du seed, existant reconstitué sans avoir pu
le rendre…).

═══════════════════════════════════════════════════════════════════════════════
6 — LES MAQUETTES (le cœur, et l'endroit où ça rate)
═══════════════════════════════════════════════════════════════════════════════
Chaque maquette est du **HTML/CSS écrit à la main dans la page**, qui reproduit le rendu réel — pas une
capture, pas une description, pas un wireframe en boîtes grises.

- **Traduis les tokens réels en valeurs littérales**, dans un bloc `.mk` portant un commentaire qui donne la
  correspondance. Dérivation **OKLab → sRGB** refaite le 2026-08-05 sur `app/globals.css` :

  | Token | `oklch()` en base | hex | Note |
  |---|---|---|---|
  | `--background` | `0.99 0.005 270` | `#fafcff` | |
  | `--foreground` | `0.13 0.01 270` | `#06070b` | 19,5:1 sur le fond |
  | `--card` | `1 0 0` | `#ffffff` | |
  | `--muted` / `--accent` / `--input` | `0.94 0.01 270` | `#e8ebf2` | |
  | `--muted-foreground` | `0.45 0.01 270` | `#53555b` | 7,23:1 sur le fond |
  | `--border` | `0.92 0.01 270` | `#e2e4eb` | |
  | `--primary` (= `--ring`) | `0.8593 0.097 340.78` | `#fdb8e4` | le rose signature |
  | `--secondary` | `0.9221 0.0871 86.29` | `#ffe2a2` | jaune pastel |
  | `--color-brand-lavender` | `0.72 0.11 295` | `#a996e2` | |
  | `--color-brand-mint` | `0.78 0.11 165` | `#6ccea6` | |
  | `--color-brand-sun` | `0.85 0.11 86` | `#eec976` | |
  | `--destructive` | `0.54 0.17 25` | `#bd3838` | assombri le 2026-08-05 pour passer AA |
  | `--success` | `0.52 0.14 145` | `#267d30` | |
  | `--warning` | `0.75 0.15 85` | `#d9a514` | |
  | `--info` | `0.55 0.15 250` | `#0f74c5` | |
  | `--radius` | `0.75rem` | 12 px | `sm .5rem` · `md 1rem` · `lg 1.25rem` · `xl 2rem` |

  **Règle de couleur qui découle de ces valeurs, et qui débloque les directions colorées** : les quatre
  accents (rose, lavande, menthe, soleil) sont **trop clairs pour porter du texte** sur le fond — 1,5 à
  2,5:1, très en dessous d'AA. Mais avec `--foreground` POSÉ DESSUS, ils donnent 7,8 à 12,7:1. Donc :
  **les accents sont des aplats, des traits, des halos et des fonds de badge — jamais une couleur de texte
  sur fond clair.** Une direction franchement colorée est possible et conforme ; elle passe par la surface,
  pas par l'encre. (Le couple `--destructive` + blanc donne 5,55:1 — et 5,40:1 sur le fond — depuis
  l'assombrissement du 2026-08-05, verrouillé par `destructive-ink-contrast.regression.test.ts` : AA passe,
  y compris en encre. Une maquette bâtie sur l'ancien `#cf4946` reproduirait le défaut que cette correction
  a résorbé.)

  ⚠️ **Convertis en OKLab, pas en CIE Lab.** Les deux espaces ont un `L` qui ne veut pas dire la même
  chose, et la confusion est silencieuse : elle rend des gris **trop clairs et trop violacés**. Une
  version antérieure de ce prompt donnait `#1c1a21` et `#6c6577` pour les deux premiers gris — soit un
  `--muted-foreground` à 5,4:1 sur le fond, alors que le vrai est à **7,23:1** (et que `app/globals.css`
  documente « ratio 6:1+ »). Des maquettes bâties là-dessus font échouer un audit de contraste que la
  vraie boutique passe. Pour tout autre token, relis `app/globals.css` et convertis — ne devine pas une
  couleur « à peu près rose », et si une valeur `oklch` a changé depuis la date ci-dessus, c'est le
  fichier qui fait foi (cf. §3).
- **Les polices ne sont pas chargeables** (CSP stricte, aucun hôte externe) : substitue une pile locale
  proche — sans pour Winky Sans (`"Trebuchet MS", "Segoe UI", sans-serif`), script pour Kalam
  (`"Snell Roundhand", "Apple Chancery", cursive`) — et **écris-le dans le footer**. Ne prétends jamais
  montrer la vraie typographie.
- **Le document est thémé, les maquettes ne le sont JAMAIS.** L'app n'a pas de thème sombre : un aperçu qui
  s'inverserait avec le thème du lecteur mentirait sur le rendu réel. Les variables des maquettes — préfixées
  `--a-*`, pour « aperçu », afin qu'aucune ne puisse être confondue avec un token du document — sont fixées en
  clair, hors de tout `prefers-color-scheme` et hors de tout `[data-theme]`.
  **Deux exceptions, et ce sont des paires, pas des bascules** : l'e-mail et le Payment Element Stripe
  existent réellement en sombre (§3). Montre-les en **deux plaques côte à côte**, chacune figée dans son
  mode et légendée — jamais une plaque unique qui s'inverse avec le lecteur, ce qui rendrait la comparaison
  impossible et le reste de la page incohérent.
- **Largeur fixe + `zoom` sur un wrapper.** Une maquette desktop se déclare `width:1280px` et se réduit par
  `zoom` (≈0,78 en large, ≈0,6 sous 62rem, ≈0,5 sous 42rem) — `zoom` et pas `transform: scale()`, qui
  laisserait la boîte à sa taille d'origine et créerait un vide fantôme. Sous le seuil où elle devient
  illisible, elle cesse de rétrécir et **défile dans sa plaque** (`overflow-x:auto` sur le conteneur) : une
  plaque qui défile ne fait jamais déborder la page. Ne construis pas une maquette responsive — tu montrerais
  le comportement de l'artifact, pas celui du site.
- **Une plaque = une figure.** `<figure>` avec un `<figcaption>` qui commence par une pastille de format
  (`1280 px`, `390 px`, `A4`, `600 px — sombre`) et poursuit par ce qu'il faut regarder : pas « aperçu
  desktop », mais « survole Les créations : le trait se dessine, le panneau est scotché ».
- **Les maquettes sont des illustrations, pas des interfaces.** Ne mets pas de `<button>` ni de `<a href>`
  réels dedans : ils seraient tabulables et annoncés comme actionnables alors qu'ils ne font rien. Utilise des
  `<div>`/`<span>`, ou pose `inert` sur la plaque. Corollaire à ne pas rater : une plaque `inert` est retirée
  de l'arbre d'accessibilité, donc **c'est le `<figcaption>` qui devient la seule description de la maquette**
  — écris-le en conséquence, il porte l'information pour qui ne voit pas l'image. Pour montrer un état de
  focus, fais une **plaque statique séparée** légendée « état focus » plutôt que de rendre la maquette
  focusable. Les `:hover` de démonstration, eux, marchent très bien sur un `<div>` — et si l'argument d'une
  direction est un micro-mouvement, il doit se laisser essayer à la souris. Seule exception à `inert` : le
  sélecteur du banc d'essai (§5.4), qui appartient au document et doit donc être un vrai contrôle, étiqueté
  et atteignable au clavier.
- **Le mouvement se maquette — mais jamais SEULEMENT en mouvement.** L'artifact est une page vivante : une
  `transition` CSS au `:hover` d'un `<div>` fonctionne, une `@keyframes` en boucle aussi. Sers-t'en, parce
  qu'une direction dont l'argument EST un geste (un trait qui se dessine, un panneau qui glisse, une carte
  qui se redresse) est indémontrable en prose — c'est même le seul type d'argument que ce format perdait
  entièrement. Trois contraintes, cumulatives :
  · **la durée et la courbe sortent de `MOTION_CONFIG` et des `--duration-*`/`--ease-*`** (§4.3), jamais
    d'un `0.3s ease` improvisé : une démo réglée sur des valeurs qui n'existent pas dans le repo promet un
    rendu que l'implémentation ne pourra pas tenir ;
  · **double toujours la démo animée d'un triptyque STATIQUE** — trois plaques côte à côte, « départ ·
    milieu · fin ». Trois lecteurs ne verront jamais l'animation : celui qui a activé
    `prefers-reduced-motion`, celui qui lit une capture d'écran, et **toi-même au §7** — tes captures
    Playwright sont des images fixes, donc un argument qui n'existe qu'en mouvement échappe à ta propre
    vérification et arrive non relu jusqu'à l'arbitrage ;
  · **toute animation de la page a son repli `prefers-reduced-motion: reduce`** (le §7 en fait une passe de
    capture, et le §8 l'exige des directions) : sous ce réglage une boucle décorative s'ARRÊTE, elle ne
    ralentit pas — et l'information qu'elle portait doit rester lisible dans le triptyque.
- **Les cibles tactiles ≥ 44 px se mesurent dans la coordonnée de la maquette, AVANT `zoom`.** À `zoom: 0.5`,
  un carré de 44 px en mesure 22 à l'écran : c'est normal et ce n'est pas un défaut de la direction. Ne
  « corrige » pas une maquette sur ce qu'affiche ta règle à l'écran.
- Les images de produits se simulent en dégradés (`linear-gradient`) : pas d'asset externe, pas de data-URI
  lourde. Un artifact de ce type tient en moins de 150 Ko ; la limite dure est 16 Mo.
  ⚠️ **Un dégradé flatte, et c'est le biais intégré de ce format** : il est toujours net, centré, du bon
  ratio, et harmonisé avec ses voisins — quatre choses que les vraies photos de la boutique ne sont pas
  (§4.6). Au moins une plaque doit donc simuler une photo HOSTILE : un dégradé quasi blanc pour la pièce
  claire sur fond clair, un dégradé d'une famille de teinte étrangère à côté des autres pour le fond qui
  jure, une boîte au ratio portrait dans une case carrée. Légende-la comme telle — c'est la plaque qui
  décide, et si tu ne la dessines pas, l'arbitrage se fait sur une série idéale qui n'existe pas.

═══════════════════════════════════════════════════════════════════════════════
7 — LE DOCUMENT LUI-MÊME, ET SA VÉRIFICATION
═══════════════════════════════════════════════════════════════════════════════
Il doit être aussi soigné que ce qu'il propose — un audit de design mal composé ne se fait pas croire.
Charge d'abord la skill `artifact-design`. Puis, sans t'interdire mieux : palette et typographie du document
**distinctes de celles de la boutique** (le document est l'établi, la boutique est l'objet posé dessus — les
confondre rend les maquettes illisibles), une famille mono pour les eyebrows, les refs de fichiers et les
en-têtes de tableaux, `text-wrap: balance` sur les titres, une mesure de texte bornée (~40rem) même dans un
conteneur large, et un `@media (prefers-reduced-motion: reduce)` en fin de feuille. Le document, lui, se
thème — `prefers-color-scheme` **et** `:root[data-theme]`, les deux.

Écris le fichier dans le scratchpad, puis **REGARDE-LE AVANT DE PUBLIER**. C'est non négociable : le JSX ne
dit rien du rythme d'espacement ni du contraste réel, et une maquette qui déborde ne se voit que rendue.
Script Playwright jetable (le repo a `@playwright/test`), sur `file://<chemin du fichier>`, aux largeurs de
la SSOT `VIEWPORTS` (`e2e/constants.ts`) plutôt qu'à des valeurs re-dérivées — `MOBILE` 390, `TABLET_PORTRAIT`
768, `DESKTOP` 1280 ; la SSOT en porte d'autres quand la cible l'exige (`REFLOW_320` 320 — WCAG 1.4.10 —,
`TABLET_LANDSCAPE` 1024, `ADMIN_DESKTOP` 1680, la seule largeur où le plafond admin `max-w-[100rem]` se voit) :
  · captures pleine page aux trois largeurs ;
  · **les DEUX mécanismes de thème, pas un seul** — une passe `colorScheme: "dark"` / `"light"` (qui ne
    pilote que `prefers-color-scheme`) ET une passe qui force `document.documentElement.dataset.theme`
    à `"dark"` puis `"light"`. C'est `data-theme` que stampe le sélecteur de thème du lecteur, et il doit
    gagner dans les deux sens : ne vérifier que `prefers-color-scheme` laisse la moitié du mécanisme
    non testée. Dans les quatre cas : le DOCUMENT bascule, les MAQUETTES ne bougent pas d'un pixel ;
  · une passe `reducedMotion: "reduce"` ;
  · et cette assertion, qui attrape le bug numéro un de ce format — **aux trois largeurs, pas seulement
    à 390** :
      document.documentElement.scrollWidth <= window.innerWidth
Puis **rouvre les captures et juge-les.** Corrige, relance, et seulement ensuite publie.

⚠️ **Le rendu local n'est pas exactement le rendu publié.** Ton fichier n'a ni `<!doctype>` ni `<head>` (voir
ci-dessous) : c'est la publication qui l'enveloppe, en ajoutant un reset CSS **absent en `file://`**. Un
débordement peut donc passer en local et apparaître en ligne. Après publication, rouvre l'URL et refais au
moins la capture 390 px — c'est le seul rendu qui fait foi.

Publie avec `Artifact` : `<title>` dans le HTML, `description` d'une phrase, `favicon` en emoji. Pas de
`<!doctype>`, `<html>`, `<head>` ni `<body>` — la page est enveloppée à la publication. Aucune ressource
externe : tout inline, et **aucune capacité runtime** (pas de `capabilities`, pas d'appel `window.claude.*`,
pas de MCP, pas de stockage persistant) — un support d'arbitrage doit rendre la même chose dans six mois.
Republier le MÊME chemin de fichier met à jour la MÊME URL — donc corrige et republie autant de fois qu'il
faut, le lien ne change pas.

⚠️ Cette dernière phrase ne vaut que **dans la session courante**. Si je te demande de reprendre un artifact
publié lors d'une conversation antérieure, republier le même chemin crée une URL NEUVE et abandonne
l'ancienne : il faut passer `url:` (retrouvée avec `action: "list"`) pour écrire au bon endroit. Garde aussi
le `favicon` stable d'une version à l'autre — c'est à lui qu'on reconnaît l'onglet.

Si tu ne peux pas rendre la page (Playwright indisponible, environnement contraint), écris-le noir sur blanc
dans ta restitution et dis ce que tu n'as donc pas pu juger. Ne présente jamais une vérification visuelle que
tu n'as pas faite.

═══════════════════════════════════════════════════════════════════════════════
8 — GARDE-FOUS
═══════════════════════════════════════════════════════════════════════════════
Aucune direction ne contredit un `@regression` sans le dire explicitement dans sa colonne « ce qu'il faut
accepter ». Aucune nouvelle dépendance, aucune police de plus. Cibles tactiles ≥ 44 px dans toutes les
maquettes. **Contraste AA : 4,5:1 sur le texte, 3:1 sur les éléments d'interface et les états de focus** — et
un état qui ne se distingue QUE par la couleur n'existe pas. Toute animation proposée a un repli
`prefers-reduced-motion` — dis-le dans la direction, pas seulement dans le code futur. Toute affordance
porteuse d'information révélée au survol doit l'être au focus clavier, et la règle de focus ne se met JAMAIS
derrière `can-hover:` (c'est le **masquage** qu'on gate, pas la révélation — sinon le CTA reste cliquable en
`opacity-0` sur iPad). Si la cible est un composant partagé, dis pour chaque direction si elle se propage à
tous ses usages ou reste locale : « on verra » n'est pas une réponse.

**Déjà proposé et refusé sur ce projet — ne le repropose pas.** Cette liste est le **sur-ensemble** des refus
dispersés dans les trois autres catalogues de `docs/` ; la source de vérité reste `memory/` (§3, passe 3) —
un fichier `feedback-*` par refus, ou la section « décisions » du fichier d'audit qui l'a enregistré —, où
figure aussi le motif. Si tu en trouves un de plus là-bas, il compte, et signale-le pour qu'il soit ajouté
ici : cette liste a déjà divergé TROIS fois, c'est son mode de panne.

- **Mouvement** : View Transition sur une fermeture Vaul, sur l'ouverture d'un sheet, sur `onSelect` d'Embla,
  ou du hero flottant vers la PDP · curseur qui suit — dans le hero ET dans `ParticleBackground` (les props
  souris ont été supprimées : tout suivi de curseur est refusé, pas seulement celui du hero) · chevron de
  scroll dans le hero · micro-animation sans fonction · hook `useMotionAllowed`.
- **Overlays** : `Drawer` pour une confirmation (c'est `AlertDialog`) · `handleOnly` par défaut.
- **Storefront** : CTA sticky mobile sur la PDP · icônes dans le bandeau réassurance du hero · troisième
  entrée dans la nav desktop — du même arbitrage (2026-05-30) : bande de réassurance des méga-menus RETIRÉE
  et carte « spotlight » large ANNULÉE · toast à l'ajout au panier (les ~24 `showSuccessToast: false` sont un
  choix, pas un oubli) · `bg-muted` — ou tout gris de séparation — sur le panneau du panier (« jugé moche » ;
  le correctif retenu est une ombre, `--shadow-paper`) · cue tactile sur `CollectionCard` (le trait rose
  reste hover/focus seulement, assumé sur tactile — 2026-08-05) · « · fait main » dans l'eyebrow des cartes
  (retiré DEUX fois le même jour, ProductCard puis CollectionCard : type de produit seul).
- **Checkout** : champs et bouton en PILULES — ASSUMÉS, Stripe a été aligné dessus (`borderRadius: "2rem"`) :
  ne les re-signale plus · délais de préparation atelier volontairement non affichés (« 2-4 jours ouvrés » =
  transport seul) · pas de case à cocher CGV (acceptation passive choisie) · persistance du formulaire de
  paiement (KI-002, **refusé deux fois** — ne le remets pas sur la table).
- **Légal** : numéro de téléphone absent des mentions légales — assumé.
- **Admin** : double bouton retour en mobile · bouton Cancel sur les formulaires de création.
- **Formulaires** : `autoFocus`.
- **Filtres** : refondre le pattern du `ProductFilterSheet`. Son état courant — **accordéon sur écran
  unique**, sections repliables, « Appliquer » en pied — a été arbitré DEUX FOIS le même jour
  (2026-05-20) : rejet de l'accordéon → drill-down master-detail « ux native like mobile » → rejet du
  drill-down et retour à l'accordéon, « je préfère avoir tout sur la même interface », les 4 fichiers
  supprimés. Le drill-down est donc une direction déjà écrite, déjà montrée et déjà refusée. Ne la
  represente pas sans me poser explicitement la question.
- **Plateforme** : PWA — manifest, service worker, page hors ligne, invite « installer l'app ». Refus
  définitif du 2026-07-26 (« pas de pwa pas besoin ») ; 15 assets et une spec E2E entière sont partis avec.
  ⚠️ Ça mord sur la ligne **Matrice d'états** du §2 : l'état « hors ligne » n'existe pas ici, ne le dessine
  pas dans une matrice sous prétexte de complétude.
- **Haptique** : parcimonieuse — jamais sur une action passive ni sur un simple affichage.

Et une préférence de fond, qui n'est pas un refus mais tranche les cas limites : **patterns natifs plutôt
que rustines cosmétiques.**

═══════════════════════════════════════════════════════════════════════════════
9 — RESTITUTION (en plus de la page)
═══════════════════════════════════════════════════════════════════════════════
Quatre choses, courtes — pas un résumé de la page, je vais la lire :
1. **L'URL de l'artifact.**
2. **Ta recommandation en une phrase**, et le défaut principal qu'elle corrige.
3. **La direction que tu as tuée à regret**, et pourquoi. Je veux savoir ce que j'ai failli avoir.
4. **Ce que tu n'as pas pu vérifier, et les dérives constatées** : un fichier non lu, une donnée substituée,
   un comportement que la maquette ne rend pas, une capture que tu n'as pas pu prendre — et tout fait de ce
   prompt qui ne correspondait plus au repo. Ne présente jamais comme observé ce que tu as déduit. Ce point
   est ce qui empêche ce fichier de pourrir ; ne le saute pas parce qu'il paraît vide.

═══════════════════════════════════════════════════════════════════════════════
BARÈME — tu seras noté là-dessus, auto-évalue-toi avant de rendre
═══════════════════════════════════════════════════════════════════════════════
25  Les directions divergent vraiment, l'une d'elles ose, et le banc d'essai les rend comparables.
20  Tout ce qui est affirmé est dessiné, et les maquettes tiennent sur le contenu le plus laid.
20  Le diagnostic est ancré (fichier:ligne, @regression, refus passés) et calibré honnêtement.
15  L'alignement de marque : coloré, fait main, avec quelqu'un derrière, le lexique et les motifs du §1
    mobilisés à bon escient — jamais joaillerie précieuse.
10  Le document est lui-même bien composé, thémé, sans débordement, et tu l'as REGARDÉ.
10  La recommandation est tranchée, lotie, et dit ce qu'elle ne réglera pas.

═══════════════════════════════════════════════════════════════════════════════
CIBLE
═══════════════════════════════════════════════════════════════════════════════
CIBLE : <CIBLE>
```

---

## Après l'artifact

L'artifact ne modifie rien. Une fois la direction choisie, ouvre une **session fraîche sur une branche dédiée**
et colle [`REDESIGN-PROMPT.md`](REDESIGN-PROMPT.md), qui **se termine** par cinq entrées prévues pour recevoir
cet artifact :

```
CIBLE : <chemin>
DIRECTION RETENUE : <la lettre + le nom + le concept + les nombres et le critère d'échec, de #directions>
NOTE AVANT : <la note /20 + les 6 jauges + l'encadré « ce qui est déjà juste », de #verdict>
REFUS ET INVARIANTS HÉRITÉS : <la section #gardefous, recopiée telle quelle>
LOTS : <le tableau Lot | Contenu | Dépend de, recopié de #reco>
```

⚠️ Les deux premiers champs portent **plus que le titre de la section**. Les nombres et le critère d'échec
sont ce qui rend une direction falsifiable à l'implémentation ; l'encadré « ce qui est déjà juste » est la
liste de ce que la refonte doit **préserver**. Les recopier au strict minimum, c'est livrer une direction que
la session d'implémentation ne peut ni vérifier ni protéger.

Les sections de l'artifact sont écrites pour se copier **telles quelles** dans ces cinq champs — c'est la
raison de leur format. `#gardefous` en particulier n'existe que pour ça : sans elle, la session
d'implémentation re-grep tout et peut re-proposer un refus déjà exprimé. `LOTS` est en dernier parce que
c'est le seul champ multi-ligne : les entrées d'une ligne se saisissent avant, sans naviguer.

Si l'artifact conclut à un lot 0 de correctifs indépendants de la direction, il se livre séparément et
d'abord : ce sont des bugs, pas du design, et les faire passer avec la refonte rend le diff illisible.
