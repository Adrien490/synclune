"use server";

import { NewsletterStatus } from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { updateTag } from "next/cache";
import { subscriberIdSchema } from "../schemas/subscriber.schemas";
import { getNewsletterInvalidationTags } from "../constants/cache";

/**
 * Server Action ADMIN pour désabonner un abonné newsletter
 */
export async function unsubscribeSubscriberAdmin(
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

		if (subscriber.status === NewsletterStatus.UNSUBSCRIBED) {
			return {
				status: ActionStatus.ERROR,
				message: "Cet abonné est déjà désabonné",
			};
		}

		// 4. Désabonner
		await prisma.newsletterSubscriber.update({
			where: { id: validatedId },
			data: {
				status: NewsletterStatus.UNSUBSCRIBED,
				unsubscribedAt: new Date(),
			},
		});

		// 5. Invalider le cache
		getNewsletterInvalidationTags().forEach((tag) => updateTag(tag));

		return {
			status: ActionStatus.SUCCESS,
			message: `${subscriber.email} a été désabonné`,
		};
	} catch (error) {
		console.error("[UNSUBSCRIBE_SUBSCRIBER_ADMIN] Erreur:", error);
		return {
			status: ActionStatus.ERROR,
			message: "Une erreur est survenue",
		};
	}
}
