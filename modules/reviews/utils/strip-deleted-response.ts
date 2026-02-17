/**
 * Nullifies soft-deleted ReviewResponse on review objects.
 *
 * Prisma 1:1 relations don't support `where` inside `select`,
 * so we include `deletedAt` in the response select and strip
 * deleted responses in application code after fetch.
 */

type ReviewWithResponse = {
	response: { deletedAt: Date | null; [key: string]: unknown } | null
	[key: string]: unknown
}

/**
 * Strips a soft-deleted response from a single review.
 * Returns a new object with `response` set to null if it was soft-deleted,
 * and `deletedAt` removed from the response object otherwise.
 */
export function stripDeletedResponse<T extends ReviewWithResponse>(review: T): T {
	if (!review.response) return review
	if (review.response.deletedAt) {
		return { ...review, response: null }
	}
	const { deletedAt: _, ...cleanResponse } = review.response
	return { ...review, response: cleanResponse } as T
}

/**
 * Strips soft-deleted responses from an array of reviews.
 */
export function stripDeletedResponses<T extends ReviewWithResponse>(reviews: T[]): T[] {
	return reviews.map(stripDeletedResponse)
}
