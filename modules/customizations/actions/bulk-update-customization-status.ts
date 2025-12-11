"use server";

import { updateTag } from "next/cache";
import { z } from "zod";

import { prisma, notDeleted } from "@/shared/lib/prisma";
import { CustomizationRequestStatus } from "@/app/generated/prisma/client";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import {
	requireAdmin,
	validateInput,
	handleActionError,
} from "@/shared/lib/actions";
import { getCustomizationInvalidationTags } from "../constants/cache";

// ============================================================================
// SCHEMA
// ============================================================================

const bulkUpdateStatusSchema = z.object({
	requestIds: z.array(z.string().cuid()).min(1, "Au moins une demande requise"),
	status: z.nativeEnum(CustomizationRequestStatus),
});

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
			select: { id: true, status: true },
		});

		if (existingRequests.length === 0) {
			return {
				status: ActionStatus.NOT_FOUND,
				message: "Aucune demande trouvée",
			};
		}

		// 4. Separate requests that need respondedAt update
		const needsRespondedAt = existingRequests
			.filter(
				(r) =>
					r.status === CustomizationRequestStatus.PENDING &&
					status !== CustomizationRequestStatus.PENDING
			)
			.map((r) => r.id);

		// 5. Update all requests
		const updatePromises = [];

		// Update requests that need respondedAt
		if (needsRespondedAt.length > 0) {
			updatePromises.push(
				prisma.customizationRequest.updateMany({
					where: { id: { in: needsRespondedAt } },
					data: { status, respondedAt: new Date() },
				})
			);
		}

		// Update requests that don't need respondedAt
		const otherIds = requestIds.filter((id) => !needsRespondedAt.includes(id));
		if (otherIds.length > 0) {
			updatePromises.push(
				prisma.customizationRequest.updateMany({
					where: { id: { in: otherIds } },
					data: { status },
				})
			);
		}

		await Promise.all(updatePromises);

		// 6. Invalidate cache
		const tags = getCustomizationInvalidationTags();
		tags.forEach((tag) => updateTag(tag));

		const count = existingRequests.length;
		return {
			status: ActionStatus.SUCCESS,
			message: `${count} demande${count > 1 ? "s" : ""} mise${count > 1 ? "s" : ""} à jour`,
			data: { count },
		};
	} catch (e) {
		return handleActionError(e, "Erreur lors de la mise à jour en masse");
	}
}
