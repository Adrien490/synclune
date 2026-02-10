import {
	getFounderSchema,
	getLocalBusinessSchema,
	getOrganizationSchema,
	getWebSiteSchema,
	SITE_URL,
	type GlobalReviewStats,
} from "@/shared/constants/seo-config";
import { use } from "react";

interface StructuredDataProps {
	reviewStatsPromise: Promise<GlobalReviewStats | undefined>;
}

/**
 * Consolidates all JSON-LD schemas into a single @graph script.
 * Accepts a Promise for review stats to enable streaming with Suspense.
 */
export function StructuredData({ reviewStatsPromise }: StructuredDataProps) {
	const reviewStats = use(reviewStatsPromise);

	const schemas = [
		getOrganizationSchema(),
		getWebSiteSchema(),
		getLocalBusinessSchema(reviewStats),
		getFounderSchema(),
	];

	// Remove @context from each schema for @graph format
	const graphSchemas: Record<string, unknown>[] = schemas.map(
		({ "@context": _, ...rest }) => rest,
	);

	// BreadcrumbList for homepage
	graphSchemas.push({
		"@type": "BreadcrumbList",
		itemListElement: [{
			"@type": "ListItem",
			position: 1,
			name: "Accueil",
			item: SITE_URL,
		}],
	});

	// Article schema for the atelier story section (centralized here)
	graphSchemas.push({
		"@type": "Article",
		headline: "L'histoire de Léane, créatrice de bijoux artisanaux Synclune",
		datePublished: "2025-01-15",
		dateModified: "2025-06-01",
		author: {
			"@type": "Person",
			name: "Léane",
			jobTitle: "Créatrice de bijoux artisanaux",
			sameAs: [
				"https://www.instagram.com/synclune.bijoux/",
				"https://www.tiktok.com/@synclune",
			],
			workLocation: {
				"@type": "Place",
				address: {
					"@type": "PostalAddress",
					addressLocality: "Nantes",
					addressCountry: "FR",
				},
			},
		},
		about: {
			"@type": "Brand",
			name: "Synclune",
			description: "Bijoux artisanaux faits main à Nantes",
		},
	});

	const jsonLd = {
		"@context": "https://schema.org",
		"@graph": graphSchemas,
	};

	return (
		<script
			type="application/ld+json"
			dangerouslySetInnerHTML={{
				__html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
			}}
		/>
	);
}
