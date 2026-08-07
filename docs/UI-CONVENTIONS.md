# UI-CONVENTIONS.md — Base UI, responsive, overlays

> **À lire avant de toucher à un composant.** `CLAUDE.md` § Key Technologies garde les règles en
> une ligne chacune ; ce document porte le _pourquoi_, les pièges et les contre-exemples. Chaque
> règle nomme le test qui la verrouille — c'est le test, pas ce fichier, qui fait autorité.
>
> Déporté de `CLAUDE.md` le 2026-08-04 : ces développements ne concernent que le travail UI, et
> les recharger à chaque session (y compris pour un correctif Stripe) coûtait ~3 500 tokens.

## Variables CSS — critère d'admission dans `globals.css`

**Règle : une variable CSS n'entre dans `app/globals.css` (ou `app/styles/*.css`) que si (a) elle
est consommée depuis au moins 2 fichiers, ou depuis JS _et_ CSS (coordination runtime — hauteurs
publiées par un ResizeObserver, échelle z-index), ou (b) elle encode une valeur mesurée/normative
qu'un test verrouille (contraste WCAG, parité avec `MOTION_CONFIG`). Une valeur décorative à usage
unique s'écrit en valeur arbitraire au call site** (`shadow-[0_0_24px_…]`), pas en token.
Verrouillé par `app/styles/__tests__/theme-token-consumers.regression.test.ts` — chaque token
custom du bloc `@theme` doit avoir au moins un lecteur hors `globals.css`.

**Pourquoi.** Les deux excès sont réels, et symétriques. D'un côté, les tokens `@theme` **sont**
la config Tailwind v4 (il n'y a plus de `tailwind.config.js`) : refuser un token multi-consommateur
force l'oklch dupliqué en valeurs arbitraires — c'est ainsi qu'un `z-40` en dur, hors de l'échelle
`--z-*`, avait fait passer une barre sticky par-dessus le mega-menu (audit navbar 2026-08-04). Et
les variables runtime (`--bottom-bar-height`, `--navbar-height`, `--pay-bar-height`) ne peuvent
pas être des classes : du JS mesure et publie, le CSS consomme. De l'autre côté, un token frappé
pour un seul call site est de la complexité pure — `--blur-1/2/3`, l'échelle `--text-shadow-*`
(tokens + classes `.text-shadow-*`, personne au bout de la chaîne) et `--duration-slower` ont vécu
des mois sans **aucun** lecteur avant le nettoyage du 2026-08-06. Un token sans lecteur est du
poids mort ; un lecteur unique se sert au call site.

## Breakpoints — rem partout, jamais px

SSOT : `shared/constants/breakpoints.ts` (`BREAKPOINTS` + `mediaBelow()` / `mediaAtLeast()` /
`mediaBetween()`). Échelle alignée sur les défauts Tailwind v4, **en rem** : `xs 23.4375` ·
`sm 40` · `md 48` · `lg 64` · `xl 80` · `2xl 96`.

**Règle : aucune largeur en px dans un `matchMedia()`, ni dans une media query CSS écrite à la
main, ni dans un `--breakpoint-*`.** Verrouillé repo-wide par
`shared/constants/__tests__/no-px-media-query.regression.test.ts`.

**Pourquoi.** Tailwind exprime ses breakpoints en rem. Un seuil JS en px ne coïncide avec eux que
tant que la police racine vaut 16px — dès que l'utilisateur change ce réglage (accessibilité,
WCAG 1.4.4), les deux divergent. Les composants **hybrides** (branche choisie en JS, branche
rendue avec une classe `md:`) tombent alors dans le vide : à police racine 14px, `md:` = 672px,
et la plage 672-767px laissait `/admin` **sans aucune surface de navigation** — `useIsMobile()`
disait « mobile » (sidebar → `null` via `disableMobileSheet`) pendant que le CSS disait déjà
« desktop ». Audit responsive 2026-07-26, P1-1.

Les media queries **sans largeur** (`prefers-reduced-motion`, `hover`, `pointer`, `orientation`,
`forced-colors`) s'écrivent en clair — seules les largeurs se désynchronisent. La syntaxe range
MQ4 (`(width < 48rem)`) est préférée à `(max-width: …)` : c'est l'équivalent exact de ce que
Tailwind compile pour `max-md:`, sans la fenêtre de désaccord d'~1px sur les DPR fractionnaires.

