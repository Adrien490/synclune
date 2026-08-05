import { FlowerIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";

import { type GetCollectionsReturn } from "@/modules/collections/data/get-collections";
import { getCollectionPriceRanges } from "@/modules/collections/data/get-collection-price-ranges";
import { extractCollectionImages } from "@/modules/collections/utils/collection-images.utils";
import { Stagger } from "@/shared/components/animations";
import { StorefrontPaginationBand } from "@/shared/components/cursor-pagination";
import { Button } from "@/shared/components/ui/button";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/shared/components/ui/empty";
import { SITE_URL } from "@/shared/constants/seo-config";
import { getOfferAvailability } from "@/shared/utils/offer-availability";
import { safeJsonLd } from "@/shared/utils/safe-json-ld";
import {
	CHAPTER_STACK_CLASSES,
	CollectionChapter,
} from "@/modules/collections/components/collection-chapter";

interface CollectionChaptersProps {
	collectionsPromise: Promise<GetCollectionsReturn>;
}

/**
 * Le carnet des séries — l'empilement des bandes-chapitres de `/collections`
 * (redesign 2026-08-05, remplace la grille de cartes « Planche-contact »).
 *
 * Les bandes sont PLEINE LARGEUR (leur voile `--section-soft` va bord à bord) :
 * ce composant se rend HORS du conteneur `max-w-6xl` de la page — chaque
 * chapitre re-contraint son contenu (`CHAPTER_CONTAINER_CLASSES`), et
 * l'état vide comme la pagination reprennent le conteneur standard.
 *
 * ⚠️ `delay={0}` sur le Stagger, comme du temps de la grille : `.enter-load` a
 * un `animation-fill-mode: both`, un délai initial tiendrait le candidat LCP à
 * `opacity: 0` (Chrome l'écarte alors du LCP) pendant que le 1er tirage dépense
 * `preload` + `fetchPriority="high"`. La cascade `stagger={0.05}` ne décale que
 * les chapitres suivants.
 */
export async function CollectionChapters({ collectionsPromise }: CollectionChaptersProps) {
	const { collections, pagination, totalCount } = await collectionsPromise;

	// Afficher le composant Empty si aucune collection
	if (collections.length === 0) {
		return (
			<div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
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
			</div>
		);
	}

	const { nextCursor, prevCursor, hasNextPage, hasPreviousPage } = pagination;

	// Fourchettes de prix exactes (tous les produits publiés, tous les SKUs actifs) :
	// le payload de la liste ne porte que 4 produits × leur SKU par défaut, il ne
	// peut pas fonder un « À partir de ». Cf. get-collection-price-ranges.ts.
	const priceRanges = await getCollectionPriceRanges(collections.map((c) => c.id));

	// Une seule dérivation par collection : images et prix étaient recalculés deux
	// fois par item (une passe JSON-LD, une passe rendu).
	const chapters = collections.map((collection) => ({
		collection,
		images: extractCollectionImages(collection.products),
		priceRange: priceRanges[collection.id],
	}));

	const itemListJsonLd = {
		"@context": "https://schema.org",
		"@type": "ItemList",
		numberOfItems: collections.length,
		itemListElement: chapters.map(({ collection, images, priceRange }, index) => {
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
							// `priceRange.offerCount` et NON `productCount` : les deux ensembles
							// diffèrent (produits publiés vs produits ayant un SKU actif), et
							// publier un compte plus large que la fourchette qui l'accompagne
							// est une incohérence structurée. Cf. le JSDoc de
							// `CollectionPriceRange`.
							offerCount: priceRange.offerCount,
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

			<Stagger
				as="ul"
				itemAs="li"
				aria-label="Liste des collections"
				className={CHAPTER_STACK_CLASSES}
				stagger={0.05}
				delay={0}
			>
				{chapters.map(({ collection, images, priceRange }, index) => (
					<CollectionChapter
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

			{/* Pagination — bande « fin de l'étal », dans le conteneur standard.
			 * Toutes tailles : c'est la seule continuation de cette page (pas de
			 * load-more ici), et elle ne se rend que si la liste dépasse une page. */}
			<div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
				<StorefrontPaginationBand
					title="La suite des collections"
					noun={{ singular: "collection", plural: "collections" }}
					hasNextPage={hasNextPage}
					hasPreviousPage={hasPreviousPage}
					currentPageSize={collections.length}
					nextCursor={nextCursor}
					prevCursor={prevCursor}
					totalCount={totalCount}
				/>
			</div>
		</div>
	);
}
