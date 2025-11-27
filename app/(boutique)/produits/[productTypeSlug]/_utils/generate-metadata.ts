import type { ProductSearchParams } from "../../page";
import { getProductTypes } from "@/modules/product-types/data/get-product-types";
import type { Metadata } from "next";

/**
 * Configuration des metadata SEO par type de bijou
 *
 * Chaque type a:
 * - title optimisé pour SEO local Nantes
 * - description unique avec mots-clés longue traîne
 * - keywords ciblés
 */
const PRODUCT_TYPE_METADATA: Record<
	string,
	{
		title: string;
		description: string;
		keywords: string;
	}
> = {
	bagues: {
		title: "Bagues Artisanales Faites Main à Nantes | Synclune",
		description:
			"Découvrez nos bagues artisanales uniques en argent 925 et pierres naturelles. Création artisanale à Nantes. Livraison France. Chaque bague est unique.",
		keywords:
			"bagues artisanales, bagues faites main, bijoux Nantes, bague argent 925, bague pierres naturelles, bijoutier Nantes, bague unique",
	},
	colliers: {
		title: "Colliers Artisanaux Faits Main à Nantes | Synclune",
		description:
			"Colliers colorés et originaux faits main avec amour à Nantes. Argent 925 et pierres naturelles. Pièces uniques artisanales. Livraison France.",
		keywords:
			"colliers artisanaux, colliers faits main, bijoux colorés Nantes, collier argent, collier pierres naturelles, bijoutier artisan",
	},
	bracelets: {
		title: "Bracelets Artisanaux Faits Main à Nantes | Synclune",
		description:
			"Bracelets artisanaux uniques créés à Nantes. Argent 925 et pierres naturelles colorées. Création artisanale française. Livraison rapide.",
		keywords:
			"bracelets artisanaux, bracelets faits main, bijoux Nantes, bracelet argent, bracelet pierres, bijoutier Nantes, bracelet unique",
	},
	"boucles-d-oreilles": {
		title: "Boucles d'Oreilles Artisanales Nantes | Synclune",
		description:
			"Boucles d'oreilles artisanales colorées et originales. Créations uniques en argent 925 à Nantes. Bijoux faits main avec pierres naturelles.",
		keywords:
			"boucles d'oreilles artisanales, boucles oreilles faites main, bijoux Nantes, boucles argent, bijoutier artisan Nantes",
	},
};

export async function generateProductTypeMetadata({
	params,
	searchParams,
}: {
	params: Promise<{ productTypeSlug: string }>;
	searchParams: Promise<ProductSearchParams>;
}): Promise<Metadata> {
	const { productTypeSlug } = await params;
	const searchParamsData = await searchParams;

	// Vérifier si des filtres sont actifs (hors navigation et type)
	// SEO: On noindex les pages avec filtres pour éviter le duplicate content
	const hasActiveFilters = Object.keys(searchParamsData).some(
		(key) =>
			![
				"cursor",
				"direction",
				"perPage",
				"sortBy",
				"search",
				"type",
				"filter_sortBy",
			].includes(key)
	);

	// Récupérer le type de produit
	const productTypesData = await getProductTypes({
		perPage: 100,
		sortBy: "label-ascending",
		filters: {
			isActive: true,
		},
	});

	const productType = productTypesData.productTypes.find(
		(t) => t.slug === productTypeSlug
	);

	// 404 si le type n'existe pas
	if (!productType) {
		return {
			title: "Type de bijou non trouvé - Synclune",
			description: "Ce type de bijou n'existe pas ou n'est plus disponible.",
		};
	}

	// Utiliser la configuration depuis _constants/metadata.ts
	const config = PRODUCT_TYPE_METADATA[productTypeSlug];

	if (config) {
		return {
			title: config.title,
			description: config.description,
			keywords: config.keywords,
			alternates: {
				canonical: `/produits/${productTypeSlug}`,
			},
			// SEO: Noindex si des filtres sont appliqués pour éviter duplicate content
			robots: hasActiveFilters
				? {
						index: false,
						follow: true,
					}
				: undefined,
			openGraph: {
				title: config.title,
				description: config.description,
				url: `https://synclune.fr/produits/${productTypeSlug}`,
				type: "website",
				images: [
					{
						url: "https://synclune.fr/og-image.jpg",
						width: 1200,
						height: 630,
						alt: `${productType.label} artisanaux Synclune`,
					},
				],
			},
			twitter: {
				card: "summary_large_image",
				title: config.title,
				description: config.description,
			},
		};
	}

	// Fallback si le type n'a pas de configuration spécifique
	return {
		title: `${productType.label} Artisanaux | Synclune - Bijoux Faits Main Nantes`,
		description: `Découvrez nos ${productType.label.toLowerCase()} artisanaux faits main à Nantes. Pièces uniques en argent 925 et pierres naturelles. Livraison France.`,
		keywords: `${productType.label.toLowerCase()} artisanaux, ${productType.label.toLowerCase()} faits main, bijoux Nantes, bijoutier artisan`,
		alternates: {
			canonical: `/produits/${productTypeSlug}`,
		},
		// SEO: Noindex si des filtres sont appliqués pour éviter duplicate content
		robots: hasActiveFilters
			? {
					index: false,
					follow: true,
				}
			: undefined,
		openGraph: {
			title: `${productType.label} Artisanaux | Synclune`,
			description: `Découvrez nos ${productType.label.toLowerCase()} artisanaux faits main à Nantes`,
			url: `https://synclune.fr/produits/${productTypeSlug}`,
			type: "website",
		},
	};
}
