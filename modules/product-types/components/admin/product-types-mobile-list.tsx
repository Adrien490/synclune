import { use } from "react";
import { Tags } from "lucide-react";

import { AdminListLiveCount } from "@/shared/components/admin-list-live-count";
import { CursorPagination } from "@/shared/components/cursor-pagination";
import { BulkSelectionProvider } from "@/shared/components/data-table";
import { EmptyResetFiltersAction } from "@/shared/components/data-table/empty-reset-filters-action";
import { TableEmptyState } from "@/shared/components/data-table/table-empty-state";
import {
	MobileSelectionBottomBar,
	MobileSelectionHeader,
} from "@/shared/components/mobile-selection";
import { ItemGroup } from "@/shared/components/ui/item";

import type { GetProductTypesReturn } from "@/modules/product-types/types/product-type.types";
import { CreateProductTypeButton } from "./create-product-type-button";
import { ProductTypeMobileItem } from "./product-type-mobile-item";
import { ProductTypesBulkActionsBar } from "./product-types-bulk-actions-bar";

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
	const { productTypes, pagination } = use(productTypesPromise);

	if (productTypes.length === 0) {
		return (
			<div className="md:hidden">
				<TableEmptyState
					icon={Tags}
					title="Aucun type trouve"
					description={
						hasActiveFilters
							? "Aucun type de bijou ne correspond aux criteres de recherche."
							: "Aucun type de bijou pour l'instant."
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

	const pageItemIds = productTypes.map((p) => p.id);

	return (
		<BulkSelectionProvider pageItemIds={pageItemIds}>
			<div className="space-y-4 pb-[calc(var(--bottom-bar-height,5rem)+1rem)] md:hidden md:pb-0">
				<MobileSelectionHeader itemsLabel={{ singular: "type", plural: "types" }} />
				<AdminListLiveCount
					count={productTypes.length}
					singular="type de bijou"
					plural="types de bijoux"
				/>
				<ItemGroup aria-label="Types de bijoux" className="gap-2">
					{productTypes.map((productType) => (
						<div key={productType.id} role="listitem">
							<ProductTypeMobileItem productType={productType} />
						</div>
					))}
				</ItemGroup>

				<CursorPagination
					perPage={perPage}
					hasNextPage={pagination.hasNextPage}
					hasPreviousPage={pagination.hasPreviousPage}
					currentPageSize={productTypes.length}
					nextCursor={pagination.nextCursor}
					prevCursor={pagination.prevCursor}
				/>
			</div>
			<MobileSelectionBottomBar>
				<ProductTypesBulkActionsBar presentation="bottom-bar" />
			</MobileSelectionBottomBar>
		</BulkSelectionProvider>
	);
}
