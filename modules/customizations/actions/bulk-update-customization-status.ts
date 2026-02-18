"use server";

import { updateTag } from "next/cache";

import { prisma, notDeleted } from "@/shared/lib/prisma";
import { CustomizationRequestStatus } from "@/app/generated/prisma/client";
import type { ActionState } from "@/shared/types/server-action";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADMIN_CUSTOMIZATION_LIMITS } from "@/shared/lib/rate-limit-config";
import {
	validateInput,
	handleActionError,
	success,
	error,
} from "@/shared/lib/actions";
import { sanitizeForEmail } from "@/shared/lib/sanitize";
import { sendCustomizationStatusEmail } from "@/modules/emails/services/customization-emails";
import { getCustomizationInvalidationTags, CUSTOMIZATION_CACHE_TAGS } from "../constants/cache";
import { canTransitionTo } from "../services/customization-status.service";
import { bulkUpdateStatusSchema } from "../schemas/bulk-update-status.schema";

// ============================================================================
// ACTION
// ============================================================================

export async function bulkUpdateCustomizationStatus(
	_: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	// 1. Auth check
	const admin = await requireAdmin();
	if ("error" in admin) return admin.error;

	const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_CUSTOMIZATION_LIMITS.BULK_UPDATE);
	if ("error" in rateLimit) return rateLimit.error;

	// 2. Validate input
	const rawData = {
		requestIds: formData.getAll("requestIds") as string[],
		status: formData.get("status") as string,
	};

	const validation = validateInput(bulkUpdateStatusSchema, rawData);
	if ("error" in validation) {
		return validation.error;
	}

	const { requestIds, status } = validation.data;

	try {
		// 3. Get existing requests to check for first response
		const existingRequests = await prisma.customizationRequest.findMany({
			where: {
				id: { in: requestIds },
				...notDeleted,
			},
			select: { id: true, userId: true, status: true, email: true, firstName: true, productTypeLabel: true, details: true, adminNotes: true },
		});

		if (existingRequests.length === 0) {
			return error("Aucune demande trouvee");
		}

		// 4. Filter out requests with invalid transitions
		const validRequests = existingRequests.filter((r) =>
			canTransitionTo(r.status, status)
		);

		if (validRequests.length === 0) {
			return error("Aucune transition de statut valide");
		}

		// 5. Separate requests that need respondedAt update
		const needsRespondedAt = validRequests
			.filter(
				(r) =>
					r.status === CustomizationRequestStatus.PENDING &&
					status !== CustomizationRequestStatus.PENDING
			)
			.map((r) => r.id);

		// 6. Update all requests atomically
		const validIds = validRequests.map((r) => r.id);
		const otherIds = validIds.filter((id) => !needsRespondedAt.includes(id));
		const txOperations = [];

		if (needsRespondedAt.length > 0) {
			txOperations.push(
				prisma.customizationRequest.updateMany({
					where: { id: { in: needsRespondedAt } },
					data: { status, respondedAt: new Date() },
				})
			);
		}

		if (otherIds.length > 0) {
			txOperations.push(
				prisma.customizationRequest.updateMany({
					where: { id: { in: otherIds } },
					data: { status },
				})
			);
		}

		await prisma.$transaction(txOperations);

		// 7. Invalidate cache (LIST, STATS, DETAIL per request, USER_REQUESTS per user)
		const tags = getCustomizationInvalidationTags();
		for (const request of validRequests) {
			tags.push(CUSTOMIZATION_CACHE_TAGS.DETAIL(request.id));
		}
		// Collect unique userIds for cache invalidation
		const userIds = new Set<string>();
		for (const request of validRequests) {
			if (request.userId) {
				userIds.add(request.userId);
			}
		}
		for (const uid of userIds) {
			tags.push(CUSTOMIZATION_CACHE_TAGS.USER_REQUESTS(uid));
		}
		tags.forEach((tag) => updateTag(tag));

		// 8. Send status emails if applicable
		if (status === "IN_PROGRESS" || status === "COMPLETED" || status === "CANCELLED") {
			for (const request of validRequests) {
				if (request.email) {
					sendCustomizationStatusEmail({
						email: sanitizeForEmail(request.email),
						firstName: sanitizeForEmail(request.firstName),
						productTypeLabel: sanitizeForEmail(request.productTypeLabel),
						status,
						adminNotes: request.adminNotes ? sanitizeForEmail(request.adminNotes) : null,
						details: sanitizeForEmail(request.details),
					}).catch((emailError) => {
						console.error("[EMAIL] Bulk status email failed", {
							requestId: request.id,
							error: emailError,
						});
					});
				}
			}
		}

		const count = validRequests.length;
		return success(
			`${count} demande${count > 1 ? "s" : ""} mise${count > 1 ? "s" : ""} a jour`,
			{ count }
		);
	} catch (e) {
		return handleActionError(e, "Erreur lors de la mise à jour en masse");
	}
}
