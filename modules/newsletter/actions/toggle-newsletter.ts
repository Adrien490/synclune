"use server";

import { NewsletterStatus } from "@/app/generated/prisma/client";
import { requireAuth } from "@/modules/auth/lib/require-auth";
import { prisma } from "@/shared/lib/prisma";
import { handleActionError, success, error } from "@/shared/lib/actions";
import type { ActionState } from "@/shared/types/server-action";
import { updateTag } from "next/cache";
import { headers } from "next/headers";
import { getClientIp } from "@/shared/lib/rate-limit";
import { NEWSLETTER_CACHE_TAGS } from "../constants/cache";
import { getNewsletterInvalidationTags } from "../utils/cache.utils";
import { subscribeToNewsletterInternal } from "./subscribe-to-newsletter-internal";

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

	const action = formData.get("action") as string;

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
			const subscriber = await prisma.newsletterSubscriber.findUnique({
				where: { email: user.email },
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
