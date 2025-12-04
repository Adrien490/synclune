"use server";

import { NewsletterStatus } from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { requireAdmin } from "@/shared/lib/actions";
import { sendNewsletterConfirmationEmail } from "@/shared/lib/email";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { randomUUID } from "crypto";
import { subscriberIdSchema } from "../../schemas/subscriber.schemas";
import { NEWSLETTER_BASE_URL } from "../../constants/urls";

/**
 * Server Action ADMIN pour renvoyer l'email de confirmation newsletter
 */
export async function resendConfirmationAdmin(subscriberId: string): Promise<ActionState> {
	try {
		// 1. Validation de l'entrée
		const validation = subscriberIdSchema.safeParse({ subscriberId });
		if (!validation.success) {
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: validation.error.issues[0]?.message || "ID d'abonné invalide",
			};
		}

		// 2. Vérification admin
		const adminCheck = await requireAdmin();
		if ("error" in adminCheck) return adminCheck.error;

		// 3. Vérifier que l'abonné existe
		const subscriber = await prisma.newsletterSubscriber.findUnique({
			where: { id: subscriberId },
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
			where: { id: subscriberId },
			data: {
				confirmationToken,
				confirmationSentAt: new Date(),
			},
		});

		// 5. Envoyer l'email de confirmation
		const confirmationUrl = `${NEWSLETTER_BASE_URL}/newsletter/confirm?token=${confirmationToken}`;

		await sendNewsletterConfirmationEmail({
			to: subscriber.email,
			confirmationUrl,
		});

		return {
			status: ActionStatus.SUCCESS,
			message: `Email de confirmation renvoyé à ${subscriber.email}`,
		};
	} catch (error) {
		console.error("[RESEND_CONFIRMATION_ADMIN] Erreur:", error);
		return {
			status: ActionStatus.ERROR,
			message: error instanceof Error ? error.message : "Une erreur est survenue",
		};
	}
}
