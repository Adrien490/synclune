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
		// Le champ inline vit dans le cluster `hidden md:flex` de la rangée titre
		// (catalog-toolbar-inline.tsx) — unique instance du DOM, la barre sticky
		// n'en monte plus. Sans viewport épinglé, il n'existe pas sur mobile.
		await this.page.setViewportSize(VIEWPORTS.DESKTOP);
		await this.page.goto("/produits");
		await this.page.waitForLoadState("domcontentloaded");
		// Attendre l'hydratation React du champ : un `fill()` avant elle est
		// AVALÉ — la valeur reste dans le DOM mais React n'a pas encore posé ses
		// listeners, le debounce ne part jamais et l'URL ne change pas. Prouvé au
		// dev server (hydratation > latence du fill) ; `networkidle` n'est pas une
		// option, il ne se résout jamais sous `next dev`.
		await this.page.waitForFunction(() => {
			const input = document.querySelector('form[role="search"] input');
			return !!input && Object.keys(input).some((key) => key.startsWith("__reactProps"));
		});
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
