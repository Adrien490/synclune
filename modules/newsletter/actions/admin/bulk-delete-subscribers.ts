"use server";

import { isAdmin } from "@/modules/auth/utils/guards";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { revalidatePath } from "next/cache";

import { bulkDeleteSubscribersSchema } from "../../schemas/subscriber.schemas";

/**
 * Server Action ADMIN pour supprimer définitivement plusieurs abonnés en masse (RGPD)
 */
export async function bulkDeleteSubscribers(
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

		const result = bulkDeleteSubscribersSchema.safeParse({ ids });
		if (!result.success) {
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: result.error.issues[0]?.message || "Données invalides",
			};
		}

		// Supprimer en masse
		const deleteResult = await prisma.newsletterSubscriber.deleteMany({
			where: { id: { in: result.data.ids } },
		});

		revalidatePath("/admin/marketing/newsletter");

		return {
			status: ActionStatus.SUCCESS,
			message: `${deleteResult.count} abonné${deleteResult.count > 1 ? "s" : ""} supprimé${deleteResult.count > 1 ? "s" : ""} définitivement`,
		};
	} catch (error) {
		console.error("[BULK_DELETE_SUBSCRIBERS]", error);
		return {
			status: ActionStatus.ERROR,
			message: "Erreur lors de la suppression",
		};
	}
}
