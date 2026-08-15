import type { Page } from "@playwright/test";

/**
 * Pré-seed le consentement cookies (localStorage, format Zustand persist v0)
 * AVANT la première navigation — à appeler avant `page.goto`.
 *
 * Pourquoi pré-seeder plutôt que cliquer « Refuser » : le bandeau est monté en
 * lazy (`CookieBannerLazy`, chunk dynamique post-hydratation) — un clic tenté
 * trop tôt le manque, et il apparaît ENSUITE, en plein milieu du test. Sur
 * mobile il recouvre la bottom-nav : le tap sur l'onglet Panier expirait en
 * 30s sans jamais aboutir (mesuré sur product-to-cart, projets mobile-*).
 *
 * ⚠️ Ne PAS l'utiliser dans les specs qui testent le bandeau lui-même
 * (RGPD quick-search, AlertDialog à 200%…) : ils ont besoin de son état réel.
 */
export async function preseedCookieConsent(page: Page): Promise<void> {
	await page.addInitScript(() => {
		window.localStorage.setItem(
			"cookie-consent",
			JSON.stringify({
				state: {
					accepted: false,
					consentDate: new Date().toISOString(),
					policyVersion: 1,
				},
				version: 0,
			}),
		);
	});
}
