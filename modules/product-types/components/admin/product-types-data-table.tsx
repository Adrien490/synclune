import Link from "next/link";

import { CursorPagination } from "@/shared/components/cursor-pagination";
import {
	BulkSelectionHeaderCheckbox,
	BulkSelectionProvider,
	BulkSelectionRowCheckbox,
	TableEmptyState,
} from "@/shared/components/data-table";
import { EmptyResetFiltersAction } from "@/shared/components/data-table/empty-reset-filters-action";
import { TableScrollContainer } from "@/shared/components/table-scroll-container";
import { Card, CardContent } from "@/shared/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/shared/components/ui/table";
import type { GetProductTypesReturn } from "@/modules/product-types/data/get-product-types";
import { Lock, Tags } from "lucide-react";
import { ProductTypeActiveToggle } from "./product-type-active-toggle";
import { ProductTypeRowActions } from "./product-type-row-actions";
import { ProductTypesBulkActionsBar } from "./product-types-bulk-actions-bar";
import { CreateProductTypeButton } from "./create-product-type-button";

interface ProductTypesDataTableProps {
	productTypesPromise: Promise<GetProductTypesReturn>;
	perPage: number;
	hasActiveFilters?: boolean;
}

export async function ProductTypesDataTable({
	productTypesPromise,
	perPage,
	hasActiveFilters,
}: ProductTypesDataTableProps) {
	const { productTypes, pagination } = await productTypesPromise;

	if (productTypes.length === 0) {
		return (
			<TableEmptyState
				className="hidden md:flex"
				icon={Tags}
				title="Aucun type trouvé"
				description={
					hasActiveFilters
						? "Aucun type de bijou ne correspond aux critères de recherche."
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
		);
	}

	const pageItemIds = productTypes.filter((pt) => !pt.isSystem).map((pt) => pt.id);

	return (
		<Card className="hidden md:block">
			<CardContent>
				<BulkSelectionProvider pageItemIds={pageItemIds}>
					<ProductTypesBulkActionsBar />
					<TableScrollContainer>
						<Table
							role="table"
							aria-label="Liste des types de produits"
							caption="Liste des types de produits"
							className="min-w-full table-fixed"
						>
							<TableHeader>
								<TableRow>
									<TableHead key="select" scope="col" role="columnheader" className="w-[4%]">
										<BulkSelectionHeaderCheckbox itemsLabel="types" />
										<span className="sr-only">Sélection</span>
									</TableHead>
									<TableHead key="label" scope="col" role="columnheader" className="w-[20%]">
										Label
									</TableHead>
									<TableHead key="description" scope="col" role="columnheader" className="w-[28%]">
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
												{productType.isSystem ? (
													<Lock
														className="text-muted-foreground inline-block size-4"
														aria-label="Type système verrouillé"
													/>
												) : (
													<BulkSelectionRowCheckbox
														id={productType.id}
														itemLabel={`Type ${productType.label}`}
													/>
												)}
											</TableCell>
											<TableCell>
												<div className="overflow-hidden">
													<Link
														href={`/admin/catalogue/types-de-produits/${productType.slug}`}
														className="text-foreground hover:text-foreground/80 focus-visible:ring-ring block truncate font-semibold outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
														title={productType.label}
														style={{
															viewTransitionName: `product-type-${productType.slug}`,
														}}
													>
														{productType.label}
													</Link>
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
				</BulkSelectionProvider>
			</CardContent>
		</Card>
	);
}
