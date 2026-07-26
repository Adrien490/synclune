import { use } from "react";
import { Tags } from "lucide-react";

import { AdminListLiveCount } from "@/shared/components/admin-list-live-count";
import { AdminMobileListPagination } from "@/shared/components/cursor-pagination";
import { EmptyResetFiltersAction } from "@/shared/components/data-table/empty-reset-filters-action";
import { TableEmptyState } from "@/shared/components/data-table/table-empty-state";
import { ItemGroup } from "@/shared/components/ui/item";

import type { GetProductTypesReturn } from "@/modules/product-types/types/product-type.types";
import { CreateProductTypeButton } from "./create-product-type-button";
import { ProductTypeMobileItem } from "./product-type-mobile-item";

interface ProductTypesMobileListProps {
	productTypesPromise: Promise<GetProductTypesReturn>;
	perPage: number;
	hasActiveFilters?: boolean;
}

export function ProductTypesMobileList({
	productTypesPromise,
	perPage,
	hasActiveFilters,
}: ProductTypesMobileListProps) {
	const { productTypes, pagination, totalCount } = use(productTypesPromise);

	if (productTypes.length === 0) {
		return (
			<div className="md:hidden">
				<TableEmptyState
					icon={Tags}
					title="Aucun type trouvé"
					description={
						hasActiveFilters
							? "Aucun type de bijou ne correspond aux critères de recherche."
							: "Aucune famille de bijoux à l'atelier pour l'instant."
					}
					actionElement={
						hasActiveFilters ? (
							<EmptyResetFiltersAction href="/admin/catalogue/types-de-produits" />
						) : (
							<CreateProductTypeButton />
						)
					}
				/>
			</div>
		);
	}

	return (
		<div className="space-y-4 overscroll-contain pb-[calc(var(--bottom-bar-height,5rem)+1rem)] md:hidden md:pb-0">
			<AdminListLiveCount
				count={productTypes.length}
				singular="type de bijou"
				plural="types de bijoux"
				totalCount={totalCount}
			/>
			<ItemGroup aria-label="Types de bijoux" className="gap-2">
				{productTypes.map((productType) => (
					<li key={productType.id}>
						<ProductTypeMobileItem productType={productType} />
					</li>
				))}
			</ItemGroup>

			<AdminMobileListPagination
				perPage={perPage}
				hasNextPage={pagination.hasNextPage}
				hasPreviousPage={pagination.hasPreviousPage}
				currentPageSize={productTypes.length}
				nextCursor={pagination.nextCursor}
				prevCursor={pagination.prevCursor}
				totalCount={totalCount}
			/>
		</div>
	);
}
