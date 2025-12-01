import { DEFAULT_PER_PAGE } from "@/shared/components/cursor-pagination/pagination";
import { DataTableToolbar } from "@/shared/components/data-table-toolbar";
import { getToolbarCollapsed } from "@/shared/data/get-toolbar-collapsed";
import { PageHeader } from "@/shared/components/page-header";
import { SearchForm } from "@/shared/components/search-form";
import { SelectFilter } from "@/shared/components/select-filter";
import { getMaterials, SORT_LABELS } from "@/modules/materials/data/get-materials";
import { getFirstParam } from "@/shared/utils/params";
import { connection } from "next/server";
import { Suspense } from "react";
import { MaterialsDataTable } from "@/modules/materials/components/admin/materials-data-table";
import { MaterialsDataTableSkeleton } from "@/modules/materials/components/admin/materials-data-table-skeleton";
import { MaterialsFilterBadges } from "@/modules/materials/components/admin/materials-filter-badges";
import { MaterialsFilterSheet } from "@/modules/materials/components/admin/materials-filter-sheet";
import { CreateMaterialButton } from "@/modules/materials/components/admin/create-material-button";
import { MaterialFormDialog } from "@/modules/materials/components/material-form-dialog";
import { DeleteMaterialAlertDialog } from "@/modules/materials/components/admin/delete-material-alert-dialog";
import { RefreshMaterialsButton } from "@/modules/materials/components/admin/refresh-materials-button";
import { Metadata } from "next";

export const metadata: Metadata = {
	title: "Matériaux - Administration",
	description: "Gérer les matériaux",
};

type MaterialsAdminPageProps = {
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function MaterialsAdminPage({
	searchParams,
}: MaterialsAdminPageProps) {
	// Force dynamic rendering to enable use cache: remote in functions
	await connection();

	const params = await searchParams;

	const cursor = getFirstParam(params.cursor);
	const direction = (getFirstParam(params.direction) || "forward") as
		| "forward"
		| "backward";
	const perPage = Number(getFirstParam(params.perPage)) || DEFAULT_PER_PAGE;
	const sortBy = (getFirstParam(params.sortBy) || "name-ascending") as
		| "name-ascending"
		| "name-descending"
		| "skuCount-ascending"
		| "skuCount-descending"
		| "createdAt-ascending"
		| "createdAt-descending";
	const search = getFirstParam(params.search);
	const filterIsActive = getFirstParam(params.filter_isActive);

	const toolbarCollapsed = await getToolbarCollapsed();

	// La promise de matériaux n'est PAS awaitée pour permettre le streaming
	const materialsPromise = getMaterials({
		cursor,
		direction,
		perPage,
		sortBy,
		search,
		filters: {
			isActive: filterIsActive ? filterIsActive === "true" : undefined,
		},
	});

	return (
		<>
			<PageHeader
				variant="compact"
				title="Matériaux"
				actions={<CreateMaterialButton />}
			/>

			<div className="space-y-6">
				<DataTableToolbar
					ariaLabel="Barre d'outils de gestion des matériaux"
					initialCollapsed={toolbarCollapsed}
					search={
						<SearchForm
							paramName="search"
							placeholder="Rechercher par nom, slug ou description..."
							ariaLabel="Rechercher un matériau par nom, slug ou description"
							className="w-full"
						/>
					}
				>
					<SelectFilter
						filterKey="sortBy"
						label="Trier par"
						options={Object.entries(SORT_LABELS).map(([value, label]) => ({
							value,
							label,
						}))}
						placeholder="Position"
						className="w-full sm:min-w-[180px]"
					/>
					<MaterialsFilterSheet />
					<RefreshMaterialsButton />
				</DataTableToolbar>

				{/* Badges de filtres actifs */}
				<MaterialsFilterBadges />

				<Suspense fallback={<MaterialsDataTableSkeleton />}>
					<MaterialsDataTable materialsPromise={materialsPromise} />
				</Suspense>
			</div>

			<MaterialFormDialog />
			<DeleteMaterialAlertDialog />
		</>
	);
}
