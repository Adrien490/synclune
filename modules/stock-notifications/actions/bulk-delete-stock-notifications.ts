"use server";

import { requireAdmin } from "@/shared/lib/actions";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { updateTag } from "next/cache";

import { bulkDeleteStockNotificationsSchema } from "../schemas/stock-notification.schemas";
import { STOCK_NOTIFICATIONS_CACHE_TAGS } from "../constants/cache";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";

/**
 * Server Action ADMIN pour soft-delete plusieurs notifications (RGPD - retention 10 ans)
 */
export async function bulkDeleteStockNotifications(
	_prevState: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		const admin = await requireAdmin();
		if ("error" in admin) return admin.error;

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

		// Soft delete en masse (retention 10 ans - Art. L123-22 Code de Commerce)
		const deleteResult = await prisma.stockNotificationRequest.updateMany({
			where: {
				id: { in: result.data.ids },
				deletedAt: null, // Ne pas re-supprimer les déjà supprimés
			},
			data: { deletedAt: new Date() },
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
