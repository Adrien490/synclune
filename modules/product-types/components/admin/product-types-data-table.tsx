import { CursorPagination } from "@/shared/components/cursor-pagination";
import { TableScrollContainer } from "@/shared/components/table-scroll-container";
import { Card, CardContent } from "@/shared/components/ui/card";
import { TableEmptyState } from "@/shared/components/data-table/table-empty-state";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/shared/components/ui/table";
import type { GetProductTypesReturn } from "@/modules/product-types/data/get-product-types";
import { Tags } from "lucide-react";
import { ProductTypeActiveToggle } from "./product-type-active-toggle";
import { ProductTypeRowActions } from "./product-type-row-actions";
import { ProductTypesSelectionToolbar } from "./product-types-selection-toolbar";
import { CreateProductTypeButton } from "./create-product-type-button";
import { TableSelectionCell } from "@/shared/components/table-selection-cell";

interface ProductTypesDataTableProps {
	productTypesPromise: Promise<GetProductTypesReturn>;
	perPage: number;
}

export async function ProductTypesDataTable({
	productTypesPromise,
	perPage,
}: ProductTypesDataTableProps) {
	const { productTypes, pagination } = await productTypesPromise;
	const productTypeIds = productTypes.map((type) => type.id);

	if (productTypes.length === 0) {
		return (
			<TableEmptyState
				icon={Tags}
				title="Aucun type trouvé"
				description="Aucun type de bijou ne correspond aux critères de recherche."
				actionElement={<CreateProductTypeButton />}
			/>
		);
	}

	return (
		<Card>
			<CardContent>
				<ProductTypesSelectionToolbar />
				<TableScrollContainer>
					<Table
						role="table"
						aria-label="Liste des types de produits"
						className="min-w-full table-fixed"
					>
						<TableHeader>
							<TableRow>
								<TableHead key="select" scope="col" role="columnheader" className="w-[5%]">
									<TableSelectionCell type="header" itemIds={productTypeIds} />
								</TableHead>
								<TableHead
									key="label"
									scope="col"
									role="columnheader"
									className="w-[30%] sm:w-[25%]"
								>
									Label
								</TableHead>
								<TableHead
									key="description"
									scope="col"
									role="columnheader"
									className="hidden w-[30%] lg:table-cell"
								>
									Description
								</TableHead>
								<TableHead
									key="products"
									scope="col"
									role="columnheader"
									className="hidden w-[15%] text-center sm:table-cell"
								>
									Produits
								</TableHead>
								<TableHead
									key="active"
									scope="col"
									role="columnheader"
									className="hidden w-[10%] text-center sm:table-cell"
								>
									Actif
								</TableHead>
								<TableHead
									key="actions"
									scope="col"
									role="columnheader"
									className="w-[15%] text-right sm:w-[10%]"
									aria-label="Actions disponibles pour chaque type de produit"
								>
									Actions
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{productTypes.map((productType) => {
								const productsCount = productType._count?.products || 0;

								return (
									<TableRow key={productType.id}>
										<TableCell role="gridcell">
											<TableSelectionCell type="row" itemId={productType.id} />
										</TableCell>
										<TableCell role="gridcell">
											<div className="overflow-hidden">
												<span
													className="text-foreground block truncate font-semibold"
													title={productType.label}
												>
													{productType.label}
												</span>
											</div>
										</TableCell>
										<TableCell role="gridcell" className="hidden lg:table-cell">
											<div className="text-muted-foreground line-clamp-2 text-sm">
												{productType.description || "-"}
											</div>
										</TableCell>
										<TableCell role="gridcell" className="hidden text-center sm:table-cell">
											<span className="text-sm font-medium">{productsCount}</span>
										</TableCell>
										<TableCell role="gridcell" className="hidden text-center sm:table-cell">
											<ProductTypeActiveToggle
												productTypeId={productType.id}
												isActive={productType.isActive}
												isSystem={productType.isSystem}
											/>
										</TableCell>
										<TableCell role="gridcell" className="text-right">
											<ProductTypeRowActions
												productTypeId={productType.id}
												isSystem={productType.isSystem}
												label={productType.label}
												description={productType.description}
												slug={productType.slug}
												productsCount={productsCount}
											/>
										</TableCell>
									</TableRow>
								);
							})}
						</TableBody>
					</Table>
				</TableScrollContainer>

				<div className="mt-4">
					<CursorPagination
						perPage={perPage}
						hasNextPage={pagination.hasNextPage}
						hasPreviousPage={pagination.hasPreviousPage}
						currentPageSize={productTypes.length}
						nextCursor={pagination.nextCursor}
						prevCursor={pagination.prevCursor}
					/>
				</div>
			</CardContent>
		</Card>
	);
}
