"use server";

import { updateTag } from "next/cache";

import { prisma, notDeleted } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import {
	validateInput,
	handleActionError,
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
			return {
				status: ActionStatus.NOT_FOUND,
				message: "Demande non trouvée",
			};
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

		return {
			status: ActionStatus.SUCCESS,
			message: sanitizedNotes ? "Notes mises à jour" : "Notes supprimées",
		};
	} catch (e) {
		return handleActionError(e, "Erreur lors de la mise à jour des notes");
	}
}