### Seuils de navigation (décision explicite, pas un accident)

| Surface                    | Seuil | Relais au-dessus                |
| -------------------------- | ----- | ------------------------------- |
| Bottom-nav boutique        | `lg`  | `DesktopNav` (`hidden lg:flex`) |
| Bottom bar + sidebar admin | `md`  | Sidebar (`hidden md:block`)     |

La bottom-nav boutique suit `lg` pour couvrir l'iPad portrait (768×1024) : avec un seuil `md`, la
plage 48-64rem perdait le panier et les favoris sans gagner le mega-menu. `BottomBar` prend un prop
`breakpoint: "md" | "lg"` d'où il dérive **à la fois** la classe Tailwind et la `matchMedia` — et ne
publie `--bottom-bar-height` que lorsque la barre est réellement visible.

⚠️ **Corollaire** : les consommateurs de cette variable ne doivent **pas** préfixer leur offset d'un
breakpoint — la variable vaut déjà 0 quand il n'y a pas de barre.

## Cibles tactiles, reflow et saisie

Trois règles arrivées le 2026-08-06 de [`docs/LANDING-BEST-PRACTICES.md`](LANDING-BEST-PRACTICES.md)
§ 6.2 et § 6.4, où elles vivaient seules. Elles se décident **en écrivant un composant**, pas en
auditant une page — c'est ici qu'elles doivent être lues. Leur sourçage (texte W3C, exceptions
exactes) reste là-bas.

⚠️ **Aucune des trois n'a encore de test de régression dédié** — c'est l'exception dans ce document,
et elle est signalée plutôt que masquée. `e2e/a11y/zoom-a11y.spec.ts` et l'audit axe-core de
`e2e/accessibility.spec.ts` en couvrent une partie ; le reste se vérifie à la main.

**Règle 1 — toute affordance en icône seule fait au moins 24 × 24 px CSS** (WCAG 2.5.8, AA).
L'exception d'**espacement** est très mal lue : on trace un **cercle de 24 px de diamètre centré**
sur chaque cible trop petite, et il suffit que ces cercles **ne se croisent pas**. Deux icônes de
20 px dont les _centres_ sont distants de 24 px **passent**, malgré 4 px d'écart visible — c'est la
distance entre centres qui compte, jamais l'espace blanc. L'autre exception (liens **en ligne** dans
une phrase) met le texte courant entièrement hors champ. Les surfaces réellement concernées sont
donc les barres d'icônes : navbar, barre basse, actions de carte.

**Règle 2 — la page se replie à 320 px de large et 256 px de haut** (WCAG 1.4.10 _Reflow_, AA).
⚠️ **Le plancher est 320 px, pas 400** : le « 400 » qui circule est le _niveau de zoom_ (320 px CSS
= un viewport de 1280 px zoomé à 400 %). Conséquence directe ici : le plus petit breakpoint du dépôt
est `xs = 23.4375 rem = 375 px`, donc **la plage 320-375 px n'est couverte par aucun palier** — elle
se tient par le fait que les mises en page y sont déjà en une colonne, pas par une règle. Une grille
de produits **n'est pas exemptée** : elle doit se replier sur une colonne.

**Règle 3 — saisie et hauteurs mobiles.**

- **`svh` ou `dvh`, jamais `vh`, pour une hauteur d'écran.** `100vh` suppose les barres du navigateur
  rétractées : au chargement, c'est **trop haut**. `lvh` = rétractées, `svh` = déployées, `dvh` =
  suit en direct (mise à jour throttlée). ⚠️ Les claviers virtuels **n'affectent pas** les unités de
  viewport — pour ça, c'est `VisualViewportBridge`.
- **Aucun champ de saisie sous 16 px rendus.** Sous ce seuil, iOS Safari zoome au focus et ne
  revient pas. C'est la taille **effective** après héritage et `rem` qui compte.
- ⚠️ **Ne jamais « corriger » ce zoom par `maximum-scale=1` ou `user-scalable=no`** : ça supprime le
  zoom **tout court** et casse **WCAG 1.4.4 _Resize Text_** (AA). Le correctif est de porter le champ
  à 16 px ; si le design impose plus petit, `font-size: 16px` + `transform: scale()`.
