import { DEFAULT_PER_PAGE } from "@/shared/lib/pagination";
import { Toolbar } from "@/shared/components/toolbar";
import { ButtonGroup } from "@/shared/components/ui/button-group";
import { PageHeader } from "@/shared/components/page-header";
import { SearchInput } from "@/shared/components/search-input";
import { SelectFilter } from "@/shared/components/select-filter";
import { getCollections, SORT_LABELS } from "@/modules/collections/data/get-collections";
import { getFirstParam } from "@/shared/utils/params";
import { type Metadata } from "next";
import { Suspense } from "react";
import dynamic from "next/dynamic";
import { CollectionsDataTable } from "@/modules/collections/components/admin/collections-data-table";
import { CollectionsDataTableSkeleton } from "@/modules/collections/components/admin/collections-data-table-skeleton";
import { CollectionsMobileList } from "@/modules/collections/components/admin/collections-mobile-list";
import { CollectionsMobileListSkeleton } from "@/modules/collections/components/admin/collections-mobile-list-skeleton";
import { CollectionsFilterBadges } from "@/modules/collections/components/admin/collections-filter-badges";
import { CollectionsFilterSheet } from "@/modules/collections/components/admin/collections-filter-sheet";
import { CollectionsSortBadge } from "@/modules/collections/components/admin/collections-sort-badge";
import { CreateCollectionButton } from "@/modules/collections/components/admin/create-collection-button";
import { RefreshCollectionsButton } from "@/modules/collections/components/admin/refresh-collections-button";
import { CollectionsAdminDialogs } from "./_components/collections-admin-dialogs";
import { ToolbarSkeleton } from "@/shared/components/toolbar-skeleton";
import { parseFilters } from "./_utils/params";

// Lazy loading - dialogs et bottom bar charges uniquement a l'ouverture
const CollectionsBottomBar = dynamic(() =>
	import("@/modules/collections/components/admin/collections-bottom-bar").then(
		(mod) => mod.CollectionsBottomBar,
	),
);
const CollectionFormDialog = dynamic(() =>
	import("@/modules/collections/components/admin/collection-form-dialog").then(
		(mod) => mod.CollectionFormDialog,
	),
);

type CollectionFiltersSearchParams = {
	filter_hasProducts?: string;
	filter_status?: string | string[];
};

export type CollectionsSearchParams = {
	cursor?: string;
	direction?: "forward" | "backward";
	perPage?: string;
	sortBy?: string;
	search?: string;
} & CollectionFiltersSearchParams;

export const metadata: Metadata = {
	title: "Collections - Administration",
	description: "Gérer les collections",
};

type CollectionsAdminPageProps = {
	searchParams: Promise<CollectionsSearchParams>;
};

export default async function CollectionsAdminPage({ searchParams }: CollectionsAdminPageProps) {
	const params = await searchParams;

	const cursor = getFirstParam(params.cursor);
	const direction = (getFirstParam(params.direction) ?? "forward") as "forward" | "backward";
	const perPage = Number(getFirstParam(params.perPage)) || DEFAULT_PER_PAGE;
	const sortBy = (getFirstParam(params.sortBy) ?? "name-ascending") as
		| "name-ascending"
		| "name-descending"
		| "created-ascending"
		| "created-descending"
		| "products-ascending"
		| "products-descending";
	const search = getFirstParam(params.search);
	const filters = parseFilters(params);

	// La promise de collections n'est PAS awaitée pour permettre le streaming
	const collectionsPromise = getCollections({
		cursor,
		direction,
		perPage,
		sortBy,
		search,
		filters,
	});

	return (
		<>
			<CollectionFormDialog />
			{/* Dialogs des actions long-press / row-actions (delete, archive, change-status) */}
			<CollectionsAdminDialogs />

			<PageHeader
				variant="compact"
				title="Collections"
				actions={<CreateCollectionButton />}
				className="hidden md:block"
			/>

			<div className="space-y-6">
				<CollectionsBottomBar />

				<Suspense
					fallback={<ToolbarSkeleton selectCount={1} buttonCount={2} className="hidden md:flex" />}
				>
					<Toolbar
						className="hidden md:flex"
						ariaLabel="Barre d'outils de gestion des collections"
						search={
							<SearchInput
								size="sm"
								paramName="search"
								placeholder="Rechercher par nom, slug, description…"
								aria-label="Rechercher une collection par nom, slug ou description"
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
							<CollectionsFilterSheet />
							<RefreshCollectionsButton />
						</ButtonGroup>
					</Toolbar>

					{/* Badges de filtres actifs (visible mobile + desktop) */}
					<CollectionsFilterBadges />
				</Suspense>

				{/* Sort badge mobile (visible si sortBy URL défini) */}
				<CollectionsSortBadge />

				{/* Liste mobile */}
				<Suspense
					fallback={
						<CollectionsMobileListSkeleton
							hasActiveFilters={
								!!search || Object.keys(params).some((key) => key.startsWith("filter_"))
							}
						/>
					}
				>
					<CollectionsMobileList
						collectionsPromise={collectionsPromise}
						perPage={perPage}
						hasActiveFilters={
							!!search || Object.keys(params).some((key) => key.startsWith("filter_"))
						}
					/>
				</Suspense>

				{/* DataTable desktop */}
				<Suspense fallback={<CollectionsDataTableSkeleton />}>
					<CollectionsDataTable
						collectionsPromise={collectionsPromise}
						perPage={perPage}
						hasActiveFilters={
							!!search || Object.keys(params).some((key) => key.startsWith("filter_"))
						}
					/>
				</Suspense>
			</div>
		</>
	);
}
