import { SITE_URL } from "@/shared/constants/seo-config";

type CuratedProduct = {
	slug: string;
	title: string;
};

/**
 * Genere les donnees structurees Schema.org ItemList pour la section "Coups de Coeur"
 * Ameliore le SEO en indiquant a Google qu'il s'agit d'une selection curatee
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
		itemListElement: products.map((product, index) => ({
			"@type": "ListItem",
			position: index + 1,
			item: {
				"@type": "Product",
				"@id": `${SITE_URL}/creations/${product.slug}`,
				name: product.title,
				url: `${SITE_URL}/creations/${product.slug}`,
			},
		})),
	};
}
