import { PublicationStatus } from "@/app/generated/prisma/client";
import { getStorefrontCollectionBySlug } from "@/modules/collections/data/get-collection";
import type { Metadata } from "next";
import { SITE_URL } from "@/shared/constants/seo-config";

/**
 * Extrait l'image du produit vedette pour OpenGraph.
 *
 * Le select storefront arrive PRÉ-TRIÉ (position asc, addedAt desc) et filtré
 * PUBLIC : la vedette est `products[0]`, son SKU représentant est `skus[0]`
 * (rang 0 de (position, id)) et son image principale la première IMAGE de cet
 * ordre — le select ne remonte que des `mediaType: IMAGE`, avec `take: 1`.
 */
function getFeaturedProductImage(
	products: NonNullable<Awaited<ReturnType<typeof getStorefrontCollectionBySlug>>>["products"],
): { url: string; alt: string } | null {
	const productToUse = products[0];

	if (!productToUse) return null;

	// SKU représentant : rang 0 de (position asc, id asc), déjà trié par le select
	const defaultSku = productToUse.product.skus[0];

	if (!defaultSku) return null;

	// Première IMAGE de l'ordre canonique (le select filtre déjà mediaType: IMAGE)
	const primaryImage = defaultSku.images[0];

	if (!primaryImage) return null;

	return {
		url: primaryImage.url,
		alt: primaryImage.altText ?? productToUse.product.title,
	};
}

export async function generateCollectionMetadata({
	params,
}: {
	params: Promise<{ slug: string }>;
}): Promise<Metadata> {
	const { slug } = await params;
	const collection = await getStorefrontCollectionBySlug({ slug });

	// Vérifier que la collection existe et est publiée
	if (!collection || collection.status !== PublicationStatus.PUBLIC) {
		return {
			title: "Collection non trouvée - Synclune",
			description: "Cette collection n'existe pas ou n'est plus disponible.",
			// La page appelle `notFound()`, donc le statut HTTP est bien 404 et l'impact
			// pratique est nul — mais la branche produit équivalente pose ce `robots` et
			// l'asymétrie n'avait aucune raison d'être. Ceinture et bretelles.
			robots: { index: false, follow: false },
		};
	}

	const title = `${collection.name} - Collections Synclune | Bijoux artisanaux faits main`;
	const description =
		collection.description ??
		`Découvrez la collection ${collection.name} de Synclune - Des bijoux colorés et originaux faits main avec amour.`;
	const canonicalUrl = `/collections/${slug}`;
	const fullUrl = `${SITE_URL}/collections/${slug}`;

	// Extraire l'image du produit vedette pour OpenGraph
	const featuredImage = getFeaturedProductImage(collection.products);

	// Keywords dynamiques enrichis
	const collectionNameLower = collection.name.toLowerCase();
	const dynamicKeywords = [
		`collection ${collectionNameLower}`,
		`${collectionNameLower} bijoux`,
		`${collectionNameLower} fait main`,
		"bijoux artisanaux",
		"collection bijoux",
		"Synclune",
		"créatrice bijoux",
		"bijoux faits main",
		"bijoux colorés",
		"bijoux originaux",
	];

	// Ajouter les types de produits présents dans la collection
	const productTypes = new Set<string>();
	collection.products.forEach((pc) => {
		if (pc.product.type?.label) {
			productTypes.add(pc.product.type.label.toLowerCase());
		}
	});
	productTypes.forEach((type) => {
		dynamicKeywords.push(`${type} ${collectionNameLower}`);
	});

	return {
		title,
		description,
		keywords: dynamicKeywords.join(", "),
		// Balise canonical pour pages collections
		alternates: {
			canonical: canonicalUrl,
		},
		openGraph: {
			title,
			description,
			url: fullUrl,
			type: "website",
			...(featuredImage && {
				images: [
					{
						url: featuredImage.url,
						alt: featuredImage.alt,
						width: 1200,
						height: 630,
					},
				],
			}),
		},
		twitter: {
			card: "summary_large_image",
			title,
			description,
			...(featuredImage && {
				images: [featuredImage.url],
			}),
		},
	};
}
