"use client";

import { useEffect, useRef, Suspense, type ComponentProps } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { SlidersHorizontalIcon } from "@phosphor-icons/react/ssr";

import { useDialog } from "@/shared/providers/overlay-store-provider";
import {
	PRODUCT_FILTER_DIALOG_ID,
	PRODUCTS_SORT_LABELS,
} from "@/modules/products/constants/product.constants";
import {
	countActiveFilters,
	isProductCategoryPage,
} from "@/modules/products/services/product-filter-params.service";
import { shelfAccentForPathname } from "@/modules/products/components/catalog-shelf-accent";
import { ShelfBar, ShelfBarButton } from "@/shared/components/shelf-bar/shelf-bar";
import { triggerHaptic } from "@/shared/hooks/use-haptic";
import { cn } from "@/shared/utils/cn";

interface ProductFilterBarProps {
	/** Classes CSS additionnelles */
	className?: string;
}

/**
 * La barre du catalogue — le meuble `< lg`, réduit à son seul geste : « Filtrer ».
 *
 * @description
 * Héritière de `ProductSortBar` (2026-08-06) : la recherche inline et ses deux
 * déclencheurs ont été retirés du catalogue (l'entrée de recherche est le
 * quick-search de la navbar / bottom-nav, qui atterrit sur `/produits?search=`),
 * et le tri a rejoint le compartiment « Trier par » du meuble de filtres — rail
 * desktop ET panneau mobile (`ProductFilterCompartments`). Plus de
 * `SortDrawer`, plus de menu ancré : la barre n'ouvre plus que le panneau.
 *
 * Un seul bouton, donc pas de `role="toolbar"` ni de roving focus — Tab suffit.
 * La peau « tranche d'étagère » reste la coque partagée `ShelfBar`.
 *
 * Collante sous `--navbar-height-static` — **jamais** `--navbar-height`, qui se
 * contracte de 5rem à 4rem au défilement et ferait remonter la barre de 16 px au
 * premier pixel scrollé.
 *
 * `lg:hidden` : à partir de `lg`, le rail (colonne gauche) porte filtres ET tri —
 * la barre n'aurait plus rien à ouvrir.
 *
 * Accessibilité : live region SIBLING du `<nav>` (pas dedans — sous l'ancêtre
 * `lg:hidden`, elle sortirait de l'arbre d'accessibilité à desktop) qui annonce
 * les changements d'état dérivés de l'URL (recherche, tri, filtres), quel que
 * soit le contrôle qui les a déclenchés.
 */
function ProductFilterBarInner({ className }: ProductFilterBarProps) {
	const { open: openFilter, isOpen: isFilterOpen } = useDialog(PRODUCT_FILTER_DIALOG_ID);

	const searchParams = useSearchParams();
	const pathname = usePathname();

	const hasActiveSearch = searchParams.has("search") && searchParams.get("search") !== "";
	const sortByValue = searchParams.get("sortBy");
	const hasActiveSort = !!sortByValue;
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

	// L'accent de la page peint le fond de l'étiquette active — le slug donne la
	// teinte, comme sur le bloc titre.
	const accent = shelfAccentForPathname(pathname);

	return (
		<>
			<ShelfBar aria-label="Filtres" className={cn("lg:hidden", className)}>
				{/* `md:ml-auto` : pleine largeur sous `md`, calée à droite ensuite —
				    même géométrie que l'ancienne rangée d'étiquettes. */}
				<div className="flex flex-1 items-center gap-2 py-2 md:ml-auto md:flex-none md:py-0">
					{/* Filtres — badge compteur plutôt que ruban : les deux ensemble
					    feraient double signal. Le panneau qu'il ouvre porte AUSSI le
					    compartiment « Trier par ». WCAG 2.5.3 Label in Name : sans filtre
					    actif, pas d'aria-label — le nom accessible EST le libellé visible
					    « Filtrer » ; avec filtres, le nom COMMENCE par lui. Pas
					    d'aria-controls : le sheet est portalisé et démonté fermé, l'idref
					    serait pendante. */}
					<ShelfBarButton
						onClick={() => {
							triggerHaptic("selection");
							openFilter();
						}}
						active={hasActiveFilters}
						accent={accent}
						count={hasActiveFilters ? activeFiltersCount : undefined}
						aria-label={
							hasActiveFilters
								? `Filtrer — ${activeFiltersCount} filtre${activeFiltersCount > 1 ? "s" : ""} actif${activeFiltersCount > 1 ? "s" : ""}`
								: undefined
						}
						aria-haspopup="dialog"
						aria-expanded={isFilterOpen}
					>
						<SlidersHorizontalIcon className="size-4" aria-hidden="true" />
						<span className="truncate">Filtrer</span>
					</ShelfBarButton>
				</div>
			</ShelfBar>

			{/* SIBLING du `<nav>`, pas dedans : sous l'ancêtre `lg:hidden`
			    (`display: none`), la live region sortirait de l'arbre
			    d'accessibilité à desktop. Le composant reste monté à tous les
			    viewports, l'annonce (dérivée de l'URL, quel que soit le contrôle
			    qui a déclenché) survit donc partout. `sr-only` = hors flux, aucune
			    incidence sur le `space-y-5` du conteneur. */}
			<span
				ref={announcementRef}
				role="status"
				aria-live="polite"
				aria-atomic="true"
				className="sr-only"
			/>
		</>
	);
}

export function ProductFilterBar(props: ComponentProps<typeof ProductFilterBarInner>) {
	return (
		<Suspense fallback={null}>
			<ProductFilterBarInner {...props} />
		</Suspense>
	);
}
