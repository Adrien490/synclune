/**
 * Cache configuration for Stock Notifications module
 */

import { cacheLife, cacheTag } from "next/cache";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";

// ============================================
// CACHE TAGS
// ============================================

export const STOCK_NOTIFICATIONS_CACHE_TAGS = {
	/** Liste des demandes de notification en attente */
	PENDING_LIST: "stock-notifications-pending-list",

	/** Demandes de notification pour un SKU spécifique */
	BY_SKU: (skuId: string) => `stock-notifications-sku-${skuId}`,

	/** Demandes de notification pour un utilisateur */
	BY_USER: (userId: string) => `stock-notifications-user-${userId}`,

	/** Demandes de notification par email */
	BY_EMAIL: (email: string) => `stock-notifications-email-${email}`,

	/** Demande de notification par token */
	BY_TOKEN: (token: string) => `stock-notifications-token-${token}`,
} as const;

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
 */
export function getStockNotificationInvalidationTags(
	skuId: string,
	userId?: string | null
): string[] {
	const tags: string[] = [
		STOCK_NOTIFICATIONS_CACHE_TAGS.PENDING_LIST,
		STOCK_NOTIFICATIONS_CACHE_TAGS.BY_SKU(skuId),
		SHARED_CACHE_TAGS.ADMIN_BADGES,
	];

	if (userId) {
		tags.push(STOCK_NOTIFICATIONS_CACHE_TAGS.BY_USER(userId));
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
