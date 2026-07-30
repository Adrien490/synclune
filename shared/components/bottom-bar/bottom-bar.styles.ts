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
export const bottomBarContainerClass = "flex items-stretch h-14";

/**
 * Classes for the `<li>` wrapping each item — un `<li>` est `display: list-item`,
 * donc le `flex-1` de {@link bottomBarItemClass} n'y aurait aucun effet sans ce
 * conteneur flex intermédiaire.
 */
export const bottomBarItemWrapperClass = "flex flex-1";

/** Classes for an individual item (button or link) inside the bar. */
export const bottomBarItemClass = cn(
	"flex-1 flex flex-col items-center justify-center gap-1",
	"h-full min-h-14 min-w-16",
	"transition-colors duration-200",
	// `motion-safe:` sur le scale comme partout ailleurs dans la primitive : le
	// retour tactile de la pression est un transform, pas une couleur.
	"motion-safe:active:scale-[0.98] active:bg-primary/10",
	// `focus-ring` pose un anneau de 3px en box-shadow **externe**. Les onglets
	// sont jointifs et tous `relative`, donc l'ordre de peinture suit le DOM :
	// sans `z-10` au focus, l'onglet suivant repeignait le bord partagé de
	// l'anneau (WCAG 2.4.11). `focus-visible:border-ring`, porté par l'utilitaire,
	// est inerte ici — l'item n'a aucune classe `border`, donc `border-width: 0`.
	"focus-ring focus-visible:z-10",
	"relative",
	"text-muted-foreground can-hover:hover:text-foreground",
);

/**
 * Classes applied to an active item (in addition to bottomBarItemClass).
 *
 * Includes forced-colors (Windows High Contrast) and prefers-contrast: more
 * outlines so the active state remains perceivable without relying on color alone.
 */
export const bottomBarActiveItemClass = cn(
	"text-foreground",
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
