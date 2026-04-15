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
	notFound,
	safeFormGet,
} from "@/shared/lib/actions";
import { logAudit } from "@/shared/lib/audit-log";
import { getCustomizationInvalidationTags, CUSTOMIZATION_CACHE_TAGS } from "../constants/cache";
import {
	CUSTOMIZATION_ERROR_MESSAGES,
	CUSTOMIZATION_SUCCESS_MESSAGES,
} from "../constants/error-messages";
import { z } from "zod";

const deleteCustomizationRequestSchema = z.object({
	requestId: z.string().cuid2("ID invalide"),
});

/**
 * Suppression (soft delete) d'une demande de personnalisation par un administrateur
 * Utilisé pour supprimer les spams, doublons ou demandes invalides
 */
export async function deleteCustomizationRequest(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	// 1. Auth check
	const auth = await requireAdminWithUser();
	if ("error" in auth) return auth.error;
	const { user: adminUser } = auth;

	// 2. Rate limiting
	const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_CUSTOMIZATION_LIMITS.DELETE);
	if ("error" in rateLimit) return rateLimit.error;

	// 3. Validation
	const validation = validateInput(deleteCustomizationRequestSchema, {
		requestId: safeFormGet(formData, "requestId"),
	});
	if ("error" in validation) return validation.error;

	const { requestId } = validation.data;

	try {
		// 4. Vérifier existence
		const existing = await prisma.customizationRequest.findFirst({
			where: { id: requestId, ...notDeleted },
			select: {
				id: true,
				userId: true,
				firstName: true,
				email: true,
			},
		});

		if (!existing) {
			return notFound("Demande non trouvée");
		}

		// 5. Soft delete
		await prisma.customizationRequest.update({
			where: { id: requestId },
			data: { deletedAt: new Date() },
		});

		// 6. Audit log
		void logAudit({
			adminId: adminUser.id,
			adminName: adminUser.name ?? adminUser.email,
			action: "customization.delete",
			targetType: "customization",
			targetId: requestId,
			metadata: { email: existing.email, firstName: existing.firstName },
		});

		// 7. Invalidation cache
		const tags = getCustomizationInvalidationTags(requestId);
		if (existing.userId) {
			tags.push(CUSTOMIZATION_CACHE_TAGS.USER_REQUESTS(existing.userId));
		}
		tags.forEach((tag) => updateTag(tag));

		return success(CUSTOMIZATION_SUCCESS_MESSAGES.DELETED);
	} catch (e) {
		Sentry.captureException(e);
		return handleActionError(e, CUSTOMIZATION_ERROR_MESSAGES.DELETE_ERROR);
	}
}
