import { CursorPagination } from "@/shared/components/cursor-pagination";
import { TableScrollContainer } from "@/shared/components/table-scroll-container";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/shared/components/ui/empty";
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
import Link from "next/link";
import { ProductTypeActiveToggle } from "./product-type-active-toggle";
import { ProductTypeRowActions } from "./product-type-row-actions";
import { ProductTypesSelectionToolbar } from "./product-types-selection-toolbar";
import { ProductTypesTableSelectionCell } from "./product-types-table-selection-cell";

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
			<Empty className="py-12">
				<EmptyHeader>
					<EmptyMedia variant="icon">
						<Tags />
					</EmptyMedia>
					<EmptyTitle>Aucun type trouvé</EmptyTitle>
					<EmptyDescription>
						Aucun type de bijou ne correspond aux critères de recherche.
					</EmptyDescription>
				</EmptyHeader>
				<EmptyContent>
					<Button asChild variant="primary">
						<Link href="/admin/catalogue/types-de-produits">
							Créer un type de bijou
						</Link>
					</Button>
				</EmptyContent>
			</Empty>
		);
	}

	return (
		<Card>
			<CardContent>
				<ProductTypesSelectionToolbar productTypeIds={productTypeIds} />
				<TableScrollContainer>
					<Table role="table" aria-label="Liste des types de produits" className="min-w-full table-fixed">
						<TableHeader>
							<TableRow>
								<TableHead key="select" scope="col" role="columnheader" className="w-[5%]">
									<ProductTypesTableSelectionCell
										type="header"
										productTypeIds={productTypeIds}
									/>
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
									className="hidden lg:table-cell w-[30%]"
								>
									Description
								</TableHead>
								<TableHead
									key="products"
									scope="col"
									role="columnheader"
									className="hidden sm:table-cell text-center w-[15%]"
								>
									Produits
								</TableHead>
								<TableHead
									key="active"
									scope="col"
									role="columnheader"
									className="hidden sm:table-cell text-center w-[10%]"
								>
									Actif
								</TableHead>
								<TableHead
									key="actions"
									scope="col"
									role="columnheader"
									className="w-[15%] sm:w-[10%] text-right"
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
											<ProductTypesTableSelectionCell
												type="row"
												productTypeId={productType.id}
											/>
										</TableCell>
										<TableCell role="gridcell">
										<div className="overflow-hidden">
											<span
												className="font-semibold text-foreground truncate block"
												title={productType.label}
											>
												{productType.label}
											</span>
										</div>
									</TableCell>
										<TableCell
											role="gridcell"
											className="hidden lg:table-cell"
										>
											<div className="text-sm text-muted-foreground line-clamp-2">
												{productType.description || "-"}
											</div>
										</TableCell>
										<TableCell
											role="gridcell"
											className="hidden sm:table-cell text-center"
										>
											<span className="text-sm font-medium">
												{productsCount}
											</span>
										</TableCell>
										<TableCell
											role="gridcell"
											className="hidden sm:table-cell text-center"
										>
											<ProductTypeActiveToggle
												productTypeId={productType.id}
												isActive={productType.isActive}
												isSystem={productType.isSystem}
											/>
										</TableCell>
										<TableCell role="gridcell" className="text-right">
											<ProductTypeRowActions
												productTypeId={productType.id}
												isActive={productType.isActive}
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
