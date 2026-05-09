"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";

import { triggerHaptic, type HapticPattern } from "@/shared/hooks/use-haptic";
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
	onClick: () => void;
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
 * Returns the next non-disabled item index in the given direction (with
 * wrap-around). Returns null if every item is disabled.
 *
 * Use `from = -1, direction = 1` to find the FIRST enabled index.
 * Use `from = 0, direction = -1` to find the LAST enabled index.
 */
function nextEnabledIndex(
	items: StickyActionBarItem[],
	from: number,
	direction: 1 | -1,
): number | null {
	const count = items.length;
	if (count === 0) return null;
	let i = from;
	for (let step = 0; step < count; step++) {
		i = (i + direction + count) % count;
		const item = items[i];
		if (item && !isDisabledItem(item)) return i;
	}
	return null;
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
 * **Haptic** : pattern `"selection"` (5ms) déclenché au tap par défaut.
 * Opt-out par item via `haptic: false`. Respecte `prefers-reduced-motion`
 * et le cooldown anti-cascade global.
 *
 * **Accessibilité** :
 *   - `role="toolbar"` avec navigation flèches gauche/droite/haut/bas + Home/End.
 *   - Roving `tabindex`. Les items disabled sont skippés.
 *   - Live region `polite` qui annonce les changements d'état actif.
 *   - Touch targets ≥ 44px (WCAG 2.5.5) + `touch-manipulation` (élimine le
 *     300ms tap-delay iOS Safari).
 *   - Safe-area horizontale (`env(safe-area-inset-left/right)`) sur le toolbar
 *     pour éviter la traversée de la notch en landscape.
 *
 * **Positionnement** :
 *   - `sticky top-[var(--admin-header-height,3.5rem)]` — s'aligne sur le
 *     header via la CSS custom property publiée par le layout admin
 *     (`[data-admin-layout]`).
 *   - `-mx-6` : compense le `p-6` du `<main>` admin pour un effet full-bleed.
 *   - `md:hidden` : masquée sur desktop (la toolbar desktop prend le relais).
 *
 * @example
 * ```tsx
 * const { isOpen, onOpenChange, open } = useToolbarDrawer<"sort"|"filter">();
 * const sp = useSearchParams();
 *
 * const items: StickyActionBarItem[] = [
 *   {
 *     key: "sort",
 *     icon: ArrowUpDown,
 *     label: "Trier",
 *     ariaLabel: "Ouvrir le tri",
 *     onClick: () => open("sort"),
 *     haspopup: "dialog",
 *     active: sp.has("sortBy"),
 *     expanded: isOpen("sort"),
 *   },
 *   {
 *     key: "filter",
 *     icon: SlidersHorizontal,
 *     label: "Filtrer",
 *     ariaLabel: "Ouvrir les filtres",
 *     onClick: () => open("filter"),
 *     haspopup: "dialog",
 *     badgeCount: activeFilterCount,
 *     expanded: isOpen("filter"),
 *   },
 *   {
 *     kind: "link",
 *     key: "add",
 *     icon: Plus,
 *     label: "Ajouter",
 *     ariaLabel: "Ajouter un produit",
 *     href: "/admin/catalogue/produits/nouveau",
 *     viewTransitionName: "admin-add-action",
 *   },
 * ];
 *
 * <StickyActionBar items={items} ariaLabel="Tri et filtres" />
 * ```
 */
export function StickyActionBar({ items, ariaLabel, className }: StickyActionBarProps) {
	const [focusedIndex, setFocusedIndex] = useState<number>(
		() => nextEnabledIndex(items, -1, 1) ?? 0,
	);
	const itemRefs = useRef<Array<HTMLButtonElement | HTMLAnchorElement | null>>([]);

	const handleKeyDown = (e: KeyboardEvent, currentIndex: number) => {
		if (items.length === 0) return;
		let nextIndex: number | null = null;

		switch (e.key) {
			case "ArrowRight":
			case "ArrowDown":
				e.preventDefault();
				nextIndex = nextEnabledIndex(items, currentIndex, 1);
				break;
			case "ArrowLeft":
			case "ArrowUp":
				e.preventDefault();
				nextIndex = nextEnabledIndex(items, currentIndex, -1);
				break;
			case "Home":
				e.preventDefault();
				nextIndex = nextEnabledIndex(items, -1, 1);
				break;
			case "End":
				e.preventDefault();
				nextIndex = nextEnabledIndex(items, 0, -1);
				break;
		}

		if (nextIndex !== null) {
			setFocusedIndex(nextIndex);
			itemRefs.current[nextIndex]?.focus();
		}
	};

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

	return (
		<nav
			aria-label={ariaLabel}
			data-testid="sticky-action-bar"
			className={cn(
				"md:hidden",
				"sticky top-[var(--admin-header-height,3.5rem)] z-30",
				"bg-background/95 supports-[backdrop-filter]:bg-background/60 backdrop-blur-md",
				"border-border/50 border-b",
				// Compense le p-6 du <main> admin pour l'effet full-bleed.
				"-mx-6",
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
					};
					const isActive = isItemActive(item);
					const itemClassName = cn(baseItemClasses, isActive && activeItemClasses);
					const dataAttrs = {
						"data-active": isActive ? "" : undefined,
						"data-state": item.expanded ? "open" : "closed",
					};
					const indicator =
						item.badgeCount && item.badgeCount > 0 ? (
							<>
								<span
									className="bg-primary text-primary-foreground inline-flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full px-1 text-[10px] font-bold"
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
								onKeyDown={(e) => handleKeyDown(e, index)}
								onFocus={() => setFocusedIndex(index)}
								tabIndex={focusedIndex === index ? 0 : -1}
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
							onClick={() => {
								triggerItemHaptic(item);
								item.onClick();
							}}
							onKeyDown={(e) => handleKeyDown(e, index)}
							onFocus={() => setFocusedIndex(index)}
							tabIndex={focusedIndex === index ? 0 : -1}
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
