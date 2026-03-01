import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { TIMEOUTS } from "../constants";

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

	const toast = page.getByText(pattern).or(page.locator('[role="status"]'));
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

	const error = page.getByText(pattern).or(page.locator('[role="alert"]'));
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
