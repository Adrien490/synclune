import {
	type GlobalReviewStats,
	getFounderSchema,
	getLocalBusinessSchema,
	getOrganizationSchema,
	getWebSiteSchema,
	SITE_URL,
} from "@/shared/constants/seo-config";

import type { ReviewHomepage } from "@/modules/reviews/types/review.types";
import { safeJsonLd } from "@/shared/utils/safe-json-ld";

interface StructuredDataProps {
	reviewStats: GlobalReviewStats;
	featuredReviews?: ReviewHomepage[];
}

/**
 * Consolidates all JSON-LD schemas into a single @graph script.
 * Sync component — data must be passed as props (no Suspense around <script> tags).
 */
export function StructuredData({ reviewStats, featuredReviews }: StructuredDataProps) {
	const schemas = [
		getOrganizationSchema(),
		getWebSiteSchema(),
		getLocalBusinessSchema(reviewStats),
		getFounderSchema(),
	];

	// Remove @context from each schema for @graph format
	const graphSchemas: Record<string, unknown>[] = schemas.map(({ "@context": _, ...rest }) => rest);

	if (featuredReviews) {
		// BreadcrumbList for homepage
		graphSchemas.push({
			"@type": "BreadcrumbList",
			itemListElement: [
				{
					"@type": "ListItem",
					position: 1,
					name: "Accueil",
					item: SITE_URL,
				},
			],
		});

		// Article schema for the atelier story section
		graphSchemas.push({
			"@type": "Article",
			headline: "L'histoire de Léane, créatrice de bijoux artisanaux Synclune",
			url: `${SITE_URL}/#atelier-section`,
			image: `${SITE_URL}/opengraph-image`,
			datePublished: "2025-01-15",
			dateModified: process.env.DEPLOY_DATE ?? "2025-01-15",
			author: {
				"@id": `${SITE_URL}/#founder`,
			},
			about: {
				"@type": "Brand",
				name: "Synclune",
				description: "Bijoux artisanaux faits main en France",
			},
		});

		// Individual Review schemas for rich snippets
		for (const review of featuredReviews) {
			graphSchemas.push({
				"@type": "Review",
				author: {
					"@type": "Person",
					name: review.user.name ?? "Anonyme",
				},
				datePublished: new Date(review.createdAt).toISOString(),
				reviewBody: review.content,
				...(review.title && { name: review.title }),
				reviewRating: {
					"@type": "Rating",
					ratingValue: review.rating,
					bestRating: 5,
					worstRating: 1,
				},
				itemReviewed: {
					"@type": "Product",
					name: review.product.title,
					url: `${SITE_URL}/creations/${review.product.slug}`,
				},
				publisher: {
					"@id": `${SITE_URL}/#organization`,
				},
			});
		}
	}

	const jsonLd = {
		"@context": "https://schema.org",
		"@graph": graphSchemas,
	};

	return (
		<script
			type="application/ld+json"
			dangerouslySetInnerHTML={{
				__html: safeJsonLd(jsonLd),
			}}
		/>
	);
}
