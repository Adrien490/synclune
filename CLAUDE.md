# CLAUDE.md

## Project Overview

Synclune - E-commerce bijoux artisanaux (Next.js 16, React 19, TypeScript, Prisma 7, Stripe
Checkout hébergé). **Schéma lean depuis la migration d'août 2026** (10 modèles, auth maison,
zéro cron) — l'historique de la migration vit dans `docs/MIGRATION-PROMPTS.md`.

**Qui c'est, et pourquoi ça change les arbitrages** — SSOT `shared/constants/brand.ts` +
`BUSINESS_INFO` (`shared/constants/seo-config.ts`) :

- **Petite micro-entreprise française**, entrepreneur individuel en **franchise de TVA** (art. 293 B
  CGI), **une seule personne** (Léane, la créatrice) — pas d'équipe technique, pas d'astreinte.
- **Bijoux créatifs et colorés, faits main.** ⚠️ **Pas de la joaillerie précieuse.** La marque
  exprime la créativité colorée de Léane : des petits objets **polychromes, narratifs et
  miniatures** — joyeux, un peu **décalé**, personnel, artisanal. Toute proposition de design bâtie
  sur le métal précieux, la gravure ou le « luxe discret » est le **contre-pied** du brief — c'est
  une erreur déjà commise, ne pas la refaire. « Bijoux » ≠ « joaillerie ».
- **B2C, France + Union Européenne** (27 États + Monaco), **français et EUR uniquement** (choix
  assumés, pas des manques), ~**20 commandes/mois** visées.

Ce profil justifie la plupart des choix qui suivent : un bouton admin plutôt qu'un cron, un mot
de passe admin unique plutôt qu'une table d'utilisateurs, pas de rate limiting, pas de i18n, pas
de multi-devise, une facture HTML imprimable plutôt qu'un PDF archivé. Une recommandation qui
présuppose une équipe, un trafic ou un catalogue plus gros passe à côté.

- **Storefront** (`/`, groupe de routes `(shop)`) - Produits, panier, redirection paiement
- **Admin** (`/admin`) - Catalogue, commandes, rétractations, dashboard
- **Stripe Checkout hébergé** - la page de paiement est chez Stripe ; 2 webhooks
- **Emails** - React Email + Resend (5 templates)
- **Auth** - un seul mot de passe admin (`ADMIN_PASSWORD`), cookie HMAC maison ; **aucun compte
  client** — tout le parcours d'achat est invité

### Direction artistique — lexique de marque

**Lexique complet : [`docs/BRAND-DA.md`](docs/BRAND-DA.md)** — les six territoires en détail, le
vocabulaire des formes, la palette, l'univers photographique, le ton éditorial, le moodboard et le
répertoire SEO. Ci-dessous le seul extrait qui change un arbitrage de design.

Formule de référence : **« Synclune crée à Nantes des bijoux miniatures, colorés et expressifs,
inspirés par les fruits, la pluie, les tableaux, le ciel et les souvenirs d'enfance »** — version
courte, **« des petits mondes colorés à porter »**. Noyau lexical : **couleur (polychromie) + goutte

- récit + fait main + miniature + Nantes**. ⚠️ « Bijoux artisanaux, colorés et poétiques » n'est pas
  faux, il est **interchangeable** : n'importe quelle boutique de bijoux peut le signer.

**La vibe, en une phrase : créatif, coloré, narratif, un peu décalé — jamais tiède.** L'audace a une
couverture officielle — le lexique assume « pop », « maximaliste », « statement », « bonbon » — donc
c'est la **sobriété qui doit se justifier**, pas l'inverse : une direction sage, neutre ou
« intemporelle » rate le brief aussi sûrement qu'une direction en or.

- **Le trio cœur · étoile · lune est le raccourci le plus court vers un « oui » de Léane** (verbatim
  du 2026-08-06 : « si c'est rose et dans la DA cœur étoile lune ça va me plaire »). ⚠️ Il garde un
  consommateur, mais en **détail** et non plus en sujet : le cœur ponctue le portrait de l'atelier
  (`ACCENT_SHAPE_PATHS.heart` via `HandDrawnAccent`), et sur la carte de partage les « étoiles » de
  la Nuit étoilée sont des TOUCHES de peinture jaunes — aucun glyphe d'étoile ni de lune dans la
  scène (`shared/components/hand-drawn/creations.ts`, rendu par `app/opengraph-image.tsx` via
  `shared/components/og/og-marks.ts`). ⚠️ Le présentoir a quitté le premier écran le 2026-08-07 —
  on ne dessine pas ce qui est photographié 40 px plus loin ; la carte de partage, elle, n'a
  aucune photo en face.
  Trois décors successifs l'avaient pris pour le sujet — c'est ce qui les a fait retirer, parce
  qu'une lune et deux étoiles ne disent rien que Synclune fabrique. À privilégier quand une
  direction doit choisir UN motif de PONCTUATION ; le sujet, ce sont les créations.
- **Le rose est l'ancre tokenisée ; la DA, elle, est polychrome et saturée.** `--primary` **EST** un
  rose (`app/globals.css`) et `--color-brand-rose-strong` sa version encre, pour les cas où le rose
  doit être **lu** et pas seulement vu ; lavande, menthe et soleil (`--color-brand-lavender` /
  `-mint` / `-sun`) tournent d'une section à l'autre via `[data-accent]`
  (`app/styles/section-accents.css`). La polychromie se joue par cette **rotation d'accents**, pas
  par un token de plus par couleur de bijou. Une surface qui raconte Synclune en gris avec un filet
  de rose a manqué le brief.
- **Maximalisme miniature** : répétition, accumulation, série, dégradé, symétrie imparfaite, effet de
  grappe ou de frange. La marque **multiplie de petits éléments** — elle ne pose pas une grosse pierre
  centrale, et ne verse pas pour autant dans le baroque luxueux.
- **Mots-clés centraux** : bijoux colorés · artisanaux · faits main · fantaisie · originaux ·
  narratifs · de créatrice · fabriqués en France · nantais · atelier nantais · créations uniques ·
  petites séries · pièce unique · commande personnalisée · assemblé/peint à la main.
- **Savoir-faire** : fabrication artisanale, peinture miniature, assemblage de perles,
  composition/recherche chromatique, association de matières, création en atelier, finitions
  à la main, expérimentation des formes.
- **Produits & matières** — ⚠️ uniquement quand c'est vrai pour la pièce : boucles pendantes,
  créoles colorées, boucles asymétriques, collier de perles/à breloques/gouttes, bague
  ajustable, bague cabochon, cabochon peint à la main, perles de verre colorées/irisées, résine,
  acrylique, acier inoxydable, plastique (fou) coloré, chaîne argentée/dorée.
- **Expressions SEO à privilégier** : « bijoux colorés faits main », « bijoux de créatrice
  française », « bijoux faits main à Nantes », « boucles d'oreilles colorées artisanales »,
  « bague peinte à la main », « bijoux inspirés de Van Gogh », « bijoux arc-en-ciel artisanaux »,
  « collier gouttes de verre », « bijou statement coloré », « bijoux roses faits main ». ⚠️ La règle
  « uniquement quand c'est vrai pour la pièce » vaut ici aussi : une expression descriptive (rose,
  cœur, arc-en-ciel, peint à la main) ne se pose sur une fiche que si le bijou l'est.
