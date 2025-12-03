import { prisma } from "@/shared/lib/prisma";
import { StockNotificationStatus } from "@/app/generated/prisma/client";
import {
	cacheStockNotificationsBySku,
	STOCK_NOTIFICATIONS_CACHE_TAGS,
} from "../constants/cache";
import {
	STOCK_NOTIFICATION_WITH_SKU_SELECT,
	GET_PENDING_NOTIFICATIONS_DEFAULT_PER_PAGE,
	GET_PENDING_NOTIFICATIONS_MAX_PER_PAGE,
} from "../constants/stock-notification.constants";
import type {
	GetPendingNotificationsParams,
	GetPendingNotificationsReturn,
} from "../types/stock-notification.types";
import { cacheTag } from "next/cache";

/**
 * Récupère les demandes de notification en attente pour un SKU spécifique
 *
 * @param skuId - ID du SKU
 * @returns Liste des demandes en attente avec pagination
 */
export async function getPendingNotificationsBySku(
	skuId: string
): Promise<GetPendingNotificationsReturn> {
	"use cache";
	cacheStockNotificationsBySku(skuId);

	try {
		// Limiter le nombre de résultats pour éviter les surcharges mémoire
		const take = GET_PENDING_NOTIFICATIONS_MAX_PER_PAGE + 1; // +1 pour détecter s'il y a plus

		const notifications = await prisma.stockNotificationRequest.findMany({
			where: {
				skuId,
				status: StockNotificationStatus.PENDING,
			},
			select: STOCK_NOTIFICATION_WITH_SKU_SELECT,
			orderBy: { createdAt: "asc" },
			take,
		});

		const hasNextPage = notifications.length > GET_PENDING_NOTIFICATIONS_MAX_PER_PAGE;
		const results = hasNextPage ? notifications.slice(0, -1) : notifications;

		return {
			notifications: results,
			pagination: {
				nextCursor: hasNextPage ? results[results.length - 1]?.id ?? null : null,
				hasNextPage,
			},
		};
	} catch (error) {
		console.error(
			"[getPendingNotificationsBySku] Error fetching notifications:",
			error
		);
		return {
			notifications: [],
			pagination: {
				nextCursor: null,
				hasNextPage: false,
			},
		};
	}
}

/**
 * Compte le nombre de demandes en attente pour un SKU
 *
 * @param skuId - ID du SKU
 * @returns Nombre de demandes en attente
 */
export async function countPendingNotificationsBySku(
	skuId: string
): Promise<number> {
	"use cache";
	cacheTag(STOCK_NOTIFICATIONS_CACHE_TAGS.BY_SKU(skuId));

	try {
		return await prisma.stockNotificationRequest.count({
			where: {
				skuId,
				status: StockNotificationStatus.PENDING,
			},
		});
	} catch (error) {
		console.error(
			"[countPendingNotificationsBySku] Error counting notifications:",
			error
		);
		return 0;
	}
}

/**
 * Vérifie si un email a déjà une demande en attente pour un SKU
 *
 * @param email - Email du demandeur
 * @param skuId - ID du SKU
 * @returns true si une demande en attente existe
 */
export async function hasExistingPendingNotification(
	email: string,
	skuId: string
): Promise<boolean> {
	try {
		const existing = await prisma.stockNotificationRequest.findFirst({
			where: {
				email: email.toLowerCase(),
				skuId,
				status: StockNotificationStatus.PENDING,
			},
			select: { id: true },
		});

		return existing !== null;
	} catch (error) {
		console.error(
			"[hasExistingPendingNotification] Error checking notification:",
			error
		);
		return false;
	}
}
