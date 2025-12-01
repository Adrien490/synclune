import { DEFAULT_PER_PAGE } from "@/shared/components/cursor-pagination/pagination";
import { DataTableToolbar } from "@/shared/components/data-table-toolbar";
import { getToolbarCollapsed } from "@/shared/data/get-toolbar-collapsed";
import { PageHeader } from "@/shared/components/page-header";
import { SearchForm } from "@/shared/components/search-form";
import { SelectFilter } from "@/shared/components/select-filter";
import { getColors, SORT_LABELS } from "@/modules/colors/data/get-colors";
import { getFirstParam } from "@/shared/utils/params";
import { connection } from "next/server";
import { Suspense } from "react";
import { ColorsDataTable } from "@/modules/colors/components/admin/colors-data-table";
import { ColorsDataTableSkeleton } from "@/modules/colors/components/admin/colors-data-table-skeleton";
import { ColorsFilterBadges } from "@/modules/colors/components/admin/colors-filter-badges";
import { ColorsFilterSheet } from "@/modules/colors/components/admin/colors-filter-sheet";
import { CreateColorButton } from "@/modules/colors/components/admin/create-color-button";
import { ColorFormDialog } from "@/modules/colors/components/color-form-dialog";
import { DeleteColorAlertDialog } from "@/modules/colors/components/admin/delete-color-alert-dialog";
import { RefreshColorsButton } from "@/modules/colors/components/admin/refresh-colors-button";
import { Metadata } from "next";

export const metadata: Metadata = {
	title: "Couleurs - Administration",
	description: "Gérer les couleurs",
};

type ColorsAdminPageProps = {
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function ColorsAdminPage({
	searchParams,
}: ColorsAdminPageProps) {
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
		| "skuCount-descending";
	const search = getFirstParam(params.search);

	const toolbarCollapsed = await getToolbarCollapsed();

	// La promise de couleurs n'est PAS awaitée pour permettre le streaming
	const colorsPromise = getColors({
		cursor,
		direction,
		perPage,
		sortBy,
		search,
		filters: {},
	});

	return (
		<>
			<PageHeader
				variant="compact"
				title="Couleurs"
				actions={<CreateColorButton />}
			/>

			<div className="space-y-6">
				<DataTableToolbar
					ariaLabel="Barre d'outils de gestion des couleurs"
					initialCollapsed={toolbarCollapsed}
					search={
						<SearchForm
							paramName="search"
							placeholder="Rechercher par nom, slug ou hex..."
							ariaLabel="Rechercher une couleur par nom, slug ou code hex"
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
					<ColorsFilterSheet />
					<RefreshColorsButton />
				</DataTableToolbar>

				{/* Badges de filtres actifs */}
				<ColorsFilterBadges />

				<Suspense fallback={<ColorsDataTableSkeleton />}>
					<ColorsDataTable colorsPromise={colorsPromise} />
				</Suspense>
			</div>

			<ColorFormDialog />
			<DeleteColorAlertDialog />
		</>
	);
}
