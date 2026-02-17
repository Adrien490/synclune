"use server";

import { updateTag } from "next/cache";

import { prisma, notDeleted } from "@/shared/lib/prisma";
import { CustomizationRequestStatus } from "@/app/generated/prisma/client";
import type { ActionState } from "@/shared/types/server-action";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import {
	validateInput,
	handleActionError,
	success,
	error,
} from "@/shared/lib/actions";
import { sendCustomizationStatusEmail } from "@/modules/emails/services/customization-emails";
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
			select: { id: true, userId: true, status: true, email: true, firstName: true, productTypeLabel: true, details: true, adminNotes: true },
		});

		if (!existing) {
			return error("Demande non trouvee");
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
		if (existing.userId) {
			tags.push(CUSTOMIZATION_CACHE_TAGS.USER_REQUESTS(existing.userId));
		}
		tags.forEach((tag) => updateTag(tag));

		// 6. Send status email if applicable
		if (
			status !== CustomizationRequestStatus.PENDING &&
			existing.email &&
			(status === "IN_PROGRESS" || status === "COMPLETED" || status === "CANCELLED")
		) {
			sendCustomizationStatusEmail({
				email: existing.email,
				firstName: existing.firstName,
				productTypeLabel: existing.productTypeLabel,
				status,
				adminNotes: existing.adminNotes,
				details: existing.details,
			}).catch((emailError) => {
				console.error("[EMAIL] Status email failed", {
					requestId,
					error: emailError,
				});
			});
		}

		return success("Statut mis a jour");
	} catch (e) {
		return handleActionError(e, "Erreur lors de la mise à jour du statut");
	}
}
