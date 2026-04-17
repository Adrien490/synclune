"use server";

import { updateTag } from "next/cache";
import * as Sentry from "@sentry/nextjs";

import { prisma, notDeleted } from "@/shared/lib/prisma";
import { ProductStatus } from "@/app/generated/prisma/client";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADMIN_CUSTOMIZATION_LIMITS } from "@/shared/lib/rate-limit-config";
import {
	validateInput,
	handleActionError,
	success,
	error,
	notFound,
	safeFormGet,
	safeFormGetJSON,
} from "@/shared/lib/actions";
import { logAudit } from "@/shared/lib/audit-log";
import type { ActionState } from "@/shared/types/server-action";

import { getCustomizationInvalidationTags, CUSTOMIZATION_CACHE_TAGS } from "../constants/cache";
import {
	CUSTOMIZATION_ERROR_MESSAGES,
	CUSTOMIZATION_SUCCESS_MESSAGES,
} from "../constants/error-messages";
import { updateInspirationProductsSchema } from "../schemas/update-inspiration-products.schema";

/**
 * Admin action — update the inspiration products of a customization request.
 *
 * Sets the many-to-many relation `CustomizationRequest.inspirationProducts` to
 * the provided list of product IDs (max 10). All products must exist, be PUBLIC
 * and not soft-deleted.
 */
export async function updateCustomizationInspirationProducts(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	// 1. Auth
	const auth = await requireAdminWithUser();
	if ("error" in auth) return auth.error;
	const { user: adminUser } = auth;

	// 2. Rate limit
	const rateLimit = await enforceRateLimitForCurrentUser(
		ADMIN_CUSTOMIZATION_LIMITS.UPDATE_INSPIRATIONS,
	);
	if ("error" in rateLimit) return rateLimit.error;

	// 3. Validation
	const validation = validateInput(updateInspirationProductsSchema, {
		requestId: safeFormGet(formData, "requestId"),
		productIds: safeFormGetJSON<string[]>(formData, "productIds") ?? [],
	});
	if ("error" in validation) return validation.error;
	const { requestId, productIds } = validation.data;

	try {
		// 4. Verify request exists
		const existing = await prisma.customizationRequest.findFirst({
			where: { id: requestId, ...notDeleted },
			select: {
				id: true,
				userId: true,
				inspirationProducts: { select: { id: true } },
			},
		});

		if (!existing) {
			return notFound(CUSTOMIZATION_ERROR_MESSAGES.REQUEST_NOT_FOUND);
		}

		// 5. Verify products exist + PUBLIC + non-deleted (only when productIds is non-empty)
		if (productIds.length > 0) {
			const validProducts = await prisma.product.findMany({
				where: {
					id: { in: productIds },
					status: ProductStatus.PUBLIC,
					...notDeleted,
				},
				select: { id: true },
			});

			if (validProducts.length !== productIds.length) {
				return error(CUSTOMIZATION_ERROR_MESSAGES.INSPIRATION_PRODUCTS_INVALID);
			}
		}

		// 6. Mutate the many-to-many relation
		await prisma.customizationRequest.update({
			where: { id: requestId },
			data: {
				inspirationProducts: {
					set: productIds.map((id) => ({ id })),
				},
			},
		});

		// 7. Audit log
		const previousIds = existing.inspirationProducts.map((p) => p.id);
		const added = productIds.filter((id) => !previousIds.includes(id));
		const removed = previousIds.filter((id) => !productIds.includes(id));

		void logAudit({
			adminId: adminUser.id,
			adminName: adminUser.name ?? adminUser.email,
			action: "customization.updateInspirations",
			targetType: "customization",
			targetId: requestId,
			metadata: {
				added,
				removed,
				total: productIds.length,
			},
		});

		// 8. Cache invalidation
		const tags = [
			...getCustomizationInvalidationTags(),
			CUSTOMIZATION_CACHE_TAGS.DETAIL(requestId),
		];
		if (existing.userId) {
			tags.push(CUSTOMIZATION_CACHE_TAGS.USER_REQUESTS(existing.userId));
		}
		tags.forEach((tag) => updateTag(tag));

		return success(CUSTOMIZATION_SUCCESS_MESSAGES.INSPIRATIONS_UPDATED(productIds.length));
	} catch (e) {
		Sentry.captureException(e);
		return handleActionError(e, CUSTOMIZATION_ERROR_MESSAGES.UPDATE_INSPIRATIONS_ERROR);
	}
}
