"use client";

import dynamic from "next/dynamic";

import {
	useCookieConsentStore,
	useHasConsented,
} from "@/shared/providers/cookie-consent-store-provider";

const CookieBanner = dynamic(
	() => import("./cookie-banner").then((mod) => ({ default: mod.CookieBanner })),
	{ ssr: false, loading: () => null },
);

/**
 * Lazy gate for the cookie banner.
 *
 * The heavy banner chunk (motion/react + FocusScope + ~20-30 KiB) only
 * loads for visitors who haven't yet consented. Returning visitors who
 * already accepted/rejected never download this code.
 *
 * Hydration ordering:
 * 1. SSR + first paint: `_hasHydrated=false` → render nothing (banner is
 *    invisible on the first paint anyway since `CookieBanner` itself
 *    early-returns on `!_hasHydrated`).
 * 2. Post-hydration: store reads from `localStorage` via Zustand persist
 *    → `useHasConsented()` becomes truthy for returning visitors → we
 *    skip the dynamic import entirely.
 * 3. New visitor (no stored consent): `_hasHydrated=true` and
 *    `useHasConsented()=false` → we dynamically load and render
 *    `CookieBanner`.
 */
export function CookieBannerLazy() {
	const hasHydrated = useCookieConsentStore((state) => state._hasHydrated);
	const hasConsented = useHasConsented();

	if (!hasHydrated || hasConsented) return null;

	return <CookieBanner />;
}
