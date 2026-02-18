"use server";

import { updateTag } from "next/cache";

import { prisma, notDeleted } from "@/shared/lib/prisma";
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
import { sanitizeText } from "@/shared/lib/sanitize";
import {
	getCustomizationInvalidationTags,
	CUSTOMIZATION_CACHE_TAGS,
} from "../constants/cache";
import { updateNotesSchema } from "../schemas/update-notes.schema";

// ============================================================================
// ACTION
// ============================================================================

export async function updateCustomizationNotes(
	_: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	// 1. Auth check
	const admin = await requireAdmin();
	if ("error" in admin) return admin.error;

	const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_CUSTOMIZATION_LIMITS.UPDATE);
	if ("error" in rateLimit) return rateLimit.error;

	// 2. Validate input
	const rawData = {
		requestId: formData.get("requestId") as string,
		notes: formData.get("notes") as string,
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
			return error("Demande non trouvee");
		}

		// 4. Update notes
		await prisma.customizationRequest.update({
			where: { id: requestId },
			data: { adminNotes: sanitizedNotes },
		});

		// 5. Invalidate cache
		const tags = [
			...getCustomizationInvalidationTags(),
			CUSTOMIZATION_CACHE_TAGS.DETAIL(requestId),
		];
		tags.forEach((tag) => updateTag(tag));

		return success(sanitizedNotes ? "Notes mises a jour" : "Notes supprimees");
	} catch (e) {
		return handleActionError(e, "Erreur lors de la mise à jour des notes");
	}
}
