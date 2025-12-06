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
			<Empty className="my-12">
				<EmptyHeader>
					<EmptyMedia variant="icon">
						<Gem className="size-6" />
					</EmptyMedia>
					<EmptyTitle>Aucune collection disponible</EmptyTitle>
					<EmptyDescription>
						Nos collections arrivent bientôt. Découvrez dès maintenant nos
						créations uniques.
					</EmptyDescription>
				</EmptyHeader>
				<EmptyContent>
					<Button asChild variant="primary" size="lg">
						<Link href="/produits">Découvrir nos bijoux</Link>
					</Button>
				</EmptyContent>
			</Empty>
		);
	}

	const { nextCursor, prevCursor, hasNextPage, hasPreviousPage } = pagination;

	return (
		<div className="space-y-8">
			{/* Grille des collections */}
			<Stagger
				role="list"
				className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 lg:gap-8"
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
			<div className="flex justify-end mt-12">
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
