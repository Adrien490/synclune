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
import {
	shelfAccentForPathname,
	sortTriggerLabelFor,
} from "@/modules/products/components/catalog-shelf-accent";
import { ShelfBar, ShelfBarButton, ShelfBarToolbar } from "@/shared/components/shelf-bar/shelf-bar";
import { useToolbarRovingFocus } from "@/shared/components/shelf-bar/use-toolbar-roving-focus";
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
 * La barre du catalogue — le meuble `< lg` (tri / recherche / filtres).
 *
 * @description
 * Direction « L'étal continue » (artifact du 2026-08-05, lot 1), recadrée le
 * même jour (retour user) : la bande sticky, coupée au conteneur `max-w-6xl`,
 * flottait au milieu des grands écrans pour n'y porter qu'un champ capé et un
 * bouton « Trier ». À partir de `md`, la recherche vit dans la RANGÉE DU TITRE
 * (`CatalogToolbarInline`) — jamais deux `SearchInput` dans le DOM (un corps
 * monté deux fois partagerait ses `id`) — et à `lg` le menu de tri ancré la
 * rejoint : la barre entière disparaît (`lg:hidden`), le rail de filtres et le
 * cluster prennent le relais.
 *
 * Ce qui reste ici, par viewport :
 * - `< md` : trois étiquettes pleine largeur sur le rebord — Trier (tiroir),
 *   Rechercher (quick-search), Filtrer (panneau) ;
 * - `md–lg` : Trier (tiroir) + Filtrer — le bouton « Rechercher » s'efface
 *   (`md:hidden`), le champ étant déjà visible dans la rangée titre.
 *
 * La peau « tranche d'étagère » (papier, grain, ombre, étiquettes, ruban
 * d'état, matérialisation au défilement) est portée par la coque partagée
 * `ShelfBar` (`shared/components/shelf-bar/`) — ce composant n'apporte que la
 * logique catalogue : dialogs, compteurs d'état, annonce, tiroir de tri.
 *
 * Collante sous `--navbar-height-static` — **jamais** `--navbar-height**, qui se
 * contracte de 5rem à 4rem au défilement et ferait remonter la barre de 16 px au
 * premier pixel scrollé.
 *
 * Accessibilité :
 * - `role="toolbar"` avec navigation par flèches (`useToolbarRovingFocus`) ;
 *   l'anneau est dérivé des boutons réellement rendus, pas d'un compte figé.
 * - Live region pour annoncer les changements d'état — en SIBLING du `<nav>`,
 *   pas dedans : sous l'ancêtre `lg:hidden` (`display: none`), elle sortirait
 *   de l'arbre d'accessibilité à desktop, alors que l'annonce (dérivée de
 *   l'URL) doit survivre à tous les viewports.
 * - Cibles tactiles 44px (WCAG 2.5.5)
 */
function ProductSortBarInner({ sortOptions, className }: ProductSortBarProps) {
	const [sortOpen, setSortOpen] = useState(false);
	const {
		open: openSearch,
		close: closeSearch,
		isOpen: isSearchOpen,
	} = useDialog(QUICK_SEARCH_DIALOG_ID);
	const {
		open: openFilter,
		close: closeFilter,
		isOpen: isFilterOpen,
	} = useDialog(PRODUCT_FILTER_DIALOG_ID);

	const searchParams = useSearchParams();

	// Le roving tabindex saute les boutons en `display: none` (`offsetParent`),
	// donc l'anneau ne compte que les étiquettes visibles au viewport courant.
	const sortButtonRef = useRef<HTMLButtonElement>(null);
	const searchButtonRef = useRef<HTMLButtonElement>(null);
	const filterButtonRef = useRef<HTMLButtonElement>(null);
	const { getRovingProps } = useToolbarRovingFocus([
		sortButtonRef,
		searchButtonRef,
		filterButtonRef,
	]);

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

	// WCAG 2.5.3 : même nom accessible que le déclencheur du menu ancré du
	// cluster (`CatalogToolbarInline`) — SSOT `sortTriggerLabelFor`.
	const sortTriggerLabel = sortTriggerLabelFor(sortByValue);

	// L'accent de la page peint le ruban et le fond des étiquettes actives —
	// le slug donne la teinte, comme sur le bloc titre (SSOT partagée avec le
	// cluster de la rangée titre).
	const accent = shelfAccentForPathname(pathname);

	return (
		<>
			{/* `lg:hidden` : à partir de `lg`, le rail de filtres (colonne gauche) et
			    le cluster de la rangée titre (recherche + menu de tri) couvrent les
			    trois gestes — la bande n'aurait plus rien à porter. */}
			<ShelfBar aria-label="Tri, recherche et filtres" className={cn("lg:hidden", className)}>
				{/* `md:ml-auto` : depuis que le champ de recherche vit dans la rangée
				    titre, la barre n'a plus de `flex-1` à gauche — sans lui, les deux
				    étiquettes `md–lg` se colleraient au bord gauche. */}
				<ShelfBarToolbar aria-label="Tri, recherche et filtres" className="md:ml-auto">
					{/* Tri, tiroir bas — la barre étant `lg:hidden`, le menu ancré du
					    cluster de la rangée titre (`CatalogToolbarInline`) prend le
					    relais à desktop : un tiroir de téléphone pleine largeur pour un
					    geste de souris était le meuble de la mauvaise vue (audit
					    /produits 2026-08-05, lot 1). Le ruban remplace la pastille 6 px
					    à 1,55:1 (P1 de l'audit barre) : l'état se voit par la forme.
					    WCAG 2.5.3 Label in Name : sans tri actif, pas d'aria-label — le
					    nom accessible EST le libellé visible « Trier » ; avec tri, le nom
					    COMMENCE par lui (même pattern que « Filtrer »). */}
					<ShelfBarButton
						ref={sortButtonRef}
						{...getRovingProps(0)}
						onClick={() => {
							triggerHaptic("selection");
							closeSearch();
							closeFilter();
							setSortOpen(true);
						}}
						active={hasActiveSort}
						accent={accent}
						showTape
						// Redondant avec le `lg:hidden` de la barre — gardé en défense en
						// profondeur : si la barre réapparaissait à `lg`, ce tiroir ferait
						// doublon avec le menu ancré du cluster.
						className="lg:hidden"
						aria-label={sortTriggerLabel}
						aria-haspopup="dialog"
						aria-controls={SORT_DRAWER_ID}
						aria-expanded={sortOpen}
					>
						<ArrowsDownUpIcon className="size-4" aria-hidden="true" />
						<span className="truncate">Trier</span>
					</ShelfBarButton>

					{/* Recherche — WCAG 2.5.3 : le nom accessible commence par le libellé
					    visible « Rechercher » (une commande vocale « clique Rechercher »
					    doit matcher), et disparaît sans état pour laisser le libellé seul. */}
					<ShelfBarButton
						ref={searchButtonRef}
						{...getRovingProps(1)}
						onClick={(e) => {
							triggerHaptic("selection");
							setSortOpen(false);
							// Sans ce handoff, `onCloseAutoFocus` refocalise le dernier
							// déclencheur connu (souvent celui d'un autre breakpoint) ou laisse
							// le focus sur <body>. Audit recherche 2026-07-26.
							setLastTrigger(e.currentTarget);
							openSearch();
						}}
						active={hasActiveSearch}
						accent={accent}
						showTape
						// Masqué à partir de `md` : le champ est déplié dans la rangée du
						// titre (`CatalogToolbarInline`), et ouvrir un dialog de recherche
						// par-dessus un champ visible serait deux entrées pour un seul geste.
						className="md:hidden"
						aria-label={
							hasActiveSearch
								? `Rechercher — recherche active : "${searchParams.get("search")}"`
								: undefined
						}
						aria-haspopup="dialog"
						aria-expanded={isSearchOpen}
					>
						<MagnifyingGlassIcon className="size-4" aria-hidden="true" />
						<span className="truncate">Rechercher</span>
					</ShelfBarButton>

					{/* Filtres — badge compteur plutôt que ruban : les deux ensemble
					    feraient double signal. */}
					<ShelfBarButton
						ref={filterButtonRef}
						{...getRovingProps(2)}
						onClick={() => {
							triggerHaptic("selection");
							setSortOpen(false);
							openFilter();
						}}
						active={hasActiveFilters}
						accent={accent}
						count={hasActiveFilters ? activeFiltersCount : undefined}
						// Masqué à partir de `lg` : le rail de filtres y est déplié en colonne
						// gauche du catalogue (« Le plan de travail ») — un bouton qui ouvre un
						// panneau par-dessus des filtres déjà visibles serait deux entrées pour
						// un seul geste, comme la recherche sous `md`. Le roving tabindex saute
						// les boutons en `display: none` (`offsetParent`), la flèche reste vive.
						className="lg:hidden"
						// WCAG 2.5.3 Label in Name : sans filtre actif, pas d'aria-label — le
						// nom accessible EST le libellé visible « Filtrer » ; avec filtres, le
						// nom COMMENCE par lui. Pas d'aria-controls : le sheet est portalisé
						// et démonté fermé, l'idref serait pendante.
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
				</ShelfBarToolbar>
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
