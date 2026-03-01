import { NewsletterStatus } from "@/app/generated/prisma/client";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import { updateTag } from "next/cache";
import { getNewsletterInvalidationTags } from "../constants/cache";

/**
 * Core unsubscribe logic by token.
 * Shared between the RFC 8058 one-click API route and the server component flow.
 * Returns true if the subscriber was found and unsubscribed (or already unsubscribed).
 */
export async function unsubscribeByToken(token: string): Promise<boolean> {
	const subscriber = await prisma.newsletterSubscriber.findFirst({
		where: {
			unsubscribeToken: token,
			...notDeleted,
		},
	});

	if (!subscriber) return false;

	if (subscriber.status !== NewsletterStatus.UNSUBSCRIBED) {
		await prisma.newsletterSubscriber.update({
			where: { id: subscriber.id },
			data: {
				status: NewsletterStatus.UNSUBSCRIBED,
				unsubscribedAt: new Date(),
			},
		});

		getNewsletterInvalidationTags(subscriber.userId ?? undefined).forEach((tag) => updateTag(tag));
	}

	return true;
}
