"use server";

import { updateTag } from "next/cache";
import * as Sentry from "@sentry/nextjs";

import { logger } from "@/shared/lib/logger";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import { requireAuth } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { CUSTOMIZATION_CUSTOMER_CANCEL_LIMIT } from "@/shared/lib/rate-limit-config";
import { sanitizeForEmail } from "@/shared/lib/sanitize";
import { sendCustomizationStatusEmail } from "@/modules/emails/services/customization-emails";
import {
	validateInput,
	handleActionError,
	success,
	error,
	notFound,
	forbidden,
	safeFormGet,
} from "@/shared/lib/actions";
import type { ActionState } from "@/shared/types/server-action";

import { canCustomerCancel } from "../services/customization-status.service";
import { getCustomizationInvalidationTags, CUSTOMIZATION_CACHE_TAGS } from "../constants/cache";
import {
	CUSTOMIZATION_ERROR_MESSAGES,
	CUSTOMIZATION_SUCCESS_MESSAGES,
} from "../constants/error-messages";
import { cancelCustomerSchema } from "../schemas/cancel-customer.schema";

/**
 * Customer-facing cancellation of a customization request.
 *
 * Rules:
 * - Only the request owner can cancel (IDOR protection)
 * - Only PENDING requests can be cancelled (artisan not yet engaged)
 * - Optimistic lock to prevent race with admin status updates
 * - Status email sent to customer (CANCELLED)
 * - Admin sees the new status via cache invalidation
 */
export async function cancelCustomizationRequestCustomer(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	// 1. Auth check
	const auth = await requireAuth();
	if ("error" in auth) return auth.error;
	const { user } = auth;

	// 2. Rate limiting (customer-scoped)
	const rateLimit = await enforceRateLimitForCurrentUser(CUSTOMIZATION_CUSTOMER_CANCEL_LIMIT);
	if ("error" in rateLimit) return rateLimit.error;

	// 3. Validation
	const validation = validateInput(cancelCustomerSchema, {
		requestId: safeFormGet(formData, "requestId"),
	});
	if ("error" in validation) return validation.error;
	const { requestId } = validation.data;

	try {
		// 4. Lookup with IDOR check baked in (userId match)
		const existing = await prisma.customizationRequest.findFirst({
			where: { id: requestId, ...notDeleted },
			select: {
				id: true,
				userId: true,
				status: true,
				email: true,
				firstName: true,
				productTypeLabel: true,
				details: true,
				adminNotes: true,
			},
		});

		if (!existing) {
			return notFound(CUSTOMIZATION_ERROR_MESSAGES.REQUEST_NOT_FOUND);
		}

		// 5. IDOR protection
		if (existing.userId !== user.id) {
			return forbidden(CUSTOMIZATION_ERROR_MESSAGES.REQUEST_NOT_FOUND);
		}

		// 6. Already cancelled
		if (existing.status === "CANCELLED") {
			return error(CUSTOMIZATION_ERROR_MESSAGES.ALREADY_CANCELLED);
		}

		// 7. State machine: customer can only cancel PENDING
		if (!canCustomerCancel(existing.status)) {
			return error(CUSTOMIZATION_ERROR_MESSAGES.CANNOT_CUSTOMER_CANCEL);
		}

		// 8. Update with optimistic lock (status hasn't changed since read)
		const updated = await prisma.customizationRequest.updateMany({
			where: { id: requestId, status: existing.status },
			data: { status: "CANCELLED" },
		});

		if (updated.count === 0) {
			return error(CUSTOMIZATION_ERROR_MESSAGES.CONCURRENT_MODIFICATION);
		}

		// 9. Customer-side log (audit log is admin-only)
		logger.info("Customization request cancelled by customer", {
			action: "cancelCustomizationRequestCustomer",
			requestId,
			userId: user.id,
			previousStatus: existing.status,
		});

		// 10. Cache invalidation
		const tags = [
			...getCustomizationInvalidationTags(),
			CUSTOMIZATION_CACHE_TAGS.DETAIL(requestId),
			CUSTOMIZATION_CACHE_TAGS.USER_REQUESTS(user.id),
		];
		tags.forEach((tag) => updateTag(tag));

		// 11. Send confirmation email to customer (fire-and-forget)
		if (existing.email) {
			sendCustomizationStatusEmail({
				email: sanitizeForEmail(existing.email),
				firstName: sanitizeForEmail(existing.firstName),
				productTypeLabel: sanitizeForEmail(existing.productTypeLabel),
				status: "CANCELLED",
				adminNotes: existing.adminNotes ? sanitizeForEmail(existing.adminNotes) : null,
				details: sanitizeForEmail(existing.details),
			}).catch((emailError: unknown) => {
				logger.error("Customer cancel email failed", emailError, {
					action: "cancelCustomizationRequestCustomer",
				});
			});
		}

		return success(CUSTOMIZATION_SUCCESS_MESSAGES.CUSTOMER_CANCELLED);
	} catch (e) {
		Sentry.captureException(e);
		return handleActionError(e, CUSTOMIZATION_ERROR_MESSAGES.CUSTOMER_CANCEL_ERROR);
	}
}
