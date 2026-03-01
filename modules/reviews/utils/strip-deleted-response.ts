/**
 * Nullifies soft-deleted ReviewResponse on review objects.
 *
 * Prisma 1:1 relations don't support `where` inside `select`,
 * so we include `deletedAt` in the response select and strip
 * deleted responses in application code after fetch.
 */

type ResponseWithDeletedAt = Record<string, unknown> & { deletedAt?: unknown };

/**
 * Transforms T by removing `deletedAt` from the `response` field.
 * This accurately describes the output: same shape as input but
 * with response.deletedAt stripped away.
 */
type StrippedResponse<T extends { response: ResponseWithDeletedAt | null }> = Omit<
	T,
	"response"
> & {
	response: Omit<NonNullable<T["response"]>, "deletedAt"> | null;
};

/**
 * Strips a soft-deleted response from a single review.
 * Returns a new object with `response` set to null if it was soft-deleted,
 * and `deletedAt` removed from the response object otherwise.
 *
 * Accepts any object with an optional `response` containing `deletedAt`.
 * The Prisma select includes `deletedAt` but our domain types (ReviewPublic, ReviewAdmin) don't,
 * so the return type uses Omit to accurately reflect the removal of `deletedAt`.
 */
export function stripDeletedResponse<T extends { response: ResponseWithDeletedAt | null }>(
	review: T,
): StrippedResponse<T> {
	if (!review.response) return review as StrippedResponse<T>;
	if (review.response.deletedAt) {
		return { ...review, response: null } as StrippedResponse<T>;
	}
	const { deletedAt: _, ...cleanResponse } = review.response;
	return { ...review, response: cleanResponse } as StrippedResponse<T>;
}

/**
 * Strips soft-deleted responses from an array of reviews.
 */
export function stripDeletedResponses<T extends { response: ResponseWithDeletedAt | null }>(
	reviews: T[],
): StrippedResponse<T>[] {
	return reviews.map(stripDeletedResponse);
}
