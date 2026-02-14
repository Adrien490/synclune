"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { Search, ArrowUpDown, SlidersHorizontal } from "lucide-react";

import { useDialog } from "@/shared/providers/dialog-store-provider";
import { QUICK_SEARCH_DIALOG_ID } from "@/modules/products/components/quick-search-dialog/constants";
import { PRODUCT_FILTER_DIALOG_ID, PRODUCTS_SORT_LABELS } from "@/modules/products/constants/product.constants";
import { countActiveFilters } from "@/modules/products/services/product-filter-params.service";
import { SortDrawer, type SortOption } from "@/shared/components/sort-drawer";
import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";
import { cn } from "@/shared/utils/cn";
import { hapticLight } from "@/shared/utils/haptic";
import { useBottomBarHeight } from "@/shared/hooks";

interface ProductSortBarProps {
	/** Options de tri disponibles */
	sortOptions: SortOption[];
	/** Classes CSS additionnelles */
	className?: string;
}

/** Short labels for sort options displayed under "Trier" */
const SORT_SHORT_LABELS: Record<string, string> = {
	"rating-descending": "Notes",
	"title-ascending": "A-Z",
	"title-descending": "Z-A",
	"price-ascending": "Prix \u2191",
	"price-descending": "Prix \u2193",
	"created-ascending": "Anciens",
	"created-descending": "R\u00e9cents",
};

interface ActiveBadgeProps {
	count?: number;
	showDot?: boolean;
}

function ActiveBadge({ count, showDot = false }: ActiveBadgeProps) {
	if (showDot && !count) {
		return (
			<span
				className="absolute top-1.5 right-1/2 translate-x-5 size-2.5 bg-primary rounded-full ring-2 ring-background animate-in zoom-in-50 duration-200"
				aria-hidden="true"
			/>
		);
	}
	if (count && count > 0) {
		return (
			<span
				className="absolute -top-0.5 right-1/2 translate-x-6 min-w-[18px] h-[18px] bg-primary text-primary-foreground rounded-full text-[11px] flex items-center justify-center font-semibold px-1 ring-2 ring-background animate-in zoom-in-50 duration-200"
				aria-hidden="true"
			>
				{count > 9 ? "9+" : count}
			</span>
		);
	}
	return null;
}

/**
 * Barre d'actions fixe en bas pour mobile (tri, recherche, filtres).
 *
 * Affiche 3 boutons:
 * - Recherche (ouvre QuickSearchDialog)
 * - Tri (ouvre SortDrawer)
 * - Filtres (ouvre ProductFilterSheet)
 *
 * Visible uniquement sur mobile (md:hidden).
 * Respecte safe-area-inset-bottom pour iPhone X+.
 *
 * Accessibilité:
 * - role="toolbar" avec navigation par flèches gauche/droite
 * - Live region pour annoncer les changements d'état
 * - Touch targets 72px minimum (WCAG 2.5.8)
 */
