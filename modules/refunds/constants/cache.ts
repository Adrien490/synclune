/**
 * Cache configuration for Refund module
 *
 * Refund data appears in 2 caches: the refunds list (`/admin/commandes/remboursements`)
 * and the orders list (which embeds refunds). Tags dedies pour chacun : une mutation
 * refund invalide les deux via les helpers `getRefundInvalidationTags()`.
 */

import { cacheLife, cacheTag } from "next/cache";
import { ORDERS_CACHE_TAGS } from "@/modules/orders/constants/cache";

// Re-export for legacy imports (refunds actions use ORDERS_CACHE_TAGS.REFUNDS per-order)
export { ORDERS_CACHE_TAGS };

// ============================================
// CACHE TAGS
// ============================================

export const REFUNDS_CACHE_TAGS = {
	/** Liste des remboursements (dashboard admin) */
	LIST: "refunds-list",

	/** Detail d'un remboursement specifique */
	DETAIL: (refundId: string) => `refund-${refundId}`,
} as const;

// ============================================
// CACHE CONFIGURATION HELPERS
// ============================================

/**
 * Configure le cache pour la liste des remboursements
 * - Utilise pour : /admin/commandes/remboursements
 * - Profil "dashboard" : 1min stale, 30s revalidate
 */
export function cacheRefunds() {
	cacheLife("user");
	cacheTag(REFUNDS_CACHE_TAGS.LIST);
}

/**
 * Configure le cache pour un remboursement specifique
 * - Utilise pour : detail admin, modale d'approbation
 * - Profil "dashboard"
 */
export function cacheRefundDetail(refundId: string, orderId?: string) {
	cacheLife("user");
	if (orderId) {
		cacheTag(
			REFUNDS_CACHE_TAGS.DETAIL(refundId),
			REFUNDS_CACHE_TAGS.LIST,
			ORDERS_CACHE_TAGS.REFUNDS(orderId),
		);
	} else {
		cacheTag(REFUNDS_CACHE_TAGS.DETAIL(refundId), REFUNDS_CACHE_TAGS.LIST);
	}
}
