import { cn } from "@/shared/utils/cn";

// ---------------------------------------------------------------------------
// Shared class constants
// ---------------------------------------------------------------------------

/**
 * Classes for the inner container.
 *
 * À poser sur un `<ul role="list">` (un `<li>` par onglet, portant
 * {@link bottomBarItemWrapperClass}) : un lecteur d'écran annonce alors le nombre
 * d'onglets, ce que des liens frères dans un `<nav>` ne donnent pas.
 *
 * ⚠️ `h-14` (3.5rem) est la hauteur de référence de la barre. Elle doit rester
 * d'accord avec le défaut `height` de `BottomBar` (56), qui sert de repli avant
 * mesure — verrouillé par `bottom-bar-height-contract.regression.test.ts`.
 */
export const bottomBarContainerClass = "flex items-stretch h-14 gap-0.5 px-1";

/**
 * Classes for the `<li>` wrapping each item — un `<li>` est `display: list-item`,
 * donc le `flex-1` de {@link bottomBarItemClass} n'y aurait aucun effet sans ce
 * conteneur flex intermédiaire.
 *
 * ⚠️ **`min-w-0` est la classe qui fait TENIR la barre**, pas une précaution.
 *
 * Un flex item a `min-width: auto` par défaut : il refuse de rétrécir sous la
 * largeur min-content de son contenu. Sans elle, le `min-w-[44px]` de l'item
 * n'a jamais sa chance — c'est le `<li>` qui impose la largeur du libellé le plus
 * long, et le `truncate` du libellé ne se déclenche jamais.
 *
 * Constaté au rendu, PAS en test : à 200 % de police racine la barre mesurait
 * encore 477px pour un écran de 390 (« Rechercher » à lui seul réclamait 124px),
 * alors que l'arithmétique du garde-fou — 5 × 44 = 220 — était juste. Le test
 * était vert pour une raison incomplète : il vérifiait le plancher déclaré, pas
 * que quelque chose puisse l'atteindre.
 */
export const bottomBarItemWrapperClass = "flex flex-1 min-w-0";

/** Classes for an individual item (button or link) inside the bar. */
export const bottomBarItemClass = cn(
	"flex-1 flex flex-col items-center justify-center gap-1",
	// ⚠️ La largeur minimale est en **px**, délibérément, et c'est l'exception à
	// « tout en rem » — pas un oubli.
	//
	// Un SEUIL de breakpoint doit suivre la police racine (il décrit une largeur
	// de texte). Une CIBLE TACTILE ne le doit pas : un doigt ne grandit pas quand
	// l'utilisateur agrandit le texte. L'ancienne valeur `min-w-16` (4rem) valait
	// donc 128px à 200 % de police racine — cinq onglets faisaient 640px dans un
	// écran de 390, et comme la barre est `fixed` le débordement n'étend PAS
	// `document.documentElement.scrollWidth` : l'onglet Panier sortait de l'écran
	// et AUCUN geste ne permettait de l'atteindre (WCAG 1.4.4, mesuré le
	// 2026-08-04 : navScrollW 512 / navClientW 390 à 4 onglets).
	//
	// 44px est la valeur de WCAG 2.5.5, la seule qui ait jamais été justifiée ici
	// — 4rem = 64px ne correspondait à rien. Verrouillé par
	// `bottom-bar-touch-target-px.regression.test.ts`.
	"h-full min-h-14 min-w-[44px]",
	// Coins hauts arrondis : la languette de l'onglet courant monte du bas de la
	// barre comme l'intercalaire d'un classeur qu'on aurait tiré.
	"rounded-t-[10px]",
	"transition-colors duration-200",
	// `motion-safe:` sur le scale comme partout ailleurs dans la primitive : le
	// retour tactile de la pression est un transform, pas une couleur.
	"motion-safe:active:scale-[0.98] active:bg-primary/10",
	// ⚠️ L'anneau de focus est sur `--foreground`, PAS sur `--ring`.
	//
	// `--ring` vaut `--primary`, le rose pastel : sur le fond de la barre il donne
	// **1,55:1**, là où WCAG 1.4.11 exige 3:1 pour un indicateur de focus. C'est
	// ce que posaient l'utilitaire `focus-ring` et la règle `:focus-visible` de
	// `@layer base` — un anneau invisible sur la seule surface de navigation qui
	// existe sous 64rem. `--foreground` sur la barre donne 19,54:1.
	//
	// L'offset est négatif : l'anneau se dessine À L'INTÉRIEUR de l'onglet, donc
	// il ne peut plus être repeint par le voisin jointif. `focus-visible:z-10`
	// reste par ceinture et bretelles.
	"focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-foreground focus-visible:outline-offset-[-3px] focus-visible:z-10",
	"relative",
	"text-muted-foreground can-hover:hover:text-foreground",
	// Parité de survol entre les deux hôtes : la boutique ajoutait ce lavage,
	// l'admin non — au clavier-souris d'un iPad l'un répondait au survol et
	// l'autre restait inerte. Il vit désormais dans la primitive.
	"can-hover:hover:bg-primary/5",
);

