import { Stagger } from "@/shared/components/animations";
import { CursorPagination } from "@/shared/components/cursor-pagination";
import { PUBLIC_PER_PAGE_OPTIONS } from "@/shared/lib/pagination";
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
import { getCollectionPriceRanges } from "@/modules/collections/data/get-collection-price-ranges";
import { extractCollectionImages } from "@/modules/collections/utils/collection-images.utils";
import { getOfferAvailability } from "@/shared/utils/offer-availability";
import { FlowerIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { CollectionCard } from "@/modules/collections/components/collection-card";
import { SITE_URL } from "@/shared/constants/seo-config";
import { safeJsonLd } from "@/shared/utils/safe-json-ld";

interface CollectionGridProps {
	collectionsPromise: Promise<GetCollectionsReturn>;
	perPage: number;
}

export async function CollectionGrid({ collectionsPromise, perPage }: CollectionGridProps) {
	const { collections, pagination, totalCount } = await collectionsPromise;

	// Afficher le composant Empty si aucune collection
	if (collections.length === 0) {
		return (
			<Empty role="status" aria-live="polite" className="mt-4 mb-12 sm:my-12">
				<EmptyHeader>
					<EmptyMedia variant="icon">
						<FlowerIcon className="size-6" />
					</EmptyMedia>
					<EmptyTitle>Aucune collection disponible</EmptyTitle>
					<EmptyDescription>Aucune collection disponible pour le moment.</EmptyDescription>
				</EmptyHeader>
				<EmptyContent>
					<Button render={<Link href="/produits" />} variant="primary" size="lg">
						Découvrir la boutique
					</Button>
				</EmptyContent>
			</Empty>
		);
	}

	const { nextCursor, prevCursor, hasNextPage, hasPreviousPage } = pagination;

	// Fourchettes de prix exactes (tous les produits publiés, tous les SKUs actifs) :
	// le payload de la liste ne porte que 4 produits × leur SKU par défaut, il ne
	// peut pas fonder un « À partir de ». Cf. get-collection-price-ranges.ts.
	const priceRanges = await getCollectionPriceRanges(collections.map((c) => c.id));

	// Une seule dérivation par collection : images et prix étaient recalculés deux
	// fois par item (une passe JSON-LD, une passe rendu).
	const cards = collections.map((collection) => ({
		collection,
		images: extractCollectionImages(collection.products),
		priceRange: priceRanges[collection.id],
	}));

	const itemListJsonLd = {
		"@context": "https://schema.org",
		"@type": "ItemList",
		numberOfItems: collections.length,
		itemListElement: cards.map(({ collection, images, priceRange }, index) => {
			const featuredImage = images[0];
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
							availability: getOfferAvailability(productCount > 0),
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

			{/* Grille des collections.
			 *
			 * Plafonnée à 3 colonnes, et le palier arrive à `md` — deux corrections du
			 * même audit (CollectionCard 2026-08-04), aux deux extrémités :
			 *
			 * - `xl:grid-cols-4` AJOUTAIT une colonne alors que le conteneur
			 *   (`max-w-6xl`) ne grandit plus au-delà de 1152px : les cartes tombaient
			 *   de 341px à 248px (−27%). Même anti-pattern que le `2xl:grid-cols-5`
			 *   retiré de la grille produit, cf. docs/UI-CONVENTIONS.md.
			 * - il n'y avait AUCUN palier entre 375 et 1024px : à 1023px les cartes
			 *   faisaient 475px de large, hors du rythme du reste du site.
			 *
			 * ⚠️ La chaîne doit rester identique dans `collection-grid-skeleton.tsx`,
			 * sinon le squelette et la grille ne se recouvrent pas. Verrouillé par
			 * `collection-skeleton-parity.regression.test.ts`. */}
			<Stagger
				as="ul"
				itemAs="li"
				aria-label="Liste des collections"
				className="xs:grid-cols-2 grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-3 lg:gap-8"
				stagger={0.05}
				delay={0.1}
			>
				{cards.map(({ collection, images, priceRange }, index) => (
					<CollectionCard
						key={collection.id}
						slug={collection.slug}
						name={collection.name}
						images={images}
						index={index}
						headingLevel="h2"
						productCount={collection._count.products}
						description={collection.description}
						priceRange={priceRange}
					/>
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
					totalCount={totalCount}
					perPageOptions={PUBLIC_PER_PAGE_OPTIONS}
				/>
			</div>
		</div>
	);
}
