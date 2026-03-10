"use server";

import { updateTag } from "next/cache";

import * as Sentry from "@sentry/nextjs";
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
import { sanitizeText } from "@/shared/lib/sanitize";
import { getCustomizationInvalidationTags, CUSTOMIZATION_CACHE_TAGS } from "../constants/cache";
import { updateNotesSchema } from "../schemas/update-notes.schema";
import {
	CUSTOMIZATION_ERROR_MESSAGES,
	CUSTOMIZATION_SUCCESS_MESSAGES,
} from "../constants/error-messages";

// ============================================================================
// ACTION
// ============================================================================

export async function updateCustomizationNotes(
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
		notes: safeFormGet(formData, "notes"),
	};

	const validation = validateInput(updateNotesSchema, rawData);
	if ("error" in validation) {
		return validation.error;
	}

	const { requestId, notes } = validation.data;

	// 2b. Sanitize text input
	const sanitizedNotes = notes ? sanitizeText(notes) : null;

	try {
		// 3. Check if request exists
		const existing = await prisma.customizationRequest.findFirst({
			where: { id: requestId, ...notDeleted },
			select: { id: true },
		});

		if (!existing) {
			return error(CUSTOMIZATION_ERROR_MESSAGES.REQUEST_NOT_FOUND);
		}

		// 4. Update notes
		await prisma.customizationRequest.update({
			where: { id: requestId },
			data: { adminNotes: sanitizedNotes },
		});

		void logAudit({
			adminId: adminUser.id,
			adminName: adminUser.name ?? adminUser.email,
			action: "customization.updateNotes",
			targetType: "customization",
			targetId: requestId,
			metadata: { hasNotes: !!sanitizedNotes },
		});

		// 5. Invalidate cache
		const tags = [
			...getCustomizationInvalidationTags(),
			CUSTOMIZATION_CACHE_TAGS.DETAIL(requestId),
		];
		tags.forEach((tag) => updateTag(tag));

		return success(
			sanitizedNotes
				? CUSTOMIZATION_SUCCESS_MESSAGES.NOTES_UPDATED
				: CUSTOMIZATION_SUCCESS_MESSAGES.NOTES_DELETED,
		);
	} catch (e) {
		Sentry.captureException(e);
		return handleActionError(e, CUSTOMIZATION_ERROR_MESSAGES.UPDATE_NOTES_ERROR);
	}
}
