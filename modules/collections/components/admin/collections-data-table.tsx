import { PublicationStatus } from "@/app/generated/prisma/client";
import { AdminDataTable, TableEmptyState } from "@/shared/components/data-table";
import { Badge } from "@/shared/components/ui/badge";
import {
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/shared/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/components/ui/tooltip";
import type { GetCollectionsReturn } from "@/modules/collections/data/get-collections";
import {
	ArchiveIcon,
	FolderOpenIcon,
	GlobeIcon,
	NotePencilIcon,
	WarningIcon,
} from "@phosphor-icons/react/ssr";
import type { Icon } from "@phosphor-icons/react";
import Link from "next/link";
import { CollectionRowActions } from "./collection-row-actions";
import { CreateCollectionButton } from "./create-collection-button";

// Labels, icônes et styles pour les badges de statut
const STATUS_CONFIG: Record<
	PublicationStatus,
	{
		label: string;
		variant: "default" | "secondary" | "destructive" | "outline";
		Icon: Icon;
	}
> = {
	[PublicationStatus.PUBLIC]: { label: "Public", variant: "default", Icon: GlobeIcon },
	[PublicationStatus.DRAFT]: { label: "Brouillon", variant: "secondary", Icon: NotePencilIcon },
	[PublicationStatus.ARCHIVED]: { label: "Archivé", variant: "outline", Icon: ArchiveIcon },
};

// Helper pour tronquer la description
const truncateDescription = (description: string | null, maxLength = 100) => {
	if (!description) return "—";
	if (description.length <= maxLength) return description;
	return `${description.substring(0, maxLength)}...`;
};

interface CollectionsDataTableProps {
	collectionsPromise: Promise<GetCollectionsReturn>;
	perPage: number;
	hasActiveFilters?: boolean;
}

export async function CollectionsDataTable({
	collectionsPromise,
	perPage,
	hasActiveFilters,
}: CollectionsDataTableProps) {
	const { collections, pagination, totalCount } = await collectionsPromise;

	if (collections.length === 0) {
		return (
			<TableEmptyState
				className="hidden md:flex"
				icon={FolderOpenIcon}
				title="Aucune collection trouvée"
				description="Aucune collection ne correspond aux critères de recherche."
				noItemsDescription="Aucune collection pour l'instant."
				hasActiveFilters={hasActiveFilters}
				resetFiltersHref="/admin/catalogue/collections"
				actionElement={<CreateCollectionButton />}
			/>
		);
	}

	return (
		<AdminDataTable
			caption="Liste des collections"
			pagination={{
				perPage,
				hasNextPage: pagination.hasNextPage,
				hasPreviousPage: pagination.hasPreviousPage,
				currentPageSize: collections.length,
				nextCursor: pagination.nextCursor,
				prevCursor: pagination.prevCursor,
				totalCount,
			}}
		>
			<TableHeader>
				<TableRow>
					<TableHead className="w-[30%]">Nom</TableHead>
					<TableHead className="w-[14%]">Statut</TableHead>
					<TableHead className="w-[32%]">Description</TableHead>
					<TableHead className="w-[12%] text-center">Produits</TableHead>
					<TableHead
						className="w-[12%] text-right"
						aria-label="Actions disponibles pour chaque collection"
					>
						Actions
					</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{collections.map((collection) => {
					const productsCount = collection._count.products || 0;
					const truncatedDescription = truncateDescription(collection.description);

					return (
						<TableRow key={collection.id}>
							<TableCell>
								<div className="flex items-center gap-2 overflow-hidden">
									<Link
										href={`/admin/catalogue/collections/${collection.slug}`}
										className="text-foreground truncate font-semibold hover:underline"
										title={collection.name}
									>
										{collection.name}
									</Link>
								</div>
							</TableCell>
							<TableCell>
								<div className="flex items-center gap-2">
									{(() => {
										const { label, variant, Icon } = STATUS_CONFIG[collection.status];
										return (
											<Badge variant={variant} role="status" aria-label={`Statut : ${label}`}>
												<Icon aria-hidden="true" />
												{label}
											</Badge>
										);
									})()}
									{/* Warning si PUBLIC mais aucun produit visible */}
									{collection.status === PublicationStatus.PUBLIC && productsCount === 0 && (
										<Tooltip>
											<TooltipTrigger render={<span className="text-amber-500" />}>
												<WarningIcon className="size-4" />
											</TooltipTrigger>
											<TooltipContent>
												<p>Aucun produit visible en boutique</p>
											</TooltipContent>
										</Tooltip>
									)}
								</div>
							</TableCell>
							<TableCell>
								<div className="overflow-hidden">
									<span
										className="text-muted-foreground block truncate text-sm"
										title={collection.description ?? "—"}
									>
										{truncatedDescription}
									</span>
								</div>
							</TableCell>
							<TableCell className="text-center">
								<span className="text-sm font-medium">{productsCount}</span>
							</TableCell>
							<TableCell>
								<div className="flex justify-end">
									<CollectionRowActions
										collectionId={collection.id}
										collectionName={collection.name}
										collectionSlug={collection.slug}
										collectionDescription={collection.description}
										collectionStatus={collection.status}
										productsCount={productsCount}
									/>
								</div>
							</TableCell>
						</TableRow>
					);
				})}
			</TableBody>
		</AdminDataTable>
	);
}