- **Trois gardes de transposition** : **irisé, pailleté, translucide décrivent les bijoux, jamais
  l'interface** (en paillettes ou verre dépoli, ils retombent dans le décoratif gratuit) ; **le
  pastel de marque ne porte pas de glyphe** (1,5–2,5:1 en texte) — il peint des aplats, des traits et
  des motifs, il n'écrit pas ; **girly ≠ mièvre** — le mot est **rétrogradé en registre secondaire**
  le 2026-08-06 (le centre est la polychromie narrative, pas le rose seul), mais quand il s'applique
  c'est le décalé et le naïf assumé qui empêchent le rose de virer princesse.
- ⚠️ **Les mots à ne pas mettre au centre** : minimaliste, sobre, épuré, neutre, intemporel, quiet
  luxury, premium, prestige, joaillerie fine, pierre précieuse, mariage chic — liste complète dans
  le lexique, appliquée aux surfaces d'identité (brand, JSON-LD, metadata) par
  `test/contract/brand-lexicon.contract.test.ts`. Une pièce isolée peut
  les mériter ; la marque, jamais. **Et le catalogue en base n'est pas la DA** — le jeu de
  démonstration (`prisma/seed.ts`) est du plaqué or, du Swarovski et des visuels de banque d'images,
  soit le contre-brief exact.

## Commands

**Avant toute PR : `pnpm validate`.**

```bash
pnpm validate               # lint + typecheck + format:check + vitest run — LE gate
pnpm dev                    # Dev server
pnpm build                  # Build (prisma generate + next build --turbopack)
pnpm start                  # Production server

# Tests
pnpm test                   # Vitest (suite complète)
pnpm test <chemin>          # Une seule suite / un seul fichier
pnpm test:critical          # Modules transactionnels (= ce que lance le hook pre-commit)
pnpm test:coverage          # Suite complète + couverture
pnpm test:integration       # Requiert INTEGRATION_DATABASE_URL (skip silencieux sinon)
pnpm e2e                    # Playwright E2E — voir § Testing pour l'env requis
pnpm e2e:ui                 # Playwright UI mode

# Qualité
pnpm lint                   # ESLint
pnpm typecheck              # tsc --noEmit
pnpm format                 # Prettier (write)
pnpm format:check           # Prettier (check only)
pnpm knip                   # Exports morts (traite "use server" comme point d'entrée)
pnpm doctor:check           # react-doctor --offline  (`doctor:full` pour le rapport complet)
                            # ⚠️ PAS `pnpm doctor` : pnpm a un builtin `doctor` qui shadow
                            # tout script de ce nom et sort en silence sans rien exécuter.
pnpm size                   # size-limit (`size:check` pour la sortie JSON)
pnpm analyse                # Bundle analysis

# Base de données
pnpm seed                   # Seed (conforme à la DA — cf. l'en-tête de prisma/seed.ts)
pnpm db:studio              # Prisma Studio GUI
pnpm db:push                # Schéma → base, sans migration (dev)
pnpm db:migrate             # prisma migrate dev
pnpm db:reset               # migrate reset + seed  ⚠️ DESTRUCTIF

# Divers
pnpm email:dev              # Preview emails (port 3001)
pnpm docs:stripe            # Mirror local de la doc Stripe → docs/stripe/
```

## Architecture

