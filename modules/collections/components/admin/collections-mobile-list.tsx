import { use } from "react";
import { FolderOpenIcon } from "@phosphor-icons/react/ssr";

import { AdminListLiveCount } from "@/shared/components/admin-list-live-count";
import { AdminMobileListPagination } from "@/shared/components/cursor-pagination";
import { EmptyResetFiltersAction } from "@/shared/components/data-table/empty-reset-filters-action";
import { TableEmptyState } from "@/shared/components/data-table/table-empty-state";
import { ItemGroup } from "@/shared/components/ui/item";

import type { GetCollectionsReturn } from "@/modules/collections/data/get-collections";
import { CreateCollectionButton } from "./create-collection-button";
import { CollectionMobileItem } from "./collection-mobile-item";
import { ADMIN_LIST_PENDING_CLASS } from "@/shared/components/admin-list-pending.styles";
import { cn } from "@/shared/utils/cn";

interface CollectionsMobileListProps {
	collectionsPromise: Promise<GetCollectionsReturn>;
	perPage: number;
	hasActiveFilters?: boolean;
}

export function CollectionsMobileList({
	collectionsPromise,
	perPage,
	hasActiveFilters,
}: CollectionsMobileListProps) {
	const { collections, pagination, totalCount } = use(collectionsPromise);

	if (collections.length === 0) {
		return (
			<div className={cn(ADMIN_LIST_PENDING_CLASS, "md:hidden")}>
				<TableEmptyState
					icon={FolderOpenIcon}
					title="Aucune collection trouvée"
					description={
						hasActiveFilters
							? "Aucune collection ne correspond aux critères de recherche."
							: "Aucune vitrine à composer pour l'instant."
					}
					actionElement={
						hasActiveFilters ? (
							<EmptyResetFiltersAction href="/admin/catalogue/collections" />
						) : (
							<CreateCollectionButton />
						)
					}
				/>
			</div>
		);
	}

	return (
		<div
			className={cn(
				ADMIN_LIST_PENDING_CLASS,
				"space-y-4 overscroll-contain pb-[calc(var(--bottom-bar-height,56px)+1rem)] md:hidden md:pb-0",
			)}
		>
			<AdminListLiveCount
				count={collections.length}
				singular="collection"
				plural="collections"
				totalCount={totalCount}
			/>
			<ItemGroup aria-label="Collections" className="gap-2">
				{collections.map((collection, index) => (
					<li key={collection.id}>
						<CollectionMobileItem collection={collection} preload={index === 0} />
					</li>
				))}
			</ItemGroup>

			<AdminMobileListPagination
				perPage={perPage}
				hasNextPage={pagination.hasNextPage}
				hasPreviousPage={pagination.hasPreviousPage}
				currentPageSize={collections.length}
				nextCursor={pagination.nextCursor}
				prevCursor={pagination.prevCursor}
				totalCount={totalCount}
			/>
		</div>
	);
}
