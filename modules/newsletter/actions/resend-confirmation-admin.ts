"use server";

import { NewsletterStatus } from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { sendNewsletterConfirmationEmail } from "@/modules/emails/services/newsletter-emails";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { randomUUID } from "crypto";
import { subscriberIdSchema } from "../schemas/subscriber.schemas";
import { NEWSLETTER_BASE_URL } from "../constants/urls.constants";
import { updateTag } from "next/cache";
import { getNewsletterInvalidationTags } from "../constants/cache";

/**
 * Server Action ADMIN pour renvoyer l'email de confirmation newsletter
 */
export async function resendConfirmationAdmin(
	_prevState: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		// 1. Vérification admin
		const adminCheck = await requireAdmin();
		if ("error" in adminCheck) return adminCheck.error;

		// 2. Validation de l'entrée
		const subscriberId = formData.get("subscriberId");
		const validation = subscriberIdSchema.safeParse({ subscriberId });
		if (!validation.success) {
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: validation.error.issues[0]?.message || "ID d'abonné invalide",
			};
		}

		const validatedId = validation.data.subscriberId;

		// 3. Vérifier que l'abonné existe
		const subscriber = await prisma.newsletterSubscriber.findUnique({
			where: { id: validatedId },
			select: { id: true, email: true, status: true },
		});

		if (!subscriber) {
			return {
				status: ActionStatus.NOT_FOUND,
				message: "Abonné non trouvé",
			};
		}

		if (subscriber.status === NewsletterStatus.CONFIRMED) {
			return {
				status: ActionStatus.ERROR,
				message: "Cet abonné a déjà confirmé son email et est actif",
			};
		}

		// 4. Régénérer un token de confirmation
		const confirmationToken = randomUUID();

		await prisma.newsletterSubscriber.update({
			where: { id: validatedId },
			data: {
				confirmationToken,
				confirmationSentAt: new Date(),
			},
		});

		// 5. Envoyer l'email de confirmation
		const confirmationUrl = `${NEWSLETTER_BASE_URL}/newsletter/confirm?token=${confirmationToken}`;

		try {
			await sendNewsletterConfirmationEmail({
				to: subscriber.email,
				confirmationUrl,
			});
		} catch (emailError) {
			console.error("[RESEND_CONFIRMATION_ADMIN] Échec envoi email:", emailError);
			return {
				status: ActionStatus.ERROR,
				message: "Token régénéré mais échec de l'envoi de l'email. Veuillez réessayer.",
			};
		}

		// 6. Invalider le cache
		getNewsletterInvalidationTags().forEach((tag) => updateTag(tag));

		return {
			status: ActionStatus.SUCCESS,
			message: `Email de confirmation renvoyé à ${subscriber.email}`,
		};
	} catch (error) {
		console.error("[RESEND_CONFIRMATION_ADMIN] Erreur:", error);
		return {
			status: ActionStatus.ERROR,
			message: "Impossible de renvoyer l'email de confirmation",
		};
	}
}