```
app/
├── (shop)/                  # Storefront (accueil, produits, collections, creations, favoris)
├── (legal)/                 # Pages légales (CGV, mentions, confidentialité, rétractation)
├── admin/
│   ├── connexion/           # Page de connexion (hors garde)
│   └── (protected)/         # Tout le reste (layout = garde dure, chaque page = assertAdminPage)
├── api/                     # admin/orders/export, csp-report, health, noop, uploadthing, webhooks
├── paiement/                # Récap + select pays + bouton payer ; retour/ et annulation/
├── suivi-commande/          # Suivi invité (token HMAC) + facture/ + avoir/ — SEUL accès client
└── opengraph-image.tsx      # Cartes de partage (3 routes dynamiques + accueil statique)

modules/                     # DDD
├── admin-auth/              # Cookie admin_session HMAC, requireAdmin, assertAdminPage
├── cart/ wishlist/          # Cookies httpOnly (panier 7 j, favoris 30 j) — rien en base
├── products/ variants/      # Catalogue : Product + ProductVariant (stock sur la variante)
├── collections/ colors/ materials/ product-types/ taxonomies/
├── payments/                # createCheckoutSession (réservation de stock + session Stripe)
├── webhooks/                # Transitions de commande (completed → PAID, expired → CANCELLED)
├── orders/                  # Admin commandes, suivi HMAC, facture Int, export CSV
├── retractations/           # RetractationRequest — machine à états monotone
├── dashboard/ emails/ media/

shared/                      # Cross-cutting : components (shadcn/Base UI), constants, hooks,
                             # lib (prisma, stripe, cache, cookie-security), stores, styles, utils
```

## Key Technologies

- **Auth** : maison — `ADMIN_PASSWORD` (env) + cookie `admin_session` signé HMAC. Zéro table.
- **Database** : PostgreSQL (Neon) + Prisma 7 (adapter `@prisma/adapter-neon`, client généré
  dans `app/generated/prisma`)
- **Paiement** : Stripe Checkout hébergé (`price_data` inline, EUR) — aucun JS Stripe côté client
- **Forms** : TanStack Form + `useAppForm`
- **State** : Zustand (dialog, alert-dialog, sheet, cookie-consent, badge-counts, overlay-stack)
- **UI** : shadcn/ui sur **Base UI** (`@base-ui/react`) + Tailwind v4 + Motion (`motion/react`)
- **Uploads** : UploadThing
- **Monitoring** : Sentry (tunnel via `/monitoring`)

### Auditer ou refondre la landing — la grille vit dans [`docs/LANDING-BEST-PRACTICES.md`](docs/LANDING-BEST-PRACTICES.md)

**Tout audit ou refonte de `/` part du § 9 de ce document**, pas de critères ré-inventés : c'est
exactement ce qu'il existe pour empêcher (chaque passe précédente refabriquait sa grille, et un
critère refabriqué peut s'inverser d'une session à l'autre). Chaque ligne y porte sa **méthode de
vérification** et le test qui la verrouille, et la grille sort une **note /100 + P0-P3**. Le § 0.3
liste ce qui, à ce format d'entreprise, ne s'applique **pas** — l'A/B testing y est
arithmétiquement indisponible (§ 7). ⚠️ Le périmètre audité inclut `app/(shop)/layout.tsx`
(navbar, pied de page, barre basse, bannière cookies), pas seulement les 4 sections de `page.tsx`.

### Conventions UI

**À lire avant de toucher à un composant.** Les règles ci-dessous sont les invariants ; chacune
nomme le test qui la verrouille, et c'est ce test qui en porte le _pourquoi_ et les contre-exemples.

