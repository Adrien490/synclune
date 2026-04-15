"use server";

import { updateTag } from "next/cache";
import * as Sentry from "@sentry/nextjs";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADMIN_CUSTOMIZATION_LIMITS } from "@/shared/lib/rate-limit-config";
import { validateInput, handleActionError, success, error } from "@/shared/lib/actions";
import { logAudit } from "@/shared/lib/audit-log";
import { getCustomizationInvalidationTags, CUSTOMIZATION_CACHE_TAGS } from "../constants/cache";
import {
	CUSTOMIZATION_ERROR_MESSAGES,
	CUSTOMIZATION_SUCCESS_MESSAGES,
} from "../constants/error-messages";
import { z } from "zod";

const bulkDeleteCustomizationRequestsSchema = z.object({
	requestIds: z
		.array(z.string().cuid2("ID invalide"))
		.min(1, "Au moins une demande est requise")
		.max(100, "Maximum 100 demandes par opération"),
});

/**
 * Suppression en masse (soft delete) de demandes de personnalisation par un administrateur
 * Utilisé pour supprimer les spams, doublons ou demandes invalides en masse
 */
export async function bulkDeleteCustomizationRequests(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	// 1. Auth check
	const auth = await requireAdminWithUser();
	if ("error" in auth) return auth.error;
	const { user: adminUser } = auth;

	// 2. Rate limiting
	const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_CUSTOMIZATION_LIMITS.BULK_DELETE);
	if ("error" in rateLimit) return rateLimit.error;

	// 3. Validation
	const requestIds = formData.getAll("requestIds") as string[];
	const validation = validateInput(bulkDeleteCustomizationRequestsSchema, { requestIds });
	if ("error" in validation) return validation.error;

	const { requestIds: validatedIds } = validation.data;

	try {
		// 4. Récupérer les demandes existantes (pour cache invalidation)
		const existing = await prisma.customizationRequest.findMany({
			where: { id: { in: validatedIds }, ...notDeleted },
			select: { id: true, userId: true },
		});

		if (existing.length === 0) {
			return error(CUSTOMIZATION_ERROR_MESSAGES.NO_REQUESTS_FOUND);
		}

		// 5. Soft delete en masse
		await prisma.customizationRequest.updateMany({
			where: { id: { in: existing.map((r) => r.id) } },
			data: { deletedAt: new Date() },
		});

		// 6. Audit log
		void logAudit({
			adminId: adminUser.id,
			adminName: adminUser.name ?? adminUser.email,
			action: "customization.bulkDelete",
			targetType: "customization",
			targetId: existing.map((r) => r.id).join(","),
			metadata: { count: existing.length },
		});

		// 7. Invalidation cache
		const tags = getCustomizationInvalidationTags();
		const userIds = new Set<string>();
		for (const request of existing) {
			tags.push(CUSTOMIZATION_CACHE_TAGS.DETAIL(request.id));
			if (request.userId) userIds.add(request.userId);
		}
		for (const uid of userIds) {
			tags.push(CUSTOMIZATION_CACHE_TAGS.USER_REQUESTS(uid));
		}
		tags.forEach((tag) => updateTag(tag));

		const count = existing.length;
		return success(CUSTOMIZATION_SUCCESS_MESSAGES.BULK_DELETED(count), { count });
	} catch (e) {
		Sentry.captureException(e);
		return handleActionError(e, CUSTOMIZATION_ERROR_MESSAGES.BULK_DELETE_ERROR);
	}
}
