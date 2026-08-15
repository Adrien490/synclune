import { cacheLife, cacheTag } from "next/cache";

import { PRODUCTS_CACHE_TAGS } from "@/modules/products/constants/cache";
import { SHIPPING_RATES } from "@/modules/orders/constants/shipping-rates";
import { LEGAL_WITHDRAWAL_DAYS } from "@/shared/constants/consumer-law";
import { SITE_URL } from "@/shared/constants/seo-config";
import { getOfferAvailability } from "@/shared/utils/offer-availability";
import type { GetProductReturn } from "@/modules/products/types/product.types";
import type { ProductVariant } from "@/modules/products/types/product-services.types";
import { pickPrimaryImage } from "@/modules/products/services/product-display.service";

// Price valid for 90 days — Google requires a future date for rich results eligibility,
// short enough to force recrawl after price changes (avoids stale snippet in SERPs).
// `"use cache"` sur la seule valeur dérivée : `Date.now()` est interdit pendant le
// prerender (blocking-prerender-current-time), et la clé sans argument fait une entrée
// unique rafraîchie par le profil `catalog` — largement assez pour une date à J+90.
//
// Tag `PRODUCTS_LIST` : sans lui, l'entrée n'avait AUCUN levier d'invalidation et ne
// se rafraîchissait qu'à l'expiration du profil (6 h). Une correction de prix veut
// justement forcer le recrawl — c'est l'argument du commentaire ci-dessus.
export async function getPriceValidUntil(): Promise<string> {
	"use cache";
	cacheLife("catalog");
	cacheTag(PRODUCTS_CACHE_TAGS.LIST);
	const PRICE_VALIDITY_DAYS = 90;
	return new Date(Date.now() + PRICE_VALIDITY_DAYS * 24 * 60 * 60 * 1000)
		.toISOString()
		.split("T")[0]!;
}

interface StructuredDataOptions {
	product: GetProductReturn;
	selectedVariant: ProductVariant | null;
	/** Date AAAA-MM-JJ issue de `getPriceValidUntil()` — injectée car dérivée de l'horloge. */
	priceValidUntil: string;
}

