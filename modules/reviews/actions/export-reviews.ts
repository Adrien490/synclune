"use server";

import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { handleActionError, success, validateInput, safeFormGet } from "@/shared/lib/actions";
import { logAudit } from "@/shared/lib/audit-log";
import { ADMIN_REVIEW_LIMITS } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";

import { REVIEW_ERROR_MESSAGES } from "../constants/review.constants";
import { exportReviewsSchema, type ExportReviewsInput } from "../schemas/review.schemas";
import { getReviewsForExport } from "../data/get-reviews-for-export";
import { buildReviewExport } from "../services/review-export.service";

/**
 * Exporte les avis au format CSV ou JSON (admin uniquement).
 *
 * Cas d'usage:
 * - Export comptable / audit legal (10 ans de retention)
 * - Analyse de la qualite des avis (NPS, rating moyen par produit)
 * - Preuve de moderation en cas de litige UGC
 *
 * Rate limit: 3/5min (proteger contre generation massive).
 */
export async function exportReviewsAction(
	_prevState: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_REVIEW_LIMITS.EXPORT);
		if ("error" in rateLimit) return rateLimit.error;

		const validation = validateInput<ExportReviewsInput>(exportReviewsSchema, {
			period: safeFormGet(formData, "period"),
			format: safeFormGet(formData, "format"),
			includeHidden: safeFormGet(formData, "includeHidden"),
			includeDeleted: safeFormGet(formData, "includeDeleted"),
		});
		if ("error" in validation) return validation.error;

		const { period, format, includeHidden, includeDeleted } = validation.data;

		const rows = await getReviewsForExport(period, includeHidden, includeDeleted);
		const payload = buildReviewExport(period, format, rows);

		void logAudit({
			adminId: adminUser.id,
			adminName: adminUser.name ?? adminUser.email,
			action: "review.export",
			targetType: "review",
			targetId: "bulk",
			metadata: {
				period,
				format,
				includeHidden,
				includeDeleted,
				rowCount: payload.rowCount,
			},
		});

		return success("Export généré", payload);
	} catch (e) {
		return handleActionError(e, REVIEW_ERROR_MESSAGES.EXPORT_FAILED);
	}
}
