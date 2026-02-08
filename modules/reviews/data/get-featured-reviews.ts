import { prisma } from "@/shared/lib/prisma"
import { REVIEW_HOMEPAGE_SELECT } from "../constants/review.constants"
import { cacheHomepageReviews } from "../constants/cache"
import type { ReviewHomepage } from "../types/review.types"

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
			deletedAt: null,
			product: {
				status: "PUBLIC",
				deletedAt: null,
			},
		},
		select: REVIEW_HOMEPAGE_SELECT,
		orderBy: [{ rating: "desc" }, { createdAt: "desc" }],
		take: 6,
	})

	// Relations are guaranteed non-null by the where clause filters
	return reviews as unknown as ReviewHomepage[]
}
