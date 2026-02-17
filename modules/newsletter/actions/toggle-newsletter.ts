"use server";

import { NewsletterStatus } from "@/app/generated/prisma/client";
import { requireAuth } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { prisma } from "@/shared/lib/prisma";
import { handleActionError, success, error, validateInput } from "@/shared/lib/actions";
import type { ActionState } from "@/shared/types/server-action";
import { updateTag } from "next/cache";
import { headers } from "next/headers";
import { getClientIp } from "@/shared/lib/rate-limit";
import { z } from "zod";
import { NEWSLETTER_CACHE_TAGS } from "../constants/cache";
import { getNewsletterInvalidationTags } from "../utils/cache.utils";
import { subscribeToNewsletterInternal } from "./subscribe-to-newsletter-internal";

const TOGGLE_NEWSLETTER_LIMIT = {
	limit: 10,
	windowMs: 60 * 60 * 1000, // 1 hour
} as const;

const toggleNewsletterSchema = z.object({
	action: z.enum(["subscribe", "unsubscribe"], {
		message: "Action invalide",
	}),
});

/**
 * Toggle newsletter subscription from the account settings page.
 * - Subscribe: uses subscribeToNewsletterInternal (double opt-in)
 * - Unsubscribe: directly updates status (no token needed, user is authenticated)
 */
export async function toggleNewsletter(
	_: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	const auth = await requireAuth();
	if ("error" in auth) return auth.error;
	const { user } = auth;

	const rateLimit = await enforceRateLimitForCurrentUser(TOGGLE_NEWSLETTER_LIMIT);
	if ("error" in rateLimit) return rateLimit.error;

	const validation = validateInput(toggleNewsletterSchema, {
		action: formData.get("action"),
	});
	if ("error" in validation) return validation.error;

	const { action } = validation.data;

	try {
		if (action === "subscribe") {
			const headersList = await headers();
			const ipAddress = (await getClientIp(headersList)) || "unknown";
			const userAgent = headersList.get("user-agent") || "unknown";

			const result = await subscribeToNewsletterInternal({
				email: user.email,
				ipAddress,
				userAgent,
				consentSource: "newsletter_form",
			});

			if (!result.success) return error(result.message);

			// Invalidate user-specific cache
			updateTag(NEWSLETTER_CACHE_TAGS.USER_STATUS(user.id));
			getNewsletterInvalidationTags().forEach((tag) => updateTag(tag));

			return success(result.message);
		}

		if (action === "unsubscribe") {
			const subscriber = await prisma.newsletterSubscriber.findFirst({
				where: { email: user.email, deletedAt: null },
			});

			if (!subscriber || subscriber.status === NewsletterStatus.UNSUBSCRIBED) {
				return success("Vous n'êtes pas inscrit(e) à la newsletter.");
			}

			await prisma.newsletterSubscriber.update({
				where: { id: subscriber.id },
				data: {
					status: NewsletterStatus.UNSUBSCRIBED,
					unsubscribedAt: new Date(),
				},
			});

			updateTag(NEWSLETTER_CACHE_TAGS.USER_STATUS(user.id));
			getNewsletterInvalidationTags().forEach((tag) => updateTag(tag));

			return success("Vous avez été désinscrit(e) de la newsletter.");
		}

		return error("Action invalide");
	} catch (e) {
		return handleActionError(e, "Erreur lors de la mise à jour");
	}
}
