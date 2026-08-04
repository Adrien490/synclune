import { pickPrimaryImage } from "@/modules/products/services/product-display.service";
import type { Product } from "@/modules/products/types/product.types";
import {
	getFounderSchema,
	getLocalBusinessSchema,
	getOrganizationSchema,
	getWebSiteSchema,
	SITE_URL,
} from "@/shared/constants/seo-config";

import { getOfferAvailability } from "@/shared/utils/offer-availability";
import { safeJsonLd } from "@/shared/utils/safe-json-ld";

interface StructuredDataProps {
	includeHomepageSchemas?: boolean;
	/**
	 * Créations mises en avant sur l'accueil (l'étal). Émet une `ItemList` de
	 * `Product` + `Offer` — l'éligibilité au carrousel produit de Google.
	 *
	 * ⚠️ L'accueil est le SEUL émetteur d'`ItemList` de son URL : `ProductList`
	 * n'en émet plus, et il n'y a pas de `PageHeader` ici. Ne pas en ajouter une
	 * seconde ailleurs sur `/` (cf. CLAUDE.md, une seule `ItemList` par URL).
	 */
	featuredProducts?: Product[];
}

/**
 * Construit le nœud `Product` d'un item de l'`ItemList` de l'accueil.
 *
 * ⚠️ L'image passe par `pickPrimaryImage()` — SSOT du choix de vignette — et le
 * champ est OMIS quand elle rend `null`. La version d'avant le vidage de la
 * landing écrivait `images.find((i) => i.isPrimary) ?? images[0]` : sur un SKU
 * dont le média principal est une vidéo, ça mettait un `.mp4` dans le champ
 * `image` d'un nœud `Product` (invalide en schema.org).
 */
function buildFeaturedProductNode(product: Product, position: number) {
	const url = `${SITE_URL}/creations/${product.slug}`;
	// skus pré-triés par [isDefault desc, priceInclTax asc] dans GET_PRODUCTS_SELECT
	const defaultSku = product.skus[0];
	const primaryImage = pickPrimaryImage(defaultSku?.images);
	const priceCents = defaultSku?.priceInclTax;

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
				availability: getOfferAvailability((defaultSku?.inventory ?? 0) > 0),
				itemCondition: "https://schema.org/NewCondition",
			},
		}),
	};

	return { "@type": "ListItem", position, item: productNode };
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

		// ItemList de l'étal — les créations réellement affichées sur l'accueil.
		if (featuredProducts && featuredProducts.length > 0) {
			graphSchemas.push({
				"@type": "ItemList",
				"@id": `${SITE_URL}/#etal`,
				name: "Dernières créations Synclune",
				numberOfItems: featuredProducts.length,
				itemListOrder: "https://schema.org/ItemListOrderDescending",
				itemListElement: featuredProducts.map((product, index) =>
					buildFeaturedProductNode(product, index + 1),
				),
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