export function generateStructuredData({
	product,
	selectedVariant,
	priceValidUntil,
}: StructuredDataOptions) {
	// Prix effectif (override variante ?? prix produit) pour les offres agrégées
	const activePrices = product.variants
		.filter((variant) => variant.active)
		.map((variant) => variant.priceCents ?? product.priceCents);

	const selectedPrice = selectedVariant ? (selectedVariant.priceCents ?? product.priceCents) : null;

	const minPrice =
		activePrices.length > 0 ? Math.min(...activePrices) : (selectedPrice ?? product.priceCents);

	const maxPrice =
		activePrices.length > 0 ? Math.max(...activePrices) : (selectedPrice ?? product.priceCents);

	const hasMultiplePrices = minPrice !== maxPrice;

	const price =
		selectedPrice != null ? (selectedPrice / 100).toFixed(2) : (minPrice / 100).toFixed(2);

	const availability = getOfferAvailability(!!selectedVariant && selectedVariant.stock > 0);

	// Dimensions standard pour les images produits (format carré e-commerce)
	const PRODUCT_IMAGE_SIZE = 1200;

	// Schéma lean : le média vit sur le PRODUIT — toutes les variantes partagent
	// la même galerie.
	const productMedia = product.media;

	// Seules les IMAGES alimentent le nœud Product : GET_PRODUCT_SELECT ne filtre pas
	// `type` (la galerie a besoin des vidéos), et un `.mp4` dans `image` est
	// invalide en schema.org (rejet Google Merchant).
	const imageOnlyMedia = productMedia.filter((img) => img.type === "IMAGE");

	// Image principale = première IMAGE de l'ordre canonique (SSOT pickPrimaryImage)
	const mainImage = pickPrimaryImage(productMedia)?.url;

	// Toutes les images en format ImageObject avec dimensions
	const allImages = imageOnlyMedia.map((img) => ({
		"@type": "ImageObject",
		url: img.url,
		contentUrl: img.url,
		width: PRODUCT_IMAGE_SIZE,
		height: PRODUCT_IMAGE_SIZE,
		...(img.alt && { caption: img.alt }),
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
							name: product.name,
							item: `${SITE_URL}/creations/${product.slug}`,
						},
					]
				: [
						{
							"@type": "ListItem",
							position: 3,
							name: product.name,
							item: `${SITE_URL}/creations/${product.slug}`,
						},
					]),
		],
	};

	// Nombre de VARIANTs actifs pour AggregateOffer
	const activeVariantCount = product.variants.filter((variant) => variant.active).length || 1;

	// Return policy and shipping details shared by all offer types.
	//
	// ⚠️ Les deux valeurs corrigées le 2026-08-06 disaient à Google le CONTRAIRE
	// des CGV — c'est une allégation commerciale, pas une inexactitude de balisage :
	//   - `returnFees` affirmait `FreeReturn` là où les CGV § 6.3 et `/retractation`
	//     disent « les frais de retour sont à votre charge » ;
	//   - `shippingRate` était figé à « 6.00 » quand `SHIPPING_RATES.FR` facture 4,99 €.
	// Les deux dérivent désormais des SSOT, comme le `hasShippingService` du nœud
	// marchand (`getOrganizationSchema`), qui est l'endroit où Google veut les lire.
	const returnPolicy = {
		"@type": "MerchantReturnPolicy",
		applicableCountry: "FR",
		returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
		merchantReturnDays: LEGAL_WITHDRAWAL_DAYS,
		returnMethod: "https://schema.org/ReturnByMail",
		returnFees: "https://schema.org/ReturnShippingFees",
	};

	const shippingDetails = {
		"@type": "OfferShippingDetails",
		shippingRate: {
			"@type": "MonetaryAmount",
			value: (SHIPPING_RATES.FR.amount / 100).toFixed(2),
			currency: "EUR",
		},
		shippingDestination: {
			"@type": "DefinedRegion",
			addressCountry: "FR",
		},
		deliveryTime: {
			"@type": "ShippingDeliveryTime",
			handlingTime: { "@type": "QuantitativeValue", minValue: 2, maxValue: 3, unitCode: "DAY" },
			transitTime: { "@type": "QuantitativeValue", minValue: 2, maxValue: 4, unitCode: "DAY" },
		},
	};

	// Utiliser AggregateOffer pour les produits multi-variantes
	const offers =
		hasMultiplePrices && activeVariantCount > 1
			? {
					"@type": "AggregateOffer",
					lowPrice: (minPrice / 100).toFixed(2),
					highPrice: (maxPrice / 100).toFixed(2),
					priceCurrency: "EUR",
					offerCount: activeVariantCount,
					availability,
					priceValidUntil,
					itemCondition: "https://schema.org/NewCondition",
					url: `${SITE_URL}/creations/${product.slug}`,
					seller: {
						"@type": "Organization",
						name: "Synclune",
					},
					hasMerchantReturnPolicy: returnPolicy,
					shippingDetails,
				}
			: {
					"@type": "Offer",
					price,
					priceCurrency: "EUR",
					availability,
					priceValidUntil,
					itemCondition: "https://schema.org/NewCondition",
					url: `${SITE_URL}/creations/${product.slug}`,
					seller: {
						"@type": "Organization",
						name: "Synclune",
					},
					hasMerchantReturnPolicy: returnPolicy,
					shippingDetails,
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
		name: product.name,
		description: product.description || `${product.name} - Bijou artisanal fait main`,
		image: allImages.length > 0 ? allImages : mainImageObject ? [mainImageObject] : [],
		brand: {
			"@type": "Brand",
			name: "Synclune",
		},
		offers,
		...(product.type && {
			category: product.type.label,
		}),
		...(selectedVariant?.material?.name && {
			material: selectedVariant.material.name,
		}),
		...(selectedVariant?.color?.name && {
			color: selectedVariant.color.name,
		}),
		...(product.collections.length > 0 && {
			isRelatedTo: product.collections.map((collection) => ({
				"@type": "CollectionPage",
				name: collection.name,
				url: `${SITE_URL}/collections/${collection.slug}`,
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
			...(selectedVariant?.stock
				? [
						{
							"@type": "PropertyValue",
							name: "Stock",
							value:
								selectedVariant.stock === 1
									? "Pièce unique"
									: selectedVariant.stock <= 3 // STOCK_THRESHOLDS.LOW
										? "Stock limité"
										: "En stock",
						},
					]
				: []),
		],
	};

	// Retourner le Schema.org avec @graph pour inclure Product + BreadcrumbList
	return {
		"@context": "https://schema.org",
		"@graph": [productData, breadcrumbList],
	};
}
