"use server";

import { updateTag } from "next/cache";

import { logger } from "@/shared/lib/logger";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADMIN_CUSTOMIZATION_LIMITS } from "@/shared/lib/rate-limit-config";
import {
	validateInput,
	handleActionError,
	success,
	error,
	safeFormGet,
} from "@/shared/lib/actions";
import { logAudit } from "@/shared/lib/audit-log";
import { sanitizeForEmail } from "@/shared/lib/sanitize";
import { sendCustomizationStatusEmail } from "@/modules/emails/services/customization-emails";
import { getCustomizationInvalidationTags, CUSTOMIZATION_CACHE_TAGS } from "../constants/cache";
import { canTransitionTo, isFirstResponse } from "../services/customization-status.service";
import { updateStatusSchema } from "../schemas/update-status.schema";
import {
	CUSTOMIZATION_ERROR_MESSAGES,
	CUSTOMIZATION_SUCCESS_MESSAGES,
} from "../constants/error-messages";

// ============================================================================
// ACTION
// ============================================================================

export async function updateCustomizationStatus(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	// 1. Auth check
	const auth = await requireAdminWithUser();
	if ("error" in auth) return auth.error;
	const { user: adminUser } = auth;

	const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_CUSTOMIZATION_LIMITS.UPDATE);
	if ("error" in rateLimit) return rateLimit.error;

	// 2. Validate input
	const rawData = {
		requestId: safeFormGet(formData, "requestId"),
		status: safeFormGet(formData, "status"),
	};

	const validation = validateInput(updateStatusSchema, rawData);
	if ("error" in validation) {
		return validation.error;
	}

	const { requestId, status } = validation.data;

	try {
		// 3. Check if request exists
		const existing = await prisma.customizationRequest.findFirst({
			where: { id: requestId, ...notDeleted },
			select: {
				id: true,
				userId: true,
				status: true,
				email: true,
				firstName: true,
				productTypeLabel: true,
				details: true,
				adminNotes: true,
			},
		});

		if (!existing) {
			return error(CUSTOMIZATION_ERROR_MESSAGES.REQUEST_NOT_FOUND);
		}

		// 4. Validate status transition
		if (!canTransitionTo(existing.status, status)) {
			return error(CUSTOMIZATION_ERROR_MESSAGES.INVALID_TRANSITION);
		}

		// 5. Update status (optimistic lock: verify status hasn't changed since read)
		const updated = await prisma.customizationRequest.updateMany({
			where: { id: requestId, status: existing.status },
			data: {
				status,
				...(isFirstResponse(existing.status, status) && { respondedAt: new Date() }),
			},
		});

		if (updated.count === 0) {
			return error(CUSTOMIZATION_ERROR_MESSAGES.CONCURRENT_MODIFICATION);
		}

		void logAudit({
			adminId: adminUser.id,
			adminName: adminUser.name ?? adminUser.email,
			action: "customization.updateStatus",
			targetType: "customization",
			targetId: requestId,
			metadata: { previousStatus: existing.status, newStatus: status },
		});

		// 6. Invalidate cache
		const tags = [
			...getCustomizationInvalidationTags(),
			CUSTOMIZATION_CACHE_TAGS.DETAIL(requestId),
		];
		if (existing.userId) {
			tags.push(CUSTOMIZATION_CACHE_TAGS.USER_REQUESTS(existing.userId));
		}
		tags.forEach((tag) => updateTag(tag));

		// 7. Send status email if applicable
		if (
			existing.email &&
			(status === "IN_PROGRESS" || status === "COMPLETED" || status === "CANCELLED")
		) {
			sendCustomizationStatusEmail({
				email: sanitizeForEmail(existing.email),
				firstName: sanitizeForEmail(existing.firstName),
				productTypeLabel: sanitizeForEmail(existing.productTypeLabel),
				status,
				adminNotes: existing.adminNotes ? sanitizeForEmail(existing.adminNotes) : null,
				details: sanitizeForEmail(existing.details),
			}).catch((emailError: unknown) => {
				logger.error("Status email failed", emailError, { action: "updateCustomizationStatus" });
			});
		}

		return success(CUSTOMIZATION_SUCCESS_MESSAGES.STATUS_UPDATED);
	} catch (e) {
		return handleActionError(e, CUSTOMIZATION_ERROR_MESSAGES.UPDATE_STATUS_ERROR);
	}
}
