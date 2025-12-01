import { cacheLife, cacheTag } from "next/cache";

export const DISPUTES_CACHE_TAGS = {
	LIST: "disputes-list",
	BY_ORDER: (orderId: string) => `disputes-order-${orderId}`,
	DETAIL: (id: string) => `dispute-${id}`,
} as const;

/**
 * Cache helper pour les disputes (courte durée car données critiques)
 */
export function cacheDisputes() {
	cacheLife("dashboard"); // 1 min stale, 30s revalidate, 5m expire
	cacheTag(DISPUTES_CACHE_TAGS.LIST);
}

/**
 * Tags à invalider lors d'une modification de dispute
 */
export function getDisputeInvalidationTags(id?: string, orderId?: string): string[] {
	const tags: string[] = [DISPUTES_CACHE_TAGS.LIST];
	if (id) tags.push(DISPUTES_CACHE_TAGS.DETAIL(id));
	if (orderId) tags.push(DISPUTES_CACHE_TAGS.BY_ORDER(orderId));
	return tags;
}
