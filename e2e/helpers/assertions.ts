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
 * Assert that a success toast/alert with THIS message is visible.
 *
 * ⚠️ `message` est OBLIGATOIRE (audit 2026-08-16) : le motif générique par
 * défaut (/succès|réussi|ajouté|…/) matchait n'importe quel feedback de la
 * page — un toast d'erreur contenant « ajouté » (ou le succès d'une TOUTE
 * autre action) rendait l'assertion verte. La branche `VISIBLE_STATUS` est
 * filtrée sur le même motif : un status visible SANS le message ne suffit plus.
 */
export async function expectSuccessToast(page: Page, message: string | RegExp) {
	const pattern = message instanceof RegExp ? message : new RegExp(message, "i");

	const toast = page
		.getByText(pattern)
		.or(page.locator(VISIBLE_STATUS).filter({ hasText: pattern }));
	await expect(toast.first()).toBeVisible({ timeout: TIMEOUTS.FEEDBACK });
}

/**
 * Assert that a form error with THIS message is visible.
 *
 * ⚠️ `message` est OBLIGATOIRE — même raison que `expectSuccessToast` : le
 * motif générique par défaut acceptait n'importe quelle erreur, y compris une
 * erreur d'un AUTRE champ que celui testé.
 */
export async function expectFormError(page: Page, message: string | RegExp) {
	const pattern = message instanceof RegExp ? message : new RegExp(message, "i");

	const error = page
		.getByText(pattern)
		.or(page.locator(VISIBLE_ALERT).filter({ hasText: pattern }));
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

// `expectRateLimitError` supprimé (audit 2026-08-16) : le rate limiting
// n'existe plus (perte volontaire de la migration lean, cf. CLAUDE.md) et
// aucun spec ne l'importait — un helper qui asserte un comportement retiré ne
// pouvait qu'induire en erreur.
