/**
 * Cache configuration for Refund module
 *
 * Refund data appears in 2 caches: the refunds list (`/admin/commandes/remboursements`)
 * and the orders list (which embeds refunds). Tags dedies pour chacun : une mutation
 * refund invalide les deux via les helpers `getRefundInvalidationTags()`.
 */

import { cacheLife, cacheTag } from "next/cache";
import { ORDERS_CACHE_TAGS } from "@/modules/orders/constants/cache";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";

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
// INVALIDATION HELPERS
// ============================================

/**
 * Tags à invalider lors d'un changement de statut de remboursement
 * (création, approbation, rejet, annulation, finalisation, échec).
 *
 * ⚠️ Ce helper couvre la surface REMBOURSEMENT, pas les statuts de commande. Il
 * n'inclut donc délibérément ni `ORDERS_CACHE_TAGS.LIST` ni `ADMIN_ORDERS_LIST` :
 * un `Refund` qui change d'état ne mute pas `Order.status`/`paymentStatus`. Quand
 * un appelant mute AUSSI la commande (`process-refund` Step 3, `charge.refunded`),
 * il compose ce helper avec `getOrderInvalidationTags(orderId)` — cf. CACHE-AUDIT-010.
 *
 * `ADMIN_BADGES` en revanche EST inclus : `get-admin-nav-badges.ts` compte les
 * `Refund` PENDING, donc toute transition depuis/vers PENDING change la pastille.
 * C'est ce que les deux handlers webhook (`handleRefundUpdated`, `handleRefundFailed`)
 * oubliaient avec leur liste écrite à la main, en même temps que `refunds-list` et
 * `refund-<id>` : après une finalisation asynchrone côté Stripe, la liste admin, la
 * fiche et la pastille gardaient l'ancien statut jusqu'à expiration du profil `user`.
 *
 * `DETAIL(orderId)` + `HISTORY(orderId)` : le statut du remboursement et son entrée
 * d'audit s'affichent sur le détail commande.
 */
export function getRefundInvalidationTags(refundId: string, orderId: string): string[] {
	return [
		REFUNDS_CACHE_TAGS.LIST,
		REFUNDS_CACHE_TAGS.DETAIL(refundId),
		ORDERS_CACHE_TAGS.REFUNDS(orderId),
		ORDERS_CACHE_TAGS.DETAIL(orderId),
		ORDERS_CACHE_TAGS.HISTORY(orderId),
		SHARED_CACHE_TAGS.ADMIN_BADGES,
	];
}

// ============================================
// CACHE CONFIGURATION HELPERS
// ============================================

/**
 * Configure le cache pour la liste des remboursements
 * - Utilise pour : /admin/commandes/remboursements
 * - Profil `user` : 2min stale, 1min revalidate
 */
export function cacheRefunds() {
	cacheLife("user");
	cacheTag(REFUNDS_CACHE_TAGS.LIST);
}

/**
 * Configure le cache pour un remboursement specifique
 * - Utilise pour : detail admin, modale d'approbation
 * - Profil `user`
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
