"use server";

import { prisma } from "@/shared/lib/prisma";
import { requireAdmin } from "@/shared/lib/actions";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { revalidatePath } from "next/cache";

/**
 * Server Action ADMIN pour supprimer définitivement un abonné newsletter
 * ATTENTION: Suppression définitive des données (RGPD droit à l'effacement)
 */
export async function deleteSubscriberAdmin(subscriberId: string): Promise<ActionState> {
	try {
		// 1. Vérification admin
		const adminCheck = await requireAdmin();
		if ("error" in adminCheck) return adminCheck.error;

		// 2. Vérifier que l'abonné existe
		const subscriber = await prisma.newsletterSubscriber.findUnique({
			where: { id: subscriberId },
			select: { id: true, email: true },
		});

		if (!subscriber) {
			return {
				status: ActionStatus.NOT_FOUND,
				message: "Abonné non trouvé",
			};
		}

		const email = subscriber.email;

		// 3. Supprimer définitivement
		await prisma.newsletterSubscriber.delete({
			where: { id: subscriberId },
		});

		// 4. Revalider
		revalidatePath("/admin/marketing/newsletter");

		return {
			status: ActionStatus.SUCCESS,
			message: `${email} a été supprimé définitivement`,
		};
	} catch (error) {
		console.error("[DELETE_SUBSCRIBER_ADMIN] Erreur:", error);
		return {
			status: ActionStatus.ERROR,
			message: error instanceof Error ? error.message : "Une erreur est survenue",
		};
	}
}
