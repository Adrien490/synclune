"use server";

import { prisma } from "@/shared/lib/prisma";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { updateTag } from "next/cache";
import { subscriberIdSchema } from "../schemas/subscriber.schemas";
import { getNewsletterInvalidationTags } from "../constants/cache";
import { handleActionError } from "@/shared/lib/actions";

/**
 * Server Action ADMIN pour supprimer définitivement un abonné newsletter
 * ATTENTION: Suppression définitive des données (RGPD droit à l'effacement)
 */
export async function deleteSubscriberAdmin(
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
			select: { id: true, email: true },
		});

		if (!subscriber) {
			return {
				status: ActionStatus.NOT_FOUND,
				message: "Abonné non trouvé",
			};
		}

		const email = subscriber.email;

		// 4. Supprimer définitivement
		await prisma.newsletterSubscriber.delete({
			where: { id: validatedId },
		});

		// 5. Invalider le cache
		getNewsletterInvalidationTags().forEach((tag) => updateTag(tag));

		return {
			status: ActionStatus.SUCCESS,
			message: `${email} a été supprimé définitivement`,
		};
	} catch (error) {
		return handleActionError(error, "Une erreur est survenue");
	}
}
