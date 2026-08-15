import {
	CreateTaxonomyButton,
	TaxonomySortBadge,
} from "@/modules/taxonomies/components/taxonomy-list-controls";
import { TaxonomyFilterBadges } from "@/modules/taxonomies/components/taxonomy-filter-badges";
import { TaxonomyBottomBar } from "@/modules/taxonomies/components/taxonomy-bottom-bar";
import { FilterTriggerButton } from "@/shared/components/filter-trigger-button";
import { DEFAULT_PER_PAGE } from "@/shared/lib/pagination";
import { Toolbar } from "@/shared/components/toolbar";
import { ButtonGroup } from "@/shared/components/ui/button-group";
import { PageHeader } from "@/shared/components/page-header";
import { SearchInput } from "@/shared/components/search-input";
import { SelectFilter } from "@/shared/components/select-filter";
import { getColors, SORT_LABELS } from "@/modules/colors/data/get-colors";
import { getFirstParam } from "@/shared/utils/params";
import { searchParamParsers } from "@/shared/utils/parse-search-params";
import { Suspense } from "react";
import { ColorsDataTable } from "@/modules/colors/components/admin/colors-data-table";
import { ColorsDataTableSkeleton } from "@/modules/colors/components/admin/colors-data-table-skeleton";
import { ColorsMobileList } from "@/modules/colors/components/admin/colors-mobile-list";
import { ColorsMobileListSkeleton } from "@/modules/colors/components/admin/colors-mobile-list-skeleton";
import dynamic from "next/dynamic";

// Lazy loading - form dialog page-level (CreateColorButton)
const ColorFormDialog = dynamic(() =>
	import("@/modules/colors/components/color-form-dialog").then((mod) => mod.ColorFormDialog),
);
import { ColorsAdminDialogs } from "./_components/colors-admin-dialogs";
import { RefreshColorsButton } from "@/modules/colors/components/admin/refresh-colors-button";
import { ToolbarSkeleton } from "@/shared/components/toolbar-skeleton";
import { type Metadata } from "next";
import { ResultCountLiveRegion } from "@/shared/components/result-count-live-region";
import { ADMIN_LIST_GROUP_CLASS } from "@/shared/components/admin-list-pending.styles";
import { cn } from "@/shared/utils/cn";
import { assertAdminPage } from "@/modules/admin-auth/lib/assert-admin-page";

export const metadata: Metadata = {
	title: "Couleurs - Administration",
	description: "Gérer les couleurs",
};

type ColorsAdminPageProps = {
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function ColorsAdminPage({ searchParams }: ColorsAdminPageProps) {
	await assertAdminPage();

	const params = await searchParams;

	const cursor = getFirstParam(params.cursor);
	const direction = (getFirstParam(params.direction) ?? "forward") as "forward" | "backward";
	const perPage = Number(getFirstParam(params.perPage)) || DEFAULT_PER_PAGE;
	// Repli sur le tri par défaut plutôt qu'un cast aveugle : un `?sortBy=bogus`
	// faisait échouer le safeParse de getColors → liste VIDE sans message.
	const rawSortBy = getFirstParam(params.sortBy);
	const sortBy = (
		rawSortBy && rawSortBy in SORT_LABELS ? rawSortBy : "name-ascending"
	) as keyof typeof SORT_LABELS;
	const search = searchParamParsers.search(params.search);

	// Schéma lean : plus de filtre de statut sur Color
	const filters = {};

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
				actions={<CreateTaxonomyButton kind="color" />}
				className="hidden md:block"
			/>

			<div className={cn(ADMIN_LIST_GROUP_CLASS, "space-y-6")}>
				<Suspense fallback={null}>
					<ResultCountLiveRegion
						totalCount={colorsPromise.then((d) => d.totalCount)}
						query={search}
						singular="couleur"
						plural="couleurs"
					/>
				</Suspense>

				<TaxonomyBottomBar kind="color" />

				<Suspense
					fallback={<ToolbarSkeleton selectCount={1} buttonCount={2} className="hidden md:flex" />}
				>
					<Toolbar
						className="hidden md:flex"
						ariaLabel="Barre d'outils de gestion des couleurs"
						search={
							<SearchInput
								size="sm"
								paramName="search"
								placeholder="Rechercher par nom, slug ou hex…"
								aria-label="Rechercher une couleur par nom, slug ou code hex"
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
							<FilterTriggerButton />
							<RefreshColorsButton />
						</ButtonGroup>
					</Toolbar>

					{/* Badges de filtres actifs (visible mobile + desktop) */}
					<TaxonomyFilterBadges kind="color" />
				</Suspense>

				{/* Sort badge mobile (visible si sortBy URL défini) */}
				<TaxonomySortBadge kind="color" />

				{/* Liste mobile */}
				<Suspense
					fallback={
						<ColorsMobileListSkeleton
							hasActiveFilters={
								!!search || Object.keys(params).some((key) => key.startsWith("filter_"))
							}
						/>
					}
				>
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
					<ColorsDataTable
						colorsPromise={colorsPromise}
						perPage={perPage}
						hasActiveFilters={
							!!search || Object.keys(params).some((key) => key.startsWith("filter_"))
						}
					/>
				</Suspense>
			</div>

			<ColorFormDialog />
			{/* Dialogs des actions long-press / row-actions (delete) */}
			<ColorsAdminDialogs />
		</>
	);
}
