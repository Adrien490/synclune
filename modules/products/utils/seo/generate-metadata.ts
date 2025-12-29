import { getProductBySlug } from "@/modules/products/data/get-product";
import type { Metadata } from "next";
import { PRODUCTION_URL } from "@/shared/constants/urls";

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

	// Construire le titre SEO optimisé (< 60 caractères recommandés)
	const title = price
		? `${product.title} à ${price} | Synclune`
		: `${product.title} | Synclune`;

	// Construire la description avec limite SEO (155 caractères)
	const rawDescription =
		product.description ||
		`Découvrez ${product.title}, un bijou artisanal fait main avec amour. ${product.type ? `Type: ${product.type.label}.` : ""} Bijoux colorés et originaux, créations uniques Synclune.`;
	const description = truncateDescription(rawDescription);

	// URL canonique et complète
	const canonicalUrl = `/creations/${slug}`;
	const fullUrl = `${PRODUCTION_URL}/creations/${slug}`;

	// Image du produit pour OpenGraph (première image du SKU principal)
	const mainImage = primarySku?.images?.[0];
	const imageUrl = mainImage?.url || `${PRODUCTION_URL}/opengraph-image`;

	// Keywords dynamiques basés sur les attributs du produit
	const dynamicKeywords: string[] = [
		product.title.toLowerCase(),
		"bijoux artisanaux",
		"fait main",
		"Synclune",
	];

	// Ajouter le type de produit
	if (product.type?.label) {
		dynamicKeywords.push(
			product.type.label.toLowerCase(),
			`${product.type.label.toLowerCase()} fait main`,
			`${product.type.label.toLowerCase()} artisanal`
		);
	}

	// Ajouter la couleur si disponible
	if (primarySku?.color?.name) {
		dynamicKeywords.push(
			`bijoux ${primarySku.color.name.toLowerCase()}`,
			primarySku.color.name.toLowerCase()
		);
	}

	// Ajouter la matière si disponible
	if (primarySku?.material?.name) {
		dynamicKeywords.push(
			`bijoux ${primarySku.material.name.toLowerCase()}`,
			primarySku.material.name.toLowerCase()
		);
	}

	// Ajouter les collections
	if (product.collections && product.collections.length > 0) {
		product.collections.slice(0, 3).forEach((pc) => {
			dynamicKeywords.push(
				`collection ${pc.collection.name.toLowerCase()}`,
				pc.collection.name.toLowerCase()
			);
		});
	}

	// Ajouter les termes locaux SEO Nantes
	dynamicKeywords.push("bijoux Nantes", "créatrice Nantes", "Loire-Atlantique");

	return {
		title,
		description,
		keywords: dynamicKeywords.join(", "),
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
