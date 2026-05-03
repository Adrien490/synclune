import { use } from "react";
import { FolderOpen } from "lucide-react";

import { CursorPagination } from "@/shared/components/cursor-pagination";
import { TableEmptyState } from "@/shared/components/data-table/table-empty-state";
import { ItemGroup } from "@/shared/components/ui/item";

import type { GetCollectionsReturn } from "@/modules/collections/data/get-collections";
import { CreateCollectionButton } from "./create-collection-button";
import { CollectionMobileItem } from "./collection-mobile-item";

interface CollectionsMobileListProps {
	collectionsPromise: Promise<GetCollectionsReturn>;
	perPage: number;
}

export function CollectionsMobileList({ collectionsPromise, perPage }: CollectionsMobileListProps) {
	const { collections, pagination } = use(collectionsPromise);

	if (collections.length === 0) {
		return (
			<div className="md:hidden">
				<TableEmptyState
					icon={FolderOpen}
					title="Aucune collection trouvee"
					description="Aucune collection ne correspond aux criteres de recherche."
					actionElement={<CreateCollectionButton />}
				/>
			</div>
		);
	}

	return (
		<div className="space-y-4 pb-[calc(var(--bottom-bar-height,5rem)+1rem)] md:hidden md:pb-0">
			<ItemGroup aria-label="Collections" className="gap-2">
				{collections.map((collection) => (
					<div key={collection.id} role="listitem">
						<CollectionMobileItem collection={collection} />
					</div>
				))}
			</ItemGroup>

			<CursorPagination
				perPage={perPage}
				hasNextPage={pagination.hasNextPage}
				hasPreviousPage={pagination.hasPreviousPage}
				currentPageSize={collections.length}
				nextCursor={pagination.nextCursor}
				prevCursor={pagination.prevCursor}
			/>
		</div>
	);
}
