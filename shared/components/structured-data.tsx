import {
	getFounderSchema,
	getLocalBusinessSchema,
	getOrganizationSchema,
	getWebSiteSchema,
	SITE_URL,
} from "@/shared/constants/seo-config";

import type { Product } from "@/modules/products/types/product.types";
import { getOfferAvailability } from "@/shared/utils/offer-availability";
import { safeJsonLd } from "@/shared/utils/safe-json-ld";

interface StructuredDataProps {
	includeHomepageSchemas?: boolean;
	featuredProducts?: Product[];
}

/**
 * Consolidates all JSON-LD schemas into a single @graph script.
 * Sync component — data must be passed as props (no Suspense around <script> tags).
 */
// Remove @context from each schema for @graph format
const BASE_GRAPH_SCHEMAS: Record<string, unknown>[] = [
	getOrganizationSchema(),
	getWebSiteSchema(),
	getLocalBusinessSchema(),
	getFounderSchema(),
].map(({ "@context": _, ...rest }) => rest);

export function StructuredData({ includeHomepageSchemas, featuredProducts }: StructuredDataProps) {
	// Copie par rendu : le tableau est muté (push) selon les props.
	const graphSchemas: Record<string, unknown>[] = [...BASE_GRAPH_SCHEMAS];

	if (includeHomepageSchemas) {
		// BreadcrumbList for homepage
		graphSchemas.push({
			"@type": "BreadcrumbList",
			"@id": `${SITE_URL}/#homepage-breadcrumb`,
			itemListElement: [
				{
					"@type": "ListItem",
					position: 1,
					name: "Accueil",
					item: SITE_URL,
				},
			],
		});

		// Article schema for the atelier story section.
		// datePublished reflects when the story was first published;
		// dateModified tracks the last deploy so search engines see fresh content.
		const articlePublishedAt = process.env.NEXT_PUBLIC_SITE_PUBLISHED_AT ?? "2025-01-15";
		graphSchemas.push({
			"@type": "Article",
			"@id": `${SITE_URL}/#atelier-article`,
			headline: "L'histoire de Léane, créatrice de bijoux artisanaux Synclune",
			url: `${SITE_URL}/#atelier-section`,
			image: `${SITE_URL}/opengraph-image`,
			datePublished: articlePublishedAt,
			dateModified: process.env.DEPLOY_DATE ?? articlePublishedAt,
			author: {
				"@id": `${SITE_URL}/#founder`,
			},
			about: {
				"@type": "Brand",
				name: "Synclune",
				description: "Bijoux artisanaux faits main en France",
			},
		});

		// ItemList for the "Latest Creations" rail — enables Google product carousel rich result.
		// Each item embeds a full Product with Offer (price, availability) for Google Shopping eligibility.
		if (featuredProducts && featuredProducts.length > 0) {
			graphSchemas.push({
				"@type": "ItemList",
				"@id": `${SITE_URL}/#latest-creations`,
				name: "Nouvelles créations Synclune",
				numberOfItems: featuredProducts.length,
				itemListOrder: "https://schema.org/ItemListOrderDescending",
				itemListElement: featuredProducts.map((product, index) => {
					const url = `${SITE_URL}/creations/${product.slug}`;
					// skus are pre-sorted by [isDefault desc, priceInclTax asc] in GET_PRODUCTS_SELECT
					const defaultSku = product.skus[0];
					const primaryImage =
						defaultSku?.images.find((img) => img.isPrimary) ?? defaultSku?.images[0];
					const priceCents = defaultSku?.priceInclTax;
					const inStock = (defaultSku?.inventory ?? 0) > 0;

					const productNode: Record<string, unknown> = {
						"@type": "Product",
						"@id": `${url}#product`,
						name: product.title,
						url,
						...(product.description && { description: product.description }),
						...(primaryImage && { image: primaryImage.url }),
						...(typeof priceCents === "number" && {
							offers: {
								"@type": "Offer",
								url,
								price: (priceCents / 100).toFixed(2),
								priceCurrency: "EUR",
								availability: getOfferAvailability(inStock),
								itemCondition: "https://schema.org/NewCondition",
							},
						}),
					};

					return {
						"@type": "ListItem",
						position: index + 1,
						url,
						item: productNode,
					};
				}),
			});
		}
	}

	const jsonLd = {
		"@context": "https://schema.org",
		"@graph": graphSchemas,
	};

	return (
		// SAFE: serialized via safeJsonLd (no user HTML)
		// react-doctor-disable-next-line react/no-danger
		<script
			type="application/ld+json"
			dangerouslySetInnerHTML={{
				__html: safeJsonLd(jsonLd),
			}}
		/>
	);
}
