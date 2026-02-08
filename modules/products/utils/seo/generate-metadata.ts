import { getProductBySlug } from "@/modules/products/data/get-product";
import type { Metadata } from "next";
import { PRODUCTION_URL } from "@/shared/constants/urls";

/**
 * Tronque un texte à une longueur maximale pour le SEO.
 * Coupe au dernier espace avant la limite et ajoute "..." si nécessaire.
 */
function truncateText(text: string, maxLength: number, ellipsis: boolean = true): string {
	if (text.length <= maxLength) return text;

	const reservedChars = ellipsis ? 3 : 0;
	const truncated = text.slice(0, maxLength - reservedChars);
	const lastSpace = truncated.lastIndexOf(" ");

	const result = lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated;
	return ellipsis ? result + "..." : result;
}

/**
 * Tronque une description à 155 caractères pour le SEO.
 */
function truncateDescription(text: string, maxLength: number = 155): string {
	return truncateText(text, maxLength);
}

/**
 * Construit un titre SEO optimisé pour les moteurs de recherche.
 * Garantit que le titre reste sous 60 caractères (recommandation Google).
 */
function buildSeoTitle(productTitle: string, price?: string): string {
	const suffix = " | Synclune";
	const maxTitleLength = 60;

	if (price) {
		const fullTitle = `${productTitle} à ${price}${suffix}`;
		if (fullTitle.length <= maxTitleLength) {
			return fullTitle;
		}

		// Titre trop long : tronquer le nom du produit pour garder le prix
		const priceAndSuffix = ` à ${price}${suffix}`;
		const availableForTitle = maxTitleLength - priceAndSuffix.length - 3; // -3 pour "..."

		if (availableForTitle > 10) {
			return truncateText(productTitle, availableForTitle) + priceAndSuffix;
		}

		// Prix trop long, omettre le prix
		return truncateText(productTitle, maxTitleLength - suffix.length - 3) + suffix;
	}

	const fullTitle = `${productTitle}${suffix}`;
	if (fullTitle.length <= maxTitleLength) {
		return fullTitle;
	}

	return truncateText(productTitle, maxTitleLength - suffix.length - 3) + suffix;
}

export async function generateProductMetadata({
	params,
}: {
	params: Promise<{ slug: string }>;
}): Promise<Metadata> {
	const { slug } = await params;
	const product = await getProductBySlug({ slug, includeDraft: true });

	if (!product || product.status !== "PUBLIC") {
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

	// Construire le titre SEO optimisé (< 60 caractères garanti)
	const title = buildSeoTitle(product.title, price || undefined);

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
			type: "website",
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
		other: {
			"product:price:amount": price || (primarySku?.priceInclTax ? (primarySku.priceInclTax / 100).toFixed(2) : ""),
			"product:price:currency": "EUR",
			"product:availability": primarySku?.inventory && primarySku.inventory > 0 ? "in stock" : "out of stock",
			"product:condition": "new",
			"product:brand": "Synclune",
		},
	};
}
