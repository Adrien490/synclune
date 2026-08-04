import type { Collection, CollectionImage } from "../types/collection.types";

export function extractCollectionImages(products: Collection["products"]): CollectionImage[] {
	if (!products.length) return [];

	// Dedup par productId (et non par image URL) pour preserver la diversite visuelle
	// quand plusieurs produits partagent le meme mockup. Affiche au plus une image
	// par produit dans la Bento Grid.
	const seenProducts = new Set<string>();

	return products
		.filter((p) => {
			if (seenProducts.has(p.product.id)) return false;
			if (!p.product.skus[0]?.images[0]) return false;
			seenProducts.add(p.product.id);
			return true;
		})
		.map((p) => {
			const img = p.product.skus[0]!.images[0]!;
			return {
				url: img.url,
				blurDataUrl: img.blurDataUrl,
				alt: img.altText,
			};
		});
}

// `extractPriceRange` a été RETIRÉ (audit CollectionCard 2026-08-04) : il dérivait
// « À partir de X € » du payload de la liste, qui ne porte que 4 produits (`take: 4`,
// les vignettes du bento) × leur SKU par défaut. Le prix d'entrée affiché était donc
// faux dès la 5ᵉ création, et republié tel quel dans l'`AggregateOffer` JSON-LD.
// La SSOT est `modules/collections/data/get-collection-price-ranges.ts`, qui agrège
// sur TOUS les produits publiés et TOUS leurs SKUs actifs. Ne pas le réintroduire :
// aucun payload de liste ne peut fonder cette valeur.
