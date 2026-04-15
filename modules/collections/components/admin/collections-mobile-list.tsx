import { use } from "react";
import { CollectionStatus } from "@/app/generated/prisma/client";
import { FolderOpen } from "lucide-react";
import Link from "next/link";
import { CursorPagination } from "@/shared/components/cursor-pagination";
import { TableEmptyState } from "@/shared/components/data-table/table-empty-state";
import {
	Item,
	ItemActions,
	ItemContent,
	ItemDescription,
	ItemGroup,
	ItemTitle,
} from "@/shared/components/ui/item";
import { Badge } from "@/shared/components/ui/badge";
import type { GetCollectionsReturn } from "@/modules/collections/data/get-collections";
import { CollectionRowActions } from "./collection-row-actions";
import { CollectionsSelectionToolbar } from "./collections-selection-toolbar";
import { CreateCollectionButton } from "./create-collection-button";

interface CollectionsMobileListProps {
	collectionsPromise: Promise<GetCollectionsReturn>;
	perPage: number;
}

const STATUS_CONFIG: Record<
	CollectionStatus,
	{ label: string; variant: "default" | "secondary" | "outline" }
> = {
	[CollectionStatus.PUBLIC]: { label: "Public", variant: "default" },
	[CollectionStatus.DRAFT]: { label: "Brouillon", variant: "secondary" },
	[CollectionStatus.ARCHIVED]: { label: "Archive", variant: "outline" },
};

export function CollectionsMobileList({ collectionsPromise, perPage }: CollectionsMobileListProps) {
	const { collections, pagination } = use(collectionsPromise);
	const collectionsData = collections.map((collection) => ({
		id: collection.id,
		name: collection.name,
		status: collection.status,
		productsCount: collection._count.products,
	}));

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
		<div className="space-y-4 pb-20 md:hidden md:pb-0">
			<CollectionsSelectionToolbar collections={collectionsData} />

			<ItemGroup aria-label="Collections" className="gap-2">
				{collections.map((collection) => {
					const productsCount = collection._count.products || 0;
					const statusConfig = STATUS_CONFIG[collection.status];

					return (
						<div key={collection.id} role="listitem">
							<Item
								variant="outline"
								size="sm"
								className="gap-3"
								aria-roledescription="carte collection"
							>
								<ItemContent className="min-w-0">
									<ItemTitle>
										<Link
											href={`/admin/catalogue/collections/${collection.slug}`}
											className="truncate font-semibold hover:underline"
										>
											{collection.name}
										</Link>
										<Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
									</ItemTitle>
									<ItemDescription className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
										<span>
											{productsCount} produit{productsCount !== 1 ? "s" : ""}
										</span>
									</ItemDescription>
								</ItemContent>
								<ItemActions>
									<CollectionRowActions
										collectionId={collection.id}
										collectionName={collection.name}
										collectionSlug={collection.slug}
										collectionDescription={collection.description}
										collectionStatus={collection.status}
										productsCount={productsCount}
									/>
								</ItemActions>
							</Item>
						</div>
					);
				})}
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
