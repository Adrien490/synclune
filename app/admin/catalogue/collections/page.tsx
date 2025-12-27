import { DEFAULT_PER_PAGE } from "@/shared/components/cursor-pagination/pagination";
import { Toolbar } from "@/shared/components/toolbar";
import { PageHeader } from "@/shared/components/page-header";
import { SearchInput } from "@/shared/components/search-input";
import { SelectFilter } from "@/shared/components/select-filter";
import {
	getCollections,
	SORT_LABELS,
} from "@/modules/collections/data/get-collections";
import { getFirstParam } from "@/shared/utils/params";
import { Metadata } from "next";
import { Suspense } from "react";
import dynamic from "next/dynamic";
import { AlertDialogSkeleton, AdminDialogSkeleton } from "@/shared/components/skeletons/lazy-loading";
import { CollectionsDataTable } from "@/modules/collections/components/admin/collections-data-table";
import { CollectionsDataTableSkeleton } from "@/modules/collections/components/admin/collections-data-table-skeleton";
import { CollectionsFilterBadges } from "@/modules/collections/components/admin/collections-filter-badges";
import { CollectionsFilterSheet } from "@/modules/collections/components/admin/collections-filter-sheet";
import { CollectionStatusNavigation } from "@/modules/collections/components/admin/collection-status-navigation";
import { CreateCollectionButton } from "@/modules/collections/components/admin/create-collection-button";
import { RefreshCollectionsButton } from "@/modules/collections/components/admin/refresh-collections-button";
import { parseFilters, parseStatus } from "./_utils/params";

// Lazy loading - dialogs charges uniquement a l'ouverture
const CollectionFormDialog = dynamic(
	() => import("@/modules/collections/components/admin/collection-form-dialog").then((mod) => mod.CollectionFormDialog),
	{ loading: () => <AdminDialogSkeleton /> }
);
const DeleteCollectionAlertDialog = dynamic(
	() => import("@/modules/collections/components/admin/delete-collection-alert-dialog").then((mod) => mod.DeleteCollectionAlertDialog),
	{ loading: () => <AlertDialogSkeleton /> }
);
const BulkDeleteCollectionsAlertDialog = dynamic(
	() => import("@/modules/collections/components/admin/bulk-delete-collections-alert-dialog").then((mod) => mod.BulkDeleteCollectionsAlertDialog),
	{ loading: () => <AlertDialogSkeleton /> }
);
const ArchiveCollectionAlertDialog = dynamic(
	() => import("@/modules/collections/components/admin/archive-collection-alert-dialog").then((mod) => mod.ArchiveCollectionAlertDialog),
	{ loading: () => <AlertDialogSkeleton /> }
);
const BulkArchiveCollectionsAlertDialog = dynamic(
	() => import("@/modules/collections/components/admin/bulk-archive-collections-alert-dialog").then((mod) => mod.BulkArchiveCollectionsAlertDialog),
	{ loading: () => <AlertDialogSkeleton /> }
);
const ChangeCollectionStatusAlertDialog = dynamic(
	() => import("@/modules/collections/components/admin/change-collection-status-alert-dialog").then((mod) => mod.ChangeCollectionStatusAlertDialog),
	{ loading: () => <AlertDialogSkeleton /> }
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

export default async function CollectionsAdminPage({
	searchParams,
}: CollectionsAdminPageProps) {
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

			<PageHeader
				variant="compact"
				title="Collections"
				actions={<CreateCollectionButton />}
			/>

			<div className="space-y-6">
				{/* Onglets de statut */}
				<CollectionStatusNavigation
					currentStatus={status}
					searchParams={params}
				/>

				<Toolbar
					ariaLabel="Barre d'outils de gestion des collections"
					search={
						<SearchInput mode="live" size="sm"
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
						className="w-full sm:min-w-[180px]"
						noPrefix
					/>
					<CollectionsFilterSheet />
					<RefreshCollectionsButton />
				</Toolbar>

				{/* Badges de filtres actifs */}
				<CollectionsFilterBadges />

				<Suspense fallback={<CollectionsDataTableSkeleton />}>
					<CollectionsDataTable collectionsPromise={collectionsPromise} perPage={perPage} />
				</Suspense>
			</div>
		</>
	);
}
