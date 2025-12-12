"use server";

import { updateTag } from "next/cache";

import { prisma, notDeleted } from "@/shared/lib/prisma";
import { CustomizationRequestStatus } from "@/app/generated/prisma/client";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { requireAdmin, validateInput, handleActionError } from "@/shared/lib/actions";
import { getCustomizationInvalidationTags, CUSTOMIZATION_CACHE_TAGS } from "../constants/cache";
import { updateStatusSchema } from "../schemas/update-status.schema";

// ============================================================================
// ACTION
// ============================================================================

export async function updateCustomizationStatus(
	_: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	// 1. Auth check
	const admin = await requireAdmin();
	if ("error" in admin) return admin.error;

	// 2. Validate input
	const rawData = {
		requestId: formData.get("requestId") as string,
		status: formData.get("status") as string,
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
			select: { id: true, status: true },
		});

		if (!existing) {
			return {
				status: ActionStatus.NOT_FOUND,
				message: "Demande non trouvée",
			};
		}

		// 4. Update status
		const isFirstResponse =
			existing.status === CustomizationRequestStatus.PENDING &&
			status !== CustomizationRequestStatus.PENDING;

		await prisma.customizationRequest.update({
			where: { id: requestId },
			data: {
				status,
				...(isFirstResponse && { respondedAt: new Date() }),
			},
		});

		// 5. Invalidate cache
		const tags = [
			...getCustomizationInvalidationTags(),
			CUSTOMIZATION_CACHE_TAGS.DETAIL(requestId),
		];
		tags.forEach((tag) => updateTag(tag));

		return {
			status: ActionStatus.SUCCESS,
			message: "Statut mis à jour",
		};
	} catch (e) {
		return handleActionError(e, "Erreur lors de la mise à jour du statut");
	}
}
