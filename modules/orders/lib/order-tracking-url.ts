import { SITE_URL } from "@/shared/constants/seo-config";
import { ROUTES } from "@/shared/constants/urls";
import { signOrderTrackingToken } from "./order-tracking-token";

/**
 * URL de suivi tokenisée envoyée dans les emails — SSOT à une seule branche.
 * Fail-closed : sans `AUTH_SECRET`, pas d'URL (l'email part sans CTA de suivi
 * plutôt qu'avec un lien mort ou non signé).
 */
export function buildOrderTrackingUrl(order: { id: string; email: string }): string | null {
	const secret = process.env.AUTH_SECRET;
	if (!secret || !order.email) return null;
	const token = signOrderTrackingToken(order.id, order.email, secret);
	return `${SITE_URL}${ROUTES.SHOP.ORDER_TRACKING}?commande=${order.id}&token=${token}`;
}
