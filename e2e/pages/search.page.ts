import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { SELECTORS, VIEWPORTS } from "../constants";
import { waitForHydratedButton } from "../helpers/hydration";

/**
 * Recherche produits — via le QUICK-SEARCH (dialog).
 *
 * Le champ inline du catalogue a été retiré (2026-08-06) : l'unique entrée de
 * recherche est le quick-search de la navbar (`aria-label="Ouvrir la recherche
 * rapide"`) / bottom-nav mobile, qui navigue vers `/produits?search=` à
 * l'Entrée. L'affordance de SORTIE est l'étiquette « Recherche : "x" » du
 * bandeau de filtres (`ProductFilterBadges`).
 */
export class SearchPage {
	readonly trigger: Locator;
	readonly dialog: Locator;
	readonly searchInput: Locator;
	readonly clearBadge: Locator;

	constructor(readonly page: Page) {
		this.trigger = page.getByRole("button", { name: /ouvrir la recherche rapide/i });
		this.dialog = page.getByRole("dialog");
		this.searchInput = page.getByRole("combobox", { name: /rechercher un bijou/i });
		// L'étiquette du bandeau qui efface `?search=` (nom accessible du badge :
		// « Supprimer le filtre Recherche : "…" »).
		this.clearBadge = page.getByRole("button", { name: /supprimer le filtre recherche/i });
	}

	async open() {
		await this.page.setViewportSize(VIEWPORTS.DESKTOP);
		await this.page.goto("/produits");
		await this.page.waitForLoadState("domcontentloaded");
		// Attendre l'hydratation React du déclencheur : un `click()` avant elle est
		// AVALÉ — le bouton est dans le DOM mais React n'a pas posé ses listeners,
		// le dialog ne s'ouvre jamais (sonde centralisée dans helpers/hydration.ts).
		await waitForHydratedButton(this.page, /^Ouvrir la recherche rapide$/);
		await this.trigger.first().click();
		await expect(this.dialog).toBeVisible();
	}

	/** Saisit le terme dans le dialog et valide à l'Entrée → `/produits?search=`. */
	async search(query: string) {
		await this.searchInput.fill(query);
		await this.page.keyboard.press("Enter");
		await expect(this.page).toHaveURL(new RegExp(`search=${encodeURIComponent(query)}`), {
			timeout: 5000,
		});
	}

	async getResults() {
		return this.page.locator(SELECTORS.PRODUCT_LINK);
	}

	async getResultCount() {
		const results = await this.getResults();
		return results.count();
	}

	/** Efface la recherche via l'étiquette du bandeau de filtres. */
	async clearSearch() {
		// Pas de garde `isVisible()` : si l'étiquette a disparu (renommage du
		// badge, refonte du bandeau), le clic doit ÉCHOUER au timeout — l'ancienne
		// version no-op laissait le test appelant passer sans rien effacer.
		await this.clearBadge.first().click();
	}

	async hasEmptyState() {
		const emptyState = this.page.getByText(/aucun (résultat|produit)/i);
		return emptyState.isVisible();
	}
}
