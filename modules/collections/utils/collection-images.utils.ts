import type { Collection, CollectionImage } from "../types/collection.types";

export function extractCollectionImages(products: Collection["products"]): CollectionImage[] {
	if (!products.length) return [];

	// Dedup par productId (et non par image URL) pour preserver la diversite visuelle
	// quand plusieurs produits partagent le meme mockup. Affiche au plus une image
	// par produit dans la Bento Grid. Schéma lean : le média vit sur le PRODUIT.
	const seenProducts = new Set<string>();

	return products
		.filter((product) => {
			if (seenProducts.has(product.id)) return false;
			if (!product.media[0]) return false;
			seenProducts.add(product.id);
			return true;
		})
		.map((product) => {
			const img = product.media[0]!;
			return {
				url: img.url,
				alt: img.alt,
			};
		});
}

// `extractPriceRange` a été RETIRÉ (audit CollectionCard 2026-08-04) : il dérivait
// « À partir de X € » du payload de la liste, qui ne porte que 4 produits (`take: 4`,
// les vignettes du bento) × leur VARIANT par défaut. Le prix d'entrée affiché était donc
// faux dès la 5ᵉ création, et republié tel quel dans l'`AggregateOffer` JSON-LD.
// La SSOT est `modules/collections/data/get-collection-price-ranges.ts`, qui agrège
// sur TOUS les produits publiés et TOUS leurs VARIANTs actifs. Ne pas le réintroduire :
// aucun payload de liste ne peut fonder cette valeur.
