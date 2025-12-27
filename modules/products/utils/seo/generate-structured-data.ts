import { SITE_URL } from "@/shared/constants/seo-config";
import type { GetProductReturn } from "@/modules/products/types/product.types";
import type { ProductSku } from "@/modules/products/types/product-services.types";
import type { ProductReviewStatistics, ReviewPublic } from "@/modules/reviews/types/review.types";

interface StructuredDataOptions {
	product: GetProductReturn;
	selectedSku: ProductSku | null;
	reviewStats?: ProductReviewStatistics | null;
	reviews?: ReviewPublic[];
}

export function generateStructuredData({
	product,
	selectedSku,
	reviewStats,
	reviews,
}: StructuredDataOptions) {
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

	// Dimensions standard pour les images produits (format carré e-commerce)
	const PRODUCT_IMAGE_SIZE = 1200;

	// Images du SKU sélectionné ou du premier SKU
	const skuImages = selectedSku?.images || product.skus?.[0]?.images || [];

	// Image principale
	const mainImage = skuImages.find((img) => img.isPrimary)?.url || skuImages[0]?.url;

	// Toutes les images en format ImageObject avec dimensions
	const allImages = skuImages.map((img) => ({
		"@type": "ImageObject",
		url: img.url,
		contentUrl: img.url,
		width: PRODUCT_IMAGE_SIZE,
		height: PRODUCT_IMAGE_SIZE,
		...(img.altText && { caption: img.altText }),
	}));

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

	// Nombre de SKUs actifs pour AggregateOffer
	const activeSkuCount = product.skus?.filter((sku) => sku.isActive).length || 1;

	// Utiliser AggregateOffer pour les produits multi-variantes
	const offers =
		hasMultiplePrices && activeSkuCount > 1
			? {
					"@type": "AggregateOffer",
					lowPrice: (minPrice / 100).toFixed(2),
					highPrice: (maxPrice / 100).toFixed(2),
					priceCurrency: "EUR",
					offerCount: activeSkuCount,
					availability,
					url: `${SITE_URL}/creations/${product.slug}`,
					seller: {
						"@type": "Organization",
						name: "Synclune",
					},
				}
			: {
					"@type": "Offer",
					price,
					priceCurrency: "EUR",
					availability,
					url: `${SITE_URL}/creations/${product.slug}`,
					seller: {
						"@type": "Organization",
						name: "Synclune",
					},
					priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
						.toISOString()
						.split("T")[0], // +30 jours
				};

	// Image principale en format ImageObject
	const mainImageObject = mainImage
		? {
				"@type": "ImageObject",
				url: mainImage,
				contentUrl: mainImage,
				width: PRODUCT_IMAGE_SIZE,
				height: PRODUCT_IMAGE_SIZE,
			}
		: null;

	const productData = {
		"@type": "Product",
		"@id": `${SITE_URL}/creations/${product.slug}#product`,
		name: product.title,
		description:
			product.description || `${product.title} - Bijou artisanal fait main`,
		image: allImages.length > 0 ? allImages : mainImageObject ? [mainImageObject] : [],
		sku: skuCode,
		// MPN = Manufacturer Part Number (code produit du fabricant)
		...(skuCode && { mpn: skuCode }),
		brand: {
			"@type": "Brand",
			name: "Synclune",
		},
		// AggregateRating - affiché seulement si des avis existent
		...(reviewStats && reviewStats.totalCount > 0 && {
			aggregateRating: {
				"@type": "AggregateRating",
				ratingValue: reviewStats.averageRating.toFixed(1),
				reviewCount: reviewStats.totalCount,
				bestRating: 5,
				worstRating: 1,
			},
		}),
		// Reviews individuels - max 10 pour les rich snippets Google
		...(reviews && reviews.length > 0 && {
			review: reviews.slice(0, 10).map((r) => ({
				"@type": "Review",
				reviewRating: {
					"@type": "Rating",
					ratingValue: r.rating,
					bestRating: 5,
					worstRating: 1,
				},
				author: {
					"@type": "Person",
					name: r.user?.name || "Client vérifié",
				},
				...(r.title && { name: r.title }),
				reviewBody: r.content,
				datePublished: new Date(r.createdAt).toISOString().split("T")[0],
			})),
		}),
		offers,
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
									: selectedSku.inventory <= 3 // STOCK_THRESHOLDS.LOW
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
