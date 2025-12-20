import { getProductBySlug } from "@/modules/products/data/get-product";
import type { Metadata } from "next";

/**
 * Tronque une description à une longueur maximale pour le SEO.
 * Coupe au dernier espace avant la limite et ajoute "..." si nécessaire.
 */
function truncateDescription(text: string, maxLength: number = 155): string {
	if (text.length <= maxLength) return text;

	// Trouver le dernier espace avant la limite pour ne pas couper un mot
	const truncated = text.slice(0, maxLength - 3);
	const lastSpace = truncated.lastIndexOf(" ");

	return (lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated) + "...";
}

export async function generateProductMetadata({
	params,
}: {
	params: Promise<{ slug: string }>;
}): Promise<Metadata> {
	const { slug } = await params;
	const product = await getProductBySlug({ slug });

	if (!product) {
		return {
			title: "Produit non trouvé - Synclune",
			description: "Ce produit n'existe pas ou n'est plus disponible.",
		};
	}

	// ✅ SIMPLE : product.skus[0] = SKU principal
	const primarySku = product.skus[0];
	const price = primarySku?.priceInclTax
		? `${(primarySku.priceInclTax / 100).toFixed(2)}€`
		: "";

	// Construire le titre (avec ou sans prix)
	const title = price
		? `${product.title} - ${price} | Bijoux artisanaux Synclune`
		: `${product.title} | Bijoux artisanaux Synclune`;

	// Construire la description avec limite SEO (155 caractères)
	const rawDescription =
		product.description ||
		`Découvrez ${product.title}, un bijou artisanal fait main avec amour. ${product.type ? `Type: ${product.type.label}.` : ""} Bijoux colorés et originaux, créations uniques Synclune.`;
	const description = truncateDescription(rawDescription);

	// URL canonique et complète
	const canonicalUrl = `/creations/${slug}`;
	const fullUrl = `https://synclune.fr/creations/${slug}`;

	// Image du produit pour OpenGraph (première image du SKU principal)
	const mainImage = primarySku?.images?.[0];
	const imageUrl = mainImage?.url || "https://synclune.fr/opengraph-image";

	return {
		title,
		description,
		alternates: {
			canonical: canonicalUrl,
		},
		openGraph: {
			title,
			description,
			url: fullUrl,
			type: "article", // "article" pour les pages produit (meilleur support que "product")
			images: [
				{
					url: imageUrl,
					width: 1200,
					height: 630,
					alt: product.title,
				},
			],
		},
		twitter: {
			card: "summary_large_image",
			title,
			description,
			images: [imageUrl],
		},
	};
}
