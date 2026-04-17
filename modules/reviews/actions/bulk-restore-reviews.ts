"use server";

import { updateTag } from "next/cache";
import { prisma } from "@/shared/lib/prisma";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import {
	success,
	error,
	validationError,
	handleActionError,
	safeFormGetJSON,
} from "@/shared/lib/actions";
import { logAudit } from "@/shared/lib/audit-log";
import { ADMIN_REVIEW_LIMITS } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";

import { REVIEWS_CACHE_TAGS, getReviewInvalidationTags } from "../constants/cache";
import { REVIEW_ERROR_MESSAGES } from "../constants/review.constants";
import { bulkRestoreReviewsSchema } from "../schemas/review.schemas";
import { updateProductReviewStats } from "../services/review-stats.service";

/**
 * Restaure plusieurs avis soft-deleted en masse (admin uniquement)
 * Max 100 avis par operation.
 */
export async function bulkRestoreReviews(
	_prevState: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_REVIEW_LIMITS.BULK_OPERATIONS);
		if ("error" in rateLimit) return rateLimit.error;

		const rawData = {
			ids: safeFormGetJSON<unknown>(formData, "ids") ?? [],
		};

		const validation = bulkRestoreReviewsSchema.safeParse(rawData);
		if (!validation.success) {
			const firstError = validation.error.issues[0];
			const errorPath = firstError?.path.join(".");
			return validationError(
				errorPath
					? `${errorPath}: ${firstError?.message}`
					: (firstError?.message ?? REVIEW_ERROR_MESSAGES.INVALID_DATA),
			);
		}

		const { ids } = validation.data;

		// Fetch only reviews that are currently soft-deleted
		const reviews = await prisma.productReview.findMany({
			where: {
				id: { in: ids },
				deletedAt: { not: null },
			},
			select: {
				id: true,
				productId: true,
				userId: true,
			},
		});

		if (reviews.length === 0) {
			return error("Aucun avis supprimé trouvé");
		}

		const productIds = [
			...new Set(reviews.map((r) => r.productId).filter((id): id is string => id !== null)),
		];

		await prisma.$transaction(async (tx) => {
			await tx.productReview.updateMany({
				where: {
					id: { in: reviews.map((r) => r.id) },
					deletedAt: { not: null },
				},
				data: { deletedAt: null },
			});

			await Promise.all(productIds.map((productId) => updateProductReviewStats(tx, productId)));
		});

		void logAudit({
			adminId: adminUser.id,
			adminName: adminUser.name ?? adminUser.email,
			action: "review.bulkRestore",
			targetType: "review",
			targetId: reviews.map((r) => r.id).join(","),
			metadata: { count: reviews.length },
		});

		const tagsToInvalidate = new Set<string>();
		reviews.forEach((review) => {
			if (review.userId) {
				getReviewInvalidationTags(review.productId, review.userId, review.id).forEach((tag) =>
					tagsToInvalidate.add(tag),
				);
			}
		});
		tagsToInvalidate.add(REVIEWS_CACHE_TAGS.ADMIN_LIST);
		tagsToInvalidate.forEach((tag) => updateTag(tag));

		return success(`${reviews.length} avis restauré(s) avec succès`, { count: reviews.length });
	} catch (e) {
		return handleActionError(e, REVIEW_ERROR_MESSAGES.RESTORE_FAILED);
	}
}
