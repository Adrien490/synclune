"use client";

import { Analytics } from "@vercel/analytics/next";
import { useCookieConsentStore } from "@/shared/providers/cookie-consent-store-provider";

/**
 * Composant wrapper pour Vercel Analytics avec respect du consentement RGPD
 *
 * Analytics ne se charge QUE si l'utilisateur a explicitement accepté les cookies.
 * Conforme RGPD : pas de tracking sans consentement.
 */
export function ConditionalAnalytics() {
	const accepted = useCookieConsentStore((state) => state.accepted);
	const hasHydrated = useCookieConsentStore((state) => state._hasHydrated);

	if (!hasHydrated || accepted !== true || !process.env.NEXT_PUBLIC_VERCEL_ENV) {
		return null;
	}

	return <Analytics />;
}
