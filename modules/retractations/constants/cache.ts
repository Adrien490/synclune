import { getOrderInvalidationTags } from "@/modules/orders/constants/cache";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";

/** Tags de cache du module retractations (lot 5). */
export const RETRACTATIONS_CACHE_TAGS = {
	ADMIN_LIST: "admin-retractations-list",
	DETAIL: (retractationId: string) => `admin-retractation-detail-${retractationId}`,
} as const;

/**
 * Tags à invalider après toute mutation d'une demande de rétractation.
 * Le remboursement change AUSSI `Order.status` : les tags commande sont
 * inclus systématiquement (une liste partielle laisse le détail stale).
 */
export function getRetractationInvalidationTags(params: {
	retractationId: string;
	orderId: string;
}): string[] {
	return [
		RETRACTATIONS_CACHE_TAGS.ADMIN_LIST,
		RETRACTATIONS_CACHE_TAGS.DETAIL(params.retractationId),
		SHARED_CACHE_TAGS.ADMIN_BADGES,
		...getOrderInvalidationTags(params.orderId),
	];
}
