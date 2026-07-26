import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { TIMEOUTS } from "../constants";

/**
 * Sélecteurs de feedback **visible**, excluant les régions d'annonce sr-only.
 *
 * ⚠️ Pourquoi `:not(.sr-only)` est indispensable.
 *
 * `AppToaster` (layout racine, donc présent sur TOUTES les pages) monte
 * `#toast-live-polite` avec `role="status"` et `#toast-live-assertive` avec
 * `role="alert"`. Ces nœuds sont `.sr-only`, soit une boîte de 1×1 px — que
 * Playwright considère **visible** (`sr-only` clippe, il ne met pas
 * `visibility: hidden`).
 *
 * Conséquence : un `expect(page.locator('[role="alert"]').first()).toBeVisible()`
 * passe sur n'importe quelle page, même sans le moindre feedback. L'audit
 * « Système de feedback » a trouvé sept specs qui passaient à faux pour cette
 * raison, dont deux helpers de ce fichier utilisés par une dizaine d'autres.
 *
 * Utiliser ces constantes pour toute assertion de feedback visible. Pour vérifier
 * une **annonce** screen-reader, cibler au contraire les régions par id et
 * asserter leur texte — cf. `e2e/a11y/live-regions.spec.ts`.
 */
export const VISIBLE_ALERT = '[role="alert"]:not(.sr-only)';
export const VISIBLE_STATUS = '[role="status"]:not(.sr-only)';

/**
 * Assert that a success toast/alert is visible on the page.
 * Matches common French success messages.
 */
export async function expectSuccessToast(page: Page, message?: string | RegExp) {
	const pattern =
		message instanceof RegExp
			? message
			: message
				? new RegExp(message, "i")
				: /succès|réussi|ajouté|enregistré|créé|modifié|supprimé|envoyé|confirmé/i;

	const toast = page.getByText(pattern).or(page.locator(VISIBLE_STATUS));
	await expect(toast.first()).toBeVisible({ timeout: TIMEOUTS.FEEDBACK });
}

/**
 * Assert that a form error is visible for a specific field or in general.
 */
export async function expectFormError(page: Page, message?: string | RegExp) {
	const pattern =
		message instanceof RegExp
			? message
			: message
				? new RegExp(message, "i")
				: /obligatoire|requis|invalide|erreur|au moins/i;

	const error = page.getByText(pattern).or(page.locator(VISIBLE_ALERT));
	await expect(error.first()).toBeVisible({ timeout: TIMEOUTS.VALIDATION });
}

/**
 * Assert that the page has the expected h1 heading.
 */
export async function expectPageHeading(page: Page, text: string | RegExp) {
	const heading = page.getByRole("heading", { level: 1 });
	await expect(heading).toBeVisible();
	if (text) {
		await expect(heading).toHaveText(text);
	}
}

/**
 * Assert that a rate limit error is shown.
 * Use when rate limiting is expected (not as a fallback for success).
 */
export async function expectRateLimitError(page: Page) {
	const error = page.getByText(/trop de demandes|réessayer plus tard|rate limit/i);
	await expect(error.first()).toBeVisible({ timeout: TIMEOUTS.FEEDBACK });
}
