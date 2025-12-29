import { prisma } from "@/shared/lib/prisma";
import { cacheLife, cacheTag } from "next/cache";
import { STOCK_NOTIFICATION_WITH_SKU_SELECT } from "../constants/stock-notification.constants";
import { STOCK_NOTIFICATIONS_CACHE_TAGS } from "../constants/cache";
import type { StockNotificationRequestWithSku } from "../types/stock-notification.types";

/**
 * Récupère une demande de notification par son ID
 *
 * @param id - ID de la demande de notification
 * @returns La demande de notification ou null si non trouvée
 */
export async function getNotificationById(
	id: string
): Promise<StockNotificationRequestWithSku | null> {
	"use cache";
	cacheLife("dashboard");
	cacheTag(STOCK_NOTIFICATIONS_CACHE_TAGS.BY_ID(id));

	try {
		const notification = await prisma.stockNotificationRequest.findUnique({
			where: {
				id,
				deletedAt: null,
			},
			select: STOCK_NOTIFICATION_WITH_SKU_SELECT,
		});

		return notification;
	} catch (error) {
		console.error(
			"[getNotificationById] Error fetching notification:",
			error
		);
		return null;
	}
}
