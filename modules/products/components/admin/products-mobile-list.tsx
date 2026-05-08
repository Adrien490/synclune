import { use } from "react";
import { Package } from "lucide-react";
import Link from "next/link";
import { AdminListLiveCount } from "@/shared/components/admin-list-live-count";
import { CursorPagination } from "@/shared/components/cursor-pagination";
import { TableEmptyState } from "@/shared/components/data-table/table-empty-state";
import { ItemGroup } from "@/shared/components/ui/item";
import type { GetProductsReturn } from "@/modules/products/types/product.types";
import { ProductMobileItem } from "./product-mobile-item";

interface ProductsMobileListProps {
	productsPromise: Promise<GetProductsReturn>;
	perPage: number;
	hasActiveFilters?: boolean;
}

export function ProductsMobileList({
	productsPromise,
	perPage,
	hasActiveFilters,
}: ProductsMobileListProps) {
	const { products, pagination } = use(productsPromise);

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
						<Link
							href="/admin/catalogue/produits/nouveau"
							className="bg-primary text-primary-foreground inline-flex h-9 items-center justify-center rounded-md px-4 text-sm font-medium"
						>
							Nouveau produit
						</Link>
					}
				/>
			</div>
		);
	}

	return (
		<div className="space-y-4 pb-[calc(var(--bottom-bar-height,5rem)+1rem)] md:hidden md:pb-0">
			<AdminListLiveCount count={products.length} singular="produit" plural="produits" />
			<ItemGroup aria-label="Produits" className="gap-2">
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
	);
}
