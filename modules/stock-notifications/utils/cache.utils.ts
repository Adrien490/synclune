/**
 * Helpers de cache pour le module Stock Notifications
 *
 * Constantes: voir constants/cache.ts
 */

import { cacheLife, cacheTag } from "next/cache";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";
import { STOCK_NOTIFICATIONS_CACHE_TAGS } from "../constants/cache";

// ============================================
// CACHE CONFIGURATION HELPERS
// ============================================

/**
 * Configure le cache pour la liste des demandes en attente
 * - Utilisé pour : /admin/marketing/stock-notifications
 * - Durée : 1min fraîche, 30s revalidation, 5min expiration
 */
export function cacheStockNotificationsList() {
	cacheLife("dashboard");
	cacheTag(STOCK_NOTIFICATIONS_CACHE_TAGS.PENDING_LIST);
}

/**
 * Configure le cache pour les demandes d'un SKU
 */
export function cacheStockNotificationsBySku(skuId: string) {
	cacheLife("dashboard");
	cacheTag(STOCK_NOTIFICATIONS_CACHE_TAGS.BY_SKU(skuId));
}

// ============================================
// INVALIDATION HELPERS
// ============================================

/**
 * Tags à invalider lors de la modification d'une demande de notification
 *
 * @param skuId - ID du SKU concerné
 * @param userId - ID de l'utilisateur (si connecté)
 * @param email - Email du demandeur (pour invités)
 * @param token - Token de désinscription unique
 * @param id - ID de la notification
 */
export function getStockNotificationInvalidationTags(
	skuId: string,
	userId?: string | null,
	email?: string | null,
	token?: string | null,
	id?: string | null
): string[] {
	const tags: string[] = [
		STOCK_NOTIFICATIONS_CACHE_TAGS.PENDING_LIST,
		STOCK_NOTIFICATIONS_CACHE_TAGS.BY_SKU(skuId),
		SHARED_CACHE_TAGS.ADMIN_BADGES,
	];

	if (userId) {
		tags.push(STOCK_NOTIFICATIONS_CACHE_TAGS.BY_USER(userId));
	}

	if (email) {
		tags.push(STOCK_NOTIFICATIONS_CACHE_TAGS.BY_EMAIL(email.toLowerCase()));
	}

	if (token) {
		tags.push(STOCK_NOTIFICATIONS_CACHE_TAGS.BY_TOKEN(token));
	}

	if (id) {
		tags.push(STOCK_NOTIFICATIONS_CACHE_TAGS.BY_ID(id));
	}

	return tags;
}

/**
 * Tags à invalider lors du traitement des notifications (envoi emails)
 */
export function getNotifyStockInvalidationTags(skuId: string): string[] {
	return [
		STOCK_NOTIFICATIONS_CACHE_TAGS.PENDING_LIST,
		STOCK_NOTIFICATIONS_CACHE_TAGS.BY_SKU(skuId),
	];
}
