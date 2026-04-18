import { NewsletterStatus } from "@/app/generated/prisma/client";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import { logger } from "@/shared/lib/logger";
import { validateInput } from "@/shared/lib/actions";
import { updateTag } from "next/cache";
import { after } from "next/server";
import { getNewsletterInvalidationTags } from "../constants/cache";
import { unsubscribeTokenSchema } from "../schemas/newsletter.schemas";

interface UnsubscribeResult {
	success: boolean;
	message: string;
}

/**
 * Unsubscribes a newsletter subscriber from a token.
 * Called directly from async server component (no action/form needed).
 * Follows the webhook exception pattern: transactional service with complete logic.
 */
export async function unsubscribeNewsletter(token: string | undefined): Promise<UnsubscribeResult> {
	try {
		// Validate token with Zod
		const validated = validateInput(unsubscribeTokenSchema, { token });
		if ("error" in validated) {
			return { success: false, message: validated.error.message };
		}
		const validatedToken = validated.data.token;

		// Find subscriber with this token
		const subscriber = await prisma.newsletterSubscriber.findFirst({
			where: {
				unsubscribeToken: validatedToken,
				...notDeleted,
			},
			select: {
				id: true,
				status: true,
				userId: true,
			},
		});

		if (!subscriber) {
			return {
				success: false,
				message:
					"Lien de désinscription invalide ou expiré. Veuillez nous contacter si le problème persiste.",
			};
		}

		// Already unsubscribed → idempotent success
		if (subscriber.status === NewsletterStatus.UNSUBSCRIBED) {
			return {
				success: true,
				message: "Vous êtes déjà désinscrit(e) de la newsletter. Aucune action nécessaire.",
			};
		}

		// Unsubscribe
		await prisma.newsletterSubscriber.update({
			where: { id: subscriber.id },
			data: {
				status: NewsletterStatus.UNSUBSCRIBED,
				unsubscribedAt: new Date(),
			},
		});

		// Invalidate cache after response (updateTag cannot be called during render)
		after(() => {
			getNewsletterInvalidationTags(subscriber.userId ?? undefined).forEach((tag) =>
				updateTag(tag),
			);
		});

		return {
			success: true,
			message:
				"Vous avez été désinscrit(e) de la newsletter. Nous sommes désolés de vous voir partir.",
		};
	} catch (e) {
		logger.error("Unexpected error during newsletter unsubscribe", e, {
			service: "unsubscribe-newsletter",
		});
		return {
			success: false,
			message: "Une erreur est survenue. Veuillez réessayer plus tard.",
		};
	}
}
