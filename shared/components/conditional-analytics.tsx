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

	// Ne charger Analytics que si l'utilisateur a accepté
	if (accepted !== true) {
		return null;
	}

	return <Analytics />;
}
