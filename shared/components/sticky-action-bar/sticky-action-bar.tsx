"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import {
	createRef,
	useEffect,
	useRef,
	useState,
	type KeyboardEvent,
	type ReactNode,
	type RefObject,
} from "react";

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
	/** Accessible name — should describe the effect AND any active state. */
	ariaLabel: string;
	/** When true, applies the active text color + optional dot/badge. */
	active?: boolean;
	/** Numeric badge (e.g. number of active filters). Takes precedence over `active` dot. */
	badgeCount?: number;
	/** ARIA popup kind for buttons that open a dialog/menu. */
	haspopup?: "dialog" | "menu" | "listbox" | "tree" | "grid";
	/** ARIA expanded state. */
	expanded?: boolean;
	/** Text shown in the polite live region when this item becomes active. */
	announcement?: string;
}

interface StickyActionBarButton extends StickyActionBarItemBase {
	kind?: "button";
	onClick: () => void;
	/** Disabled state (kept focusable via roving tabindex). */
	disabled?: boolean;
}

interface StickyActionBarLink extends StickyActionBarItemBase {
	kind: "link";
	href: string;
	/** Open in a new tab. */
	external?: boolean;
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
	 * Content rendered to the right of the item row (e.g., a small status
	 * indicator). Kept hidden on very narrow viewports when the toolbar is full.
	 */
	endSlot?: ReactNode;
}

const baseItemClasses = cn(
	"flex flex-1 items-center justify-center gap-1.5 h-11 min-w-0 px-2",
	"text-xs font-medium text-muted-foreground",
	"hover:text-foreground",
	"active:bg-primary/5 active:scale-[0.98]",
	"transition-[color,background-color,transform] duration-150",
	"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset",
	"disabled:opacity-50 disabled:pointer-events-none",
);

const activeItemClasses = "text-foreground";

function isItemActive(item: StickyActionBarItem): boolean {
	if (item.active === true) return true;
	return (item.badgeCount ?? 0) > 0;
}

/**
 * Sous-header sticky (mobile uniquement) pour une rangée d'actions
 * contextuelles (Trier, Rechercher, Filtrer, Ajouter…).
 *
 * Positionne juste sous le header de l'interface courante, 2-5 boutons
 * compacts data-driven. Convention e-commerce mobile (Zalando, ASOS, Etsy) :
 * actions de listing en sticky header, wayfinding primaire en bottom nav.
 *
 * Accessibilité :
 * - `role="toolbar"` avec navigation par flèches gauche/droite/haut/bas + Home/End
 * - Roving `tabindex` entre les items
 * - Live region `polite` qui annonce les changements d'état actif
 * - Touch targets ≥ 44px (WCAG 2.5.5)
 *
 * Positionnement :
 * - `sticky top-[var(--admin-header-height,3.5rem)]` — s'aligne sur le header
 *   via la CSS custom property publiée par le layout (admin publie
 *   `--admin-header-height` sur `[data-admin-layout]`).
 * - `-mx-6` : compense le `p-6` du `<main>` admin pour un effet full-bleed.
 * - `md:hidden` : masquée sur desktop (toolbar desktop prend le relais).
 */
export function StickyActionBar({ items, ariaLabel, className, endSlot }: StickyActionBarProps) {
	const [focusedIndex, setFocusedIndex] = useState(0);
	const itemRefs = items.map(() => createRef<HTMLButtonElement | HTMLAnchorElement>()) as RefObject<
		HTMLButtonElement | HTMLAnchorElement | null
	>[];

	const handleKeyDown = (e: KeyboardEvent, currentIndex: number) => {
		const count = items.length;
		if (count === 0) return;
		let nextIndex: number | null = null;

		switch (e.key) {
			case "ArrowRight":
			case "ArrowDown":
				e.preventDefault();
				nextIndex = (currentIndex + 1) % count;
				break;
			case "ArrowLeft":
			case "ArrowUp":
				e.preventDefault();
				nextIndex = (currentIndex - 1 + count) % count;
				break;
			case "Home":
				e.preventDefault();
				nextIndex = 0;
				break;
			case "End":
				e.preventDefault();
				nextIndex = count - 1;
				break;
		}

		if (nextIndex !== null) {
			setFocusedIndex(nextIndex);
			itemRefs[nextIndex]?.current?.focus();
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

	return (
		<nav
			aria-label={ariaLabel}
			data-testid="sticky-action-bar"
			className={cn(
				"md:hidden",
				"sticky top-[var(--admin-header-height,3.5rem)] z-30",
				"bg-background/80 backdrop-blur-md",
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
				className="divide-border/30 flex items-stretch divide-x"
			>
				{items.map((item, index) => {
					const Icon = item.icon;
					const commonA11y = {
						"aria-label": item.ariaLabel,
						...(item.haspopup && { "aria-haspopup": item.haspopup }),
						...(typeof item.expanded === "boolean" && { "aria-expanded": item.expanded }),
					};
					const isActive = isItemActive(item);
					const className = cn(baseItemClasses, isActive && activeItemClasses);
					const indicator =
						item.badgeCount && item.badgeCount > 0 ? (
							<span
								className="bg-primary text-primary-foreground inline-flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full px-1 text-[10px] font-bold"
								aria-hidden="true"
							>
								{item.badgeCount > 99 ? "99+" : item.badgeCount}
							</span>
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
						return (
							<Link
								key={item.key}
								ref={itemRefs[index] as RefObject<HTMLAnchorElement | null>}
								href={item.href}
								target={item.external ? "_blank" : undefined}
								rel={item.external ? "noopener noreferrer" : undefined}
								onKeyDown={(e) => handleKeyDown(e, index)}
								onFocus={() => setFocusedIndex(index)}
								tabIndex={focusedIndex === index ? 0 : -1}
								className={className}
								{...commonA11y}
							>
								{children}
							</Link>
						);
					}

					return (
						<button
							key={item.key}
							ref={itemRefs[index] as RefObject<HTMLButtonElement | null>}
							type="button"
							disabled={item.disabled}
							onClick={item.onClick}
							onKeyDown={(e) => handleKeyDown(e, index)}
							onFocus={() => setFocusedIndex(index)}
							tabIndex={focusedIndex === index ? 0 : -1}
							className={className}
							{...commonA11y}
						>
							{children}
						</button>
					);
				})}

				{endSlot}
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
