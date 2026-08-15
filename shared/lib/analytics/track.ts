"use client";

/**
 * Custom funnel event properties (primitives only).
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
 * Sink d'analytics. AUCUN provider n'est branché par défaut : Vercel Analytics a
 * été retiré (audit right-sizing §4.8 — service payant non justifié à ~20 cmd/mois).
 * L'abstraction funnel (view_item/add_to_cart/begin_checkout/purchase) est conservée
 * et RGPD-gated : il suffit de brancher un provider gratuit (ex. Plausible) via
 * `setAnalyticsSink` pour réactiver la mesure, sans toucher aux call sites.
 */
type AnalyticsSink = (name: string, properties?: EventProperties) => void;

let analyticsSink: AnalyticsSink = () => {
	/* no-op : aucun provider branché */
};

/** Branche un provider d'analytics concret (remplace le no-op par défaut). */
export function setAnalyticsSink(sink: AnalyticsSink): void {
	analyticsSink = sink;
}

/**
 * Événement window émis par le store cookie-consent à chaque acceptation/refus.
 * Permet aux consommateurs hors React (ex. `instrumentation-client.ts` pour
 * Sentry Session Replay) de réagir sans re-render ni polling.
 */
export const COOKIE_CONSENT_CHANGE_EVENT = "synclune:cookie-consent-changed";

/**
 * Vérifie si l'utilisateur a accepté les cookies analytics.
 *
 * Lit directement `localStorage` (clé Zustand persist : `cookie-consent`)
 * pour éviter de wrapper chaque tracker dans le provider hook.
 */
export function hasAnalyticsConsent(): boolean {
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
 * Émet un événement funnel custom, gated par le consentement RGPD.
 *
 * No-op si : exécuté côté serveur, consentement non accordé, ou aucun provider
 * branché (sink par défaut). Le contrat reste stable pour les call sites :
 *   trackEvent(FUNNEL_EVENTS.ADD_TO_CART, { variantId, productId, quantity, value })
 *   trackEvent(FUNNEL_EVENTS.PURCHASE, { orderNumber, value, currency: "EUR" })
 */
export function trackEvent(name: FunnelEvent | string, properties?: EventProperties): void {
	if (typeof window === "undefined") return;
	if (!hasAnalyticsConsent()) return;
	analyticsSink(name, properties);
}
