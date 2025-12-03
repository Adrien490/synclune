"use server";

import { prisma } from "@/shared/lib/prisma";
import { StockNotificationStatus } from "@/app/generated/prisma/client";
import { updateTag } from "next/cache";
import { requireAdmin } from "@/shared/lib/actions";
import { ActionState, ActionStatus } from "@/shared/types/server-action";
import { STOCK_NOTIFICATIONS_CACHE_TAGS } from "../constants/cache";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";
import { STOCK_NOTIFICATION_EXPIRY_DAYS } from "../constants/stock-notification.constants";

/**
 * Marque comme expirées toutes les demandes PENDING plus anciennes que STOCK_NOTIFICATION_EXPIRY_DAYS (90 jours)
 *
 * Cette action permet de nettoyer la base de données des demandes obsolètes
 * qui n'ont jamais pu être satisfaites (le produit n'est jamais revenu en stock).
 *
 * @returns Le nombre de demandes expirées
 */
export async function cleanupExpiredNotifications(): Promise<{
	expiredCount: number;
}> {
	try {
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

		if (result.count > 0) {
			// Invalider le cache
			const tagsToInvalidate = [
				STOCK_NOTIFICATIONS_CACHE_TAGS.PENDING_LIST,
				SHARED_CACHE_TAGS.ADMIN_BADGES,
			];
			tagsToInvalidate.forEach((tag) => updateTag(tag));
		}

		console.log(
			`[cleanupExpiredNotifications] Marked ${result.count} notifications as EXPIRED`
		);

		return { expiredCount: result.count };
	} catch (error) {
		console.error("[cleanupExpiredNotifications] Error:", error);
		return { expiredCount: 0 };
	}
}

/**
 * Server Action pour nettoyer manuellement les demandes expirées (admin uniquement)
 * Compatible avec useActionState
 */
export async function cleanupExpiredNotificationsAction(
	_: ActionState | undefined
): Promise<ActionState> {
	const admin = await requireAdmin();
	if (!admin) {
		return {
			status: ActionStatus.UNAUTHORIZED,
			message: "Accès non autorisé. Droits administrateur requis.",
		};
	}

	const result = await cleanupExpiredNotifications();

	if (result.expiredCount > 0) {
		return {
			status: ActionStatus.SUCCESS,
			message: `${result.expiredCount} demande(s) expirée(s) nettoyée(s)`,
			data: result,
		};
	}

	return {
		status: ActionStatus.SUCCESS,
		message: "Aucune demande expirée à nettoyer",
		data: result,
	};
}
