"use server";

import { isAdmin } from "@/modules/auth/utils/guards";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { revalidatePath } from "next/cache";

import { bulkUnsubscribeSubscribersSchema } from "../../schemas/subscriber.schemas";

/**
 * Server Action ADMIN pour désabonner plusieurs abonnés en masse
 */
export async function bulkUnsubscribeSubscribers(
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

		const result = bulkUnsubscribeSubscribersSchema.safeParse({ ids });
		if (!result.success) {
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: result.error.issues[0]?.message || "Données invalides",
			};
		}

		// Trouver les abonnés actifs
		const activeSubscribers = await prisma.newsletterSubscriber.findMany({
			where: {
				id: { in: result.data.ids },
				isActive: true,
			},
			select: { id: true },
		});

		if (activeSubscribers.length === 0) {
			return {
				status: ActionStatus.ERROR,
				message: "Aucun abonné actif à désabonner",
			};
		}

		// Désabonner en masse
		await prisma.newsletterSubscriber.updateMany({
			where: { id: { in: activeSubscribers.map((s) => s.id) } },
			data: { isActive: false },
		});

		revalidatePath("/admin/marketing/newsletter");

		const skipped = result.data.ids.length - activeSubscribers.length;
		let message = `${activeSubscribers.length} abonné${activeSubscribers.length > 1 ? "s" : ""} désabonné${activeSubscribers.length > 1 ? "s" : ""}`;
		if (skipped > 0) {
			message += ` - ${skipped} ignoré${skipped > 1 ? "s" : ""} (déjà inactif${skipped > 1 ? "s" : ""})`;
		}

		return {
			status: ActionStatus.SUCCESS,
			message,
		};
	} catch (error) {
		console.error("[BULK_UNSUBSCRIBE_SUBSCRIBERS]", error);
		return {
			status: ActionStatus.ERROR,
			message: "Erreur lors du désabonnement",
		};
	}
}
