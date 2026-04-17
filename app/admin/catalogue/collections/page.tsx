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
import { CollectionStatusNavigation } from "@/modules/collections/components/admin/collection-status-navigation";
import { CreateCollectionButton } from "@/modules/collections/components/admin/create-collection-button";
import { RefreshCollectionsButton } from "@/modules/collections/components/admin/refresh-collections-button";
import { ToolbarSkeleton } from "@/shared/components/toolbar-skeleton";
import { parseFilters, parseStatus } from "./_utils/params";

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
const DeleteCollectionAlertDialog = dynamic(() =>
	import("@/modules/collections/components/admin/delete-collection-alert-dialog").then(
		(mod) => mod.DeleteCollectionAlertDialog,
	),
);
const BulkDeleteCollectionsAlertDialog = dynamic(() =>
	import("@/modules/collections/components/admin/bulk-delete-collections-alert-dialog").then(
		(mod) => mod.BulkDeleteCollectionsAlertDialog,
	),
);
const ArchiveCollectionAlertDialog = dynamic(() =>
	import("@/modules/collections/components/admin/archive-collection-alert-dialog").then(
		(mod) => mod.ArchiveCollectionAlertDialog,
	),
);
const BulkArchiveCollectionsAlertDialog = dynamic(() =>
	import("@/modules/collections/components/admin/bulk-archive-collections-alert-dialog").then(
		(mod) => mod.BulkArchiveCollectionsAlertDialog,
	),
);
const ChangeCollectionStatusAlertDialog = dynamic(() =>
	import("@/modules/collections/components/admin/change-collection-status-alert-dialog").then(
		(mod) => mod.ChangeCollectionStatusAlertDialog,
	),
);
const CollectionItemDrawer = dynamic(() =>
	import("@/modules/collections/components/admin/collection-item-drawer").then(
		(mod) => mod.CollectionItemDrawer,
	),
);

type CollectionFiltersSearchParams = {
	filter_hasProducts?: string;
};

export type CollectionsSearchParams = {
	cursor?: string;
	direction?: "forward" | "backward";
	perPage?: string;
	sortBy?: string;
	search?: string;
	status?: string;
} & CollectionFiltersSearchParams;

export type ParsedCollectionFilters = {
	hasProducts?: boolean;
};

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
	const status = parseStatus(params);

	// La promise de collections n'est PAS awaitée pour permettre le streaming
	const collectionsPromise = getCollections({
		cursor,
		direction,
		perPage,
		sortBy,
		search,
		filters: parseFilters(params),
	});

	return (
		<>
			<CollectionFormDialog />
			<DeleteCollectionAlertDialog />
			<BulkDeleteCollectionsAlertDialog />
			<ArchiveCollectionAlertDialog />
			<BulkArchiveCollectionsAlertDialog />
			<ChangeCollectionStatusAlertDialog />
			<CollectionItemDrawer />

			<PageHeader
				variant="compact"
				title="Collections"
				actions={<CreateCollectionButton />}
				className="hidden md:block"
			/>

			<div className="space-y-6">
				<CollectionsBottomBar />

				{/* Onglets de statut */}
				<div className="hidden md:block">
					<CollectionStatusNavigation currentStatus={status} searchParams={params} />
				</div>

				<Suspense
					fallback={<ToolbarSkeleton selectCount={1} buttonCount={2} className="hidden md:flex" />}
				>
					<Toolbar
						className="hidden md:flex"
						ariaLabel="Barre d'outils de gestion des collections"
						search={
							<SearchInput
								mode="live"
								size="sm"
								paramName="search"
								placeholder="Rechercher par nom, slug, description..."
								ariaLabel="Rechercher une collection par nom, slug ou description"
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

					{/* Badges de filtres actifs */}
					<div className="hidden md:block">
						<CollectionsFilterBadges />
					</div>
				</Suspense>

				{/* Liste mobile */}
				<Suspense fallback={<CollectionsMobileListSkeleton />}>
					<CollectionsMobileList collectionsPromise={collectionsPromise} perPage={perPage} />
				</Suspense>

				{/* DataTable desktop */}
				<Suspense fallback={<CollectionsDataTableSkeleton />}>
					<CollectionsDataTable collectionsPromise={collectionsPromise} perPage={perPage} />
				</Suspense>
			</div>
		</>
	);
}
