"use server";

import { isAdmin } from "@/modules/auth/utils/guards";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { revalidatePath } from "next/cache";

import { bulkResubscribeSubscribersSchema } from "../../schemas/subscriber.schemas";

/**
 * Server Action ADMIN pour réabonner plusieurs abonnés en masse
 * Ne réabonne que les abonnés dont l'email est vérifié
 */
export async function bulkResubscribeSubscribers(
	_prevState: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		const admin = await isAdmin();
		if (!admin) {
			return {
				status: ActionStatus.UNAUTHORIZED,
				message: "Accès non autorisé",
			};
		}

		const idsRaw = formData.get("ids") as string;
		let ids: string[];

		try {
			ids = JSON.parse(idsRaw);
		} catch {
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: "Format des IDs invalide",
			};
		}

		const result = bulkResubscribeSubscribersSchema.safeParse({ ids });
		if (!result.success) {
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: result.error.issues[0]?.message || "Données invalides",
			};
		}

		// Trouver les abonnés inactifs avec email vérifié
		const eligibleSubscribers = await prisma.newsletterSubscriber.findMany({
			where: {
				id: { in: result.data.ids },
				isActive: false,
				emailVerified: true,
			},
			select: { id: true },
		});

		if (eligibleSubscribers.length === 0) {
			return {
				status: ActionStatus.ERROR,
				message: "Aucun abonné éligible (doit être inactif avec email vérifié)",
			};
		}

		// Réabonner en masse
		await prisma.newsletterSubscriber.updateMany({
			where: { id: { in: eligibleSubscribers.map((s) => s.id) } },
			data: { isActive: true },
		});

		revalidatePath("/admin/marketing/newsletter");

		const skipped = result.data.ids.length - eligibleSubscribers.length;
		let message = `${eligibleSubscribers.length} abonné${eligibleSubscribers.length > 1 ? "s" : ""} réabonné${eligibleSubscribers.length > 1 ? "s" : ""}`;
		if (skipped > 0) {
			message += ` - ${skipped} ignoré${skipped > 1 ? "s" : ""} (déjà actif${skipped > 1 ? "s" : ""} ou non vérifié${skipped > 1 ? "s" : ""})`;
		}

		return {
			status: ActionStatus.SUCCESS,
			message,
		};
	} catch (error) {
		console.error("[BULK_RESUBSCRIBE_SUBSCRIBERS]", error);
		return {
			status: ActionStatus.ERROR,
			message: "Erreur lors du réabonnement",
		};
	}
}
