import { SITE_URL } from "@/shared/constants/seo-config";

type CuratedProduct = {
	slug: string;
	title: string;
	skus: Array<{
		priceInclTax: number;
		inventory: number;
		isActive: boolean;
		images: Array<{ url: string; altText: string | null }>;
	}>;
};

/**
 * Genere les donnees structurees Schema.org ItemList pour la section "Coups de Coeur"
 * Ameliore le SEO en indiquant a Google qu'il s'agit d'une selection curatee
 * Inclut les offres (prix, disponibilite) pour les rich snippets
 */
export function generateCuratedPicksSchema(products: CuratedProduct[]) {
	return {
		"@context": "https://schema.org",
		"@type": "ItemList",
		"@id": `${SITE_URL}/#curated-picks`,
		name: "Coups de Coeur de Leane - Bijoux Artisanaux",
		description:
			"Selection personnelle de la creatrice parmi ses bijoux artisanaux faits main a Nantes",
		numberOfItems: products.length,
		author: {
			"@type": "Person",
			"@id": `${SITE_URL}/#founder`,
			name: "Leane Taddei",
			jobTitle: "Creatrice de bijoux artisanaux",
		},
		itemListElement: products.map((product, index) => {
			const activeSku = product.skus.find((s) => s.isActive);
			const price = activeSku?.priceInclTax ?? 0;
			const inStock = product.skus.some((s) => s.isActive && s.inventory > 0);
			const image = activeSku?.images[0]?.url;

			return {
				"@type": "ListItem",
				position: index + 1,
				item: {
					"@type": "Product",
					"@id": `${SITE_URL}/creations/${product.slug}`,
					name: product.title,
					url: `${SITE_URL}/creations/${product.slug}`,
					...(image && { image }),
					offers: {
						"@type": "Offer",
						url: `${SITE_URL}/creations/${product.slug}`,
						priceCurrency: "EUR",
						price: (price / 100).toFixed(2),
						availability: inStock
							? "https://schema.org/InStock"
							: "https://schema.org/OutOfStock",
						seller: {
							"@type": "Organization",
							"@id": `${SITE_URL}/#organization`,
						},
					},
				},
			};
		}),
	};
}