/**
 * Classes applied to an active item (in addition to bottomBarItemClass).
 *
 * **La languette.** L'onglet courant n'est plus signalé par un ornement posé
 * dessus (l'ancienne pastille de 32×4) : c'est la CELLULE ENTIÈRE qui change de
 * matière, en aplat d'accent de marque sous encre `--foreground`.
 *
 * ⚠️ C'est le sens de lecture qui rend la chose conforme. Les quatre accents
 * (rose, lavande, menthe, soleil) sont **inutilisables en encre** sur fond clair
 * — 1,54 à 2,49:1 — mais excellents en **aplat** sous `--foreground` : 7,85 à
 * 12,68:1. Une barre franchement colorée est donc possible sans la moindre
 * concession, à condition de ne jamais inverser le sens. Verrouillé par
 * `bottom-bar-accent-is-a-surface.regression.test.ts`.
 *
 * La couleur vient de `--section-accent`, posée par `data-accent` sur l'élément
 * (cf. `app/styles/section-accents.css`), avec repli sur le rose signature —
 * même motif que `HandDrawnUnderline`. C'est ce repli qui fait qu'un seul dessin
 * sert les deux hôtes : la boutique décline quatre couleurs de rayon, l'admin
 * garde une languette rose, sans variante à maintenir.
 *
 * Includes forced-colors (Windows High Contrast) and prefers-contrast: more
 * outlines so the active state remains perceivable without relying on color alone.
 */
export const bottomBarActiveItemClass = cn(
	"bottom-bar-tab-current text-foreground",
	"forced-colors:outline forced-colors:outline-2 forced-colors:outline-[Highlight]",
	"contrast-more:outline contrast-more:outline-2 contrast-more:outline-current",
);

/** Icon size class. */
export const bottomBarIconClass = "size-5";

/** Label text class. */
export const bottomBarLabelClass = "text-xs font-medium truncate max-w-full";

/**
 * Alert-style badge class for **destructive-tone** indicators on bottom-bar items
 * (e.g. admin "orders pending" alert that requires action).
 *
 * For neutral counters (cart, wishlist) prefer `<CountBadge>` from
 * `shared/components/ui/count-badge` which uses the brand `bg-primary` and
 * supports dot/inline variants + flash "+N" + AnimatePresence exit.
 *
 * ⚠️ Cette classe ne porte que le visuel. La pastille doit être `aria-hidden` et
 * son compte replié dans l'`aria-label` de l'onglet, l'annonce étant faite par une
 * région `aria-live` **persistante** montée à part. Une région montée en même temps
 * que son contenu n'est jamais vocalisée : la pastille admin gatée sur
 * `count > 0` rendait muette la transition 0→1, soit l'arrivée d'une commande à
 * traiter — la seule qui compte (audit bottom-bar 2026-07-30, P2-4 ; même piège
 * documenté dans `CountBadge`).
 *
 * Positioned absolutely over the icon's top-right corner. Includes a
 * background-colored outline to stay visible in forced-colors / prefers-contrast.
 */
export const bottomBarBadgeClass = cn(
	"absolute -top-1 -right-1",
	"min-w-4 h-4 px-1",
	"rounded-full",
	"bg-destructive text-destructive-foreground",
	"text-2xs font-semibold leading-none",
	"flex items-center justify-center",
	"ring-2 ring-background",
	"forced-colors:outline forced-colors:outline-1 forced-colors:outline-[CanvasText]",
);
