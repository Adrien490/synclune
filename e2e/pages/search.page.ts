import type { Locator, Page } from "@playwright/test"
import { expect } from "@playwright/test"
import { SELECTORS } from "../constants"

export class SearchPage {
	readonly searchForm: Locator
	readonly searchInput: Locator
	readonly clearButton: Locator
	readonly statusRegion: Locator

	constructor(readonly page: Page) {
		this.searchForm = page.locator('form[role="search"]')
		this.searchInput = page.getByRole("searchbox")
		this.clearButton = page.getByLabel("Effacer la recherche")
		this.statusRegion = this.searchForm.locator('[role="status"]')
	}

	async open() {
		// The search input is typically visible on /produits
		await this.page.goto("/produits")
		await this.page.waitForLoadState("domcontentloaded")
	}

	async search(query: string) {
		await this.searchInput.first().fill(query)
		// Wait for debounced URL update
		await expect(this.page).toHaveURL(new RegExp(`search=${encodeURIComponent(query)}`), {
			timeout: 5000,
		})
	}

	async getResults() {
		return this.page.locator(SELECTORS.PRODUCT_LINK)
	}

	async getResultCount() {
		const results = await this.getResults()
		return results.count()
	}

	async clearSearch() {
		if (await this.clearButton.isVisible()) {
			await this.clearButton.click()
		}
	}

	async hasEmptyState() {
		const emptyState = this.page.getByText(/aucun (résultat|produit)/i)
		return emptyState.isVisible()
	}
}
