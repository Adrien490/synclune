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
import { useBottomBarHeight } from "@/shared/hooks";

interface ProductSortBarProps {
	/** Options de tri disponibles */
	sortOptions: SortOption[];
	/** Classes CSS additionnelles */
	className?: string;
}

function ActiveDot() {
	return (
		<span
			className="absolute -top-0.5 left-1/2 -translate-x-1/2 size-1.5 bg-primary rounded-full animate-in zoom-in-50 duration-200"
			aria-hidden="true"
		/>
	);
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
 * - Touch targets 56px minimum (Material Design 3)
 */
export function ProductSortBar({ sortOptions, className }: ProductSortBarProps) {
	useBottomBarHeight(56);

	const [sortOpen, setSortOpen] = useState(false);
	const [focusedIndex, setFocusedIndex] = useState(0);
	const { open: openSearch, close: closeSearch, isOpen: isSearchOpen } = useDialog(QUICK_SEARCH_DIALOG_ID);
	const { open: openFilter, close: closeFilter, isOpen: isFilterOpen } = useDialog(PRODUCT_FILTER_DIALOG_ID);
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

	// Live region for screen reader announcements
	const announcementRef = useRef<HTMLSpanElement>(null);
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

		if (announcementRef.current) announcementRef.current.textContent = parts;

		// Clear after 3s to avoid re-announcements
		const timer = setTimeout(() => {
			if (announcementRef.current) announcementRef.current.textContent = "";
		}, 3000);
		return () => clearTimeout(timer);
	}, [hasActiveSearch, hasActiveSort, hasActiveFilters, activeFiltersCount, searchParams, sortByValue]);

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

	const getButtonClassName = () =>
		cn(
			"flex-1 min-w-18 flex flex-col items-center justify-center gap-1",
			"h-full min-h-14",
			"transition-colors duration-200",
			"active:scale-[0.98] active:bg-primary/10",
			"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset",
			"relative",
			"text-muted-foreground hover:text-foreground"
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
					"md:hidden",
					"fixed bottom-0 left-0 right-0 z-[75]",
					"pb-[env(safe-area-inset-bottom)]",
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
						onClick={() => { closeSearch(); closeFilter(); setSortOpen(true); }}
						onKeyDown={(e) => handleToolbarKeyDown(e, 0)}
						onFocus={() => setFocusedIndex(0)}
						tabIndex={focusedIndex === 0 ? 0 : -1}
						className={getButtonClassName()}
						aria-label={hasActiveSort ? "Tri actif. Modifier le tri" : "Ouvrir les options de tri"}
					>
						{hasActiveSort && <ActiveDot />}
						<ArrowUpDown className={iconClassName} aria-hidden="true" />
						<span className={labelClassName}>Trier</span>
					</button>

					{/* Recherche */}
					<button
						ref={searchButtonRef}
						type="button"
						onClick={() => { setSortOpen(false); openSearch(); }}
						onKeyDown={(e) => handleToolbarKeyDown(e, 1)}
						onFocus={() => setFocusedIndex(1)}
						tabIndex={focusedIndex === 1 ? 0 : -1}
						className={getButtonClassName()}
						aria-label={
							hasActiveSearch
								? `Recherche: "${searchParams.get("search")}". Modifier la recherche`
								: "Ouvrir la recherche"
						}
					>
						{hasActiveSearch && <ActiveDot />}
						<Search className={iconClassName} aria-hidden="true" />
						<span className={labelClassName}>Rechercher</span>
					</button>

					{/* Filtres */}
					<button
						ref={filterButtonRef}
						type="button"
						onClick={() => { setSortOpen(false); openFilter(); }}
						onKeyDown={(e) => handleToolbarKeyDown(e, 2)}
						onFocus={() => setFocusedIndex(2)}
						tabIndex={focusedIndex === 2 ? 0 : -1}
						className={getButtonClassName()}
						aria-label={
							hasActiveFilters
								? `${activeFiltersCount} filtre${activeFiltersCount > 1 ? "s" : ""} actif${activeFiltersCount > 1 ? "s" : ""}. Modifier les filtres`
								: "Ouvrir les filtres"
						}
					>
						{hasActiveFilters && <ActiveDot />}
						<SlidersHorizontal className={iconClassName} aria-hidden="true" />
						<span className={labelClassName}>Filtrer</span>
					</button>

				</div>

				{/* Live region pour screen readers */}
				<span ref={announcementRef} role="status" aria-live="polite" aria-atomic="true" className="sr-only" />
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
