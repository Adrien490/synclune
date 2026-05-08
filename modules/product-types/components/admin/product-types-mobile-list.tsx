import { use } from "react";
import { Tags } from "lucide-react";

import { AdminListLiveCount } from "@/shared/components/admin-list-live-count";
import { CursorPagination } from "@/shared/components/cursor-pagination";
import { TableEmptyState } from "@/shared/components/data-table/table-empty-state";
import { ItemGroup } from "@/shared/components/ui/item";

import type { GetProductTypesReturn } from "@/modules/product-types/types/product-type.types";
import { CreateProductTypeButton } from "./create-product-type-button";
import { ProductTypeMobileItem } from "./product-type-mobile-item";

interface ProductTypesMobileListProps {
	productTypesPromise: Promise<GetProductTypesReturn>;
	perPage: number;
}

export function ProductTypesMobileList({
	productTypesPromise,
	perPage,
}: ProductTypesMobileListProps) {
	const { productTypes, pagination } = use(productTypesPromise);

	if (productTypes.length === 0) {
		return (
			<div className="md:hidden">
				<TableEmptyState
					icon={Tags}
					title="Aucun type trouve"
					description="Aucun type de bijou ne correspond aux criteres de recherche."
					actionElement={<CreateProductTypeButton />}
				/>
			</div>
		);
	}

	return (
		<div className="space-y-4 pb-[calc(var(--bottom-bar-height,5rem)+1rem)] md:hidden md:pb-0">
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
	);
}
