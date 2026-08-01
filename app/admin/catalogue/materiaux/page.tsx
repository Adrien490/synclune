import { DEFAULT_PER_PAGE } from "@/shared/lib/pagination";
import { Toolbar } from "@/shared/components/toolbar";
import { ButtonGroup } from "@/shared/components/ui/button-group";
import { PageHeader } from "@/shared/components/page-header";
import { SearchInput } from "@/shared/components/search-input";
import { SelectFilter } from "@/shared/components/select-filter";
import { getMaterials, MATERIALS_SORT_LABELS } from "@/modules/materials/data/get-materials";
import { getFirstParam } from "@/shared/utils/params";
import { searchParamParsers } from "@/shared/utils/parse-search-params";
import { Suspense } from "react";
import { MaterialsDataTable } from "@/modules/materials/components/admin/materials-data-table";
import { MaterialsDataTableSkeleton } from "@/modules/materials/components/admin/materials-data-table-skeleton";
import { MaterialsMobileList } from "@/modules/materials/components/admin/materials-mobile-list";
import { MaterialsMobileListSkeleton } from "@/modules/materials/components/admin/materials-mobile-list-skeleton";
import { MaterialsFilterBadges } from "@/modules/materials/components/admin/materials-filter-badges";
import { MaterialsFilterSheet } from "@/modules/materials/components/admin/materials-filter-sheet";
import { MaterialsSortBadge } from "@/modules/materials/components/admin/materials-sort-badge";
import { CreateMaterialButton } from "@/modules/materials/components/admin/create-material-button";
import dynamic from "next/dynamic";

// Lazy loading - form dialog page-level (CreateMaterialButton)
const MaterialFormDialog = dynamic(() =>
	import("@/modules/materials/components/material-form-dialog").then(
		(mod) => mod.MaterialFormDialog,
	),
);
import { MaterialsAdminDialogs } from "./_components/materials-admin-dialogs";
import { RefreshMaterialsButton } from "@/modules/materials/components/admin/refresh-materials-button";
import { MaterialsBottomBar } from "@/modules/materials/components/admin/materials-bottom-bar";
import { ToolbarSkeleton } from "@/shared/components/toolbar-skeleton";
import { type Metadata } from "next";
import { ResultCountLiveRegion } from "@/shared/components/result-count-live-region";
import { ADMIN_LIST_GROUP_CLASS } from "@/shared/components/admin-list-pending.styles";
import { cn } from "@/shared/utils/cn";
import { assertAdminPage } from "@/modules/auth/lib/assert-admin-page";

export const metadata: Metadata = {
	title: "Matériaux - Administration",
	description: "Gérer les matériaux",
};

type MaterialsAdminPageProps = {
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function MaterialsAdminPage({ searchParams }: MaterialsAdminPageProps) {
	await assertAdminPage();

	const params = await searchParams;

	const cursor = getFirstParam(params.cursor);
	const direction = (getFirstParam(params.direction) ?? "forward") as "forward" | "backward";
	const perPage = Number(getFirstParam(params.perPage)) || DEFAULT_PER_PAGE;
	// Repli sur le tri par défaut plutôt qu'un cast aveugle : un `?sortBy=bogus`
	// faisait échouer le safeParse de getMaterials → liste VIDE sans message.
	const rawSortBy = getFirstParam(params.sortBy);
	const sortBy = (
		rawSortBy && rawSortBy in MATERIALS_SORT_LABELS ? rawSortBy : "name-ascending"
	) as keyof typeof MATERIALS_SORT_LABELS;
	const search = searchParamParsers.search(params.search);
	const filterIsActive = getFirstParam(params.filter_isActive);
	const hasActiveFilters = !!search || Object.keys(params).some((key) => key.startsWith("filter_"));
	const filters = {
		isActive: filterIsActive ? filterIsActive === "true" : undefined,
	};

	// La promise de matériaux n'est PAS awaitée pour permettre le streaming
	const materialsPromise = getMaterials({
		cursor,
		direction,
		perPage,
		sortBy,
		search,
		filters,
	});

	return (
		<>
			<PageHeader
				variant="compact"
				title="Matériaux"
				actions={<CreateMaterialButton />}
				className="hidden md:block"
			/>

			<div className={cn(ADMIN_LIST_GROUP_CLASS, "space-y-6")}>
				<Suspense fallback={null}>
					<ResultCountLiveRegion
						totalCount={materialsPromise.then((d) => d.totalCount)}
						query={search}
						singular="matériau"
						plural="matériaux"
					/>
				</Suspense>

				<MaterialsBottomBar />

				<Suspense
					fallback={<ToolbarSkeleton selectCount={1} buttonCount={2} className="hidden md:flex" />}
				>
					<Toolbar
						className="hidden md:flex"
						ariaLabel="Barre d'outils de gestion des matériaux"
						search={
							<SearchInput
								size="sm"
								paramName="search"
								placeholder="Rechercher par nom, slug ou description…"
								aria-label="Rechercher un matériau par nom, slug ou description"
								className="w-full"
							/>
						}
					>
						<SelectFilter
							filterKey="sortBy"
							label="Trier par"
							options={Object.entries(MATERIALS_SORT_LABELS).map(([value, label]) => ({
								value,
								label,
							}))}
							placeholder="Position"
							className="w-full sm:min-w-45"
							noPrefix
						/>
						<ButtonGroup aria-label="Filtres et actions">
							<MaterialsFilterSheet />
							<RefreshMaterialsButton />
						</ButtonGroup>
					</Toolbar>

					{/* Badges de filtres actifs (visible mobile + desktop) */}
					<MaterialsFilterBadges />
				</Suspense>

				{/* Sort badge mobile (visible si sortBy URL défini) */}
				<MaterialsSortBadge />

				{/* Liste mobile */}
				<Suspense fallback={<MaterialsMobileListSkeleton hasActiveFilters={hasActiveFilters} />}>
					<MaterialsMobileList
						materialsPromise={materialsPromise}
						perPage={perPage}
						hasActiveFilters={hasActiveFilters}
					/>
				</Suspense>

				{/* DataTable desktop */}
				<Suspense fallback={<MaterialsDataTableSkeleton />}>
					<MaterialsDataTable
						materialsPromise={materialsPromise}
						perPage={perPage}
						hasActiveFilters={hasActiveFilters}
					/>
				</Suspense>
			</div>

			<MaterialFormDialog />
			{/* Dialogs des actions long-press / row-actions (delete) */}
			<MaterialsAdminDialogs />
		</>
	);
}
