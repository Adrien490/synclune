import { use } from "react";
import { Tags } from "lucide-react";

import { AdminListLiveCount } from "@/shared/components/admin-list-live-count";
import { AdminMobileStickyPagination } from "@/shared/components/cursor-pagination";
import { BulkSelectionProvider } from "@/shared/components/data-table";
import { EmptyResetFiltersAction } from "@/shared/components/data-table/empty-reset-filters-action";
import { TableEmptyState } from "@/shared/components/data-table/table-empty-state";
import {
	MobileSelectionBottomBar,
	MobileSelectionHeader,
} from "@/shared/components/mobile-selection";
import { ItemGroup } from "@/shared/components/ui/item";
import { AdminListPendingProvider } from "@/shared/contexts/admin-list-pending-context";

import type {
	GetProductTypesReturn,
	GetProductTypesParams,
	ProductTypeFilters,
} from "@/modules/product-types/types/product-type.types";
import { CreateProductTypeButton } from "./create-product-type-button";
import { ProductTypeMobileItem } from "./product-type-mobile-item";
import { ProductTypesBulkActionsBar } from "./product-types-bulk-actions-bar";
import { ProductTypesCrossPageBanner } from "./product-types-cross-page-banner";

interface ProductTypesMobileListProps {
	productTypesPromise: Promise<GetProductTypesReturn>;
	perPage: number;
	hasActiveFilters?: boolean;
	filterParams?: {
		search?: string;
		sortBy?: GetProductTypesParams["sortBy"];
		filters?: ProductTypeFilters;
	};
}

export function ProductTypesMobileList({
	productTypesPromise,
	perPage,
	hasActiveFilters,
	filterParams,
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

	const pageItemIds = productTypes.map((p) => p.id);

	return (
		<BulkSelectionProvider pageItemIds={pageItemIds}>
			<AdminListPendingProvider
				itemsLabel={{ singular: "type de bijou", plural: "types de bijoux" }}
			>
				<div className="space-y-4 overscroll-contain pb-[calc(var(--bottom-bar-height,5rem)+1rem)] md:hidden md:pb-0">
					<MobileSelectionHeader itemsLabel={{ singular: "type", plural: "types" }} />
					{filterParams ? (
						<ProductTypesCrossPageBanner totalCount={totalCount} filterParams={filterParams} />
					) : null}
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

					<AdminMobileStickyPagination
						perPage={perPage}
						hasNextPage={pagination.hasNextPage}
						hasPreviousPage={pagination.hasPreviousPage}
						currentPageSize={productTypes.length}
						nextCursor={pagination.nextCursor}
						prevCursor={pagination.prevCursor}
						totalCount={totalCount}
					/>
				</div>
				<MobileSelectionBottomBar emptyHint="Tape sur les familles de bijoux">
					<ProductTypesBulkActionsBar presentation="bottom-bar" />
				</MobileSelectionBottomBar>
			</AdminListPendingProvider>
		</BulkSelectionProvider>
	);
}
