import { DataTableToolbar } from "@/shared/components/data-table-toolbar";
import { PageHeader } from "@/shared/components/page-header";
import { SearchForm } from "@/shared/components/search-form";
import { SelectFilter } from "@/shared/components/select-filter";
import { getInventory } from "@/modules/skus/data/get-inventory";
import { getColorOptions } from "@/modules/colors/data/get-colors";
import { getMaterialOptions } from "@/modules/materials/data/get-materials";
import { SORT_LABELS } from "@/modules/skus/constants/skus-constants";
import { Suspense } from "react";
import { InventoryDataTable } from "@/modules/skus/components/admin/inventory-data-table";
import { InventoryDataTableSkeleton } from "@/modules/skus/components/admin/inventory-data-table-skeleton";
import { InventoryFilterSheet } from "@/modules/skus/components/admin/inventory-filter-sheet";
import { RefreshSkusButton } from "@/modules/skus/components/admin/refresh-skus-button";
import { AdjustStockDialog } from "@/modules/skus/components/admin/adjust-stock-dialog";
import { UpdatePriceDialog } from "@/modules/skus/components/admin/update-price-dialog";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Inventaire - Administration",
	description: "Gérer le stock de tous les produits",
};

export type InventorySearchParams = {
	cursor?: string;
	direction?: "forward" | "backward";
	perPage?: string;
	sortBy?: string;
	search?: string;
	filter_stockStatus?: string | string[];
	filter_colorId?: string | string[];
	filter_materialId?: string | string[];
};

type InventoryAdminPageProps = {
	searchParams: Promise<InventorySearchParams>;
};

// Normalise une valeur string ou string[] en tableau
function normalizeArray(value: string | string[] | undefined): string[] {
	if (!value) return [];
	return Array.isArray(value) ? value : [value];
}

function parseInventoryParams(params: InventorySearchParams) {
	const stockStatuses = normalizeArray(params.filter_stockStatus).filter(
		(s) => s !== "all"
	);
	const colorIds = normalizeArray(params.filter_colorId);
	const materialIds = normalizeArray(params.filter_materialId);

	return {
		cursor: params.cursor,
		direction: params.direction as "forward" | "backward" | undefined,
		perPage: params.perPage ? parseInt(params.perPage, 10) : undefined,
		sortBy: params.sortBy,
		search: params.search,
		// Si un seul statut, utiliser comme string pour le schema existant
		stockStatus:
			stockStatuses.length === 1
				? (stockStatuses[0] as "in_stock" | "low_stock" | "out_of_stock")
				: undefined,
		colorId: colorIds.length > 0 ? colorIds : undefined,
		materialId: materialIds.length > 0 ? materialIds : undefined,
	};
}

export default async function InventoryAdminPage({
	searchParams,
}: InventoryAdminPageProps) {
	const params = await searchParams;
	const parsedParams = parseInventoryParams(params);

	// La promise d'inventaire n'est PAS awaited pour permettre le streaming
	const inventoryPromise = getInventory({
		cursor: parsedParams.cursor,
		direction: parsedParams.direction,
		perPage: parsedParams.perPage,
		sortBy: parsedParams.sortBy,
		search: parsedParams.search,
		filters: {
			stockStatus: parsedParams.stockStatus,
			colorId: parsedParams.colorId,
			materialId: parsedParams.materialId,
		},
	});

	// Les options de filtre sont awaited car nécessaires immédiatement
	const [colorOptions, materialOptions] = await Promise.all([
		getColorOptions(),
		getMaterialOptions(),
	]);

	return (
		<>
			<PageHeader
				variant="compact"
				title="Inventaire"
			/>

			<div className="space-y-6">
				<DataTableToolbar ariaLabel="Barre d'outils de l'inventaire">
					<div className="flex-1 w-full sm:max-w-md min-w-0">
						<SearchForm
							paramName="search"
							placeholder="Rechercher un produit..."
							ariaLabel="Rechercher dans l'inventaire"
							className="w-full"
						/>
					</div>

					<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
						<InventoryFilterSheet
							colorOptions={colorOptions}
							materialOptions={materialOptions}
						/>
						<SelectFilter
							filterKey="sortBy"
							label="Trier par"
							options={Object.entries(SORT_LABELS).map(([value, label]) => ({
								value,
								label,
							}))}
							placeholder="Plus récents"
							className="w-full sm:min-w-[180px]"
						/>
						<RefreshSkusButton />
					</div>
				</DataTableToolbar>

				<Suspense fallback={<InventoryDataTableSkeleton />}>
					<InventoryDataTable inventoryPromise={inventoryPromise} />
				</Suspense>
			</div>

			{/* Dialogs pour les actions */}
			<AdjustStockDialog />
			<UpdatePriceDialog />
		</>
	);
}
