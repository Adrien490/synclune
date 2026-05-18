"use server";

import { ReviewStatus } from "@/app/generated/prisma/client";
import { updateTag } from "next/cache";

import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import {
	error,
	handleActionError,
	parseFormIds,
	safeFormGet,
	success,
	validateInput,
} from "@/shared/lib/actions";
import { notDeleted, prisma } from "@/shared/lib/prisma";
import { ADMIN_REVIEW_LIMITS } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";

import { getReviewModerationTags } from "../constants/cache";
import { REVIEW_ERROR_MESSAGES } from "../constants/review.constants";
import { bulkModerateReviewsSchema } from "../schemas/review.schemas";
import { recomputeProductReviewStatsBatch } from "../services/review-stats.service";

/**
 * Masque ou republie en lot plusieurs avis.
 *
 * formData :
 * - `reviewIds`     : JSON array cuid2 (1..100)
 * - `targetStatus`  : "PUBLISHED" | "HIDDEN"
 */
export async function bulkModerateReviews(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		const auth = await requireAdmin();
		if ("error" in auth) return auth.error;
		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_REVIEW_LIMITS.MODERATE);
		if ("error" in rateLimit) return rateLimit.error;

		const idsResult = parseFormIds(formData, "reviewIds");
		if ("error" in idsResult) return idsResult.error;

		const validation = validateInput(bulkModerateReviewsSchema, {
			reviewIds: idsResult.ids,
			targetStatus: safeFormGet(formData, "targetStatus") ?? undefined,
		});
		if ("error" in validation) return validation.error;

		const { reviewIds, targetStatus } = validation.data;

		const reviews = await prisma.productReview.findMany({
			where: { id: { in: reviewIds }, ...notDeleted },
			select: { id: true, productId: true, status: true },
		});

		if (reviews.length === 0) {
			return error("Aucun avis valide trouvé");
		}

		const eligible = reviews.filter((r) => r.status !== targetStatus);

		if (eligible.length === 0) {
			return error(
				targetStatus === ReviewStatus.PUBLISHED
					? "Tous les avis sélectionnés sont déjà publiés"
					: "Tous les avis sélectionnés sont déjà masqués",
			);
		}

		const eligibleIds = eligible.map((r) => r.id);
		const productIdsToUpdate = Array.from(
			new Set(eligible.map((r) => r.productId).filter((id): id is string => id !== null)),
		);

		await prisma.$transaction(async (tx) => {
			await tx.productReview.updateMany({
				where: { id: { in: eligibleIds } },
				data: { status: targetStatus },
			});

			await recomputeProductReviewStatsBatch(tx, productIdsToUpdate);
		});

		const tags = new Set<string>();
		for (const r of eligible) {
			getReviewModerationTags(r.productId, r.id).forEach((tag) => tags.add(tag));
		}
		tags.forEach((tag) => updateTag(tag));

		const verb = targetStatus === ReviewStatus.HIDDEN ? "masqué" : "republié";
		const plural = eligibleIds.length > 1 ? "s" : "";
		return success(`${eligibleIds.length} avis ${verb}${plural} avec succès`, {
			count: eligibleIds.length,
			targetStatus,
		});
	} catch (e) {
		return handleActionError(e, REVIEW_ERROR_MESSAGES.MODERATE_FAILED);
	}
}
