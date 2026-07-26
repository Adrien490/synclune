"use client";

import { useEffect, useRef, useState, Suspense, type ComponentProps } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Search, ArrowUpDown, SlidersHorizontal } from "lucide-react";

import { useDialog } from "@/shared/providers/dialog-store-provider";
import { QUICK_SEARCH_DIALOG_ID } from "@/modules/products/components/quick-search-dialog/constants";
import { setLastTrigger } from "@/modules/products/components/quick-search-dialog/last-trigger";
import {
	PRODUCT_FILTER_DIALOG_ID,
	PRODUCTS_SORT_LABELS,
} from "@/modules/products/constants/product.constants";
import {
	countActiveFilters,
	isProductCategoryPage,
} from "@/modules/products/services/product-filter-params.service";
import { SortDrawer, type SortOption } from "@/shared/components/sort-drawer";
import { triggerHaptic } from "@/shared/hooks/use-haptic";
import { cn } from "@/shared/utils/cn";

interface ProductSortBarProps {
	/** Options de tri disponibles */
	sortOptions: SortOption[];
	/** Classes CSS additionnelles */
	className?: string;
}

/**
 * DOM `id` du contenu du SortDrawer, appairé avec `aria-controls` sur le
 * bouton « Trier » — permet aux lecteurs d'écran d'annoncer le lien
 * bouton → popup (cf. JSDoc `SortDrawerProps.id`).
 */
const SORT_DRAWER_ID = "product-sort-drawer";

/**
 * Sous-header sticky discret (mobile uniquement) pour tri / recherche / filtres.
 *
 * Positionne juste sous la navbar (sticky), 3 boutons compacts qui ne
 * bloquent pas la visibilite des produits. Convention e-commerce mobile
 * (Zalando, ASOS, Etsy, Shein) : actions de listing en sticky header,
 * wayfinding primaire en bottom nav.
 *
 * Accessibilite :
 * - `role="toolbar"` avec navigation par fleches gauche/droite
 * - Live region pour annoncer les changements d'etat
 * - Touch targets 44px (WCAG 2.5.5)
 */
