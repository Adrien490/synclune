import { SITE_URL } from "@/shared/constants/seo-config";
import type { GetProductReturn } from "@/modules/products/types/product.types";
import type { ProductSku } from "@/modules/products/types/product-services.types";

export function generateStructuredData(
	product: GetProductReturn,
	selectedSku: ProductSku | null
) {
	// Calculer le prix minimum et maximum pour les offres agrégées
	const activePrices =
		product.skus
			?.filter((sku) => sku.isActive)
			.map((sku) => sku.priceInclTax) || [];

	const minPrice =
		activePrices.length > 0
			? Math.min(...activePrices)
			: selectedSku?.priceInclTax || 0;

	const maxPrice =
		activePrices.length > 0
			? Math.max(...activePrices)
			: selectedSku?.priceInclTax || 0;

	const hasMultiplePrices = minPrice !== maxPrice;

	const price = selectedSku?.priceInclTax
		? (selectedSku.priceInclTax / 100).toFixed(2)
		: (minPrice / 100).toFixed(2);

	const availability =
		selectedSku && selectedSku.inventory > 0
			? "https://schema.org/InStock"
			: "https://schema.org/OutOfStock";

	// Image principale
	const mainImage =
		selectedSku?.images?.find((img) => img.isPrimary)?.url ||
		product.skus?.[0]?.images?.[0]?.url;

	// Toutes les images
	const allImages =
		selectedSku?.images?.map((img) => img.url) ||
		product.skus?.[0]?.images?.map((img) => img.url) ||
		[];

	// Construction du BreadcrumbList pour SEO
	const breadcrumbList = {
		"@type": "BreadcrumbList",
		"@id": `${SITE_URL}/creations/${product.slug}#breadcrumb`,
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
				name: "Créations",
				item: `${SITE_URL}/produits`,
			},
			...(product.type
				? [
						{
							"@type": "ListItem",
							position: 3,
							name: product.type.label,
							item: `${SITE_URL}/produits/${product.type.slug}`,
						},
						{
							"@type": "ListItem",
							position: 4,
							name: product.title,
							item: `${SITE_URL}/creations/${product.slug}`,
						},
					]
				: [
						{
							"@type": "ListItem",
							position: 3,
							name: product.title,
							item: `${SITE_URL}/creations/${product.slug}`,
						},
					]),
		],
	};

	// MPN (Manufacturer Part Number) - utilise le code SKU comme référence fabricant
	const skuCode = selectedSku?.sku || product.skus?.[0]?.sku;

	const productData = {
		"@type": "Product",
		"@id": `${SITE_URL}/creations/${product.slug}#product`,
		name: product.title,
		description:
			product.description || `${product.title} - Bijou artisanal fait main`,
		image: allImages.length > 0 ? allImages : [mainImage],
		sku: skuCode,
		// MPN = Manufacturer Part Number (code produit du fabricant)
		...(skuCode && { mpn: skuCode }),
		brand: {
			"@type": "Brand",
			name: "Synclune",
		},
		// NOTE: aggregateRating supprimé - À réactiver quand un vrai système d'avis sera en place
		offers: {
			"@type": "Offer",
			price,
			priceCurrency: "EUR",
			// Prix minimum et maximum si plusieurs prix différents
			...(hasMultiplePrices && {
				lowPrice: (minPrice / 100).toFixed(2),
				highPrice: (maxPrice / 100).toFixed(2),
			}),
			availability,
			url: `${SITE_URL}/creations/${product.slug}`,
			seller: {
				"@type": "Organization",
				name: "Synclune",
			},
			priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
				.toISOString()
				.split("T")[0], // +30 jours
		},
		...(product.type && {
			category: product.type.label,
		}),
		...(selectedSku?.material?.name && {
			material: selectedSku.material.name,
		}),
		...(selectedSku?.color && {
			color: selectedSku.color.name,
		}),
		...(product.collections && product.collections.length > 0 && {
			isRelatedTo: product.collections.map((pc) => ({
				"@type": "Collection",
				name: pc.collection.name,
			})),
		}),
		additionalProperty: [
			{
				"@type": "PropertyValue",
				name: "Fait main",
				value: "Oui",
			},
			{
				"@type": "PropertyValue",
				name: "Origine",
				value: "France",
			},
			...(selectedSku?.inventory
				? [
						{
							"@type": "PropertyValue",
							name: "Stock",
							value:
								selectedSku.inventory === 1
									? "Pièce unique"
									: selectedSku.inventory <= 5
										? "Stock limité"
										: "En stock",
						},
					]
				: []),
		],
	};

	// Retourner le Schema.org avec @graph pour inclure Product + BreadcrumbList
	return {
		"@context": "https://schema.org/",
		"@graph": [productData, breadcrumbList],
	};
}
