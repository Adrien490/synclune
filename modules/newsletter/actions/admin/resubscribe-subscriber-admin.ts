"use server";

import { NewsletterStatus } from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { requireAdmin } from "@/shared/lib/actions";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { revalidatePath } from "next/cache";
import { subscriberIdSchema } from "../../schemas/subscriber.schemas";

/**
 * Server Action ADMIN pour réabonner un abonné newsletter désactivé
 */
export async function resubscribeSubscriberAdmin(subscriberId: string): Promise<ActionState> {
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
			select: { id: true, email: true, status: true, confirmedAt: true },
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
				message: "Cet abonné est déjà actif",
			};
		}

		// 4. Réabonner (uniquement si l'email était vérifié auparavant)
		if (!subscriber.confirmedAt) {
			return {
				status: ActionStatus.ERROR,
				message: "Cet abonné n'a jamais confirmé son email. Renvoyez plutôt l'email de confirmation.",
			};
		}

		await prisma.newsletterSubscriber.update({
			where: { id: subscriberId },
			data: {
				status: NewsletterStatus.CONFIRMED,
				unsubscribedAt: null,
			},
		});

		// 5. Revalider
		revalidatePath("/admin/marketing/newsletter");

		return {
			status: ActionStatus.SUCCESS,
			message: `${subscriber.email} a été réabonné`,
		};
	} catch (error) {
		console.error("[RESUBSCRIBE_SUBSCRIBER_ADMIN] Erreur:", error);
		return {
			status: ActionStatus.ERROR,
			message: error instanceof Error ? error.message : "Une erreur est survenue",
		};
	}
}
