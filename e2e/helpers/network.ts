import type { Page, Route } from "@playwright/test";

/**
 * Interception réseau pour les E2E de résilience.
 *
 * ⚠️ Le storefront ne parle PAS en `/api/**` : toutes les mutations invitées
 * (ajout panier, favoris, quick-search) passent par des **Server Actions** —
 * un POST sur l'URL de la page courante, identifié par l'en-tête `next-action`
 * (l'id d'action hashé au build). Les anciennes interceptions `**\/api/**`
 * étaient des no-ops silencieux : elles ne matchaient jamais rien, et les
 * tests qui s'y appuyaient passaient sans avoir rien exercé (audit 2026-08-16).
 *
 * Les helpers ci-dessous ciblent donc le POST de Server Action lui-même. Ils
 * matchent par en-tête, pas par URL : c'est stable à travers les builds (les
 * ids d'action changent, l'en-tête non).
 */

function isServerActionRequest(route: Route): boolean {
	const request = route.request();
	return request.method() === "POST" && request.headers()["next-action"] !== undefined;
}

/**
 * Fait échouer TOUTES les Server Actions avec le statut donné (500 par défaut).
 * Retourne une fonction de nettoyage qui restaure le réseau.
 *
 * Côté client, React rejette alors la promesse de l'action : l'erreur remonte
 * à la frontière d'erreur du segment (`app/(shop)/error.tsx` sur la vitrine).
 */
export async function failServerActions(page: Page, status = 500): Promise<() => Promise<void>> {
	const handler = (route: Route) => {
		if (isServerActionRequest(route)) {
			return route.fulfill({ status, contentType: "text/plain", body: "" });
		}
		return route.continue();
	};
	await page.route("**/*", handler);
	return () => page.unroute("**/*", handler);
}

/**
 * Retarde toutes les Server Actions de `delayMs` avant de les laisser passer.
 * Sert à rendre observable l'état d'attente (`aria-busy`, libellé « … en
 * cours »), invisible à vitesse locale. Retourne la fonction de nettoyage.
 */
export async function delayServerActions(
	page: Page,
	delayMs: number,
): Promise<() => Promise<void>> {
	const handler = async (route: Route) => {
		if (isServerActionRequest(route)) {
			await new Promise((resolve) => setTimeout(resolve, delayMs));
		}
		return route.continue();
	};
	await page.route("**/*", handler);
	return () => page.unroute("**/*", handler);
}