- **Breakpoints en rem, jamais en px** — aucune largeur en px dans un `matchMedia()`, une media query manuelle ou un `--breakpoint-*`. SSOT `shared/constants/breakpoints.ts`. Un seuil JS en px décroche du CSS Tailwind dès que la police racine n'est plus à 16px (WCAG 1.4.4), et les composants **hybrides** tombent alors dans le vide. Verrouillé par `no-px-media-query.regression.test.ts`.
- **Variables CSS : critère d'admission** — un token n'entre dans `globals.css` que consommé depuis ≥ 2 fichiers, depuis JS **et** CSS (coordination runtime), ou verrouillé par un test (WCAG, parité `MOTION_CONFIG`) ; une valeur décorative mono-usage s'écrit en arbitraire au call site. Les tokens `@theme` sont la config Tailwind v4, pas « du CSS en plus » — ne pas les remplacer par de l'oklch dupliqué. Verrouillé par `theme-token-consumers.regression.test.ts`.
- **Seuils de navigation** : bottom-nav boutique à `lg` (couvre l'iPad portrait), bottom bar + sidebar admin à `md`. `--bottom-bar-height` vaut déjà 0 quand la barre est absente — ne pas préfixer son offset d'un breakpoint.
- **Plafonds de contenu** : storefront `max-w-6xl`, checkout `max-w-5xl`, admin `max-w-[100rem]` **sans `mx-auto`**. ⚠️ **Un palier de colonnes ne s'ajoute que si le conteneur grandit avec lui** — au-delà du plafond, une colonne de plus rétrécit les cartes.
- **Survol ⇒ focus** pour toute affordance porteuse d'information (WCAG 2.4.7). ⚠️ **Jamais de règle de focus derrière `can-hover:`** : elle ne s'appliquerait jamais au clavier sur tactile. Gater le hover seul — et gater le **masquage**, pas la révélation, sinon le CTA reste cliquable en `opacity-0` sur iPad.
- **Overlays** : `ConfirmDialog` (confirmation), `ResponsiveDialog` (formulaire, bascule sur `md`), `Sheet` (panneau persistant), `Drawer` (feuille éphémère). Les 4 sont des couches Base UI : **une seule pile de dismiss**, donc migrer une famille sans les autres est interdit. Un overlay enfant se rend **dans** l'arbre JSX du parent — ⚠️ et son `Backdrop` exige alors `forceRender`, sans quoi Base UI ne le rend PAS (`enabled: forceRender || !nested`) et le panneau reste net sous la modale, sans erreur.
- **Règle d'admission `responsive-*`** : un fichier `responsive-*` n'existe **que** s'il rend une primitive différente selon le viewport. Tout autre wrapper porte un nom qui décrit ce qu'il **décide**, et n'existe que s'il change le rendu ou possède un état non trivial ; **un wrapper dont ≥ 50 % des exports sont des pass-through est un bug d'architecture**. `responsive-alert-dialog.tsx` (179 l., 7 pass-through sur 9, aucune bascule) a été supprimé le 2026-08-06 — son `tone` vit sur `AlertDialogAction`.
- **Confirmations** : tout footer `[Annuler, Confirmer]` passe par `ConfirmDialog` (`shared/components/dialogs/`) ; on ne descend aux primitives que si un des 4 invariants de frontière est faux, avec dérogation motivée dans `confirm-dialog-boundary.regression.test.ts`. ⚠️ **Le bouton de confirmation ferme le dialog AU CLIC** (c'est un `Close` Base UI, la fermeture précède la mutation) : un libellé d'attente ou un spinner piloté par `isPending` n'est jamais vu — le retour d'attente est le toast — et une validation HTML (`required`) ne peut pas être rapportée, d'où `confirmDisabled`. Verrouillé par `alert-dialog-close-on-confirm.regression.test.tsx`.
- ⚠️ **Jamais `<SheetClose render={…}>` / `<DrawerClose render={…}>` autour d'un `<Link>`** — `history.back()` race le `router.push` et annule la navigation, sans erreur visible. Fermer par la prop contrôlée, naviguer en `replace`.
- **`render`, jamais `asChild`** — Base UI n'a pas de `Slot`, et la règle **n'a pas d'exception** : plus aucun `asChild` dans le dépôt. `render` déplace l'ÉLÉMENT, pas les enfants.
- **`data-*` booléens, plus de `data-state`** — `data-open:` et non `data-[state=open]:`. ⚠️ `Menu.Item` / `Select.Item` ne prennent pas le focus DOM : c'est `data-highlighted:`, jamais `focus:`.
- **`handleOnly`** : uniquement sur collision de gestes constatée et commentée sur le call site. Verrouillé par `handle-only-allowlist.regression.test.ts`.
- **Panneaux : une TRANSITION, pas une animation keyframes** — une `animate-in` écraserait le translate piloté par le geste.
- **Aucune couleur de token dans une prop d'animation Motion** (`animate`, `initial`, `exit`, `while*`, objets `*Variants`) — Motion n'interpole que hex / `rgb()` / `hsl()`, et **tous** nos tokens sont des `oklch()`. Il résout le `var(--…)` via `getComputedStyle`, ne sait pas mélanger le résultat, et retombe sur `mixImmediate` : la couleur **saute à la frame 1**. Le fondu n'existe pas, alors que l'état change bien — le défaut ne se voit qu'en console. ⚠️ Les moteurs sérialisent la valeur calculée d'un `oklch()` en **`lab(…)`** — vérifié sur Chromium comme sur WebKit, à la virgule près (`lab(82.3361% …)` vs `lab(82.3361 …)`) : chercher « oklch » dans la console ne ramène rien, c'est le même token sous un autre nom. Le correctif n'est **jamais** un hex dupliqué (`--primary` est SSOT) : superposer des tracés aux couleurs **statiques** et animer leur `opacity`. Verrouillé par `motion-animatable-colors.regression.test.ts`.
- **Graisse des montants : deux crans, jamais `font-bold`** — total à payer d'un récap client en `font-semibold`, tout le reste (ligne d'article, sous-total, prix unitaire, ligne de tableau admin) en `font-medium`. Le prix héros d'une PDP est à part : `font-display` + **`font-normal`**, il tient par la taille et la fonte (même logique que les h1 en `font-light`). ⚠️ **Le rôle ne se déduit pas de l'expression** : `order.total` dans une ligne de tableau admin est un montant parmi vingt, il reste en `font-medium`. Un montant en `font-bold` casse l'échelle — il ne reste plus de cran au-dessus pour distinguer le total de sa ligne. Avant l'audit du 2026-08-05, un montant se rendait sous **quatre** graisses selon le fichier, avec deux paires co-visibles à la suite (récap de paiement → suivi de commande). `emails/` est hors périmètre (styles inline, pas de classes). Verrouillé par `amount-font-weight.regression.test.ts`.
- **Icônes : Phosphor, importées depuis `@phosphor-icons/react/ssr`** (migration du 2026-08-04 ; `lucide-react` est retiré). La racine du paquet tire ~9000 modules et ses composants CSR lisent `IconContext` — ils cassent **au rendu** en Server Component ; seuls les `import type` (`Icon`, `IconProps`) la visent. Le poids `regular` vaut exactement le trait **1,5** des SVG maison, donc **`weight`, jamais `strokeWidth`** : Phosphor peint en `fill`, la prop de trait n'a aucun effet et une classe `fill-*` ne remplit rien. ⚠️ Chaque icône embarque ses **6 graisses** dans un module unique, intreeshakable (~5× le gzip d'une icône lucide) : le seul levier de poids est le nombre d'icônes **distinctes** par route. Verrouillé par `phosphor-ssr-entry.regression.test.ts`.

### React 19 - NO MEMOIZATION

Le compilateur React 19 optimise automatiquement. **NE PAS utiliser:**

- `useMemo()`, `useCallback()`, `React.memo()`

**L'interdiction a une contrepartie, et elle se verrouille des deux côtés.** `reactCompiler: true`
(`next.config.ts`) est ce qui rend la mémoïsation manuelle inutile : le retirer ne casserait rien de
visible, l'application perdrait simplement toute auto-mémoïsation **en silence**. Les deux moitiés
sont donc tenues par `test/conventions/no-react-memoization.regression.test.ts` — absence des 4
tournures **et** présence du flag, plus « aucun fichier ne porte `"use no memo"` ».

