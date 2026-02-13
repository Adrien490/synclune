/**
 * Configuration SEO et référencement local pour Synclune
 * Créatrice de bijoux faits main à Nantes
 */

import { BRAND } from "./brand";

export const SITE_URL =
	process.env.NEXT_PUBLIC_SITE_URL ?? "https://synclune.fr";

export const BUSINESS_INFO = {
	name: "Synclune",
	legalName: "TADDEI LEANE",
	tradeName: "Synclune",
	description:
		"Créatrice de bijoux faits main avec amour à Nantes. Bijoux artisanaux colorés et originaux pour le quotidien et les occasions spéciales.",
	email: "synclune.bijoux@gmail.com",
	// Informations légales
	siren: "839 183 027",
	siret: "839 183 027 00037",
	vat: "FR35839183027",
	apeCode: "47.91B",
	social: BRAND.social,
	// Informations de localisation Nantes
	location: {
		street: "77 Boulevard du Tertre",
		city: "Nantes",
		region: "Loire-Atlantique",
		regionCode: "44",
		country: "France",
		countryCode: "FR",
		postalCode: "44100",
		// Coordonnées GPS du siège social (approximatives)
		latitude: 47.218371,
		longitude: -1.553621,
		// Description pour le SEO local
		addressLocality: "Nantes",
		addressRegion: "Pays de la Loire",
	},
	// Mots-clés SEO local
	localKeywords: [
		"bijoux Nantes",
		"créatrice bijoux Nantes",
		"bijoux faits main Nantes",
		"artisan bijoutier Nantes",
		"bijoux artisanaux Nantes",
		"bijoux Loire-Atlantique",
		"créatrice Nantes",
		"atelier bijoux Nantes",
		"bijoux originaux Nantes",
		"bijoux colorés Nantes",
	],
} as const;

export const SEO_DEFAULTS = {
	siteName: BUSINESS_INFO.name,
	locale: "fr_FR",
	type: "website",
	images: {
		// Image par defaut pour Open Graph (generee dynamiquement par app/opengraph-image.tsx)
		default: `${SITE_URL}/opengraph-image`,
		width: 1200,
		height: 630,
	},
	twitter: {
		card: "summary_large_image",
		// Pas de compte Twitter/X - utilisation du card type uniquement
	},
} as const;

export type GlobalReviewStats = {
	totalReviews: number;
	averageRating: number;
};

/**
 * Génère les données structurées LocalBusiness pour le référencement local Nantes
 * @param reviewStats - Statistiques globales d'avis (optionnel)
 */
export function getLocalBusinessSchema(reviewStats?: GlobalReviewStats) {
	const baseSchema = {
		"@context": "https://schema.org",
		"@type": "LocalBusiness",
		"@id": `${SITE_URL}/#organization`,
		name: BUSINESS_INFO.name,
		legalName: BUSINESS_INFO.legalName,
		description: BUSINESS_INFO.description,
		url: SITE_URL,
		logo: `${SITE_URL}/logo.webp`,
		image: `${SITE_URL}/opengraph-image`,
		email: BUSINESS_INFO.email,
		address: {
			"@type": "PostalAddress",
			streetAddress: BUSINESS_INFO.location.street,
			addressLocality: BUSINESS_INFO.location.addressLocality,
			addressRegion: BUSINESS_INFO.location.addressRegion,
			addressCountry: BUSINESS_INFO.location.countryCode,
			postalCode: BUSINESS_INFO.location.postalCode,
		},
		geo: {
			"@type": "GeoCoordinates",
			latitude: BUSINESS_INFO.location.latitude,
			longitude: BUSINESS_INFO.location.longitude,
		},
		areaServed: [
			{
				"@type": "City",
				name: "Nantes",
			},
			{
				"@type": "AdministrativeArea",
				name: "Loire-Atlantique",
			},
			{
				"@type": "AdministrativeArea",
				name: "Pays de la Loire",
			},
			{
				"@type": "Country",
				name: "France",
			},
		],
		priceRange: "€€",
		sameAs: [
			BUSINESS_INFO.social.instagram.url,
			BUSINESS_INFO.social.tiktok.url,
		],
		brand: {
			"@type": "Brand",
			name: BUSINESS_INFO.name,
			logo: `${SITE_URL}/logo.webp`,
		},
		founder: {
			"@type": "Person",
			name: "Léane Taddei",
			jobTitle: "Artisan créateur de bijoux",
			address: {
				"@type": "PostalAddress",
				streetAddress: BUSINESS_INFO.location.street,
				addressLocality: BUSINESS_INFO.location.addressLocality,
				postalCode: BUSINESS_INFO.location.postalCode,
				addressCountry: BUSINESS_INFO.location.countryCode,
			},
		},
		knowsAbout: [
			"Bijoux faits main",
			"Bijoux artisanaux",
			"Création de bijoux",
			"Bijoux colorés",
			"Bijoux originaux",
		],
		hasOfferCatalog: {
			"@type": "OfferCatalog",
			name: "Bijoux Synclune",
			itemListElement: [
				{
					"@type": "OfferCatalog",
					name: "Boucles d'oreilles",
					itemListElement: [
						{
							"@type": "Offer",
							itemOffered: {
								"@type": "Product",
								name: "Boucles d'oreilles artisanales",
							},
						},
					],
				},
				{
					"@type": "OfferCatalog",
					name: "Colliers",
					itemListElement: [
						{
							"@type": "Offer",
							itemOffered: {
								"@type": "Product",
								name: "Colliers faits main",
							},
						},
					],
				},
				{
					"@type": "OfferCatalog",
					name: "Bracelets",
					itemListElement: [
						{
							"@type": "Offer",
							itemOffered: {
								"@type": "Product",
								name: "Bracelets artisanaux",
							},
						},
					],
				},
			],
		},
	};

	// Ajouter l'AggregateRating si des avis existent
	if (reviewStats && reviewStats.totalReviews > 0) {
		return {
			...baseSchema,
			aggregateRating: {
				"@type": "AggregateRating",
				ratingValue: reviewStats.averageRating.toFixed(1),
				reviewCount: reviewStats.totalReviews,
				bestRating: 5,
				worstRating: 1,
			},
		};
	}

	return baseSchema;
}