function ProductSortBarInner({ sortOptions, className }: ProductSortBarProps) {
	const [sortOpen, setSortOpen] = useState(false);
	const [focusedIndex, setFocusedIndex] = useState(0);
	const {
		open: openSearch,
		close: closeSearch,
		isOpen: isSearchOpen,
	} = useDialog(QUICK_SEARCH_DIALOG_ID);
	const { open: openFilter, close: closeFilter } = useDialog(PRODUCT_FILTER_DIALOG_ID);

	const searchParams = useSearchParams();

	const sortButtonRef = useRef<HTMLButtonElement>(null);
	const searchButtonRef = useRef<HTMLButtonElement>(null);
	const filterButtonRef = useRef<HTMLButtonElement>(null);
	const buttonRefs = [sortButtonRef, searchButtonRef, filterButtonRef];

	const hasActiveSearch = searchParams.has("search") && searchParams.get("search") !== "";
	const sortByValue = searchParams.get("sortBy");
	const hasActiveSort = !!sortByValue;
	const pathname = usePathname();
	const isOnCategoryPage = isProductCategoryPage(pathname);
	const { activeFiltersCount: urlFiltersCount, hasActiveFilters: urlHasActiveFilters } =
		countActiveFilters(searchParams);
	const activeFiltersCount = urlFiltersCount + (isOnCategoryPage ? 1 : 0);
	const hasActiveFilters = urlHasActiveFilters || isOnCategoryPage;

	const announcementRef = useRef<HTMLSpanElement>(null);
	const prevStateRef = useRef({
		hasActiveSearch,
		hasActiveSort,
		hasActiveFilters,
		activeFiltersCount,
		search: searchParams.get("search"),
	});

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

		prevStateRef.current = {
			hasActiveSearch,
			hasActiveSort,
			hasActiveFilters,
			activeFiltersCount,
			search: currentSearch,
		};

		const parts = [
			hasActiveSearch && `Recherche "${currentSearch}" active`,
			hasActiveSort &&
				`Tri : ${sortByValue ? PRODUCTS_SORT_LABELS[sortByValue as keyof typeof PRODUCTS_SORT_LABELS] : "actif"}`,
			hasActiveFilters &&
				`${activeFiltersCount} filtre${activeFiltersCount > 1 ? "s" : ""} actif${activeFiltersCount > 1 ? "s" : ""}`,
		]
			.filter(Boolean)
			.join(". ");

		if (announcementRef.current) announcementRef.current.textContent = parts;

		const timer = setTimeout(() => {
			if (announcementRef.current) announcementRef.current.textContent = "";
		}, 3000);
		return () => clearTimeout(timer);
	}, [
		hasActiveSearch,
		hasActiveSort,
		hasActiveFilters,
		activeFiltersCount,
		searchParams,
		sortByValue,
	]);

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
			buttonRefs[nextIndex]?.current?.focus();
		}
	};

	const buttonBase = cn(
		"flex flex-1 items-center justify-center gap-1.5 h-11 min-w-0 px-2",
		"text-xs font-medium text-muted-foreground",
		"hover:text-foreground",
		"active:bg-primary/5 active:scale-[0.98]",
		"transition-[color,background-color,transform] duration-150",
		"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset",
	);
	const buttonActive = "text-foreground";

	return (
		<>
			<nav
				aria-label="Tri, recherche et filtres"
				className={cn(
					"md:hidden",
					"sticky top-[calc(var(--announcement-bar-height,0px)+var(--navbar-height))] z-30",
					"bg-background/80 backdrop-blur-md",
					"border-border/50 border-b",
					// Extend past container horizontal padding for a full-bleed sticky strip.
					"-mx-4 sm:-mx-6",
					className,
				)}
			>
				<div
					role="toolbar"
					aria-orientation="horizontal"
					aria-label="Tri, recherche et filtres"
					className="divide-border/30 flex items-stretch divide-x"
				>
					{/* Tri */}
					<button
						ref={sortButtonRef}
						type="button"
						onClick={() => {
							triggerHaptic("selection");
							closeSearch();
							closeFilter();
							setSortOpen(true);
						}}
						onKeyDown={(e) => handleToolbarKeyDown(e, 0)}
						onFocus={() => setFocusedIndex(0)}
						tabIndex={focusedIndex === 0 ? 0 : -1}
						className={cn(buttonBase, hasActiveSort && buttonActive)}
						aria-label={hasActiveSort ? "Tri actif. Modifier le tri" : "Ouvrir les options de tri"}
						aria-haspopup="dialog"
						aria-controls={SORT_DRAWER_ID}
						aria-expanded={sortOpen}
					>
						<ArrowUpDown className="size-4" aria-hidden="true" />
						<span className="truncate">Trier</span>
						{hasActiveSort && (
							<span className="bg-primary size-1.5 shrink-0 rounded-full" aria-hidden="true" />
						)}
					</button>

					{/* Recherche */}
					<button
						ref={searchButtonRef}
						type="button"
						onClick={(e) => {
							triggerHaptic("selection");
							setSortOpen(false);
							// Sans ce handoff, `onCloseAutoFocus` refocalise le dernier
							// déclencheur connu (souvent celui d'un autre breakpoint) ou laisse
							// le focus sur <body>. Audit recherche 2026-07-26.
							setLastTrigger(e.currentTarget);
							openSearch();
						}}
						onKeyDown={(e) => handleToolbarKeyDown(e, 1)}
						onFocus={() => setFocusedIndex(1)}
						tabIndex={focusedIndex === 1 ? 0 : -1}
						className={cn(buttonBase, hasActiveSearch && buttonActive)}
						aria-label={
							hasActiveSearch
								? `Recherche: "${searchParams.get("search")}". Modifier la recherche`
								: "Ouvrir la recherche"
						}
						aria-haspopup="dialog"
						aria-expanded={isSearchOpen}
					>
						<Search className="size-4" aria-hidden="true" />
						<span className="truncate">Rechercher</span>
						{hasActiveSearch && (
							<span className="bg-primary size-1.5 shrink-0 rounded-full" aria-hidden="true" />
						)}
					</button>

					{/* Filtres */}
					<button
						ref={filterButtonRef}
						type="button"
						onClick={() => {
							triggerHaptic("selection");
							setSortOpen(false);
							openFilter();
						}}
						onKeyDown={(e) => handleToolbarKeyDown(e, 2)}
						onFocus={() => setFocusedIndex(2)}
						tabIndex={focusedIndex === 2 ? 0 : -1}
						className={cn(buttonBase, hasActiveFilters && buttonActive)}
						aria-label={
							hasActiveFilters
								? `${activeFiltersCount} filtre${activeFiltersCount > 1 ? "s" : ""} actif${activeFiltersCount > 1 ? "s" : ""}. Modifier les filtres`
								: "Ouvrir les filtres"
						}
						aria-haspopup="dialog"
					>
						<SlidersHorizontal className="size-4" aria-hidden="true" />
						<span className="truncate">Filtrer</span>
						{hasActiveFilters && (
							<span
								className="bg-primary text-primary-foreground text-2xs inline-flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full px-1 font-bold"
								aria-hidden="true"
							>
								{activeFiltersCount}
							</span>
						)}
					</button>
				</div>

				<span
					ref={announcementRef}
					role="status"
					aria-live="polite"
					aria-atomic="true"
					className="sr-only"
				/>
			</nav>

			<SortDrawer
				open={sortOpen}
				onOpenChange={setSortOpen}
				options={sortOptions}
				showResetOption
				id={SORT_DRAWER_ID}
			/>
		</>
	);
}

export function ProductSortBar(props: ComponentProps<typeof ProductSortBarInner>) {
	return (
		<Suspense fallback={null}>
			<ProductSortBarInner {...props} />
		</Suspense>
	);
}