⚠️ **Ne sont PAS de la mémoïsation manuelle** et restent encouragés : `useEffectEvent` (38 sites),
`useTransition`, `useDeferredValue`, et l'init paresseuse `useState(() => …)` pour une instance
stable (pattern des 4 providers Zustand).

⚠️ **Le shim `allowNavigationRef` des 16 formulaires admin est PORTEUR, ne pas le « nettoyer ».**
Il ressemble à du latest-ref hérité de React 18 (`useRef` + `useEffect` d'écriture, 3 lignes ×16),
et il répond en fait à un cycle réel : `useUnsavedChanges(isDirty, !isPending)` a besoin du
`isPending` de `useActionState`, dont le `onSuccess` a besoin d'`allowNavigation`. Appeler
`allowNavigation()` directement a été **essayé et mesuré** (2026-08-07, sortie du compilateur
diffée) : la valeur étant déclarée plus bas, le compilateur **renonce à mémoïser** tout l'argument
de `useActionState` — le cache du composant tombe de 78 à 71 slots et l'action est reconstruite à
chaque rendu. Le ref est ce qui LUI PERMET de mémoïser. `useEffectEvent` bute sur le même ordre.

**Ce qui fait ABANDONNER l'optimisation d'un composant** — le dépôt est à zéro sur les quatre, ne
pas les réintroduire : `try { … } finally { … }`, les assignations logiques `??=` / `||=` / `&&=`,
un `await import()` dans un corps de composant ou de hook, et la lecture de `ref.current` pendant
le rendu (seule la lazy-init null-guardée `if (ref.current === null)` est tolérée). Les 4 sites qui
ont **évité** `??=` pour cette raison le disent en commentaire — c'est le précédent à copier.

**Un composant client doit être PUR.** Pas de `new Date()` / `Date.now()` / `Math.random()` pendant
le rendu : SSR et hydratation ne retombent pas forcément sur la même valeur, et le compilateur se
voit confier une entrée qu'il ne peut pas mémoïser honnêtement. Le calcul remonte côté serveur et
descend en `ReactNode` (`DeliveryEstimator`, monté par la PDP et relayé en prop `deliveryEstimate`,
verrouillé par `delivery-estimator-stays-server.regression.test.ts`) ; à défaut, l'impureté est
assumée par un commentaire **et** un `suppressHydrationWarning`.

**Le filet réel, c'est ESLint, pas react-doctor.** `pnpm lint` porte les 16 règles
`eslint-plugin-react-hooks` v7 — dont les 14 issues du compilateur (`purity`, `immutability`,
`refs`, `set-state-in-render`, `preserve-manual-memoization`…) — et `--max-warnings=0` rend
bloquantes jusqu'aux 3 laissées en `warn` en amont, `unsupported-syntax` (les bail-outs ci-dessus)
comprise. ⚠️ Ces règles ne sont **écrites nulle part** dans `eslint.config.mjs` : elles arrivent par
`...nextConfig`, donc un bump d'`eslint-config-next` pourrait les retirer sans qu'un seul fichier
versionné ne bouge — d'où `test/contract/react-compiler-lint-rules.contract.test.ts`.

## Schéma lean — 10 modèles, et les règles qui vont avec

`Collection` · `Color` · `Material` · `ProductType` · `Product` · `ProductVariant` ·
`ProductMedia` · `Order` · `OrderItem` · `RetractationRequest`. Le schéma est la SSOT
(`prisma/schema.prisma`, baseline unique `20260815001033_init`) ; pas de `down.sql`, pas de
raw-guards SQL, pas de soft delete (`deletedAt` n'existe plus — supprimer supprime, les FK
`Restrict`/`SetNull` disent ce qui est protégé).

- **Chaque produit a AU MOINS UNE variante** ; le stock vit sur la variante, jamais sur le
  produit. Prix effectif d'une variante = `variant.priceCents ?? product.priceCents`.
- **Statuts = booléens `active`** (produit, collection, variante) — plus d'enum de publication.
- **Média sur le PRODUIT** (`ProductMedia`, position 0 = principal). `pickPrimaryImage()`
  (`modules/products/services/product-display.service.ts`) reste la SSOT « première IMAGE de
  l'ordre canonique » : `ProductMedia` est polymorphe (IMAGE/VIDEO) et une vidéo en position 0
  ne doit jamais atteindre `og:image` ni un `<Image src>`.
- **Identité URL d'une couleur = son nom slugifié** (`?color=bleu-nuit`) ; la résolution
  slug → nom vit dans `modules/products/data/resolve-filter-slugs.ts` — SQL ne sait pas
  slugifier, ne jamais comparer un slug à `color.name`.
- **`ProductType`** (conservé en forme lean `{ id, slug, label, position }`) : les 7 slugs
  système de `SYSTEM_PRODUCT_TYPE_SLUGS` pilotent le guide des tailles ; l'admin crée librement
  d'autres types ; suppression bloquée par FK `Restrict` tant que des produits pointent dessus.
- **Les `select` Prisma vivent dans `constants/`** (ex. `GET_PRODUCTS_SELECT`,
  `GET_ORDERS_SELECT`) — un select inline dans `data/` rate les migrations de schéma.
- **Visibilité : les data fns forcent** `active: true` pour tout appelant non-admin
  (`getProducts`, `getCollections`, `getProductTypes` acceptent `options.isAdmin`, obligatoire
  depuis un scope `"use cache"` où `isAdmin()` — qui lit les cookies — est interdit).
- Pas de `metaTitle`/`metaDescription` en base : titre SEO dérivé de `name` + prix, meta
  description = description tronquée.

## Cycle de vie d'une commande

```
createCheckoutSession (Server Action, POST du récap /paiement)
  → tx : décrément de stock CONDITIONNEL (updateMany stock >= qty, count vérifié)
       + Order PENDING avec snapshots (nameSnapshot, variantSnapshot, unitPriceCents)
  → session Stripe Checkout (price_data inline EUR, expires_at +31 min, metadata.orderId)
  → redirect(session.url)                     [échec Stripe ⇒ rollback compensatoire]

webhook checkout.session.completed  → PENDING → PAID   (+ invoiceNumber + email + adresse)
webhook checkout.session.expired    → PENDING → CANCELLED (+ restock, même transaction)
```

- **Idempotence par garde de transition**, pas par table : `updateMany({ stripeSessionId,
status: PENDING })` — un rejeu d'event est un no-op naturel. Pas de `WebhookEvent`.
- Les transitions partagées vivent dans
  `modules/webhooks/services/checkout-session-transitions.service.ts` ; le service retourne
  les tags de cache, **l'appelant invalide selon son contexte** (webhook →
  `revalidateTagsInBackground`, action admin → `updateTagsAfterMutation`).
