"use client";

import dynamic from "next/dynamic";
import { useCookieConsentStore } from "@/shared/providers/cookie-consent-store-provider";

const Analytics = dynamic(
	() => import("@vercel/analytics/next").then((mod) => mod.Analytics),
	{ ssr: false }
);

const SpeedInsights = dynamic(
	() => import("@vercel/speed-insights/next").then((mod) => mod.SpeedInsights),
	{ ssr: false }
);

/**
 * Composant wrapper pour Vercel Analytics et Speed Insights avec respect du consentement RGPD
 *
 * Analytics et Speed Insights ne se chargent QUE si l'utilisateur a explicitement accepté les cookies.
 * Conforme RGPD : pas de tracking sans consentement.
 */
export function ConditionalAnalytics() {
	const accepted = useCookieConsentStore((state) => state.accepted);

	if (accepted !== true) {
		return null;
	}

	return (
		<>
			<Analytics />
			<SpeedInsights />
		</>
	);
}
