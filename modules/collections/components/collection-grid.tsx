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
import { type GetCollectionsReturn } from "@/modules/collections/data/get-collections";
import {
	extractCollectionImages,
	extractPriceRange,
} from "@/modules/collections/utils/collection-images.utils";
import { Gem } from "lucide-react";
import Link from "next/link";
import { use } from "react";
import { CollectionCard } from "@/modules/collections/components/collection-card";
import { SITE_URL } from "@/shared/constants/seo-config";
import { safeJsonLd } from "@/shared/utils/safe-json-ld";

interface CollectionGridProps {
	collectionsPromise: Promise<GetCollectionsReturn>;
	perPage: number;
}

export function CollectionGrid({ collectionsPromise, perPage }: CollectionGridProps) {
	const { collections, pagination } = use(collectionsPromise);

	// Afficher le composant Empty si aucune collection
	if (collections.length === 0) {
		return (
			<Empty role="status" aria-live="polite" className="mt-4 mb-12 sm:my-12">
				<EmptyHeader>
					<EmptyMedia variant="icon">
						<Gem className="size-6" />
					</EmptyMedia>
					<EmptyTitle>Aucune collection disponible</EmptyTitle>
					<EmptyDescription>Aucune collection disponible pour le moment.</EmptyDescription>
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

	const itemListJsonLd = {
		"@context": "https://schema.org",
		"@type": "ItemList",
		numberOfItems: collections.length,
		itemListElement: collections.map((collection, index) => {
			const priceRange = extractPriceRange(collection.products);
			const featuredImage = extractCollectionImages(collection.products)[0];
			const productCount = collection._count.products;
			const collectionUrl = `${SITE_URL}/collections/${collection.slug}`;
			return {
				"@type": "ListItem",
				position: index + 1,
				url: collectionUrl,
				item: {
					"@type": "CollectionPage",
					name: collection.name,
					url: collectionUrl,
					...(collection.description && { description: collection.description }),
					...(featuredImage && { image: featuredImage.url }),
					...(priceRange && {
						offers: {
							"@type": "AggregateOffer",
							priceCurrency: "EUR",
							lowPrice: (priceRange.min / 100).toFixed(2),
							highPrice: (priceRange.max / 100).toFixed(2),
							offerCount: productCount,
							availability:
								productCount > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
						},
					}),
				},
			};
		}),
	};

	return (
		<div className="space-y-8">
			{/* SAFE: serialized via safeJsonLd (no user HTML) */}
			{/* react-doctor-disable-next-line react/no-danger */}
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{
					__html: safeJsonLd(itemListJsonLd),
				}}
			/>

			{/* Grille des collections */}
			<Stagger
				role="list"
				aria-label="Liste des collections"
				className="xs:grid-cols-2 grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3 lg:gap-8 xl:grid-cols-4"
				stagger={0.05}
				delay={0.1}
			>
				{collections.map((collection, index) => {
					return (
						<div key={collection.id} role="listitem">
							<CollectionCard
								slug={collection.slug}
								name={collection.name}
								images={extractCollectionImages(collection.products)}
								index={index}
								headingLevel="h2"
								productCount={collection._count.products}
								description={collection.description}
								priceRange={extractPriceRange(collection.products)}
							/>
						</div>
					);
				})}
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