export function ProductSortBar({ sortOptions, className }: ProductSortBarProps) {
	useBottomBarHeight(56);

	const [sortOpen, setSortOpen] = useState(false);
	const [focusedIndex, setFocusedIndex] = useState(0);
	const { open: openSearch, isOpen: isSearchOpen } = useDialog(QUICK_SEARCH_DIALOG_ID);
	const { open: openFilter, isOpen: isFilterOpen } = useDialog(PRODUCT_FILTER_DIALOG_ID);
	const searchParams = useSearchParams();
	const prefersReducedMotion = useReducedMotion();

	// Refs for toolbar buttons (order: Sort, Search, Filters)
	const sortButtonRef = useRef<HTMLButtonElement>(null);
	const searchButtonRef = useRef<HTMLButtonElement>(null);
	const filterButtonRef = useRef<HTMLButtonElement>(null);
	const buttonRefs = [sortButtonRef, searchButtonRef, filterButtonRef];

	// Active states
	const hasActiveSearch = searchParams.has("search") && searchParams.get("search") !== "";
	const sortByValue = searchParams.get("sortBy");
	const hasActiveSort = !!sortByValue;
	const { activeFiltersCount, hasActiveFilters } = countActiveFilters(searchParams);

	// Short label for active sort (B2)
	const sortShortLabel = sortByValue ? SORT_SHORT_LABELS[sortByValue] : null;

	// Event-driven live region (B6c)
	const [announcement, setAnnouncement] = useState("");
	const prevStateRef = useRef({ hasActiveSearch, hasActiveSort, hasActiveFilters, activeFiltersCount, search: searchParams.get("search") });

	useEffect(() => {
		const prev = prevStateRef.current;
		const currentSearch = searchParams.get("search");
		const changed =
			prev.hasActiveSearch !== hasActiveSearch ||
			prev.hasActiveSort !== hasActiveSort ||
			prev.hasActiveFilters !== hasActiveFilters ||
			prev.activeFiltersCount !== activeFiltersCount ||
			prev.search !== currentSearch;

		if (!changed) return;

		prevStateRef.current = { hasActiveSearch, hasActiveSort, hasActiveFilters, activeFiltersCount, search: currentSearch };

		const parts = [
			hasActiveSearch && `Recherche "${currentSearch}" active`,
			hasActiveSort && `Tri : ${sortByValue ? (PRODUCTS_SORT_LABELS[sortByValue as keyof typeof PRODUCTS_SORT_LABELS] ?? "actif") : "actif"}`,
			hasActiveFilters &&
				`${activeFiltersCount} filtre${activeFiltersCount > 1 ? "s" : ""} actif${activeFiltersCount > 1 ? "s" : ""}`,
		]
			.filter(Boolean)
			.join(". ");

		setAnnouncement(parts);

		// Clear after 3s to avoid re-announcements
		const timer = setTimeout(() => setAnnouncement(""), 3000);
		return () => clearTimeout(timer);
	}, [hasActiveSearch, hasActiveSort, hasActiveFilters, activeFiltersCount, searchParams, sortByValue]);

	// Focus restoration after panel close (B6d)
	const prevSortOpenRef = useRef(sortOpen);
	const prevSearchOpenRef = useRef(isSearchOpen);
	const prevFilterOpenRef = useRef(isFilterOpen);

	useEffect(() => {
		if (prevSortOpenRef.current && !sortOpen) {
			sortButtonRef.current?.focus();
		}
		prevSortOpenRef.current = sortOpen;
	}, [sortOpen]);

	useEffect(() => {
		if (prevSearchOpenRef.current && !isSearchOpen) {
			searchButtonRef.current?.focus();
		}
		prevSearchOpenRef.current = isSearchOpen;
	}, [isSearchOpen]);

	useEffect(() => {
		if (prevFilterOpenRef.current && !isFilterOpen) {
			filterButtonRef.current?.focus();
		}
		prevFilterOpenRef.current = isFilterOpen;
	}, [isFilterOpen]);

	// Keyboard navigation for toolbar (arrow keys)
	const handleToolbarKeyDown = (e: React.KeyboardEvent, currentIndex: number) => {
		const buttonCount = 3;
		let nextIndex: number | null = null;

		switch (e.key) {
			case "ArrowRight":
			case "ArrowDown":
				e.preventDefault();
				nextIndex = (currentIndex + 1) % buttonCount;
				break;
			case "ArrowLeft":
			case "ArrowUp":
				e.preventDefault();
				nextIndex = (currentIndex - 1 + buttonCount) % buttonCount;
				break;
			case "Home":
				e.preventDefault();
				nextIndex = 0;
				break;
			case "End":
				e.preventDefault();
				nextIndex = buttonCount - 1;
				break;
		}

		if (nextIndex !== null) {
			setFocusedIndex(nextIndex);
			buttonRefs[nextIndex].current?.focus();
		}
	};

	// Common button styles (B5: scale-[0.98] instead of scale-95)
	const getButtonClassName = (isActive: boolean) =>
		cn(
			"flex-1 min-w-18 flex flex-col items-center justify-center gap-1",
			"h-full min-h-14", // 56px - Material Design 3 touch target
			"transition-colors duration-200",
			"active:scale-[0.98] active:bg-primary/10",
			"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset",
			"relative",
			isActive
				? "text-primary hover:text-primary"
				: "text-muted-foreground hover:text-foreground"
		);

	const iconClassName = "size-5";
	const labelClassName = "text-xs font-medium";

	return (
		<>
			<motion.div
				initial={prefersReducedMotion ? false : { y: 100, opacity: 0 }}
				animate={{ y: 0, opacity: 1 }}
				transition={MOTION_CONFIG.spring.bar}
				className={cn(
					// Mobile only
					"md:hidden",
					// Position fixe en bas
					"fixed bottom-0 left-0 right-0 z-50",
					// Safe area pour iPhone X+
					"pb-[env(safe-area-inset-bottom)]",
					// Style
					"bg-background/95 backdrop-blur-md",
					"border-t border-x border-border",
					"rounded-t-2xl",
					"shadow-[0_-4px_20px_rgba(0,0,0,0.08)]",
					className
				)}
			>
				<div
					role="toolbar"
					aria-orientation="horizontal"
					aria-label="Actions rapides"
					className="flex items-stretch h-14 divide-x divide-border/50"
				>
					{/* Tri */}
					<button
						ref={sortButtonRef}
						type="button"
						onClick={() => {
							hapticLight();
							setSortOpen(true);
						}}
						onKeyDown={(e) => handleToolbarKeyDown(e, 0)}
						onFocus={() => setFocusedIndex(0)}
						tabIndex={focusedIndex === 0 ? 0 : -1}
						className={getButtonClassName(hasActiveSort)}
						aria-label={hasActiveSort ? "Tri actif. Modifier le tri" : "Ouvrir les options de tri"}
					>
						<ArrowUpDown className={iconClassName} aria-hidden="true" />
						<span className={labelClassName}>Trier</span>
						{sortShortLabel ? (
							<span className="text-[10px] text-primary truncate max-w-16 leading-none">
								{sortShortLabel}
							</span>
						) : (
							<ActiveBadge showDot={hasActiveSort} />
						)}
					</button>

					{/* Recherche */}
					<button
						ref={searchButtonRef}
						type="button"
						onClick={() => {
							hapticLight();
							openSearch();
						}}
						onKeyDown={(e) => handleToolbarKeyDown(e, 1)}
						onFocus={() => setFocusedIndex(1)}
						tabIndex={focusedIndex === 1 ? 0 : -1}
						className={getButtonClassName(hasActiveSearch)}
						aria-label={
							hasActiveSearch
								? `Recherche: "${searchParams.get("search")}". Modifier la recherche`
								: "Ouvrir la recherche"
						}
					>
						<Search className={iconClassName} aria-hidden="true" />
						<span className={labelClassName}>Rechercher</span>
						<ActiveBadge showDot={hasActiveSearch} />
					</button>

					{/* Filtres */}
					<button
						ref={filterButtonRef}
						type="button"
						onClick={() => {
							hapticLight();
							openFilter();
						}}
						onKeyDown={(e) => handleToolbarKeyDown(e, 2)}
						onFocus={() => setFocusedIndex(2)}
						tabIndex={focusedIndex === 2 ? 0 : -1}
						className={getButtonClassName(hasActiveFilters)}
						aria-label={
							hasActiveFilters
								? `${activeFiltersCount} filtre${activeFiltersCount > 1 ? "s" : ""} actif${activeFiltersCount > 1 ? "s" : ""}. Modifier les filtres`
								: "Ouvrir les filtres"
						}
					>
						<SlidersHorizontal className={iconClassName} aria-hidden="true" />
						<span className={labelClassName}>Filtrer</span>
						<ActiveBadge count={activeFiltersCount} />
					</button>

				</div>

				{/* Live region pour screen readers */}
				<span role="status" aria-live="polite" aria-atomic="true" className="sr-only">
					{announcement}
				</span>
			</motion.div>

			{/* SortDrawer */}
			<SortDrawer
				open={sortOpen}
				onOpenChange={setSortOpen}
				options={sortOptions}
				showResetOption
			/>
		</>
	);
}
