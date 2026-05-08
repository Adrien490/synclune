import { DEFAULT_PER_PAGE } from "@/shared/lib/pagination";
import { Toolbar } from "@/shared/components/toolbar";
import { ButtonGroup } from "@/shared/components/ui/button-group";
import { PageHeader } from "@/shared/components/page-header";
import { SearchInput } from "@/shared/components/search-input";
import { SelectFilter } from "@/shared/components/select-filter";
import { getColors, SORT_LABELS } from "@/modules/colors/data/get-colors";
import { getFirstParam } from "@/shared/utils/params";
import { Suspense } from "react";
import { ColorsDataTable } from "@/modules/colors/components/admin/colors-data-table";
import { ColorsDataTableSkeleton } from "@/modules/colors/components/admin/colors-data-table-skeleton";
import { ColorsMobileList } from "@/modules/colors/components/admin/colors-mobile-list";
import { ColorsMobileListSkeleton } from "@/modules/colors/components/admin/colors-mobile-list-skeleton";
import { ColorsFilterBadges } from "@/modules/colors/components/admin/colors-filter-badges";
import { ColorsFilterSheet } from "@/modules/colors/components/admin/colors-filter-sheet";
import { CreateColorButton } from "@/modules/colors/components/admin/create-color-button";
import dynamic from "next/dynamic";

// Lazy loading - form dialog page-level (CreateColorButton)
const ColorFormDialog = dynamic(() =>
	import("@/modules/colors/components/color-form-dialog").then((mod) => mod.ColorFormDialog),
);
import { ColorsAdminDialogs } from "./_components/colors-admin-dialogs";
import { RefreshColorsButton } from "@/modules/colors/components/admin/refresh-colors-button";
import { ColorsBottomBar } from "@/modules/colors/components/admin/colors-bottom-bar";
import { ToolbarSkeleton } from "@/shared/components/toolbar-skeleton";
import { type Metadata } from "next";

export const metadata: Metadata = {
	title: "Couleurs - Administration",
	description: "Gérer les couleurs",
};

type ColorsAdminPageProps = {
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function ColorsAdminPage({ searchParams }: ColorsAdminPageProps) {
	const params = await searchParams;

	const cursor = getFirstParam(params.cursor);
	const direction = (getFirstParam(params.direction) ?? "forward") as "forward" | "backward";
	const perPage = Number(getFirstParam(params.perPage)) || DEFAULT_PER_PAGE;
	const sortBy = (getFirstParam(params.sortBy) ?? "name-ascending") as
		| "name-ascending"
		| "name-descending"
		| "skuCount-ascending"
		| "skuCount-descending";
	const search = getFirstParam(params.search);

	// Parse filters from search params
	const filterIsActive = getFirstParam(params.filter_isActive);
	const filters: { isActive?: boolean } = {};
	if (filterIsActive === "true") filters.isActive = true;
	else if (filterIsActive === "false") filters.isActive = false;

	// La promise de couleurs n'est PAS awaitée pour permettre le streaming
	const colorsPromise = getColors({
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
				title="Couleurs"
				actions={<CreateColorButton />}
				className="hidden md:block"
			/>

			<div className="space-y-6">
				<ColorsBottomBar />

				<Suspense
					fallback={<ToolbarSkeleton selectCount={1} buttonCount={2} className="hidden md:flex" />}
				>
					<Toolbar
						className="hidden md:flex"
						ariaLabel="Barre d'outils de gestion des couleurs"
						search={
							<SearchInput
								mode="live"
								size="sm"
								paramName="search"
								placeholder="Rechercher par nom, slug ou hex…"
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
							className="w-full sm:min-w-45"
							noPrefix
						/>
						<ButtonGroup aria-label="Filtres et actions">
							<ColorsFilterSheet />
							<RefreshColorsButton />
						</ButtonGroup>
					</Toolbar>

					{/* Badges de filtres actifs (visible mobile + desktop) */}
					<ColorsFilterBadges />
				</Suspense>

				{/* Liste mobile */}
				<Suspense fallback={<ColorsMobileListSkeleton />}>
					<ColorsMobileList
						colorsPromise={colorsPromise}
						perPage={perPage}
						hasActiveFilters={
							!!search || Object.keys(params).some((key) => key.startsWith("filter_"))
						}
					/>
				</Suspense>

				{/* DataTable desktop */}
				<Suspense fallback={<ColorsDataTableSkeleton />}>
					<ColorsDataTable colorsPromise={colorsPromise} perPage={perPage} />
				</Suspense>
			</div>

			<ColorFormDialog />
			{/* Dialogs des actions long-press / row-actions (delete) */}
			<ColorsAdminDialogs />
		</>
	);
}
