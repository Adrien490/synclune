import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { SELECTORS, VIEWPORTS } from "../constants";

export class SearchPage {
	readonly searchForm: Locator;
	readonly searchInput: Locator;
	readonly clearButton: Locator;
	readonly statusRegion: Locator;

	constructor(readonly page: Page) {
		this.searchForm = page.locator('form[role="search"]');
		this.searchInput = page.getByRole("searchbox");
		this.clearButton = page.getByLabel("Effacer la recherche");
		// `MiniDotsLoader` porte lui aussi `role="status"` dans ce même form pendant
		// le pending : un `[role="status"]` nu est ambigu. On cible la live region
		// sr-only, seule annonceuse depuis le lot D.
		this.statusRegion = this.searchForm.locator('span[role="status"].sr-only');
	}

	async open() {
		// Le champ inline est dans une toolbar `hidden md:flex` (product-catalog.tsx).
		// Sans viewport épinglé, il n'existe pas sur les projets mobiles.
		await this.page.setViewportSize(VIEWPORTS.DESKTOP);
		await this.page.goto("/produits");
		await this.page.waitForLoadState("domcontentloaded");
	}

	async search(query: string) {
		await this.searchInput.first().fill(query);
		// Wait for debounced URL update
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

	async clearSearch() {
		if (await this.clearButton.isVisible()) {
			await this.clearButton.click();
		}
	}

	async hasEmptyState() {
		const emptyState = this.page.getByText(/aucun (résultat|produit)/i);
		return emptyState.isVisible();
	}
}
