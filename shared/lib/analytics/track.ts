"use client";

import { track as vercelTrack } from "@vercel/analytics";

/**
 * Vercel Analytics custom event properties.
 * Vercel only supports string | number | boolean | null primitives.
 */
type EventProperties = Record<string, string | number | boolean | null>;

/**
 * Funnel event names (centralisés pour éviter les fautes de frappe en consommation).
 */
export const FUNNEL_EVENTS = {
	VIEW_ITEM: "view_item",
	ADD_TO_CART: "add_to_cart",
	BEGIN_CHECKOUT: "begin_checkout",
	PURCHASE: "purchase",
} as const;

export type FunnelEvent = (typeof FUNNEL_EVENTS)[keyof typeof FUNNEL_EVENTS];

/**
 * Vérifie si l'utilisateur a accepté les cookies analytics.
 *
 * Lit directement `localStorage` (clé Zustand persist : `cookie-consent`)
 * pour éviter de wrapper chaque tracker dans le provider hook.
 * Cohérent avec [shared/components/conditional-analytics.tsx] qui ne monte
 * `<Analytics />` que si `accepted === true`.
 */
function hasAnalyticsConsent(): boolean {
	if (typeof window === "undefined") return false;
	try {
		const raw = window.localStorage.getItem("cookie-consent");
		if (!raw) return false;
		const parsed = JSON.parse(raw) as { state?: { accepted?: boolean | null } } | null;
		return parsed?.state?.accepted === true;
	} catch {
		return false;
	}
}

/**
 * Émet un événement custom Vercel Analytics, gated par le consentement RGPD.
 *
 * No-op si :
 * - exécuté côté serveur
 * - utilisateur n'a pas accepté les cookies analytics
 * - `<Analytics />` n'est pas monté (Vercel `track()` est lui-même no-op silencieux)
 *
 * Usage funnel e-commerce :
 *   trackEvent(FUNNEL_EVENTS.ADD_TO_CART, { skuId, productId, quantity, value })
 *   trackEvent(FUNNEL_EVENTS.PURCHASE, { orderNumber, value, currency: "EUR" })
 */
export function trackEvent(name: FunnelEvent | string, properties?: EventProperties): void {
	if (typeof window === "undefined") return;
	if (!hasAnalyticsConsent()) return;
	vercelTrack(name, properties);
}
