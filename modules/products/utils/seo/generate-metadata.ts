import { getProductBySlug } from "@/modules/products/data/get-product";
import { pickPrimaryImage } from "@/modules/products/services/product-display.service";
import type { Metadata } from "next";
import { SITE_URL } from "@/shared/constants/seo-config";

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

	if (!product || !product.active) {
		return {
			title: "Produit non trouvé - Synclune",
			description: "Ce produit n'existe pas ou n'est plus disponible.",
			robots: { index: false, follow: false },
		};
	}

	// ✅ SIMPLE : product.variants[0] = VARIANT principal
	const primaryVariant = product.variants[0];
	const price = primaryVariant?.priceCents
		? `${(primaryVariant.priceCents / 100).toFixed(2)}€`
		: "";

	// Availability OG = somme inventaire sur tous VARIANTs actifs (aligné avec AggregateOffer JSON-LD).
	// Évite de signaler "out of stock" quand seul le VARIANT principal est épuisé mais d'autres variantes sont dispo.
	const totalStock = product.variants.reduce(
		(sum, variant) => (variant.active ? sum + variant.stock : sum),
		0,
	);

	// Construire le titre SEO optimisé (< 60 caractères garanti)
	const title = buildSeoTitle(product.name, price || undefined);

	// Construire la description avec limite SEO (155 caractères)
	const rawDescription =
		product.description ||
		`Découvrez ${product.name}, un bijou artisanal fait main avec amour. ${product.type ? `Type: ${product.type.label}.` : ""} Bijoux colorés et originaux, créations uniques Synclune.`;
	const description = truncateDescription(rawDescription);

	// URL canonique et complète
	const canonicalUrl = `/creations/${slug}`;
	const fullUrl = `${SITE_URL}/creations/${slug}`;

	// Image du produit pour OpenGraph.
	// `pickPrimaryImage` et non `images[0]` : `GET_PRODUCT_SELECT` ne filtre pas
	// `mediaType` (la galerie a besoin des vidéos), donc l'expression naïve mettait
	// l'url d'un `.mp4` dans `og:image`/`twitter:images` dès qu'un VARIANT avait une
	// vidéo au rang 0 — carte sociale cassée au partage de la fiche. Le repli sur
	// l'OG image de marque couvre désormais aussi ce cas.
	const mainImage = pickPrimaryImage(product.media);
	const imageUrl = mainImage?.url ?? `${SITE_URL}/opengraph-image`;

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
					alt: product.name,
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
			"product:price:amount":
				price || (primaryVariant?.priceCents ? (primaryVariant.priceCents / 100).toFixed(2) : ""),
			"product:price:currency": "EUR",
			"product:availability": totalStock > 0 ? "in stock" : "out of stock",
			"product:condition": "new",
			"product:brand": "Synclune",
		},
	};
}
