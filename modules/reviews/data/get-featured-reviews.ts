import { prisma, notDeleted } from "@/shared/lib/prisma"
import { REVIEW_HOMEPAGE_SELECT } from "../constants/review.constants"
import { cacheHomepageReviews } from "../constants/cache"
import type { ReviewHomepage } from "../types/review.types"
import { stripDeletedResponses } from "../utils/strip-deleted-response"

/**
 * Fetches the top 6 published reviews for the homepage social proof section.
 * Sorted by highest rating first, then most recent.
 */
export async function getFeaturedReviews(): Promise<ReviewHomepage[]> {
	"use cache"
	cacheHomepageReviews()

	const reviews = await prisma.productReview.findMany({
		where: {
			status: "PUBLISHED",
			...notDeleted,
			product: {
				status: "PUBLIC",
				deletedAt: null,
			},
		},
		select: REVIEW_HOMEPAGE_SELECT,
		orderBy: [{ rating: "desc" }, { createdAt: "desc" }],
		take: 12,
	})

	const typed = stripDeletedResponses(reviews) as unknown as ReviewHomepage[]

	// Filter for substantive reviews (>= 50 chars)
	const quality = typed.filter((r) => r.content.length >= 50)

	// Fallback to unfiltered if fewer than 3 pass the quality filter
	return (quality.length >= 3 ? quality : typed).slice(0, 6)
}
