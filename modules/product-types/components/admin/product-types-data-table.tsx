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
import { CreateProductTypeButton } from "./create-product-type-button";

interface ProductTypesDataTableProps {
	productTypesPromise: Promise<GetProductTypesReturn>;
	perPage: number;
}

export async function ProductTypesDataTable({
	productTypesPromise,
	perPage,
}: ProductTypesDataTableProps) {
	const { productTypes, pagination } = await productTypesPromise;

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
		<Card className="hidden md:block">
			<CardContent>
				<TableScrollContainer>
					<Table
						role="table"
						aria-label="Liste des types de produits"
						caption="Liste des types de produits"
						className="min-w-full table-fixed"
					>
						<TableHeader>
							<TableRow>
								<TableHead key="label" scope="col" role="columnheader" className="w-[22%]">
									Label
								</TableHead>
								<TableHead key="description" scope="col" role="columnheader" className="w-[30%]">
									Description
								</TableHead>
								<TableHead
									key="products"
									scope="col"
									role="columnheader"
									className="w-[12%] text-center"
								>
									Produits
								</TableHead>
								<TableHead
									key="active"
									scope="col"
									role="columnheader"
									className="w-[10%] text-center"
								>
									Actif
								</TableHead>
								<TableHead
									key="actions"
									scope="col"
									role="columnheader"
									className="w-[8%] text-right"
									aria-label="Actions disponibles pour chaque type de produit"
								>
									Actions
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{productTypes.map((productType) => {
								const productsCount = productType._count.products || 0;

								return (
									<TableRow key={productType.id}>
										<TableCell>
											<div className="overflow-hidden">
												<span
													className="text-foreground block truncate font-semibold"
													title={productType.label}
												>
													{productType.label}
												</span>
											</div>
										</TableCell>
										<TableCell>
											<div className="text-muted-foreground line-clamp-2 text-sm">
												{productType.description ?? "-"}
											</div>
										</TableCell>
										<TableCell className="text-center">
											<span className="text-sm font-medium">{productsCount}</span>
										</TableCell>
										<TableCell className="text-center">
											<ProductTypeActiveToggle
												productTypeId={productType.id}
												isActive={productType.isActive}
												isSystem={productType.isSystem}
											/>
										</TableCell>
										<TableCell className="text-right">
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