/**
 * Génère les données structurées Person pour la créatrice Léane Taddei
 * Renforce l'E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness)
 */
export function getFounderSchema() {
	return {
		"@context": "https://schema.org",
		"@type": "Person",
		"@id": `${SITE_URL}/#founder`,
		name: "Léane Taddei",
		jobTitle: "Créatrice de bijoux artisanaux",
		description:
			"Artisan créatrice de bijoux faits main à Nantes. Passionnée par les couleurs et les créations uniques, je conçois chaque pièce avec amour dans mon atelier nantais.",
		url: SITE_URL,
		image: `${SITE_URL}/opengraph-image`,
		sameAs: [
			BUSINESS_INFO.social.instagram.url,
			BUSINESS_INFO.social.tiktok.url,
		],
		worksFor: {
			"@id": `${SITE_URL}/#organization`,
		},
		knowsAbout: [
			"Création de bijoux",
			"Bijoux faits main",
			"Artisanat",
			"Design de bijoux",
			"Bijoux colorés",
		],
		address: {
			"@type": "PostalAddress",
			addressLocality: BUSINESS_INFO.location.addressLocality,
			addressRegion: BUSINESS_INFO.location.addressRegion,
			addressCountry: BUSINESS_INFO.location.countryCode,
		},
	};
}

/**
 * Génère les données structurées Organization
 */
export function getOrganizationSchema() {
	return {
		"@context": "https://schema.org",
		"@type": "Organization",
		"@id": `${SITE_URL}/#organization`,
		name: BUSINESS_INFO.name,
		legalName: BUSINESS_INFO.legalName,
		url: SITE_URL,
		logo: {
			"@type": "ImageObject",
			"@id": `${SITE_URL}/#logo`,
			url: `${SITE_URL}/logo.webp`,
			contentUrl: `${SITE_URL}/logo.webp`,
			caption: BUSINESS_INFO.name,
		},
		image: {
			"@type": "ImageObject",
			"@id": `${SITE_URL}/#image`,
			url: `${SITE_URL}/opengraph-image`,
			contentUrl: `${SITE_URL}/opengraph-image`,
		},
		description: BUSINESS_INFO.description,
		email: BUSINESS_INFO.email,
		sameAs: [
			BUSINESS_INFO.social.instagram.url,
			BUSINESS_INFO.social.tiktok.url,
		],
		address: {
			"@type": "PostalAddress",
			streetAddress: BUSINESS_INFO.location.street,
			addressLocality: BUSINESS_INFO.location.addressLocality,
			addressRegion: BUSINESS_INFO.location.addressRegion,
			postalCode: BUSINESS_INFO.location.postalCode,
			addressCountry: BUSINESS_INFO.location.countryCode,
		},
		contactPoint: {
			"@type": "ContactPoint",
			contactType: "customer service",
			email: BUSINESS_INFO.email,
			availableLanguage: "French",
		},
		paymentAccepted: "Visa, Mastercard, CB, PayPal, Apple Pay",
	};
}

/**
 * Génère les données structurées WebSite avec SearchAction
 * Améliore le référencement en permettant à Google de comprendre
 * que le site dispose d'une fonction de recherche
 */
export function getWebSiteSchema() {
	return {
		"@context": "https://schema.org",
		"@type": "WebSite",
		"@id": `${SITE_URL}/#website`,
		url: SITE_URL,
		name: BUSINESS_INFO.name,
		description: BUSINESS_INFO.description,
		publisher: {
			"@id": `${SITE_URL}/#organization`,
		},
		potentialAction: {
			"@type": "SearchAction",
			target: {
				"@type": "EntryPoint",
				urlTemplate: `${SITE_URL}/produits?q={search_term_string}`,
			},
			"query-input": "required name=search_term_string",
		},
	};
}