- **Frais de port** : le select de pays sur `/paiement` fixe l'option de livraison ET verrouille
  `allowed_countries` sur ce seul pays (`SHIPPING_RATES` : FR 4,99 € / UE 9,50 €). ⚠️ Limite
  assumée : l'exclusion Corse/DOM-TOM par code postal n'existe plus au checkout — Léane arbitre.
- **JAMAIS de création de session sur un GET** — un prefetch réserverait du stock.
- **L'adresse est collectée par Stripe** et écrite au webhook (`Order.email` naît `""`).
- **Réconciliation** : bouton « Vérifier les commandes en attente » sur la liste admin
  (`reconcile-pending-orders.ts`) — PENDING > 24 h → `checkout.sessions.retrieve` → applique
  l'état réel. C'est le remplaçant des crons : il n'y en a AUCUN (`vercel.json` sans `crons`).
- **Annuler depuis l'admin** (PENDING) : la session Stripe est **expirée AVANT** la transition —
  une session encore `open` laisserait la cliente payer une commande annulée.

## Facturation — Int séquentiel, facture HTML

- `invoiceNumber Int? @unique` : attribué **dans la transaction** PENDING→PAID (`max+1`, retry
  P2002 ×3) ; le webhook (et la réconciliation, même service) est le **SEUL écrivain**. Jamais
  de commande PAID sans numéro ; l'échec des 3 tentatives fait répondre 500 (Stripe redélivre).
- **Facture = rendu HTML imprimable** (`/suivi-commande/facture`, token client OU session
  admin), reconstruite à chaque affichage : identité vendeur `getVendorLegalInfo()` (env),
  lignes snapshots, mention `DEFAULT_FRANCHISE_VAT_MENTION` (SSOT
  `shared/constants/vat-franchise.ts`). **Pas de PDF, pas d'archive, pas de hash.**
- ⚠️ Date de facture ET date d'encaissement de l'export = `createdAt` de la commande (écart
  réel ≤ ~31 min, la durée de vie d'une session Checkout). Limite assumée, documentée.
- **Export livre de recettes** (art. 50-0 CGI) : `POST /api/admin/orders/export` — CSV `;` +
  BOM UTF-8, commandes PAID/SHIPPED/REFUNDED triées par numéro.
- **Avoir** : `creditNoteNumber Int? @unique` sur `RetractationRequest` — compteur séquentiel
  **DISTINCT** du compteur facture, attribué au remboursement. Avoir = UNE ligne au montant
  remboursé + référence de la facture d'origine (art. 272-I), page `/suivi-commande/avoir`.
- Les **snapshots** (`nameSnapshot`, `variantSnapshot`, `unitPriceCents`, colonnes `shipping*`)
  sont figés au checkout/webhook ; une mutation Product/Variant ne modifie jamais un OrderItem.
  Le détail admin rend les SNAPSHOTS — les FK (`SetNull`) ne servent qu'aux liens de navigation.

## Suivi de commande invité — token HMAC

`/suivi-commande?commande=<id>&token=<hmac>` : token = HMAC-SHA256(`orderId:email` minuscule)
signé `AUTH_SECRET` (`modules/orders/lib/order-tracking-token.ts`), vérifié CONTRE l'email en
base — token invalide ⇒ 404 **indistinct** (anti-énumération). Lecture fraîche sans cache
(donnée nominative). `buildOrderTrackingUrl` est la SSOT de l'URL (fail-closed sans
`AUTH_SECRET`). C'est le SEUL accès client à une commande — il arrive par l'email de
confirmation.

## Rétractation (`modules/retractations/`)

Machine à états **strictement monotone**, gardée par `updateMany` sur le statut source :
`RECEIVED → ACKNOWLEDGED → AWAITING_RETURN → REFUNDED` ; `REJECTED` possible tant que non
remboursée. `@unique(orderId)` ⇒ une seule demande par commande, même rejetée.

- **Public** : bouton « Me rétracter » sur le suivi (motif optionnel) — parse Zod PUIS token
  HMAC vérifié AVANT toute écriture. Hors délai : soumettable (droit de demande), l'admin
  tranche. L'accusé part sans délai ; s'il part, la demande passe ACKNOWLEDGED.
- **Admin** (`/admin/ventes/retractations`) : « Colis reçu » → AWAITING_RETURN ; « Rembourser »
  → `stripe.refunds.create({ payment_intent })` INTÉGRAL, idempotencyKey
  `retractation-refund-<id>`, puis `finalizeRetractationRefund` : REFUNDED + `creditNoteNumber`
  - `Order.status` REFUNDED + restock **OPT-IN décoché par défaut** (bijou retourné ≠
    revendable) ; « Rejeter » : motif REQUIS ≥ 10 c., envoyé par email, **non persisté**.
