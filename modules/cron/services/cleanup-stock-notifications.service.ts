import { prisma } from "@/shared/lib/prisma";
import { StockNotificationStatus } from "@/app/generated/prisma/client";
import { updateTag } from "next/cache";
import { STOCK_NOTIFICATIONS_CACHE_TAGS } from "@/modules/stock-notifications/constants/cache";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";
import { STOCK_NOTIFICATION_EXPIRY_DAYS } from "@/modules/stock-notifications/constants/stock-notification.constants";

/**
 * Service de nettoyage des notifications de stock expirées
 *
 * Marque comme EXPIRED toutes les demandes PENDING plus anciennes
 * que STOCK_NOTIFICATION_EXPIRY_DAYS (90 jours).
 *
 * Nettoie les demandes obsolètes qui n'ont jamais pu être satisfaites
 * (le produit n'est jamais revenu en stock).
 */
export async function cleanupExpiredStockNotifications(): Promise<{
	expiredCount: number;
}> {
	console.log(
		"[CRON:cleanup-stock-notifications] Starting expired notifications cleanup..."
	);

	const expiryDate = new Date(
		Date.now() - STOCK_NOTIFICATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000
	);

	const result = await prisma.stockNotificationRequest.updateMany({
		where: {
			status: StockNotificationStatus.PENDING,
			createdAt: { lt: expiryDate },
		},
		data: {
			status: StockNotificationStatus.EXPIRED,
		},
	});

	console.log(
		`[CRON:cleanup-stock-notifications] Marked ${result.count} notifications as EXPIRED`
	);

	if (result.count > 0) {
		const tagsToInvalidate = [
			STOCK_NOTIFICATIONS_CACHE_TAGS.PENDING_LIST,
			SHARED_CACHE_TAGS.ADMIN_BADGES,
		];
		tagsToInvalidate.forEach((tag) => updateTag(tag));
		console.log(
			`[CRON:cleanup-stock-notifications] Cache invalidated: ${tagsToInvalidate.join(", ")}`
		);
	}

	console.log("[CRON:cleanup-stock-notifications] Cleanup completed");

	return { expiredCount: result.count };
}
