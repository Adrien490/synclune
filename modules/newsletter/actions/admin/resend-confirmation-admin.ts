"use server";

import { prisma } from "@/shared/lib/prisma";
import { requireAdmin } from "@/shared/lib/actions";
import { sendNewsletterConfirmationEmail } from "@/shared/lib/email";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { randomUUID } from "crypto";

/**
 * Server Action ADMIN pour renvoyer l'email de confirmation newsletter
 */
export async function resendConfirmationAdmin(subscriberId: string): Promise<ActionState> {
	try {
		// 1. Vérification admin
		const adminCheck = await requireAdmin();
		if ("error" in adminCheck) return adminCheck.error;

		// 2. Vérifier que l'abonné existe
		const subscriber = await prisma.newsletterSubscriber.findUnique({
			where: { id: subscriberId },
			select: { id: true, email: true, emailVerified: true, isActive: true },
		});

		if (!subscriber) {
			return {
				status: ActionStatus.NOT_FOUND,
				message: "Abonné non trouvé",
			};
		}

		if (subscriber.emailVerified && subscriber.isActive) {
			return {
				status: ActionStatus.ERROR,
				message: "Cet abonné a déjà confirmé son email et est actif",
			};
		}

		// 3. Régénérer un token de confirmation
		const confirmationToken = randomUUID();

		await prisma.newsletterSubscriber.update({
			where: { id: subscriberId },
			data: {
				confirmationToken,
				confirmationSentAt: new Date(),
			},
		});

		// 4. Envoyer l'email de confirmation
		const baseUrl = process.env.BETTER_AUTH_URL || "https://synclune.fr";
		const confirmationUrl = `${baseUrl}/newsletter/confirm?token=${confirmationToken}`;

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
