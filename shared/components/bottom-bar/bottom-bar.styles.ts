import { cn } from "@/shared/utils/cn";

// ---------------------------------------------------------------------------
// Shared class constants
// ---------------------------------------------------------------------------

/** Classes for the inner container (flex row with dividers). */
export const bottomBarContainerClass = "flex items-stretch h-14";

/** Classes for an individual item (button or link) inside the bar. */
export const bottomBarItemClass = cn(
	"flex-1 flex flex-col items-center justify-center gap-1",
	"h-full min-h-14 min-w-16",
	"transition-colors duration-200",
	"active:scale-[0.98] active:bg-primary/10",
	"focus-ring",
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
