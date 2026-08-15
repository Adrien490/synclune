import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";

/**
 * Tags de cache du module orders — schéma lean (lot 4).
 *
 * `ADMIN_LIST` réutilise le tag partagé posé aussi par le checkout et les
 * webhooks ; `DETAIL(id)` couvre la page détail admin.
 */
export const ORDERS_CACHE_TAGS = {
	ADMIN_LIST: SHARED_CACHE_TAGS.ADMIN_ORDERS_LIST,
	DETAIL: (orderId: string) => `admin-order-detail-${orderId}`,
} as const;

/**
 * Tags à invalider après toute mutation de `Order.status` — jamais une liste
 * écrite à la main chez l'appelant (une liste partielle laisse le détail
 * stale jusqu'à l'expiration du profil `user`).
 */
export function getOrderInvalidationTags(orderId: string): string[] {
	return [
		ORDERS_CACHE_TAGS.ADMIN_LIST,
		ORDERS_CACHE_TAGS.DETAIL(orderId),
		SHARED_CACHE_TAGS.ADMIN_BADGES,
	];
}
