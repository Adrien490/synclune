import { Stagger } from "@/shared/components/animations";
import { CursorPagination } from "@/shared/components/cursor-pagination";
import { Button } from "@/shared/components/ui/button";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/shared/components/ui/empty";
import { GetCollectionsReturn } from "@/modules/collections/data/get-collections";
import { Gem } from "lucide-react";
import Link from "next/link";
import { use } from "react";
import { CollectionCard } from "@/modules/collections/components/collection-card";

interface CollectionGridProps {
	collectionsPromise: Promise<GetCollectionsReturn>;
	perPage: number;
}

export function CollectionGrid({
	collectionsPromise,
	perPage,
}: CollectionGridProps) {
	const { collections, pagination } = use(collectionsPromise);

	// Afficher le composant Empty si aucune collection
	if (!collections || collections.length === 0) {
		return (
			<Empty role="status" aria-live="polite">
				<EmptyHeader>
					<EmptyMedia>
						<Gem className="size-6" />
					</EmptyMedia>
					<EmptyTitle>Aucune collection disponible</EmptyTitle>
					<EmptyDescription>
						Les collections arrivent bientôt !
					</EmptyDescription>
				</EmptyHeader>
				<EmptyContent>
					<Button asChild variant="primary" size="lg">
						<Link href="/produits">Découvrir la boutique</Link>
					</Button>
				</EmptyContent>
			</Empty>
		);
	}

	const { nextCursor, prevCursor, hasNextPage, hasPreviousPage } = pagination;

	return (
		<div className="space-y-8">
			{/* Compteur de résultats */}
			<p className="text-sm text-muted-foreground">
				{collections.length} collection{collections.length > 1 ? "s" : ""}
			</p>

			{/* Grille des collections */}
			<Stagger
				role="list"
				aria-label="Liste des collections"
				className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6 lg:gap-8"
				stagger={0.05}
				delay={0.1}
			>
				{collections.map((collection, index) => (
					<div key={collection.id} role="listitem">
						<CollectionCard
							slug={collection.slug}
							name={collection.name}
							description={collection.description}
							imageUrl={collection.products[0]?.product?.skus[0]?.images[0]?.url || null}
							showDescription={true}
							index={index}
						/>
					</div>
				))}
			</Stagger>

			{/* Pagination */}
			<div className="flex justify-end">
				<CursorPagination
					perPage={perPage}
					hasNextPage={hasNextPage}
					hasPreviousPage={hasPreviousPage}
					currentPageSize={collections.length}
					nextCursor={nextCursor}
					prevCursor={prevCursor}
				/>
			</div>
		</div>
	);
}
