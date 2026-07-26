import { use } from "react";
import { Package } from "lucide-react";
import Link from "next/link";
import { AdminListLiveCount } from "@/shared/components/admin-list-live-count";
import { AdminMobileListPagination } from "@/shared/components/cursor-pagination";
import { EmptyResetFiltersAction } from "@/shared/components/data-table/empty-reset-filters-action";
import { TableEmptyState } from "@/shared/components/data-table/table-empty-state";
import { Button } from "@/shared/components/ui/button";
import { ItemGroup } from "@/shared/components/ui/item";
import type { GetProductsReturn } from "@/modules/products/types/product.types";
import { ProductMobileItem } from "./product-mobile-item";

interface ProductsMobileListProps {
	productsPromise: Promise<GetProductsReturn>;
	perPage: number;
	hasActiveFilters?: boolean;
	/** Collections disponibles pour le bulk-attach (sheet "Lier à une collection"). */
	/** Snapshot des filtres courants pour la sélection cross-page. */
}

export function ProductsMobileList({
	productsPromise,
	perPage,
	hasActiveFilters,
}: ProductsMobileListProps) {
	const { products, pagination, totalCount } = use(productsPromise);

	if (products.length === 0) {
		return (
			<div className="md:hidden">
				<TableEmptyState
					icon={Package}
					title="Aucun produit trouvé"
					description={
						hasActiveFilters
							? "Aucun produit ne correspond aux critères de recherche."
							: "Commencez par créer votre premier produit."
					}
					actionElement={
						hasActiveFilters ? (
							<EmptyResetFiltersAction href="/admin/catalogue/produits" />
						) : (
							<Button asChild className="min-h-11 shadow-[0_0_24px_var(--color-glow-pink)]">
								<Link href="/admin/catalogue/produits/nouveau">Nouveau produit</Link>
							</Button>
						)
					}
				/>
			</div>
		);
	}

	return (
		<div className="space-y-4 overscroll-contain pb-[calc(var(--bottom-bar-height,5rem)+1rem)] md:hidden md:pb-0">
			<AdminListLiveCount count={products.length} singular="produit" plural="produits" />
			<ItemGroup aria-label="Produits" className="gap-2">
				{products.map((product, index) => (
					<li key={product.id}>
						<ProductMobileItem product={product} preload={index === 0} />
					</li>
				))}
			</ItemGroup>

			<AdminMobileListPagination
				perPage={perPage}
				hasNextPage={pagination.hasNextPage}
				hasPreviousPage={pagination.hasPreviousPage}
				currentPageSize={products.length}
				nextCursor={pagination.nextCursor}
				prevCursor={pagination.prevCursor}
				totalCount={totalCount}
			/>
		</div>
	);
}
