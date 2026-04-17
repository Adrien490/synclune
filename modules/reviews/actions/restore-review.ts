"use server";

import { updateTag } from "next/cache";
import { prisma } from "@/shared/lib/prisma";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { logAudit } from "@/shared/lib/audit-log";
import { ADMIN_REVIEW_LIMITS } from "@/shared/lib/rate-limit-config";
import { success, notFound, validationError, handleActionError } from "@/shared/lib/actions";
import type { ActionState } from "@/shared/types/server-action";

import { getReviewInvalidationTags } from "../constants/cache";
import { REVIEW_ERROR_MESSAGES } from "../constants/review.constants";
import { restoreReviewSchema } from "../schemas/review.schemas";
import { updateProductReviewStats } from "../services/review-stats.service";

/**
 * Restaure un avis soft-deleted (admin uniquement)
 *
 * Cas d'usage : annuler une suppression accidentelle (cote utilisateur ou cote admin bulk).
 * L'avis retrouve son status initial (PUBLISHED ou HIDDEN) tel qu'il etait avant suppression.
 */
export async function restoreReview(
	_prevState: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_REVIEW_LIMITS.RESTORE);
		if ("error" in rateLimit) return rateLimit.error;

		const rawData = {
			id: formData.get("id"),
		};

		const validation = restoreReviewSchema.safeParse(rawData);
		if (!validation.success) {
			const firstError = validation.error.issues[0];
			const errorPath = firstError?.path.join(".");
			return validationError(
				errorPath
					? `${errorPath}: ${firstError?.message}`
					: (firstError?.message ?? REVIEW_ERROR_MESSAGES.INVALID_DATA),
			);
		}

		const { id } = validation.data;

		const review = await prisma.productReview.findUnique({
			where: { id },
			select: {
				id: true,
				productId: true,
				userId: true,
				deletedAt: true,
				status: true,
			},
		});

		if (!review) {
			return notFound("Avis");
		}

		if (!review.deletedAt) {
			return validationError(REVIEW_ERROR_MESSAGES.NOT_DELETED);
		}

		await prisma.$transaction(async (tx) => {
			await tx.productReview.update({
				where: { id },
				data: { deletedAt: null },
			});

			if (review.productId) {
				await updateProductReviewStats(tx, review.productId);
			}
		});

		void logAudit({
			adminId: adminUser.id,
			adminName: adminUser.name ?? adminUser.email,
			action: "review.restore",
			targetType: "review",
			targetId: id,
			metadata: {
				previousDeletedAt: review.deletedAt.toISOString(),
				status: review.status,
			},
		});

		if (review.userId) {
			const tags = getReviewInvalidationTags(review.productId, review.userId, id);
			tags.forEach((tag) => updateTag(tag));
		}

		return success("Avis restauré avec succès");
	} catch (e) {
		return handleActionError(e, REVIEW_ERROR_MESSAGES.RESTORE_FAILED);
	}
}
