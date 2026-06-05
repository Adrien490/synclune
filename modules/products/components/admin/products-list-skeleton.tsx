import { StickyActionBarSkeleton } from "@/shared/components/sticky-action-bar";
import { ToolbarSkeleton } from "@/shared/components/toolbar-skeleton";

import { ProductsDataTableSkeleton } from "./products-data-table-skeleton";
import { ProductsMobileListSkeleton } from "./products-mobile-list-skeleton";

interface ProductsListSkeletonProps {
	hasActiveFilters?: boolean;
}

/**
 * Squelette complet du corps de la liste produits admin (barre d'action,
 * toolbar, liste mobile, data table desktop).
 *
 * Partagé entre `app/admin/catalogue/produits/loading.tsx` (fallback de
 * navigation route) et le `<Suspense>` interne de la page (fallback de fetch
 * des données : filtre/tri/pagination), pour garantir un rendu identique dans
 * les deux cas. Ne contient PAS le PageHeader : il reste monté hors Suspense
 * dans la page et n'est rendu que par `loading.tsx`.
 */
export function ProductsListSkeleton({ hasActiveFilters }: ProductsListSkeletonProps = {}) {
	return (
		<div className="space-y-6">
			<StickyActionBarSkeleton itemCount={3} withSearch />

			<ToolbarSkeleton selectCount={1} buttonCount={2} className="hidden md:flex" />

			<div className="min-h-[1px]" aria-hidden="true" />

			<ProductsMobileListSkeleton hasActiveFilters={hasActiveFilters} />
			<ProductsDataTableSkeleton />
		</div>
	);
}
