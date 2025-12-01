"use server";

import { isAdmin } from "@/modules/auth/utils/guards";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { updateTag } from "next/cache";

import { bulkDeleteStockNotificationsSchema } from "../schemas/stock-notification.schemas";
import { STOCK_NOTIFICATIONS_CACHE_TAGS } from "../constants/cache";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";

/**
 * Server Action ADMIN pour supprimer définitivement plusieurs notifications (RGPD)
 */
export async function bulkDeleteStockNotifications(
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

		const result = bulkDeleteStockNotificationsSchema.safeParse({ ids });
		if (!result.success) {
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: result.error.issues[0]?.message || "Données invalides",
			};
		}

		// Supprimer en masse
		const deleteResult = await prisma.stockNotificationRequest.deleteMany({
			where: { id: { in: result.data.ids } },
		});

		// Invalider le cache
		const tagsToInvalidate = [
			STOCK_NOTIFICATIONS_CACHE_TAGS.PENDING_LIST,
			SHARED_CACHE_TAGS.ADMIN_BADGES,
		];
		tagsToInvalidate.forEach((tag) => updateTag(tag));

		return {
			status: ActionStatus.SUCCESS,
			message: `${deleteResult.count} notification${deleteResult.count > 1 ? "s" : ""} supprimée${deleteResult.count > 1 ? "s" : ""} définitivement`,
		};
	} catch (error) {
		console.error("[BULK_DELETE_STOCK_NOTIFICATIONS]", error);
		return {
			status: ActionStatus.ERROR,
			message: "Erreur lors de la suppression",
		};
	}
}