- Pas de webhook `refund.*` : `stripeRefundId` est la trace. Échéance légale : 14 j après la
  DEMANDE (art. L221-24), badge calculé en couche data.

## Auth — un mot de passe, un cookie

`modules/admin-auth/` : cookie `admin_session` = `<expiry>.<hmac>` (HMAC-SHA256 de l'expiry
avec `AUTH_SECRET`, httpOnly + secure + sameSite=lax, 7 j). Login = comparaison
`ADMIN_PASSWORD` (env). **Zéro table d'auth en base.**

- Helpers : `requireAdmin()` (Server Actions, → `{ admin: true } | { error }`),
  `requireAdminApiRoute()` (routes, → `Response`), `isAdmin()` (couche data),
  `assertAdminPage()` (chaque `app/admin/(protected)/**/page.tsx` l'appelle — un layout
  partagé n'est PAS ré-exécuté en navigation client), `hasValidAdminSession()`.
- Le proxy ne valide PAS le HMAC (pas de node:crypto en edge) : il ne fait que du default-deny
  de routes ; c'est la PAGE qui valide et redirige.
- `connection()` avant `Date.now()` dans la validation de session (contrainte PPR), et
  `app/admin/connexion/loading.tsx` est une frontière Suspense OBLIGATOIRE.
- `ADMIN_DISPLAY_NAME = "Léane"` remplace tout `user.name`.
- ⚠️ **Toute page à IO non cachée (prisma direct, cookies) DOIT avoir un `loading.tsx`** —
  sinon le prérendu PPR échoue (« uncached data during prerendering »). Corollaire : depuis ces
  frontières Suspense, `notFound()` est streamé APRÈS le shell — le contenu est bien la 404
  mais le **statut HTTP est 200** (pages noindex, assumé ; les e2e assertent le CONTENU).

## Panier & favoris — cookies, rien en base

- **Panier** : cookie `cart` httpOnly 7 j glissants — lignes `{ variantId, quantity, prix
témoin }`. SSOT `modules/cart/lib/cart-cookie.ts`. Le prix du cookie est un témoin
  d'affichage : `createCheckoutSession` **revalide chaque ligne en base** avant de facturer.
- **Favoris** : cookie `wishlist` httpOnly 30 j glissants (ids produit). Un id supprimé devient
  inerte — aucune purge nécessaire côté serveur.
- **Un webhook ne peut PAS vider le panier** (un appel serveur-à-serveur ne porte aucun cookie
  client) : le vidage revient à la page de retour `/paiement/retour`. Une carte refusée ou un
  abandon garde le panier — c'est voulu, la cliente doit pouvoir réessayer.
- Le flag `secure` de TOUS les cookies applicatifs passe par
  `shared/lib/cookie-security.ts` (SSOT — WebKit refuse un cookie `Secure` posé depuis
  http://localhost, cf. § Testing).
- Rien côté serveur ne voit les paniers : pas de compteur « dans X paniers », et supprimer une
  variante ne peut pas être bloqué par des paniers — seule la garde `orderItems` (historique)
  reste.

## Server Actions Pattern

```typescript
"use server";

import { requireAdmin } from "@/modules/admin-auth/lib/require-admin";
import { validateInput, success, error, handleActionError } from "@/shared/lib/actions";
import { prisma } from "@/shared/lib/prisma";

export async function createSomething(
	prevState: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	const admin = await requireAdmin();
	if ("error" in admin) return admin.error;

	const validation = validateInput(schema, { name: formData.get("name") });
	if (!validation.success) return error(validation.error.errors[0]?.message);

	try {
		await prisma.model.create({ data: validation.data });
		updateTag("cache-tag");
		return success("Créé avec succès");
	} catch (e) {
		return handleActionError(e, "Erreur création");
	}
}
```

- **Une Server Action VALIDE son argument** : un fichier `"use server"` transforme chaque
  export en endpoint RPC aux arguments arbitraires — les types TS sont effacés à l'exécution.
  Parser AVANT de dériver quoi que ce soit de l'argument ; un helper appelé par une action ne
  vit jamais dans un module `"use server"`. Verrouillé par
  `test/contract/server-action-input-validation.contract.test.ts`.
- **Toute action admin passe par `requireAdmin()`** — verrouillé par
  `admin-actions-require-admin` (contract), `request-retractation` étant la seule action
  publique whitelistée (garde token HMAC documentée).
- **Il n'y a PLUS de rate limiting** (perte volontaire de la migration) — ne pas en réintroduire
  sans demande explicite.
- Lectures de validation dans `actions/` : acceptées quand elles sont atomiques avec la
  mutation (existence, unicité, bulk) — elles ne bénéficieraient pas du cache.

## Caching

```typescript
export async function getProducts() {
	"use cache";
	cacheLife("catalog");
	cacheTag(PRODUCTS_CACHE_TAGS.LIST); // constante SSOT, jamais un littéral
	return prisma.product.findMany({ select: GET_PRODUCTS_SELECT });
}
```

**4 profils** (`next.config.ts`) : `checkout` (1 m/30 s) · `user` (2 m/1 m — admin) ·
`catalog` (15 m/5 m) · `reference` (7 j/24 h). La clé d'une entrée `"use cache"` = build ID +
fonction + **arguments** — un `cacheTag()` n'est PAS la clé. Le panier/favoris se matérialisent
par un `"use cache"` PUBLIC keyé sur les ids du cookie.

### Invalidation : l'API dépend du CONTEXTE D'EXÉCUTION, pas du module

| Contexte                       | API                                 | Helper SSOT (`shared/lib/cache.ts`) |
| ------------------------------ | ----------------------------------- | ----------------------------------- |
| Server Action (`"use server"`) | `updateTag(tag)`                    | `updateTagsAfterMutation(tags)`     |
| Route handler, webhook         | `revalidateTag(tag, { expire: 0 })` | `revalidateTagsInBackground(tags)`  |

⚠️ **`updateTag` THROW hors Server Action** — Next teste la route en cours d'exécution, pas le
module où l'appel est écrit ; déléguer à un service ne protège de rien. Trois filets :
`local/no-update-tag-outside-server-action` (ESLint) ·
`update-tag-server-action-only.regression.test.ts` ·
`test/contract/cache-invalidation-context.contract.test.ts` (exerce la vraie implémentation
Next — les tests qui mockent `next/cache` sont aveugles à cette contrainte).

**Un tag n'existe que s'il a un lecteur ET un mutateur** — un `cacheTag()` jamais invalidé et
un `updateTag()` jamais posé sont tous deux silencieux.

## Module Layers Pattern

| Besoin                         | Layer       |
| ------------------------------ | ----------- |
| Lire des données avec cache    | `data/`     |
| Transformer/calculer (sans DB) | `services/` |
| Muter la base                  | `actions/`  |
| Construire des WHERE clauses   | `services/` |
| Helpers simples, type guards   | `utils/`    |

Exceptions : `modules/webhooks/services/` porte la logique transactionnelle complète
(atomicité des transitions) ; `finalizeRetractationRefund` est un service transactionnel
partagé ; les reads de validation dans `actions/` (cf. § Server Actions).

## Emails

**5 templates** React Email + Resend (`emails/`) : `order-confirmation`,
`shipping-confirmation`, `retractation-ack`, `retractation-refunded`, `retractation-rejected`.
Émetteurs dans `modules/emails/services/`, tous idempotents (idempotencyKey Resend 24 h, ex.
`order-confirm:<orderId>`). **Un échec d'email ne défait JAMAIS une transition** (sinon le 500
ferait redélivrer un event devenu no-op et l'email ne partirait jamais). Aucun émetteur
marketing. Config : `shared/lib/email-config.ts`. Preview : `pnpm email:dev`.

## Cartes de partage (OG)

Quatre routes : accueil (statique, rendue au build) + produit/collection/famille (dynamiques).
Toutes passent par `renderOgImage()` (`shared/components/og/render-og.tsx`) : **pré-rendu en
buffer dans le handler** (l'échec devient attrapable — au streaming il ne l'est pas) avec repli
sur une carte générique **figée en PNG embarqué** (`generic-card.generated.ts`). Raison : sous
charge soutenue, une instance satori/resvg avortée empoisonne TOUS les rendus du process
jusqu'au redémarrage. Toute photo distante passe par `fetchOgImageAsDataUri()` (fetch validé,
formats sûrs) — jamais d'URL brute dans un `<img>` Satori. Dans `OgShell`, les SVG sont
INLINE (pas de data-URI `<img>` : sharp les rejette en rendu runtime).

## Testing

| Scope               | Déclencheur                          | Commande                |
| ------------------- | ------------------------------------ | ----------------------- |
| **Critical path**   | Pre-commit (si modules touchés) + CI | `pnpm test:critical`    |
| **Full unit suite** | CI PR + push main                    | `pnpm test:coverage`    |
| **Integration DB**  | CI + opt-in local                    | `pnpm test:integration` |
| **E2E complet**     | CI + local                           | `pnpm e2e`              |

**Critical path** : `modules/cart` `orders` `payments` `webhooks` `admin-auth` +
`app/api/webhooks/stripe` + `test/contract` (script `test:critical` de `package.json`, en phase
avec le grep de `.husky/pre-commit`).

**E2E en local** : la suite tourne contre un **build de prod** (`pnpm build` + `pnpm start` —
le dev server sature sous les workers), avec deux flags opt-in :
`E2E_ALLOW_SEED_IMAGES=1` (build-time — le seed picsum passe l'optimiseur d'images) et
`E2E_INSECURE_COOKIES=1` (runtime — WebKit refuse en silence un cookie `Secure` posé depuis
http://localhost, panier/favoris deviendraient inertes sur les projets webkit). `ADMIN_PASSWORD`
et `AUTH_SECRET` doivent être dans l'env. `retries: 1` en local (un repêché reste signalé
« flaky »). Les webhooks Stripe sont rejoués par POST **signé**
(`e2e/helpers/stripe-webhook.ts`, `generateTestHeaderString`) — on ne pilote JAMAIS la page
checkout.stripe.com. Les e2e assertent le **CONTENU** des 404, pas le statut (streaming PPR).

**Conventions** : régression = suffixe `.regression.test.ts` + JSDoc `@regression <slug>` (toute
modif requiert review explicite) ; intégration = `.integration.test.ts` (runner séparé, jamais
`@/shared/lib/prisma`) ; contract Stripe = `test/contract/stripe-events.contract.test.ts`
(fixtures `checkout.session.*` ↔ `case` de la route) ; mock d'erreur Prisma = subclass réelle
obligatoire (un `Object.assign(new Error(), { code })` n'est pas `instanceof`).

## Conventions

| Type        | Convention                            |
| ----------- | ------------------------------------- |
| Files       | `kebab-case.ts`                       |
| Components  | `PascalCase`                          |
| Functions   | `camelCase`                           |
| Constants   | `UPPER_SNAKE_CASE`                    |
| UI text     | French, **tutoiement**                |
| Code        | English                               |
| Commits     | `feat:`, `fix:`, `docs:`, `refactor:` |
| Indentation | Tabs                                  |

**Voix : tutoiement partout** — la seule prose vouvoyante tolérée est celle que Stripe rend
lui-même (page Checkout hébergée, hors de notre DOM).
