import { getProductBySlug } from "@/modules/products/data/get-product";
import type { Metadata } from "next";

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

	// Construire le titre et la description
	const title = `${product.title} ${price ? `- ${price}` : ""} | Bijoux artisanaux Synclune`;
	const description =
		product.description ||
		`Découvrez ${product.title}, un bijou artisanal fait main avec amour. ${product.type ? `Type: ${product.type.label}.` : ""} Bijoux colorés et originaux, créations uniques Synclune.`;

	// URL canonique et complète
	const canonicalUrl = `/creations/${slug}`;
	const fullUrl = `https://synclune.fr/creations/${slug}`;

	// Image du produit pour OpenGraph (première image du SKU principal)
	const mainImage = primarySku?.images?.[0];
	const imageUrl = mainImage?.url || "https://synclune.fr/og-image.jpg";

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
