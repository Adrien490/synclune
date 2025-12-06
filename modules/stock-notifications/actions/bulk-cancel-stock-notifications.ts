"use server";

import { requireAdmin } from "@/shared/lib/actions";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { StockNotificationStatus } from "@/app/generated/prisma/client";
import { updateTag } from "next/cache";

import { bulkCancelStockNotificationsSchema } from "../schemas/stock-notification.schemas";
import { STOCK_NOTIFICATIONS_CACHE_TAGS } from "../constants/cache";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";

/**
 * Server Action ADMIN pour annuler plusieurs notifications de stock en masse
 * Seules les notifications en attente (PENDING) seront annulées
 */
export async function bulkCancelStockNotifications(
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

		const result = bulkCancelStockNotificationsSchema.safeParse({ ids });
		if (!result.success) {
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: result.error.issues[0]?.message || "Données invalides",
			};
		}

		// Trouver les notifications en attente parmi les sélectionnées
		const eligibleNotifications = await prisma.stockNotificationRequest.findMany({
			where: {
				id: { in: result.data.ids },
				status: StockNotificationStatus.PENDING,
			},
			select: { id: true },
		});

		if (eligibleNotifications.length === 0) {
			return {
				status: ActionStatus.ERROR,
				message: "Aucune notification éligible (doit être en attente)",
			};
		}

		// Annuler en masse
		await prisma.stockNotificationRequest.updateMany({
			where: { id: { in: eligibleNotifications.map((n) => n.id) } },
			data: { status: StockNotificationStatus.CANCELLED },
		});

		// Invalider le cache
		const tagsToInvalidate = [
			STOCK_NOTIFICATIONS_CACHE_TAGS.PENDING_LIST,
			SHARED_CACHE_TAGS.ADMIN_BADGES,
		];
		tagsToInvalidate.forEach((tag) => updateTag(tag));

		const skipped = result.data.ids.length - eligibleNotifications.length;
		let message = `${eligibleNotifications.length} notification${eligibleNotifications.length > 1 ? "s" : ""} annulée${eligibleNotifications.length > 1 ? "s" : ""}`;
		if (skipped > 0) {
			message += ` - ${skipped} ignorée${skipped > 1 ? "s" : ""} (déjà traitée${skipped > 1 ? "s" : ""})`;
		}

		return {
			status: ActionStatus.SUCCESS,
			message,
		};
	} catch (error) {
		console.error("[BULK_CANCEL_STOCK_NOTIFICATIONS]", error);
		return {
			status: ActionStatus.ERROR,
			message: "Erreur lors de l'annulation",
		};
	}
}
