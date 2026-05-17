"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, type CSSProperties, type MouseEvent } from "react";

import { triggerHaptic, type HapticPattern } from "@/shared/hooks/use-haptic";
import { useRovingTabIndex } from "@/shared/hooks/use-roving-tab-index";
import { cn } from "@/shared/utils/cn";

/**
 * Base props shared by every item (button or link).
 */
interface StickyActionBarItemBase {
	/** Stable key for React + refs. */
	key: string;
	/** Visible label (truncated when the bar is narrow). */
	label: string;
	/** Leading icon (lucide-react). */
	icon: LucideIcon;
	/**
	 * Accessible name — should describe the EFFECT only ("Ouvrir les filtres").
	 * The active-count is announced automatically via a sibling sr-only span
	 * when `badgeCount > 0`, so the wrapper does NOT need to repeat it here.
	 */
	ariaLabel: string;
	/** When true, applies the active text color + small dot (no badge). */
	active?: boolean;
	/**
	 * Numeric badge (e.g. number of active filters). Takes precedence over
	 * `active` dot, and emits an automatic sr-only "X éléments actifs"
	 * announcement next to the visual badge.
	 */
	badgeCount?: number;
	/** ARIA popup kind for buttons that open a dialog/menu. */
	haspopup?: "dialog" | "menu" | "listbox" | "tree" | "grid";
	/** ARIA expanded state — wire to drawer open state for `data-state="open"`. */
	expanded?: boolean;
	/**
	 * DOM `id` of the controlled popup (drawer/dialog/menu). When provided
	 * alongside `haspopup`, wired automatically as `aria-controls` so assistive
	 * tech can announce which popup is operated.
	 */
	controls?: string;
	/** Text shown in the polite live region when this item becomes active. */
	announcement?: string;
	/**
	 * Haptic pattern triggered on tap. Default: `"selection"` (5ms).
	 * Pass `false` to opt out (e.g. when the action is purely cosmetic).
	 */
	haptic?: HapticPattern | false;
}

interface StickyActionBarButton extends StickyActionBarItemBase {
	kind?: "button";
	onClick: (event: MouseEvent<HTMLButtonElement>) => void;
	/** Disabled state. The keyboard navigation skips disabled items. */
	disabled?: boolean;
}

interface StickyActionBarLink extends StickyActionBarItemBase {
	kind: "link";
	href: string;
	/** Open in a new tab. */
	external?: boolean;
	/**
	 * CSS `view-transition-name` applied to the link, e.g. `"admin-add-action"`.
	 * Lets Next.js morph the link into the destination page header on click.
	 */
	viewTransitionName?: string;
}

export type StickyActionBarItem = StickyActionBarButton | StickyActionBarLink;

interface StickyActionBarProps {
	/** Toolbar items — typically 2-5. */
	items: StickyActionBarItem[];
	/** Accessible name for the `<nav>` + `<toolbar>` wrapper. */
	ariaLabel: string;
	/** Extra classes merged onto the nav. */
	className?: string;
	/**
	 * CSS custom property name (without `var(...)`) used for `sticky top`.
	 * Default: `"--admin-header-height"` (admin layout). For other contexts,
	 * pass e.g. `"--shop-header-height"`. Falls back to `3.5rem` if unset.
	 */
	stickyTopVar?: string;
	/**
	 * `data-testid` for the root `<nav>`. Default: `"sticky-action-bar"`.
	 * Override when multiple bars coexist in tests.
	 */
	testId?: string;
}

const baseItemClasses = cn(
	"flex flex-1 items-center justify-center gap-1.5 h-11 min-w-0 px-2",
	"text-xs font-medium text-muted-foreground",
	"hover:text-foreground",
	"active:bg-primary/5 motion-safe:active:scale-[0.98]",
	"motion-safe:transition-[color,background-color,transform] motion-safe:duration-[var(--duration-fast)]",
	"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset",
	"disabled:opacity-50 disabled:pointer-events-none",
	"touch-manipulation [-webkit-tap-highlight-color:transparent]",
);

const activeItemClasses = "text-foreground";

function isItemActive(item: StickyActionBarItem): boolean {
	if (item.active === true) return true;
	return (item.badgeCount ?? 0) > 0;
}

function isDisabledItem(item: StickyActionBarItem): boolean {
	return item.kind !== "link" && item.disabled === true;
}

