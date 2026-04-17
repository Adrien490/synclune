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
	includeHomepageSchemas?: boolean;
	featuredReviews?: ReviewHomepage[];
}

/**
 * Consolidates all JSON-LD schemas into a single @graph script.
 * Sync component — data must be passed as props (no Suspense around <script> tags).
 */
export function StructuredData({
	reviewStats,
	includeHomepageSchemas,
	featuredReviews,
}: StructuredDataProps) {
	const schemas = [
		getOrganizationSchema(),
		getWebSiteSchema(),
		getLocalBusinessSchema(reviewStats),
		getFounderSchema(),
	];

	// Remove @context from each schema for @graph format
	const graphSchemas: Record<string, unknown>[] = schemas.map(({ "@context": _, ...rest }) => rest);

	if (includeHomepageSchemas) {
		// BreadcrumbList for homepage
		graphSchemas.push({
			"@type": "BreadcrumbList",
			"@id": `${SITE_URL}/#homepage-breadcrumb`,
			itemListElement: [
				{
					"@type": "ListItem",
					position: 1,
					name: "Accueil",
					item: SITE_URL,
				},
			],
		});

		// Article schema for the atelier story section.
		// datePublished reflects when the story was first published;
		// dateModified tracks the last deploy so search engines see fresh content.
		const articlePublishedAt = process.env.NEXT_PUBLIC_SITE_PUBLISHED_AT ?? "2025-01-15";
		graphSchemas.push({
			"@type": "Article",
			"@id": `${SITE_URL}/#atelier-article`,
			headline: "L'histoire de Léane, créatrice de bijoux artisanaux Synclune",
			url: `${SITE_URL}/#atelier-section`,
			image: `${SITE_URL}/opengraph-image`,
			datePublished: articlePublishedAt,
			dateModified: process.env.DEPLOY_DATE ?? articlePublishedAt,
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
		if (featuredReviews) {
			for (const [index, review] of featuredReviews.entries()) {
				graphSchemas.push({
					"@type": "Review",
					"@id": `${SITE_URL}/#review-${index}`,
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
