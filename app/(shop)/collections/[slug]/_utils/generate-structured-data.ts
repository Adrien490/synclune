import { SITE_URL } from "@/shared/constants/seo-config";

type CollectionProduct = {
	slug: string;
	title: string;
	priceInclTax?: number;
	imageUrl?: string;
	imageAlt?: string;
	inStock?: boolean;
};

type Collection = {
	slug: string;
	name: string;
	description: string | null;
	featuredImageUrl?: string | null;
	products?: CollectionProduct[];
};

/**
 * Génère les données structurées Schema.org pour une page collection
 * Inclut CollectionPage (avec mainEntity ItemList Product+Offer) + BreadcrumbList
 */
export function generateCollectionStructuredData(collection: Collection) {
	// BreadcrumbList pour la navigation
	const breadcrumbList = {
		"@type": "BreadcrumbList",
		"@id": `${SITE_URL}/collections/${collection.slug}#breadcrumb`,
		itemListElement: [
			{
				"@type": "ListItem",
				position: 1,
				name: "Accueil",
				item: SITE_URL,
			},
			{
				"@type": "ListItem",
				position: 2,
				name: "Collections",
				item: `${SITE_URL}/collections`,
			},
			{
				"@type": "ListItem",
				position: 3,
				name: collection.name,
				item: `${SITE_URL}/collections/${collection.slug}`,
			},
		],
	};

	// mainEntity ItemList des produits avec offers (recommandation Google Search)
	const products = collection.products ?? [];
	const itemListMainEntity =
		products.length > 0
			? {
					"@type": "ItemList",
					numberOfItems: products.length,
					itemListElement: products.map((product, index) => ({
						"@type": "ListItem",
						position: index + 1,
						item: {
							"@type": "Product",
							name: product.title,
							url: `${SITE_URL}/creations/${product.slug}`,
							...(product.imageUrl && {
								image: {
									"@type": "ImageObject",
									url: product.imageUrl,
									...(product.imageAlt && { caption: product.imageAlt }),
								},
							}),
							...(product.priceInclTax !== undefined && {
								offers: {
									"@type": "Offer",
									priceCurrency: "EUR",
									price: (product.priceInclTax / 100).toFixed(2),
									availability: product.inStock
										? "https://schema.org/InStock"
										: "https://schema.org/OutOfStock",
									url: `${SITE_URL}/creations/${product.slug}`,
								},
							}),
						},
					})),
				}
			: undefined;

	// CollectionPage pour décrire la page
	const collectionPage = {
		"@type": "CollectionPage",
		"@id": `${SITE_URL}/collections/${collection.slug}#collectionpage`,
		url: `${SITE_URL}/collections/${collection.slug}`,
		name: `Collection ${collection.name} - Synclune`,
		description:
			collection.description ??
			`Découvrez la collection ${collection.name} de bijoux artisanaux faits main par Synclune`,
		inLanguage: "fr-FR",
		isPartOf: {
			"@type": "WebSite",
			"@id": `${SITE_URL}/#website`,
		},
		about: {
			"@type": "Thing",
			name: collection.name,
			description: collection.description ?? undefined,
		},
		...(collection.featuredImageUrl && {
			image: {
				"@type": "ImageObject",
				url: collection.featuredImageUrl,
				caption: `Collection ${collection.name}`,
			},
		}),
		...(itemListMainEntity && { mainEntity: itemListMainEntity }),
		breadcrumb: {
			"@id": `${SITE_URL}/collections/${collection.slug}#breadcrumb`,
		},
		publisher: {
			"@type": "Organization",
			"@id": `${SITE_URL}/#organization`,
			name: "Synclune",
		},
	};

	// Retourner le Schema.org avec @graph
	return {
		"@context": "https://schema.org",
		"@graph": [collectionPage, breadcrumbList],
	};
}