/**
 * Sous-header sticky (mobile uniquement) pour une rangée d'actions
 * contextuelles (Trier, Rechercher, Filtrer, Ajouter…).
 *
 * Positionne juste sous le header de l'interface courante, 2-5 boutons
 * compacts data-driven. Convention e-commerce mobile (Zalando, ASOS, Etsy) :
 * actions de listing en sticky header, wayfinding primaire en bottom nav.
 *
 * **Contrat `ariaLabel`** : décrit l'EFFET seul ("Ouvrir les filtres"). Le
 * compteur `badgeCount` est annoncé automatiquement via un span sr-only
 * jumeau du badge visuel — aucun besoin de le dupliquer dans `ariaLabel`.
 *
 * **Badge vs active** :
 *   - `badgeCount: number` → comptable (n filtres actifs). Affiche un badge
 *     numérique (capé "99+") + sr-only "n éléments actifs".
 *   - `active: true`       → booléen (recherche/tri appliqué). Affiche un
 *     petit dot. Annonce textuelle via `announcement` dans la live region.
 *
 * **`controls`** : passer l'`id` DOM du popup pour câbler `aria-controls`
 * quand `haspopup` est défini. Les drawers (`SortDrawer`,
 * `AdminSearchDrawerTop`, `*-FilterSheet`) acceptent une prop `id` ;
 * partager la constante entre le drawer et l'item.
 *
 * **Haptic** : pattern `"selection"` (5ms) déclenché au tap par défaut.
 * Opt-out par item via `haptic: false`. Respecte `prefers-reduced-motion`
 * et le cooldown anti-cascade global.
 *
 * **Accessibilité** :
 *   - `role="toolbar"` avec navigation flèches gauche/droite/haut/bas + Home/End
 *     (via `useRovingTabIndex` partagé).
 *   - Roving `tabindex` avec auto-realign si l'item ciblé devient out-of-bounds
 *     ou disabled (évite le deadlock "aucun item tab-able").
 *   - Live region `polite` qui annonce les changements d'état actif.
 *   - Touch targets ≥ 44px (WCAG 2.5.5) + `touch-manipulation` (élimine le
 *     300ms tap-delay iOS Safari).
 *   - Safe-area horizontale (`env(safe-area-inset-left/right)`) sur le toolbar
 *     pour éviter la traversée de la notch en landscape.
 *
 * **Positionnement** :
 *   - `sticky top: var(--admin-header-height, 3.5rem)` — paramétrable via
 *     `stickyTopVar` pour usages hors admin (publier la var côté layout).
 *   - `-mx-[var(--admin-main-x,1.5rem)]` : compense le padding horizontal du
 *     `<main>` admin (var publiée par `[data-admin-layout]`) pour l'effet
 *     full-bleed sans hardcoder `-mx-6`.
 *   - `md:hidden` : masquée sur desktop (la toolbar desktop prend le relais).
 *
 * @example
 * ```tsx
 * const FILTER_ID = "admin-products-filter-drawer";
 * const { isOpen, onOpenChange, open } = useToolbarDrawer<"sort"|"filter">();
 *
 * const items: StickyActionBarItem[] = [
 *   {
 *     key: "filter",
 *     icon: SlidersHorizontal,
 *     label: "Filtrer",
 *     ariaLabel: "Ouvrir les filtres",
 *     onClick: () => open("filter"),
 *     haspopup: "dialog",
 *     controls: FILTER_ID,
 *     badgeCount: activeFilterCount,
 *     expanded: isOpen("filter"),
 *   },
 * ];
 *
 * <StickyActionBar items={items} ariaLabel="Tri et filtres" />
 * <ProductsFilterSheet id={FILTER_ID} ... />
 * ```
 */
