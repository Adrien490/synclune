import { use } from "react";
import { Package } from "lucide-react";
import Link from "next/link";
import { AdminListLiveCount } from "@/shared/components/admin-list-live-count";
import { CursorPagination } from "@/shared/components/cursor-pagination";
import { BulkSelectionProvider } from "@/shared/components/data-table";
import { EmptyResetFiltersAction } from "@/shared/components/data-table/empty-reset-filters-action";
import { TableEmptyState } from "@/shared/components/data-table/table-empty-state";
import {
	MobileSelectionBottomBar,
	MobileSelectionHeader,
} from "@/shared/components/mobile-selection";
import { Button } from "@/shared/components/ui/button";
import { ItemGroup } from "@/shared/components/ui/item";
import { AdminListPendingProvider } from "@/shared/contexts/admin-list-pending-context";
import type {
	GetProductsReturn,
	ProductFilters,
	SortField,
} from "@/modules/products/types/product.types";
import { ProductMobileItem } from "./product-mobile-item";
import { ProductsBulkActionsBar } from "./products-bulk-actions-bar";
import { ProductsCrossPageBanner } from "./products-cross-page-banner";

interface ProductsMobileListProps {
	productsPromise: Promise<GetProductsReturn>;
	perPage: number;
	hasActiveFilters?: boolean;
	/** Collections disponibles pour le bulk-attach (sheet "Lier à une collection"). */
	collections?: Array<{ id: string; name: string }>;
	/** Snapshot des filtres courants pour la sélection cross-page. */
	filterParams?: {
		search?: string;
		sortBy?: SortField;
		filters?: ProductFilters;
	};
}

export function ProductsMobileList({
	productsPromise,
	perPage,
	hasActiveFilters,
	collections = [],
	filterParams,
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

	const pageItemIds = products.map((p) => p.id);

	return (
		<BulkSelectionProvider pageItemIds={pageItemIds}>
			<AdminListPendingProvider>
				<div className="space-y-4 overscroll-contain pb-[calc(var(--bottom-bar-height,5rem)+1rem)] md:hidden md:pb-0">
					<MobileSelectionHeader itemsLabel={{ singular: "produit", plural: "produits" }} />
					<AdminListLiveCount count={products.length} singular="produit" plural="produits" />
					{filterParams ? (
						<ProductsCrossPageBanner totalCount={totalCount} filterParams={filterParams} />
					) : null}
					<ItemGroup role="list" aria-label="Produits" className="gap-2">
						{products.map((product) => (
							<div key={product.id} role="listitem">
								<ProductMobileItem product={product} />
							</div>
						))}
					</ItemGroup>

					<CursorPagination
						perPage={perPage}
						hasNextPage={pagination.hasNextPage}
						hasPreviousPage={pagination.hasPreviousPage}
						currentPageSize={products.length}
						nextCursor={pagination.nextCursor}
						prevCursor={pagination.prevCursor}
					/>
				</div>
				<MobileSelectionBottomBar>
					<ProductsBulkActionsBar presentation="bottom-bar" collections={collections} />
				</MobileSelectionBottomBar>
			</AdminListPendingProvider>
		</BulkSelectionProvider>
	);
}
