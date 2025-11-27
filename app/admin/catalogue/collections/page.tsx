import { DEFAULT_PER_PAGE } from "@/shared/components/cursor-pagination/pagination";
import { DataTableToolbar } from "@/shared/components/data-table-toolbar";
import { PageHeader } from "@/shared/components/page-header";
import { SearchForm } from "@/shared/components/search-form";
import { SelectFilter } from "@/shared/components/select-filter";
import {
	getCollections,
	SORT_LABELS,
} from "@/modules/collections/data/get-collections";
import { getCollectionCountsByStatus } from "@/modules/collections/data/get-collection-counts-by-status";
import { getFirstParam } from "@/shared/utils/params";
import { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { BulkDeleteCollectionsAlertDialog } from "@/modules/collections/components/admin/bulk-delete-collections-alert-dialog";
import { CollectionFormDialog } from "@/modules/collections/components/admin/collection-form-dialog";
import { CollectionsDataTable } from "@/modules/collections/components/admin/collections-data-table";
import { CollectionsDataTableSkeleton } from "@/modules/collections/components/admin/collections-data-table-skeleton";
import { CollectionsFilterBadges } from "@/modules/collections/components/admin/collections-filter-badges";
import { CollectionsFilterSheet } from "@/modules/collections/components/admin/collections-filter-sheet";
import { CollectionStatusNavigation } from "@/modules/collections/components/admin/collection-status-navigation";
import { CreateCollectionButton } from "@/modules/collections/components/admin/create-collection-button";
import { DeleteCollectionAlertDialog } from "@/modules/collections/components/admin/delete-collection-alert-dialog";
import { ArchiveCollectionAlertDialog } from "@/modules/collections/components/admin/archive-collection-alert-dialog";
import { BulkArchiveCollectionsAlertDialog } from "@/modules/collections/components/admin/bulk-archive-collections-alert-dialog";
import { ChangeCollectionStatusAlertDialog } from "@/modules/collections/components/admin/change-collection-status-alert-dialog";
import { RefreshCollectionsButton } from "@/modules/collections/components/admin/refresh-collections-button";
import { parseFilters, parseStatus } from "./_utils/params";

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

export default async function CollectionsAdminPage({
	searchParams,
}: CollectionsAdminPageProps) {
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
		| "created-ascending"
		| "created-descending"
		| "products-ascending"
		| "products-descending";
	const search = getFirstParam(params.search);
	const status = parseStatus(params);

	const collectionCounts = await getCollectionCountsByStatus();

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

			<PageHeader
				variant="compact"
				title="Collections"
				description="Gérez vos collections de bijoux"
				actions={<CreateCollectionButton />}
			/>

			<div className="space-y-6">
				{/* Onglets de statut */}
				<CollectionStatusNavigation
					currentStatus={status}
					searchParams={params}
					counts={collectionCounts}
				/>

				<DataTableToolbar ariaLabel="Barre d'outils de gestion des collections">
					<div className="flex-1 w-full sm:max-w-md min-w-0">
						<SearchForm
							paramName="search"
							placeholder="Rechercher par nom, slug, description..."
							ariaLabel="Rechercher une collection par nom, slug ou description"
							className="w-full"
						/>
					</div>

					<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
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
						<CollectionsFilterSheet />
						<RefreshCollectionsButton />
					</div>
				</DataTableToolbar>

				{/* Badges de filtres actifs */}
				<CollectionsFilterBadges />

				<Suspense fallback={<CollectionsDataTableSkeleton />}>
					<CollectionsDataTable collectionsPromise={collectionsPromise} />
				</Suspense>
			</div>
		</>
	);
}
