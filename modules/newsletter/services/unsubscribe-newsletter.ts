import { NewsletterStatus } from "@/app/generated/prisma/client";
import { ajNewsletterUnsubscribe } from "@/shared/lib/arcjet";
import { prisma } from "@/shared/lib/prisma";
import { validateInput } from "@/shared/lib/actions";
import { headers } from "next/headers";
import { updateTag } from "next/cache";
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
export async function unsubscribeNewsletter(
	token: string | undefined
): Promise<UnsubscribeResult> {
	try {
		// Arcjet protection: Shield + Rate Limiting against brute-force
		const headersList = await headers();
		const request = new Request("http://localhost/newsletter/unsubscribe", {
			method: "POST",
			headers: headersList,
		});

		const decision = await ajNewsletterUnsubscribe.protect(request, {
			requested: 1,
		});

		if (decision.isDenied()) {
			if (decision.reason.isRateLimit()) {
				return {
					success: false,
					message:
						"Trop de tentatives de désinscription. Veuillez réessayer dans quelques minutes.",
				};
			}

			if (decision.reason.isShield()) {
				console.warn(
					"[UNSUBSCRIBE_NEWSLETTER] Shield blocked suspicious request"
				);
				return {
					success: false,
					message:
						"Votre requête a été bloquée pour des raisons de sécurité.",
				};
			}

			return {
				success: false,
				message:
					"Votre requête n'a pas pu être traitée. Veuillez réessayer.",
			};
		}

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
				deletedAt: null,
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
				message:
					"Vous êtes déjà désinscrit(e) de la newsletter. Aucune action nécessaire.",
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

		// Invalidate cache (pass userId to invalidate user-specific status)
		getNewsletterInvalidationTags(subscriber.userId ?? undefined).forEach((tag) => updateTag(tag));

		return {
			success: true,
			message:
				"Vous avez été désinscrit(e) de la newsletter. Nous sommes désolés de vous voir partir.",
		};
	} catch (e) {
		console.error("[UNSUBSCRIBE_NEWSLETTER] Unexpected error:", e);
		return {
			success: false,
			message: "Une erreur est survenue. Veuillez réessayer plus tard.",
		};
	}
}
