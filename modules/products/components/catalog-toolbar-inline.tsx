"use client";

import { Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { ArrowsDownUpIcon } from "@phosphor-icons/react/ssr";

import {
	shelfAccentForPathname,
	sortTriggerLabelFor,
} from "@/modules/products/components/catalog-shelf-accent";
import { ProductSortMenu } from "@/modules/products/components/product-sort-menu";
import { SearchInput } from "@/shared/components/search-input";
import { ShelfBarButton } from "@/shared/components/shelf-bar/shelf-bar";
import type { SortOption } from "@/shared/types/sort.types";
import { cn } from "@/shared/utils/cn";

interface CatalogToolbarInlineProps {
	/** Options de tri disponibles (SSOT `PRODUCTS_SORT_OPTIONS`). */
	sortOptions: SortOption[];
	/** Placeholder du champ de recherche. */
	searchPlaceholder?: string;
	/** Classes CSS additionnelles */
	className?: string;
}

/**
 * Géométrie du cluster, partagée avec le fallback Suspense ET avec le miroir
 * du squelette (`product-catalog-skeleton.tsx`) : le cluster n'existe qu'à
 * partir de `md`, calé à droite de la rangée titre.
 */
const CLUSTER_CLASS = "hidden shrink-0 items-center gap-2 md:flex";

/**
 * Recherche + tri dans la RANGÉE DU TITRE — le meuble `≥ md` du catalogue
 * (retour user 2026-08-05 : la bande sticky, coupée au conteneur `max-w-6xl`,
 * flottait au milieu des grands écrans pour n'y porter qu'un champ capé et un
 * bouton).
 *
 * @description
 * - `md–lg` : le champ de recherche seul — la `ShelfBar` sticky garde Trier
 *   (tiroir) + Filtrer. Le champ vit ICI et plus dans la barre : un corps monté
 *   deux fois partagerait ses `id` (`<label htmlFor>` résout vers la première
 *   occurrence, même masquée) et ferait échouer le strict mode Playwright —
 *   il n'y a donc JAMAIS deux `SearchInput` dans le DOM.
 * - `≥ lg` : champ + menu de tri ancré ; la `ShelfBar` disparaît (`lg:hidden`),
 *   le rail de filtres et ce cluster prennent tout le relais.
 *
 * Le champ inline est un **contrat E2E** — `e2e/pages/search.page.ts` épingle
 * le viewport desktop et attend un `role="searchbox"`.
 *
 * Pas de `role="toolbar"` ni de roving focus : deux contrôles indépendants
 * (un champ, un bouton), Tab suffit. Le déclencheur « Trier » garde
 * l'étiquette `ShelfBarButton` (h-11 = hauteur du champ `size="sm"`, même
 * vocabulaire papier/ruban que la barre) et le même nom accessible que son
 * frère tiroir (`sortTriggerLabelFor`, WCAG 2.5.3).
 */
function CatalogToolbarInlineInner({
	sortOptions,
	searchPlaceholder,
	className,
}: CatalogToolbarInlineProps) {
	const searchParams = useSearchParams();
	const pathname = usePathname();

	const sortByValue = searchParams.get("sortBy");
	const hasActiveSort = !!sortByValue;
	const sortTriggerLabel = sortTriggerLabelFor(sortByValue);
	const accent = shelfAccentForPathname(pathname);

	return (
		<div className={cn(CLUSTER_CLASS, className)}>
			<SearchInput
				size="sm"
				paramName="search"
				placeholder={searchPlaceholder ?? "Rechercher un bijou…"}
				className="w-64 lg:w-72"
			/>

			{/* Tri, menu ancré — le meuble desktop. Base UI pose lui-même
			    `aria-haspopup`/`aria-expanded` sur le déclencheur. Sous `lg`, le
			    tiroir de la barre prend le relais. */}
			<ProductSortMenu options={sortOptions}>
				<ShelfBarButton
					active={hasActiveSort}
					accent={accent}
					showTape
					className="hidden lg:flex"
					aria-label={sortTriggerLabel}
				>
					<ArrowsDownUpIcon className="size-4" aria-hidden="true" />
					<span className="truncate">Trier</span>
				</ShelfBarButton>
			</ProductSortMenu>
		</div>
	);
}

export function CatalogToolbarInline(props: CatalogToolbarInlineProps) {
	return (
		<Suspense
			fallback={
				/* Ghost à la géométrie exacte du cluster (champ h-11 w-64/w-72 +
				   étiquette Trier ≥ lg) : `useSearchParams` exige la frontière, et un
				   fallback null ferait sauter la rangée titre à la résolution. */
				<div aria-hidden="true" className={cn(CLUSTER_CLASS, props.className)}>
					<div className="bg-muted/40 h-11 w-64 rounded-md lg:w-72" />
					<div className="border-border bg-background hidden h-11 w-[5.5rem] rounded-sm border lg:block" />
				</div>
			}
		>
			<CatalogToolbarInlineInner {...props} />
		</Suspense>
	);
}