- **`inputmode`** (`numeric`, `decimal`, `tel`, `email`, `search`) sur chaque champ, avec le `type`
  correspondant : les deux **suggèrent** le clavier, sans garantie identique d'un appareil à l'autre.

## Largeurs de contenu et grilles

| Surface    | Plafond                   | Note                                                                                                             |
| ---------- | ------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Storefront | `max-w-6xl` (1152px)      | Appliqué page par page, pas par le layout. Aucun palier `2xl:` — le hero faisait exception et décrochait de 64px |
| Checkout   | `max-w-5xl` (1024px)      | États intermédiaires en `max-w-3xl`                                                                              |
| Admin      | `max-w-[100rem]` (1600px) | **Sans `mx-auto`** : centrer ferait varier la gouttière gauche avec la largeur de fenêtre                        |

**Un palier de colonnes ne s'ajoute que si le conteneur grandit avec lui.** Les variants de grille
se déclenchent sur la largeur du **viewport**, pas du conteneur : au-delà du plafond, une colonne de
plus répartit le _même_ espace en plus de parts. `2xl:grid-cols-5` sur la grille produit faisait
tomber les cartes de 248px à 192px (-22%) — retiré. Au-dessus du plafond, l'espace est de la marge,
pas des colonnes.

## Survol vs focus

