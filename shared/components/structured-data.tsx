import {
	getFounderSchema,
	getLocalBusinessSchema,
	getOrganizationSchema,
	getWebSiteSchema,
	SITE_URL,
} from "@/shared/constants/seo-config";
import { cacheLife, cacheTag } from "next/cache";

import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";
import { getFeaturedReviews } from "@/modules/reviews/data/get-featured-reviews";
import { getGlobalReviewStats } from "@/modules/reviews/data/get-global-review-stats";

interface StructuredDataProps {
	includeHomepageSchemas?: boolean;
}

/**
 * Consolidates all JSON-LD schemas into a single @graph script.
 * Uses "use cache" to avoid Suspense boundaries around <script> tags.
 */
export async function StructuredData({ includeHomepageSchemas }: StructuredDataProps = {}) {
	"use cache";
	cacheLife("products");
	cacheTag(SHARED_CACHE_TAGS.HOMEPAGE_STRUCTURED_DATA);

	const reviewStats = await getGlobalReviewStats();

	const schemas = [
		getOrganizationSchema(),
		getWebSiteSchema(),
		getLocalBusinessSchema(reviewStats),
		getFounderSchema(),
	];

	// Remove @context from each schema for @graph format
	const graphSchemas: Record<string, unknown>[] = schemas.map(({ "@context": _, ...rest }) => rest);

	if (includeHomepageSchemas) {
		const reviews = await getFeaturedReviews();

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
			dateModified: process.env.DEPLOY_DATE ?? "2025-06-01",
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
		for (const review of reviews) {
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
				__html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
			}}
		/>
	);
}
