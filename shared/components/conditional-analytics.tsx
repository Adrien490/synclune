"use client";

import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { useCookieConsentStore } from "@/shared/providers/cookie-consent-store-provider";

/**
 * Composant wrapper pour Vercel Analytics et Speed Insights avec respect du consentement RGPD
 *
 * Analytics et Speed Insights ne se chargent QUE si l'utilisateur a explicitement accepté les cookies.
 * Conforme RGPD : pas de tracking sans consentement.
 */
export function ConditionalAnalytics() {
	const accepted = useCookieConsentStore((state) => state.accepted);
	const hasHydrated = useCookieConsentStore((state) => state._hasHydrated);

	if (!hasHydrated || accepted !== true) {
		return null;
	}

	return (
		<>
			<Analytics />
			<SpeedInsights />
		</>
	);
}