Toute affordance **porteuse d'information** révélée au survol doit l'être au focus clavier
(WCAG 2.4.7) : soulignement de lien, chevron de navigation, bouton d'action qui s'éclaircit. Les
effets purement décoratifs (scale d'image, halo) n'ont pas cette obligation.

⚠️ **Ne jamais placer une règle de focus derrière `can-hover:`** — ce variant vaut
`(hover: hover) and (pointer: fine)` et existe pour neutraliser le sticky-hover iOS ; une règle de
focus derrière lui ne s'appliquerait **jamais** au clavier sur tactile. Le gate va sur le hover seul :

```tsx
"can-hover:group-hover:opacity-100 group-focus-visible:opacity-100";
```

Composants verrouillés par `shared/components/__tests__/hover-focus-parity.regression.test.ts`
(liste à étendre, volontairement pas un scan repo-wide : un garde-fou qui hurle sur chaque
`group-hover:scale-105` décoratif serait désactivé en une semaine).

⚠️ **Angle mort connu, déjà payé deux fois** : gater le _reveal_ sur `can-hover:` laisse un CTA en
`opacity-0` **cliquable** sur iPad. C'est le **masquage** qu'il faut gater, pas la révélation.

## Overlays — quelle primitive choisir

| Besoin                                           | Composant                                                                           | Rendu                                          |
| ------------------------------------------------ | ----------------------------------------------------------------------------------- | ---------------------------------------------- |
| Confirmer, action destructive                    | `ConfirmDialog`                                                                     | `AlertDialog`, **identique mobile et desktop** |
| Formulaire, édition                              | `ResponsiveDialog`                                                                  | `Drawer` < `md`, `Dialog` ≥ `md`               |
| Navigation, filtres, panier — panneau persistant | `Sheet`                                                                             | `Drawer` Base UI, latéral par défaut           |
| Menu d'actions, picker, tri — feuille éphémère   | `Drawer`                                                                            | `Drawer` Base UI, bottom par défaut            |
| `Dialog` / `AlertDialog` bruts                   | seulement si la surface n'existe pas en mobile (raccourcis clavier, export desktop) |                                                |

### Règle d'admission d'un fichier `responsive-*`

Un fichier `responsive-*` n'existe **que** s'il rend une primitive DIFFÉRENTE selon le viewport.
Tout autre wrapper porte un nom qui décrit ce qu'il **décide** (`ConfirmDialog`), et n'a le droit
d'exister que s'il change le rendu ou possède un état non trivial. **Un wrapper dont ≥ 50 % des
exports sont des pass-through est un bug d'architecture, pas un composant.**

⚠️ Cette règle est née d'un cas réel : `responsive-alert-dialog.tsx` (179 lignes) ne basculait rien
malgré son préfixe — 7 de ses 9 exports étaient des pass-through dont le seul effet était de throw
si un contexte à un champ manquait, en doublon du message que Base UI émet déjà. Il a été supprimé
le 2026-08-06 ; son `tone` vit désormais sur `AlertDialogAction`. Verrouillé par
`shared/components/ui/__tests__/confirm-dialog-boundary.regression.test.ts`.

### La confirmation passe par `ConfirmDialog`

Toute surface dont le footer est exactement `[Annuler, Confirmer]` passe par `ConfirmDialog`
(`shared/components/dialogs/confirm-dialog.tsx`). On ne descend aux primitives `ui/alert-dialog` que
si l'un de ces invariants est faux — et la dérogation doit alors dire lequel, dans l'allowlist du
test de frontière : **(1)** un seul écran ; **(2)** exactement deux boutons, Annuler puis Confirmer ;
**(3)** tout le contenu vit dans le formulaire ; **(4)** l'ouverture est pilotée du dehors.

⚠️ **Le bouton de confirmation FERME le dialog au clic** — c'est un `Close` Base UI, et la fermeture
part avant que la mutation ne démarre (`alert-dialog-close-on-confirm.regression.test.tsx`). Deux
corollaires : un libellé d'attente ou un spinner piloté par `isPending` n'est **jamais vu** (le
retour d'attente appartient au toast), et une validation HTML (`required`, `minLength`) ne peut pas
être rapportée à l'utilisatrice — le dialog a disparu quand le navigateur bloque la soumission. Toute
garde de validation passe par `confirmDisabled`.

`Sheet` et `Drawer` enveloppent le **même** `Drawer` de Base UI. Le critère est l'intention, pas la
technique : un panneau qu'on consulte (Sheet) vs une feuille qu'on referme aussitôt l'action faite
(Drawer). Ils dérivent `swipeDirection` de leur prop `direction` (Vaul nommait le bord d'ancrage,
Base UI nomme le geste qui ferme).

### Une seule pile de dismiss

**Les 4 familles sont des couches Base UI**, donc un seul verrou de scroll et une seule pile de
dismiss — pas de double verrou concurrent, y compris sur un `AlertDialog` empilé dans un `Sheet`.

⚠️ **Cet invariant interdit de migrer une famille sans les autres.** Pendant la migration
Radix → Base UI, la `Sheet` est restée un cycle sur Vaul alors que l'`AlertDialog` était déjà
passé : deux piles indépendantes, et Échap fermait la confirmation **ET** la sheet. Attrapé par
`nested-overlay-stacking.regression.test.tsx`, qui le verrouille désormais.

### Imbrication

Un overlay ouvert depuis un `Sheet`/`Drawer` doit être rendu **dans** son arbre JSX. L'empilement
(scale du parent, focus chaîné, `--nested-drawers`) est natif — le `vaul-nested-context` maison a
disparu. Ne jamais fermer le parent avant d'ouvrir l'enfant. Deux surfaces dérogent encore
(`admin-menu-sheet`, `menu-sheet` diffèrent l'ouverture après la transition) — dette connue, pas un
modèle à suivre.

### ⚠️ Jamais `<SheetClose render={…}>` autour d'un `<Link>`

Le Close fait atterrir son `onClick` sur le `<Link>`, et Next l'invoque **avant** `linkClicked` :
`onOpenChange(false)` → `handleClose()` → `history.back()` synchrone, qui race le `router.push` et
**annule la navigation** — l'utilisateur reste sur la page, sans erreur.

La garde `isTopOfHistory` ne couvre PAS ce cas : elle détecte « un push a eu lieu **pendant**
l'ouverture », pas « le push est queué dans le même clic, après la fermeture », où `history.length`
est encore intact.

**Le pattern correct** : fermer par la **prop contrôlée** (`open={isOpen}` + un handler qui
`close()`), ce qui court-circuite `onOpenChange` ; et naviguer en **`replace`** — l'entrée poussée à
l'ouverture porte la même URL que la page, la consommer évite une pression de retour morte par cycle
ouvrir → naviguer (cumulative).

Deux régressions verrouillent le pattern :
`shared/components/responsive-action-menu/__tests__/link-history-back.regression.test.tsx` (2026-05-15) et
`app/(shop)/(home)/_components/navbar/__tests__/menu-sheet-link-navigation.regression.test.tsx`
(2026-07-26, monte le **vrai** `ui/sheet` — un mock du wrapper rend le test aveugle à cette chaîne).

Cas non couverts restants : `dashboard-period-sheet`, `dashboard-refresh-sheet`,
`filter-sheet-wrapper`.

### Historique du bouton retour

`useBackButtonClose` pousse une entrée à l'ouverture pour que le retour matériel ferme l'overlay.
Les 4 wrappers reprennent cette entrée sur **toutes** les fermetures via `handleClose` — un wrapper
qui l'oublierait laisserait une entrée orpheline de même URL, avalant une pression de retour par
cycle. `handleClose` ne recule que si l'entrée est encore au sommet (`history.length` inchangée
depuis le push) : sinon une navigation a eu lieu entre-temps et reculer la défairait.

### `handleOnly`

Autorisé uniquement sur une collision de gestes **constatée et décrite en commentaire sur le call
site**, jamais par défaut — il supprime le swipe-to-dismiss depuis le contenu. Verrouillé par
`shared/components/ui/__tests__/handle-only-allowlist.regression.test.ts`.

⚠️ Le prop survit à la migration mais son **mécanisme s'est inversé** : Vaul avait une liste blanche
(« seule la poignée drague »), Base UI a une liste **noire** — les wrappers enveloppent le contenu
dans un conteneur `display:contents` porteur de `data-base-ui-swipe-ignore` (invisible pour le flex,
trouvé par le `closest()` de Base UI). Même attribut, à la main, pour exclure une zone ponctuelle :
il a remplacé `data-vaul-no-drag`.

### Animation des panneaux : une TRANSITION, pas une animation keyframes

Entrée, sortie et suivi du doigt partagent la propriété `transform` ; une `animate-in` écraserait le
translate piloté par le geste (les keyframes l'emportent, puis `fill-mode: both` fige la valeur
finale).

⚠️ **Corollaire à ne pas perdre** : le killswitch `prefers-reduced-motion` de
`app/styles/animations.css` ne coupe que `animation` — c'est `app/styles/pwa.css` qui neutralise ces
transitions-là, et `e2e/cart.spec.ts` qui le garde.

Autres partis pris : pas de `Drawer` pour une confirmation, pas de View Transition sur une fermeture
de panneau.

### Un `animate-out` sans `fill-mode-forwards` est un bug, pas un oubli de style

Les keyframes de tw-animate-css sont **asymétriques** : `enter` n'a qu'un `from` (son état final EST
le style de base, donc le bon), `exit` n'a qu'un `to` — et le raccourci `animation` qu'émettent
`animate-in`/`animate-out` fixe `var(--tw-animation-fill-mode, none)`. Un élément encore monté à la
fin de son animation de sortie **redevient donc pleinement visible**. D'où un défaut qui ne se
manifeste qu'à la **fermeture**.

Ça n'épargne pas le popup par chance mais par construction : Base UI le démonte dans un
`ReactDOM.flushSync` avant la peinture de la frame où son animation s'achève. Le **scrim, lui, n'est
jamais attendu** — `useOpenStateTransitions` (`utils/popups/popupStoreUtils.js`) ne passe que
`store.context.popupRef` à `useOpenChangeComplete`, et `useAnimationsFinished` appelle
`getAnimations()` sur ce seul élément, sans sous-arbre.

⚠️ **Second corollaire : le scrim déclare une durée EXPLICITE, égale à celle de son popup.** Sans
`duration-*` il retombe sur le défaut 150 ms de la librairie. Les 4 scrims sont partis avec ce
défaut (audit overlays 2026-08-04) :

| Surface       | Scrim  | Popup                               | Scrim ressuscité |
| ------------- | ------ | ----------------------------------- | ---------------- |
| `Sheet`       | 150 ms | 300 ms (`PANEL_TRANSITION`)         | **150 ms**       |
| `Drawer`      | 150 ms | 300 ms (`PANEL_TRANSITION`)         | **150 ms**       |
| `Dialog`      | 150 ms | 200 ms (`motion-safe:duration-200`) | **50 ms**        |
| `AlertDialog` | 200 ms | 200 ms                              | 0 — par chance   |

Les deux règles sont verrouillées par
`shared/components/ui/__tests__/animate-out-fill-mode.regression.test.ts`. **Garder les deux** : les
durées se désynchronisent en silence, le fill mode non.

## Composition : `render`, jamais `asChild`

Base UI n'a pas de `Slot`. Pour rendre un autre élément à la place de celui du composant, on passe un
**élément** au prop `render` :

```tsx
// ❌ Radix — plus aucun composant du kit ne l'accepte
<Button asChild><Link href="/produits">Voir</Link></Button>
// ✅ Base UI — les enfants restent portés par le composant
<Button render={<Link href="/produits" />}>Voir</Button>
```

**La règle n'a pas d'exception.** Le mega-menu, dernier îlot Radix, est passé à
`@base-ui/react/navigation-menu` (cf. le JSDoc de `shared/components/ui/navigation-menu.tsx`, qui
détaille les 3 conséquences structurelles de la bascule) : il ne reste plus aucun `asChild` dans le
JSX du dépôt. Le seul paquet Radix encore installé est `@radix-ui/react-focus-scope`
(`media-lightbox.tsx`), qui n'expose pas `asChild`.

⚠️ Ce n'est **pas un renommage** : `render` déplace l'ÉLÉMENT, pas les enfants. Les props de
l'élément passé gagnent sur celles du composant ; `children` participe à cette fusion comme
n'importe quelle autre prop.

Nos propres composants (`Button`, `Item`, `SidebarMenuButton`, `ResponsiveActionMenuTrigger`…)
exposent le même prop via `useRender` + `mergeProps` de `@base-ui/react`. `useRender` n'appelle son
unique hook que si `document` existe : ces modules **restent utilisables depuis un composant
serveur**, ne pas leur ajouter `"use client"` sans raison.

Corollaires :

- **Un mock de test qui ignore `render` fait disparaître l'élément du DOM.** Utiliser
  `renderPropMock` (`test/mocks/render-prop.tsx`), qui reproduit la fusion exacte. ⚠️ Ne jamais
  passer `children` en 3ᵉ argument de `cloneElement` : React remplace alors inconditionnellement les
  enfants, y compris par `undefined`.
- `render={<a href="…" />}` déclenche un faux positif `jsx-a11y/anchor-has-content` (le nom
  accessible vient des enfants du composant) — annoter avec la justification, comme les 7 sites
  existants.

## État : `data-*` booléens, plus de `data-state`

Base UI expose les états en attributs **présents ou absents** : `data-open` / `data-closed`,
`data-checked` / `data-unchecked`, `data-active`, `data-highlighted`, `data-panel-open` (trigger
d'accordéon/collapsible), `data-popup-open` (trigger de popup). Les variants Tailwind s'écrivent donc
`data-open:` et non `data-[state=open]:`.

⚠️ **Piège des menus** : `Menu.Item` et `Select.Item` ne prennent PAS le focus DOM — le popup le
garde et désigne l'item courant par `aria-activedescendant`. Un `focus:bg-accent` hérité de Radix ne
se déclenche **jamais** ; c'est `data-highlighted:` qu'il faut. Verrouillé par
`dropdown-menu-highlight.regression.test.tsx`.

Autres correspondances qui ne sont pas des renommages :

| Radix                                  | Base UI                                                                                          |
| -------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `onSelect` sur `Menu.Item`             | `onClick` + `closeOnClick`                                                                       |
| `onCloseAutoFocus` / `onOpenAutoFocus` | `finalFocus` / `initialFocus` (attendent l'**élément**, ou `false`)                              |
| `onEscapeKeyDown`                      | arbitrage dans `onOpenChange` : `eventDetails.reason === "escape-key"` + `eventDetails.cancel()` |

⚠️ Base UI **ignore `preventDefault`** sur ses handlers : utiliser `preventBaseUIHandler`.

## Icônes — Phosphor, entrée `/ssr`, `weight` et non `strokeWidth`

Migration `lucide-react` → `@phosphor-icons/react` du 2026-08-04. Le motif n'est pas la mode : le
trait par défaut de lucide vaut **2** alors que tous les SVG maison du dépôt
(`shared/components/icons/icon-sprite.tsx`, `shared/components/ui/toast-icons.tsx`,
`hamburger-icon.tsx`, `animated-heart-icon.tsx`) sont à **1,5**, et trois call sites lucide
rétablissaient 1,5/1,6 à la main. Le poids `regular` de Phosphor vaut exactement 1,5 sur grille 24
équivalente (16/256) : le défaut de la librairie est désormais la convention de la maison.

### Les quatre règles

1. **Les imports de VALEUR passent par `@phosphor-icons/react/ssr`**, jamais par la racine.
   `dist/index.es.js` importe _eagerly_ les ~1512 modules CSR **plus** tout l'arbre SSR ; et les
   composants `dist/csr/*` lisent `IconContext` sans porter de directive `"use client"`, donc un
   import racine dans un Server Component casse **au rendu**, pas à l'analyse. Les variantes
   `dist/ssr/*` passent par `SSRBase`, sans contexte : elles fonctionnent des deux côtés.
2. **Les imports de TYPE viennent de la racine, en `import type`** — les typings de l'entrée `/ssr`
   ne ré-exportent pas `Icon` / `IconProps` / `IconWeight`. Un `import type` est effacé au build.
3. **`weight`, jamais `strokeWidth`.** Phosphor peint en `fill="currentColor"` sur un tracé fermé :
   la prop `strokeWidth` n'a aucun effet, et une classe `fill-*` ne remplit pas l'icône. Une coche
   plus grasse s'écrit `weight="bold"` ; une étoile pleine, `weight="fill"`.
4. **Nommage suffixé `*Icon`** (`HeartIcon`, `MagnifyingGlassIcon`) — convention Phosphor 2.1.x.

| Graisse   | Trait équivalent /24 | Usage                                            |
| --------- | -------------------- | ------------------------------------------------ |
| `thin`    | 0,75                 | —                                                |
| `light`   | 1,125                | —                                                |
| `regular` | **1,5**              | défaut, aligné sur les SVG maison                |
| `bold`    | 2,25                 | pastilles denses, coches sur fond coloré         |
| `fill`    | aplat                | état actif : cœur favori, étoile principale      |
| `duotone` | aplat + contour      | accent : un 2ᵉ ton depuis un seul `currentColor` |

### Ce qui ne change pas

Les 15 composants SVG maison restent la couche « signature » de la marque et sont **hors migration** :
`shared/components/icons/` (sprite, cœur animé, hamburger, logos de paiement, Instagram, TikTok,
Google), `shared/components/ui/toast-icons.tsx`, `shared/components/squiggle-underline.tsx`,
`shared/components/animations/hand-drawn-accent.tsx`, `shared/components/masking-tape.tsx`.
Ils étaient déjà à 1,5 : ils sont désormais cohérents avec le trait par défaut, au lieu de trancher.

### Deux pièges vérifiés pendant la migration

- **Le défaut de taille passe de 24 px à `1em`.** Sans classe de taille, une icône Phosphor hérite
  de la taille de police. Ce n'est un problème nulle part aujourd'hui parce que les primitives qui
  accueillent des icônes nues les contraignent en CSS (`Alert` : `[&>svg]:size-4` ; `Button`,
  `DropdownMenuItem`, `Attachment` : `[&_svg:not([class*='size-'])]:size-4`) — mais un nouveau
  conteneur maison doit poser la contrainte ou la classe.
- **Ne pas fondre deux icônes co-visibles.** La migration a dédoublonné 157 noms lucide en
  128 icônes, mais `Search`/`SearchX` (champ de recherche + état « aucun résultat » juste dessous)
  et `PackageX`/`CircleX` (« Marquer comme retourné » et « Annuler la commande », deux entrées du
  même menu) devaient rester distincts. Le critère n'est pas « même sens », c'est « jamais visibles
  ensemble ».

Verrouillé par `shared/components/__tests__/phosphor-ssr-entry.regression.test.ts` (entrée `/ssr`,
cible des `vi.mock`, absence de `lucide-react`).

## Typographie — Winky Sans / Onest / Kalam (SSOT `shared/styles/fonts.ts`)

Migration S5 « Encre et papier » du 2026-08-05 — audit, mesures et candidats écartés dans
`docs/FONTS-AUDIT-2026-08-05.md`. Les classes s'appuient sur `--font-display` /
`--font-sans` / `--font-cursive`, qui ne changent jamais : c'est `fonts.ts` qui migre.

- **La display n'a PAS de chiffres tabulaires** (Winky Sans, comme Fraunces avant elle :
  GSUB sans `tnum`). Tout montant qui bouge (totaux animés, compteurs alignés) se compose
  dans la sans (`Onest`, `tnum` vérifié) — verrouillé par
  `modules/cart/components/__tests__/cart-sheet-footer.test.tsx`. `tabular-nums` sous
  `font-display` est un no-op silencieux.
- **`font-cursive` est RÉSERVÉE au décoratif** (logotype, signatures « — Léane »,
  légendes) — jamais prix, libellés de formulaire, navigation ni body. Ni `font-bold`
  ni `italic` dessus : Kalam n'est chargée qu'en 400, et un script est déjà incliné.
- **Graisse plancher display : 300.** Les h1 du storefront sont en `font-light` — toute
  future display doit couvrir 300, sinon le navigateur clampe au min de l'axe sans
  avertissement (c'est ce qui a écarté Gabarito et Baloo 2 à l'audit).
- ⚠️ **Jamais d'utilitaire custom dans le namespace `font-`** s'il n'est pas une famille :
  `cn()` est un `twMerge` nu (`shared/utils/cn.ts`), et tailwind-merge classe tout
  `font-<x>` inconnu en font-family — il supprime alors le `font-display` voisin,
  invisible au lint, au typecheck et aux tests (incident `fraunces-wonk` vs `font-wonk`,
  2026-07-27). Nommer `<famille>-<variante>`, jamais `font-<variante>`.

### Graisse des montants — deux crans, et `font-bold` n'en est pas un

| Rôle du montant                                                    | Graisse            |
| ------------------------------------------------------------------ | ------------------ |
| Total à payer / total commande, dans un récap **client**           | `font-semibold`    |
| Ligne d'article, sous-total, prix unitaire, ligne de tableau admin | `font-medium`      |
| n'importe quel montant                                             | jamais `font-bold` |

Le prix héros d'une PDP est à part : il se compose en `font-display` **`font-normal`**
(`modules/products/components/product-price-display.tsx`) — il tient par la taille et la
fonte, pas par la graisse. C'est la même logique qui donne les h1 en `font-light`.

**Pourquoi deux crans et pas trois.** Audit typographique 2026-08-05 : un montant se rendait
sous **quatre** graisses selon le fichier. Le total était `font-semibold` dans
`modules/payments/components/checkout-summary.tsx` et `font-bold` dans
`modules/orders/components/customer/order-summary-card.tsx` ; la ligne d'article était
`font-medium` dans le premier et `font-semibold` dans
`modules/orders/components/customer/order-items-list.tsx`. Ces deux paires sont vues **à la
suite** par la même personne (récap de paiement → page de suivi), donc l'écart se voit. La
règle n'a pas été inventée : elle est reprise des deux surfaces les plus travaillées du
tunnel (`checkout-summary` et `app/paiement/confirmation/page.tsx`), déjà d'accord entre
elles ; les huit sites divergents ont été alignés dessus.

⚠️ **Le rôle ne se déduit pas de l'expression.** `order.total` est bien « un total », mais
dans une LIGNE de tableau admin c'est un montant parmi vingt : il reste en `font-medium`,
sinon toute la colonne passe en relief. C'est pourquoi le versant `font-semibold` du
garde-fou est une liste explicite de récaps client, pas un motif.

`font-bold` reste légitime **hors montants** : pastilles de compteur en `text-2xs` (où c'est
de la lisibilité, pas de la hiérarchie) et chiffres décoratifs `aria-hidden`. Sur un montant
il casse l'échelle — il ne reste plus de cran au-dessus pour distinguer le total de sa ligne.

Les templates `emails/` sont hors périmètre : pas de classes utilitaires, des `style={{
fontWeight }}` inline sur une échelle contrainte par les clients de messagerie.

Verrouillé par `shared/components/__tests__/amount-font-weight.regression.test.ts`.
