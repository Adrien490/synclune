import Link from "next/link";

import { AdminDataTable, TableEmptyState } from "@/shared/components/data-table";
import {
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/shared/components/ui/table";
import type { GetProductTypesReturn } from "@/modules/product-types/data/get-product-types";
import { LockIcon, ShapesIcon } from "@phosphor-icons/react/ssr";
import { ProductTypeActiveToggle } from "./product-type-active-toggle";
import { ProductTypeRowActions } from "./product-type-row-actions";
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
	const { productTypes, pagination, totalCount } = await productTypesPromise;

	if (productTypes.length === 0) {
		return (
			<TableEmptyState
				className="hidden md:flex"
				icon={ShapesIcon}
				title="Aucun type trouvé"
				description="Aucun type de bijou ne correspond aux critères de recherche."
				noItemsDescription="Aucun type de bijou pour l'instant."
				hasActiveFilters={hasActiveFilters}
				resetFiltersHref="/admin/catalogue/types-de-produits"
				actionElement={<CreateProductTypeButton />}
			/>
		);
	}

	return (
		<AdminDataTable
			caption="Liste des types de produits"
			pagination={{
				perPage,
				hasNextPage: pagination.hasNextPage,
				hasPreviousPage: pagination.hasPreviousPage,
				currentPageSize: productTypes.length,
				nextCursor: pagination.nextCursor,
				prevCursor: pagination.prevCursor,
				totalCount,
			}}
		>
			<TableHeader>
				<TableRow>
					<TableHead className="w-[26%]">Label</TableHead>
					<TableHead className="w-[38%]">Description</TableHead>
					<TableHead className="w-[12%] text-center">Produits</TableHead>
					<TableHead className="w-[12%] text-center">Actif</TableHead>
					<TableHead
						className="w-[12%] text-right"
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
								<div className="flex min-w-0 items-center gap-1.5">
									<Link
										href={`/admin/catalogue/types-de-produits/${productType.slug}`}
										className="text-foreground hover:text-foreground/80 focus-visible:ring-ring min-w-0 truncate font-semibold outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
										title={productType.label}
										style={{
											viewTransitionName: `product-type-${productType.slug}`,
										}}
									>
										{productType.label}
									</Link>
									{productType.isSystem ? (
										<LockIcon
											className="text-muted-foreground size-4 shrink-0"
											aria-label="Type système verrouillé"
										/>
									) : null}
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
		</AdminDataTable>
	);
}
