import { CollectionStatus, ProductStatus } from "@/app/generated/prisma/client";
import { getCollectionBySlug } from "@/modules/collections/data/get-collection";
import type { Metadata } from "next";
import { PRODUCTION_URL } from "@/shared/constants/urls";

/**
 * Extrait l'image du produit vedette (ou le premier produit PUBLIC) pour OpenGraph
 */
function getFeaturedProductImage(
	products: NonNullable<
		Awaited<ReturnType<typeof getCollectionBySlug>>
	>["products"]
): { url: string; alt: string } | null {
	// Chercher d'abord le produit featured PUBLIC
	const featuredProduct = products.find(
		(pc) => pc.isFeatured && pc.product.status === ProductStatus.PUBLIC
	);

	// Sinon prendre le premier produit PUBLIC
	const productToUse =
		featuredProduct ||
		products.find((pc) => pc.product.status === ProductStatus.PUBLIC);

	if (!productToUse) return null;

	// Trouver le SKU par defaut ou le premier SKU actif
	const defaultSku =
		productToUse.product.skus.find((s) => s.isDefault) ||
		productToUse.product.skus[0];

	if (!defaultSku) return null;

	// Trouver l'image primaire ou la premiere image
	const primaryImage =
		defaultSku.images.find((i) => i.isPrimary) || defaultSku.images[0];

	if (!primaryImage) return null;

	return {
		url: primaryImage.url,
		alt: primaryImage.altText || productToUse.product.title,
	};
}

export async function generateCollectionMetadata({
	params,
}: {
	params: Promise<{ slug: string }>;
}): Promise<Metadata> {
	const { slug } = await params;
	const collection = await getCollectionBySlug({ slug });

	// Vérifier que la collection existe et est publiée
	if (!collection || collection.status !== CollectionStatus.PUBLIC) {
		return {
			title: "Collection non trouvée - Synclune",
			description: "Cette collection n'existe pas ou n'est plus disponible.",
		};
	}

	const title = `${collection.name} - Collections Synclune | Bijoux artisanaux faits main`;
	const description =
		collection.description ||
		`Découvrez la collection ${collection.name} de Synclune - Des bijoux colorés et originaux faits main avec amour.`;
	const canonicalUrl = `/collections/${slug}`;
	const fullUrl = `${PRODUCTION_URL}/collections/${slug}`;

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
		"bijoux Nantes",
		"créatrice Nantes",
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
