"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search, ArrowUpDown, SlidersHorizontal } from "lucide-react";

import { useDialog } from "@/shared/providers/dialog-store-provider";
import { useSheetStore } from "@/shared/providers/sheet-store-provider";
import { SKU_SELECTOR_DIALOG_ID } from "@/modules/cart/components/sku-selector-dialog";
import { QUICK_SEARCH_DIALOG_ID } from "@/modules/products/components/quick-search-dialog/constants";
import { PRODUCT_FILTER_DIALOG_ID, PRODUCTS_SORT_LABELS } from "@/modules/products/constants/product.constants";
import { countActiveFilters } from "@/modules/products/services/product-filter-params.service";
import { SortDrawer, type SortOption } from "@/shared/components/sort-drawer";
import {
	BottomBar,
	ActiveDot,
	bottomBarContainerClass,
	bottomBarItemClass,
	bottomBarActiveItemClass,
	bottomBarIconClass,
	bottomBarLabelClass,
} from "@/shared/components/bottom-bar";
import { cn } from "@/shared/utils/cn";

interface ProductSortBarProps {
	/** Options de tri disponibles */
	sortOptions: SortOption[];
	/** Classes CSS additionnelles */
	className?: string;
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
 * Accessibilite:
 * - role="toolbar" avec navigation par fleches gauche/droite
 * - Live region pour annoncer les changements d'etat
 * - Touch targets 56px minimum (Material Design 3)
 */
export function ProductSortBar({ sortOptions, className }: ProductSortBarProps) {
	const [sortOpen, setSortOpen] = useState(false);
	const [focusedIndex, setFocusedIndex] = useState(0);
	const { open: openSearch, close: closeSearch, isOpen: isSearchOpen } = useDialog(QUICK_SEARCH_DIALOG_ID);
	const { open: openFilter, close: closeFilter, isOpen: isFilterOpen } = useDialog(PRODUCT_FILTER_DIALOG_ID);
	const { isOpen: isSkuSelectorOpen } = useDialog(SKU_SELECTOR_DIALOG_ID);
	const isAnySheetOpen = useSheetStore((state) => state.openSheet !== null);

	const isHidden = isSearchOpen || isFilterOpen || sortOpen || isSkuSelectorOpen || isAnySheetOpen;

	const searchParams = useSearchParams();

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

	const buttonClassName = cn(bottomBarItemClass, "min-w-18");
	const activeButtonClassName = cn(buttonClassName, bottomBarActiveItemClass);

	return (
		<>
			<BottomBar
				as="nav"
				aria-label="Tri, recherche et filtres"
				isHidden={isHidden}
				breakpointClass="md:hidden"
				zIndex="z-[75]"
				className={className}
			>
				<div
					role="toolbar"
					aria-orientation="horizontal"
					aria-label="Tri, recherche et filtres"
					className={bottomBarContainerClass}
				>
					{/* Tri */}
					<button
						ref={sortButtonRef}
						type="button"
						onClick={() => { closeSearch(); closeFilter(); setSortOpen(true); }}
						onKeyDown={(e) => handleToolbarKeyDown(e, 0)}
						onFocus={() => setFocusedIndex(0)}
						tabIndex={focusedIndex === 0 ? 0 : -1}
						className={hasActiveSort ? activeButtonClassName : buttonClassName}
						aria-label={hasActiveSort ? "Tri actif. Modifier le tri" : "Ouvrir les options de tri"}
						aria-haspopup="dialog"
					>
						{hasActiveSort && <ActiveDot />}
						<ArrowUpDown className={bottomBarIconClass} aria-hidden="true" />
						<span className={bottomBarLabelClass}>Trier</span>
					</button>

					{/* Recherche */}
					<button
						ref={searchButtonRef}
						type="button"
						onClick={() => { setSortOpen(false); openSearch(); }}
						onKeyDown={(e) => handleToolbarKeyDown(e, 1)}
						onFocus={() => setFocusedIndex(1)}
						tabIndex={focusedIndex === 1 ? 0 : -1}
						className={hasActiveSearch ? activeButtonClassName : buttonClassName}
						aria-label={
							hasActiveSearch
								? `Recherche: "${searchParams.get("search")}". Modifier la recherche`
								: "Ouvrir la recherche"
						}
						aria-haspopup="dialog"
					>
						{hasActiveSearch && <ActiveDot />}
						<Search className={bottomBarIconClass} aria-hidden="true" />
						<span className={bottomBarLabelClass}>Rechercher</span>
					</button>

					{/* Filtres */}
					<button
						ref={filterButtonRef}
						type="button"
						onClick={() => { setSortOpen(false); openFilter(); }}
						onKeyDown={(e) => handleToolbarKeyDown(e, 2)}
						onFocus={() => setFocusedIndex(2)}
						tabIndex={focusedIndex === 2 ? 0 : -1}
						className={hasActiveFilters ? activeButtonClassName : buttonClassName}
						aria-label={
							hasActiveFilters
								? `${activeFiltersCount} filtre${activeFiltersCount > 1 ? "s" : ""} actif${activeFiltersCount > 1 ? "s" : ""}. Modifier les filtres`
								: "Ouvrir les filtres"
						}
						aria-haspopup="dialog"
					>
						{hasActiveFilters && <ActiveDot />}
						<SlidersHorizontal className={bottomBarIconClass} aria-hidden="true" />
						<span className={bottomBarLabelClass}>Filtrer</span>
					</button>

				</div>

				{/* Live region pour screen readers */}
				<span ref={announcementRef} role="status" aria-live="polite" aria-atomic="true" className="sr-only" />
			</BottomBar>

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
