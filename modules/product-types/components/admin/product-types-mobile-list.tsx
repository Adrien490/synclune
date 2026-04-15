import { use } from "react";
import { Tags } from "lucide-react";
import { CursorPagination } from "@/shared/components/cursor-pagination";
import { TableEmptyState } from "@/shared/components/data-table/table-empty-state";
import {
	Item,
	ItemActions,
	ItemContent,
	ItemDescription,
	ItemGroup,
	ItemTitle,
} from "@/shared/components/ui/item";
import { Badge } from "@/shared/components/ui/badge";
import type { GetProductTypesReturn } from "@/modules/product-types/types/product-type.types";
import { ProductTypeRowActions } from "./product-type-row-actions";
import { ProductTypesSelectionToolbar } from "./product-types-selection-toolbar";
import { CreateProductTypeButton } from "./create-product-type-button";

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
		<div className="space-y-4 pb-20 md:hidden md:pb-0">
			<ProductTypesSelectionToolbar />

			<ItemGroup aria-label="Types de bijoux" className="gap-2">
				{productTypes.map((productType) => {
					const productsCount = productType._count.products || 0;

					return (
						<div key={productType.id} role="listitem">
							<Item
								variant="outline"
								size="sm"
								className="gap-3"
								aria-roledescription="carte type de bijou"
							>
								<ItemContent className="min-w-0">
									<ItemTitle>
										<span className="truncate font-semibold">{productType.label}</span>
										<Badge variant={productType.isActive ? "default" : "secondary"}>
											{productType.isActive ? "Actif" : "Inactif"}
										</Badge>
										{productType.isSystem && <Badge variant="outline">Systeme</Badge>}
									</ItemTitle>
									{productType.description && (
										<ItemDescription className="line-clamp-1">
											{productType.description}
										</ItemDescription>
									)}
									<ItemDescription className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
										<span>
											{productsCount} produit{productsCount !== 1 ? "s" : ""}
										</span>
									</ItemDescription>
								</ItemContent>
								<ItemActions>
									<ProductTypeRowActions
										productTypeId={productType.id}
										isSystem={productType.isSystem}
										label={productType.label}
										description={productType.description}
										slug={productType.slug}
										productsCount={productsCount}
									/>
								</ItemActions>
							</Item>
						</div>
					);
				})}
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
