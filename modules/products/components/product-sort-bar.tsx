"use client";

import { useEffect, useRef, useState, Suspense, type ComponentProps } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
	ArrowsDownUpIcon,
	MagnifyingGlassIcon,
	SlidersHorizontalIcon,
} from "@phosphor-icons/react/ssr";

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
import { SearchInput } from "@/shared/components/search-input";
import { SortDrawer, type SortOption } from "@/shared/components/sort-drawer";
import { triggerHaptic } from "@/shared/hooks/use-haptic";
import { cn } from "@/shared/utils/cn";

interface ProductSortBarProps {
	/** Options de tri disponibles */
	sortOptions: SortOption[];
	/** Placeholder du champ de recherche déplié à partir de `md`. */
	searchPlaceholder?: string;
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
 * La barre unique du catalogue — tri / recherche / filtres, à TOUS les viewports.
 *
 * @description
 * Direction « L'étal continue » (artifact du 2026-08-05, lot 1). Le catalogue
 * avait **deux** barres mutuellement exclusives : celle-ci sous `md`, et une
 * `Toolbar` en carte blanche à bordure, ombre et rayon au-dessus — non collante,
 * avec un autre vocabulaire (« Trier par » / « Filtres » contre « Trier » /
 * « Filtrer ») et un champ de recherche qui s'étalait sur ~1 050 px à 1280 pour
 * accueillir le mot « bague ». Un même geste ne se faisait ni au même endroit ni
 * avec le même mot selon la largeur.
 *
 * Une seule barre désormais, qui change de FORME et non de nature :
 * - `< md` : trois cellules pleine largeur, séparées par des filets ;
 * - `≥ md` : la même réglette, avec le champ de recherche déplié à gauche et le
 *   bouton « Rechercher » retiré (il ouvrirait un dialog par-dessus un champ
 *   déjà visible). Le champ inline est un **contrat E2E** — `e2e/pages/search.page.ts`
 *   épingle le viewport desktop et attend un `role="searchbox"`.
 *
 * Collante sous `--navbar-height-static` — **jamais** `--navbar-height**, qui se
 * contracte de 5rem à 4rem au défilement et ferait remonter la barre de 16 px au
 * premier pixel scrollé.
 *
 * Accessibilité :
 * - `role="toolbar"` avec navigation par flèches gauche/droite ; le nombre de
 *   boutons est dérivé du breakpoint pour que la boucle ne passe pas par un
 *   bouton masqué en `display: none` (il n'est pas focusable, la touche serait
 *   morte).
 * - Live region pour annoncer les changements d'état
 * - Cibles tactiles 44px (WCAG 2.5.5)
 */
function ProductSortBarInner({ sortOptions, searchPlaceholder, className }: ProductSortBarProps) {
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
		/*
		 * Le bouton « Rechercher » est masqué à partir de `md` (le champ y est
		 * déplié). Un élément en `display: none` n'est pas focusable : boucler sur
		 * un compte figé à 3 ferait une flèche morte sur desktop. On dérive donc
		 * l'anneau de navigation des boutons RÉELLEMENT rendus — `offsetParent` est
		 * `null` exactement dans ce cas, ce qui gate par capacité et non par une
		 * largeur re-dérivée en JS.
		 */
		const visibleIndexes = buttonRefs
			.map((ref, index) => ({ ref, index }))
			.filter(({ ref }) => ref.current?.offsetParent != null)
			.map(({ index }) => index);

		if (visibleIndexes.length === 0) return;

		const position = visibleIndexes.indexOf(currentIndex);
		const count = visibleIndexes.length;
		let nextIndex: number | null = null;

		switch (e.key) {
			case "ArrowRight":
			case "ArrowDown":
				e.preventDefault();
				nextIndex = visibleIndexes[(position + 1) % count]!;
				break;
			case "ArrowLeft":
			case "ArrowUp":
				e.preventDefault();
				nextIndex = visibleIndexes[(position - 1 + count) % count]!;
				break;
			case "Home":
				e.preventDefault();
				nextIndex = visibleIndexes[0]!;
				break;
			case "End":
				e.preventDefault();
				nextIndex = visibleIndexes[count - 1]!;
				break;
		}

		if (nextIndex !== null) {
			setFocusedIndex(nextIndex);
			buttonRefs[nextIndex]?.current?.focus();
		}
	};

	const buttonBase = cn(
		"flex flex-1 items-center justify-center gap-1.5 h-11 min-w-0 px-2",
		"md:flex-none md:gap-2 md:px-3.5 md:text-[0.8125rem]",
		"text-xs font-medium text-muted-foreground",
		"hover:text-foreground",
		"active:bg-primary/5 active:scale-[0.98]",
		"md:rounded-full md:hover:bg-accent/60",
		"transition-[color,background-color,transform] duration-150",
		"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset md:focus-visible:ring-offset-0",
	);
	const buttonActive = "text-foreground";

	return (
		<>
			<nav
				aria-label="Tri, recherche et filtres"
				className={cn(
					// `--navbar-height-static` et NON `--navbar-height` : la seconde se
					// contracte de 5rem à 4rem au défilement, ce qui ferait remonter la
					// barre de 16px au premier pixel scrollé.
					"sticky top-[var(--navbar-height-static)] z-30",
					"bg-background/80 backdrop-blur-md",
					"border-border/50 border-b",
					// Full-bleed dans le conteneur : la bande colle d'un bord à l'autre,
					// le padding est réinjecté pour aligner son contenu sur la grille.
					"-mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8",
					className,
				)}
			>
				<div className="flex items-stretch gap-3">
					{/* Champ déplié à partir de `md`. Contrat E2E : `search.page.ts`
					    épingle le viewport desktop et attend un `role="searchbox"`. */}
					<div className="hidden min-w-0 flex-1 items-center py-2 md:flex">
						<SearchInput
							size="sm"
							paramName="search"
							placeholder={searchPlaceholder ?? "Rechercher un bijou…"}
							className="w-full max-w-md"
						/>
					</div>

					<div
						role="toolbar"
						aria-orientation="horizontal"
						aria-label="Tri, recherche et filtres"
						className="divide-border/30 flex flex-1 items-stretch divide-x md:flex-none md:items-center md:gap-1 md:divide-x-0"
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
							aria-label={
								hasActiveSort ? "Tri actif. Modifier le tri" : "Ouvrir les options de tri"
							}
							aria-haspopup="dialog"
							aria-controls={SORT_DRAWER_ID}
							aria-expanded={sortOpen}
						>
							<ArrowsDownUpIcon className="size-4" aria-hidden="true" />
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
							// Masqué à partir de `md` : le champ y est déjà déplié à gauche, et
							// ouvrir un dialog de recherche par-dessus un champ visible serait
							// deux entrées pour un seul geste.
							className={cn(buttonBase, "md:hidden", hasActiveSearch && buttonActive)}
							aria-label={
								hasActiveSearch
									? `Recherche: "${searchParams.get("search")}". Modifier la recherche`
									: "Ouvrir la recherche"
							}
							aria-haspopup="dialog"
							aria-expanded={isSearchOpen}
						>
							<MagnifyingGlassIcon className="size-4" aria-hidden="true" />
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
							<SlidersHorizontalIcon className="size-4" aria-hidden="true" />
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
