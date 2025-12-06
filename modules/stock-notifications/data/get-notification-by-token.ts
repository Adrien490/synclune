import { prisma } from "@/shared/lib/prisma";
import { cacheLife, cacheTag } from "next/cache";
import { STOCK_NOTIFICATION_WITH_SKU_SELECT } from "../constants/stock-notification.constants";
import { STOCK_NOTIFICATIONS_CACHE_TAGS } from "../constants/cache";
import type { StockNotificationRequestWithSku } from "../types/stock-notification.types";

/**
 * Récupère une demande de notification par son token de désinscription
 *
 * @param token - Token unique de désinscription
 * @returns La demande de notification ou null si non trouvée
 */
export async function getNotificationByToken(
	token: string
): Promise<StockNotificationRequestWithSku | null> {
	"use cache";
	cacheLife("dashboard");
	cacheTag(STOCK_NOTIFICATIONS_CACHE_TAGS.BY_TOKEN(token));

	try {
		const notification = await prisma.stockNotificationRequest.findFirst({
			where: {
				unsubscribeToken: token,
				deletedAt: null,
				// Exclure les notifications d'utilisateurs soft-deleted
				OR: [{ user: null }, { user: { deletedAt: null } }],
			},
			select: STOCK_NOTIFICATION_WITH_SKU_SELECT,
		});

		return notification;
	} catch (error) {
		console.error(
			"[getNotificationByToken] Error fetching notification:",
			error
		);
		return null;
	}
}

/**
 * Récupère les demandes de notification d'un utilisateur
 *
 * @param userId - ID de l'utilisateur
 * @returns Liste des demandes de l'utilisateur
 */
export async function getNotificationsByUser(
	userId: string
): Promise<StockNotificationRequestWithSku[]> {
	"use cache: private";
	cacheLife("dashboard");
	cacheTag(STOCK_NOTIFICATIONS_CACHE_TAGS.BY_USER(userId));

	try {
		const notifications = await prisma.stockNotificationRequest.findMany({
			where: { userId, deletedAt: null },
			select: STOCK_NOTIFICATION_WITH_SKU_SELECT,
			orderBy: { createdAt: "desc" },
		});

		return notifications;
	} catch (error) {
		console.error(
			"[getNotificationsByUser] Error fetching notifications:",
			error
		);
		return [];
	}
}

/**
 * Récupère les demandes de notification par email
 *
 * @param email - Email du demandeur
 * @returns Liste des demandes pour cet email
 */
export async function getNotificationsByEmail(
	email: string
): Promise<StockNotificationRequestWithSku[]> {
	"use cache: private";
	cacheLife("dashboard");
	cacheTag(STOCK_NOTIFICATIONS_CACHE_TAGS.BY_EMAIL(email.toLowerCase()));

	try {
		const notifications = await prisma.stockNotificationRequest.findMany({
			where: { email: email.toLowerCase(), deletedAt: null },
			select: STOCK_NOTIFICATION_WITH_SKU_SELECT,
			orderBy: { createdAt: "desc" },
		});

		return notifications;
	} catch (error) {
		console.error(
			"[getNotificationsByEmail] Error fetching notifications:",
			error
		);
		return [];
	}
}
