import { CursorPagination } from "@/shared/components/cursor-pagination";
import { Card, CardContent } from "@/shared/components/ui/card";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/shared/components/ui/empty";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/shared/components/ui/table";
import type { GetCollectionsReturn } from "@/modules/collections/data/get-collections";
import { FolderOpen, Package } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { ViewTransition } from "react";
import { CollectionRowActions } from "./collection-row-actions";
import { CollectionsSelectionToolbar } from "./collections-selection-toolbar";
import { CollectionsTableSelectionCell } from "./collections-table-selection-cell";
import { CreateCollectionButton } from "./create-collection-button";

interface CollectionsDataTableProps {
	collectionsPromise: Promise<GetCollectionsReturn>;
}

export async function CollectionsDataTable({
	collectionsPromise,
}: CollectionsDataTableProps) {
	const { collections, pagination } = await collectionsPromise;
	const collectionIds = collections.map((collection) => collection.id);
	const collectionsData = collections.map((collection) => ({
		id: collection.id,
		name: collection.name,
		productsCount: collection._count.products,
	}));

	// Helper pour tronquer la description
	const truncateDescription = (description: string | null, maxLength = 100) => {
		if (!description) return "—";
		if (description.length <= maxLength) return description;
		return `${description.substring(0, maxLength)}...`;
	};

	if (collections.length === 0) {
		return (
			<Empty className="py-12">
				<EmptyHeader>
					<EmptyMedia variant="icon">
						<FolderOpen />
					</EmptyMedia>
					<EmptyTitle>Aucune collection trouvée</EmptyTitle>
					<EmptyDescription>
						Aucune collection ne correspond aux critères de recherche.
					</EmptyDescription>
				</EmptyHeader>
				<EmptyContent>
					<CreateCollectionButton />
				</EmptyContent>
			</Empty>
		);
	}

	return (
		<Card>
			<CardContent>
				<CollectionsSelectionToolbar
					collectionIds={collectionIds}
					collections={collectionsData}
				/>
				<div className="overflow-x-auto">
					<Table role="table" aria-label="Liste des collections" className="min-w-full table-fixed">
						<TableHeader>
							<TableRow>
								<TableHead key="select" scope="col" role="columnheader" className="w-[5%]">
									<CollectionsTableSelectionCell
										type="header"
										collectionIds={collectionIds}
									/>
								</TableHead>
								<TableHead
									key="image"
									scope="col"
									role="columnheader"
									className="hidden md:table-cell w-[12%]"
								>
									Image
								</TableHead>
								<TableHead
									key="name"
									scope="col"
									role="columnheader"
									className="w-[50%] sm:w-[30%]"
								>
									Nom
								</TableHead>
								<TableHead
									key="description"
									scope="col"
									role="columnheader"
									className="hidden xl:table-cell w-[30%]"
								>
									Description
								</TableHead>
								<TableHead
									key="products"
									scope="col"
									role="columnheader"
									className="hidden sm:table-cell text-center w-[15%]"
								>
									Produits
								</TableHead>
								<TableHead
									key="actions"
									scope="col"
									role="columnheader"
									className="w-[15%] sm:w-[10%] text-right"
								>
									Actions
								</TableHead>
							</TableRow>
						</TableHeader>
						<ViewTransition name="admin-collections-table-content">
							<TableBody>
								{collections.map((collection) => {
								const productsCount = collection._count?.products || 0;
								const truncatedDescription = truncateDescription(
									collection.description
								);

								return (
									<TableRow key={collection.id}>
										<TableCell role="gridcell">
											<CollectionsTableSelectionCell
												type="row"
												collectionId={collection.id}
											/>
										</TableCell>
										<TableCell
											role="gridcell"
											className="hidden md:table-cell py-3"
										>
											<div className="w-20 h-20 relative shrink-0">
												{collection.imageUrl ? (
													<Image
														src={collection.imageUrl}
														alt={collection.name}
														fill
														sizes="80px"
														className="rounded-md object-cover"
													/>
												) : (
													<div className="flex w-full h-full items-center justify-center rounded-md bg-muted">
														<Package className="h-8 w-8 text-muted-foreground" />
													</div>
												)}
											</div>
										</TableCell>
										<TableCell role="gridcell">
											<div className="overflow-hidden">
												<Link
													href={`/dashboard/collections/${collection.id}`}
													className="font-semibold text-foreground hover:underline truncate block"
													title={collection.name}
												>
													{collection.name}
												</Link>
											</div>
										</TableCell>
										<TableCell role="gridcell" className="hidden xl:table-cell">
											<div className="overflow-hidden">
												<span
													className="text-sm text-muted-foreground truncate block"
													title={collection.description || "—"}
												>
													{truncatedDescription}
												</span>
											</div>
										</TableCell>
										<TableCell
											role="gridcell"
											className="hidden sm:table-cell text-center"
										>
											<span className="text-sm font-medium">
												{productsCount}
											</span>
										</TableCell>
										<TableCell role="gridcell">
											<div className="flex justify-end">
												<CollectionRowActions
													collectionId={collection.id}
													collectionName={collection.name}
													collectionSlug={collection.slug}
													collectionDescription={collection.description}
													collectionImageUrl={collection.imageUrl}
													productsCount={productsCount}
												/>
											</div>
										</TableCell>
									</TableRow>
								);
								})}
							</TableBody>
						</ViewTransition>
					</Table>
				</div>

				<div className="mt-4">
					<CursorPagination
						perPage={collections.length}
						hasNextPage={pagination.hasNextPage}
						hasPreviousPage={pagination.hasPreviousPage}
						currentPageSize={collections.length}
						nextCursor={pagination.nextCursor}
						prevCursor={pagination.prevCursor}
					/>
				</div>
			</CardContent>
		</Card>
	);
}
