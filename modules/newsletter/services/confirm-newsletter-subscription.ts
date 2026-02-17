import { NewsletterStatus } from "@/app/generated/prisma/client";
import { ajNewsletterConfirm } from "@/shared/lib/arcjet";
import { sendNewsletterWelcomeEmail } from "@/modules/emails/services/newsletter-emails";
import { prisma } from "@/shared/lib/prisma";
import { getClientIp } from "@/shared/lib/rate-limit";
import { validateInput } from "@/shared/lib/actions";
import { headers } from "next/headers";
import { updateTag } from "next/cache";
import { getNewsletterInvalidationTags } from "../constants/cache";
import { confirmationTokenSchema } from "../schemas/newsletter.schemas";
import { NEWSLETTER_BASE_URL } from "../constants/urls.constants";

interface ConfirmResult {
	success: boolean;
	message: string;
}

/**
 * Confirms a newsletter subscription from a token.
 * Called directly from async server component (no action/form needed).
 * Follows the webhook exception pattern: transactional service with complete logic.
 */
export async function confirmNewsletterSubscription(
	token: string | undefined
): Promise<ConfirmResult> {
	try {
		// Arcjet protection: Shield + Rate Limiting against brute-force
		const headersList = await headers();
		const request = new Request("http://localhost/newsletter/confirm", {
			method: "POST",
			headers: headersList,
		});

		const decision = await ajNewsletterConfirm.protect(request, {
			requested: 1,
		});

		if (decision.isDenied()) {
			if (decision.reason.isRateLimit()) {
				return {
					success: false,
					message:
						"Trop de tentatives de confirmation. Veuillez réessayer dans quelques minutes.",
				};
			}

			if (decision.reason.isShield()) {
				console.warn(
					"[CONFIRM_SUBSCRIPTION] Shield blocked suspicious request"
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
		const validated = validateInput(confirmationTokenSchema, { token });
		if ("error" in validated) {
			return { success: false, message: validated.error.message };
		}
		const validatedToken = validated.data.token;

		// Find subscriber with this token (exclude soft-deleted)
		const subscriber = await prisma.newsletterSubscriber.findFirst({
			where: { confirmationToken: validatedToken, deletedAt: null },
		});

		if (!subscriber) {
			return {
				success: false,
				message:
					"Lien de confirmation invalide ou expiré. Veuillez vous réinscrire.",
			};
		}

		// Check if already confirmed
		if (subscriber.status === NewsletterStatus.CONFIRMED) {
			return {
				success: true,
				message:
					"Votre email est déjà confirmé ! Vous êtes bien inscrit(e).",
			};
		}

		// Check token expiration (7 days)
		if (!subscriber.confirmationSentAt) {
			return {
				success: false,
				message:
					"Lien de confirmation invalide. Veuillez vous réinscrire.",
			};
		}

		const tokenAge =
			Date.now() - new Date(subscriber.confirmationSentAt).getTime();
		const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;

		if (tokenAge > sevenDaysInMs) {
			return {
				success: false,
				message:
					"Ce lien de confirmation a expiré (validité : 7 jours). Veuillez vous réinscrire pour recevoir un nouveau lien.",
			};
		}

		// Get confirmation IP for GDPR traceability
		const confirmationIpAddress =
			(await getClientIp(headersList)) || "unknown";

		// Activate subscriber
		await prisma.newsletterSubscriber.update({
			where: { id: subscriber.id },
			data: {
				status: NewsletterStatus.CONFIRMED,
				confirmedAt: new Date(),
				confirmationIpAddress,
				subscribedAt: new Date(),
				unsubscribedAt: null,
				confirmationToken: null,
			},
		});

		// Invalidate cache
		getNewsletterInvalidationTags().forEach((tag) => updateTag(tag));

		// Send welcome email (non-blocking: don't fail confirmation if email fails)
		try {
			const unsubscribeUrl = `${NEWSLETTER_BASE_URL}/newsletter/unsubscribe?token=${subscriber.unsubscribeToken}`;
			await sendNewsletterWelcomeEmail({
				to: subscriber.email,
				unsubscribeUrl,
			});
		} catch (emailError) {
			console.error(
				"[CONFIRM_SUBSCRIPTION] Erreur envoi email bienvenue:",
				emailError
			);
		}

		return {
			success: true,
			message:
				"Merci ! Votre inscription est confirmée. Vous recevrez bientôt notre prochaine newsletter.",
		};
	} catch (e) {
		console.error("[CONFIRM_SUBSCRIPTION] Unexpected error:", e);
		return {
			success: false,
			message: "Une erreur est survenue. Veuillez réessayer plus tard.",
		};
	}
}