export function StickyActionBar({
	items,
	ariaLabel,
	className,
	stickyTopVar = "--admin-header-height",
	testId = "sticky-action-bar",
}: StickyActionBarProps) {
	const { getTabIndex, setFocusedIndex, itemRefs, onKeyDown } = useRovingTabIndex<
		StickyActionBarItem,
		HTMLButtonElement | HTMLAnchorElement
	>({ items, isDisabled: isDisabledItem });

	// Live region — announce active-state transitions (debounced clear 3s)
	const announcementRef = useRef<HTMLSpanElement>(null);
	const activeSignature = items
		.filter(isItemActive)
		.map(
			(it) => `${it.key}:${it.announcement ?? it.label}${it.badgeCount ? `:${it.badgeCount}` : ""}`,
		)
		.join("|");

	useEffect(() => {
		if (!announcementRef.current) return;

		const parts = items.filter(isItemActive).map((it) => it.announcement ?? it.label);

		announcementRef.current.textContent = parts.join(". ");
		const timer = setTimeout(() => {
			if (announcementRef.current) announcementRef.current.textContent = "";
		}, 3000);
		return () => clearTimeout(timer);
		// activeSignature is the stable digest of what matters here.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [activeSignature]);

	const triggerItemHaptic = (item: StickyActionBarItem) => {
		if (item.haptic === false) return;
		triggerHaptic(item.haptic ?? "selection");
	};

	const stickyStyle: CSSProperties = { top: `var(${stickyTopVar},3.5rem)` };

	return (
		<nav
			aria-label={ariaLabel}
			data-testid={testId}
			style={stickyStyle}
			className={cn(
				"md:hidden",
				"sticky z-30",
				"bg-background/95 supports-[backdrop-filter]:bg-background/60 backdrop-blur-md",
				"border-border/50 border-b",
				// Compense le padding horizontal du <main> admin pour l'effet full-bleed.
				"-mx-[var(--admin-main-x,1.5rem)]",
				// Mount entry — slide-down + fade, motion-safe gated
				"motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-2 motion-safe:duration-300 motion-safe:ease-out",
				className,
			)}
		>
			<div
				role="toolbar"
				aria-orientation="horizontal"
				aria-label={ariaLabel}
				className="divide-border/30 flex items-stretch divide-x pr-[env(safe-area-inset-right)] pl-[env(safe-area-inset-left)]"
			>
				{items.map((item, index) => {
					const Icon = item.icon;
					const commonA11y = {
						"aria-label": item.ariaLabel,
						...(item.haspopup && { "aria-haspopup": item.haspopup }),
						...(typeof item.expanded === "boolean" && { "aria-expanded": item.expanded }),
						...(item.haspopup && item.controls && { "aria-controls": item.controls }),
					};
					const isActive = isItemActive(item);
					const itemClassName = cn(baseItemClasses, isActive && activeItemClasses);
					const dataAttrs = {
						"data-active": isActive ? "" : undefined,
						...(typeof item.expanded === "boolean" && {
							"data-state": item.expanded ? "open" : "closed",
						}),
					};
					const indicator =
						item.badgeCount && item.badgeCount > 0 ? (
							<>
								<span
									className="bg-primary text-primary-foreground text-2xs inline-flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full px-1 font-bold"
									aria-hidden="true"
								>
									{item.badgeCount > 99 ? "99+" : item.badgeCount}
								</span>
								<span className="sr-only">
									{item.badgeCount > 99 ? "plus de 99" : item.badgeCount}{" "}
									{item.badgeCount === 1 ? "élément actif" : "éléments actifs"}
								</span>
							</>
						) : item.active ? (
							<span className="bg-primary size-1.5 shrink-0 rounded-full" aria-hidden="true" />
						) : null;

					const children = (
						<>
							<Icon className="size-4 shrink-0" aria-hidden="true" />
							<span className="truncate">{item.label}</span>
							{indicator}
						</>
					);

					if (item.kind === "link") {
						const linkStyle: CSSProperties | undefined = item.viewTransitionName
							? { viewTransitionName: item.viewTransitionName }
							: undefined;

						return (
							<Link
								key={item.key}
								ref={(node) => {
									itemRefs.current[index] = node;
								}}
								href={item.href}
								target={item.external ? "_blank" : undefined}
								rel={item.external ? "noopener noreferrer" : undefined}
								onClick={() => triggerItemHaptic(item)}
								onKeyDown={(e) => onKeyDown(e, index)}
								onFocus={() => setFocusedIndex(index)}
								tabIndex={getTabIndex(index)}
								className={itemClassName}
								style={linkStyle}
								{...dataAttrs}
								{...commonA11y}
							>
								{children}
							</Link>
						);
					}

					return (
						<button
							key={item.key}
							ref={(node) => {
								itemRefs.current[index] = node;
							}}
							type="button"
							disabled={item.disabled}
							onClick={(e) => {
								triggerItemHaptic(item);
								item.onClick(e);
							}}
							onKeyDown={(e) => onKeyDown(e, index)}
							onFocus={() => setFocusedIndex(index)}
							tabIndex={getTabIndex(index)}
							className={itemClassName}
							{...dataAttrs}
							{...commonA11y}
						>
							{children}
						</button>
					);
				})}
			</div>

			<span
				ref={announcementRef}
				role="status"
				aria-live="polite"
				aria-atomic="true"
				className="sr-only"
			/>
		</nav>
	);
}
