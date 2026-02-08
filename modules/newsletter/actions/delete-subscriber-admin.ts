"use server";

import { prisma } from "@/shared/lib/prisma";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { validateInput, handleActionError, success, notFound } from "@/shared/lib/actions";
import type { ActionState } from "@/shared/types/server-action";
import { updateTag } from "next/cache";
import { subscriberIdSchema } from "../schemas/subscriber.schemas";
import { getNewsletterInvalidationTags } from "../constants/cache";

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
		const validated = validateInput(subscriberIdSchema, { subscriberId });
		if ("error" in validated) return validated.error;

		const validatedId = validated.data.subscriberId;

		// 3. Vérifier que l'abonné existe
		const subscriber = await prisma.newsletterSubscriber.findUnique({
			where: { id: validatedId },
			select: { id: true, email: true },
		});

		if (!subscriber) {
			return notFound("Abonné");
		}

		const email = subscriber.email;

		// 4. Supprimer définitivement
		await prisma.newsletterSubscriber.delete({
			where: { id: validatedId },
		});

		// 5. Invalider le cache
		getNewsletterInvalidationTags().forEach((tag) => updateTag(tag));

		return success(`${email} a été supprimé définitivement`);
	} catch (e) {
		return handleActionError(e, "Une erreur est survenue");
	}
}
