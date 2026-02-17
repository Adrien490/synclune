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

		// 4. Separate requests that need respondedAt update
		const needsRespondedAt = existingRequests
			.filter(
				(r) =>
					r.status === CustomizationRequestStatus.PENDING &&
					status !== CustomizationRequestStatus.PENDING
			)
			.map((r) => r.id);

		// 5. Update all requests atomically
		const otherIds = requestIds.filter((id) => !needsRespondedAt.includes(id));
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

		// 6. Invalidate cache (LIST, STATS, DETAIL per request, USER_REQUESTS per user)
		const tags = getCustomizationInvalidationTags();
		for (const request of existingRequests) {
			tags.push(CUSTOMIZATION_CACHE_TAGS.DETAIL(request.id));
		}
		// Collect unique userIds for cache invalidation
		const userIds = new Set<string>();
		for (const request of existingRequests) {
			if (request.userId) {
				userIds.add(request.userId);
			}
		}
		for (const uid of userIds) {
			tags.push(CUSTOMIZATION_CACHE_TAGS.USER_REQUESTS(uid));
		}
		tags.forEach((tag) => updateTag(tag));

		// 7. Send status emails if applicable
		if (status === "IN_PROGRESS" || status === "COMPLETED" || status === "CANCELLED") {
			for (const request of existingRequests) {
				if (request.email) {
					sendCustomizationStatusEmail({
						email: request.email,
						firstName: request.firstName,
						productTypeLabel: request.productTypeLabel,
						status,
						adminNotes: request.adminNotes,
						details: request.details,
					}).catch((emailError) => {
						console.error("[EMAIL] Bulk status email failed", {
							requestId: request.id,
							error: emailError,
						});
					});
				}
			}
		}

		const count = existingRequests.length;
		return success(
			`${count} demande${count > 1 ? "s" : ""} mise${count > 1 ? "s" : ""} a jour`,
			{ count }
		);
	} catch (e) {
		return handleActionError(e, "Erreur lors de la mise à jour en masse");
	}
}
