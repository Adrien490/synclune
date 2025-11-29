import { SITE_URL } from "@/shared/constants/seo-config";

type Collection = {
	slug: string;
	name: string;
	description: string | null;
	featuredImageUrl?: string | null;
};

/**
 * Génère les données structurées Schema.org pour une page collection
 * Inclut CollectionPage + BreadcrumbList pour améliorer le SEO
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

	// CollectionPage pour décrire la page
	const collectionPage = {
		"@type": "CollectionPage",
		"@id": `${SITE_URL}/collections/${collection.slug}#collectionpage`,
		url: `${SITE_URL}/collections/${collection.slug}`,
		name: `Collection ${collection.name} - Synclune`,
		description:
			collection.description ||
			`Découvrez la collection ${collection.name} de bijoux artisanaux faits main par Synclune à Nantes`,
		inLanguage: "fr-FR",
		isPartOf: {
			"@type": "WebSite",
			"@id": `${SITE_URL}/#website`,
		},
		about: {
			"@type": "Thing",
			name: collection.name,
			description: collection.description || undefined,
		},
		...(collection.featuredImageUrl && {
			image: {
				"@type": "ImageObject",
				url: collection.featuredImageUrl,
				caption: `Collection ${collection.name}`,
			},
		}),
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
		"@context": "https://schema.org/",
		"@graph": [collectionPage, breadcrumbList],
	};
}
