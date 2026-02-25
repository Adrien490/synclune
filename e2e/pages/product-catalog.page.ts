import type { Locator, Page } from "@playwright/test"

export class ProductCatalogPage {
	readonly productLinks: Locator
	readonly addToCartButton: Locator
	readonly searchInput: Locator
	readonly heading: Locator

	constructor(private page: Page) {
		this.productLinks = page.locator('a[href*="/creations/"]')
		this.addToCartButton = page.getByRole("button", { name: /Ajouter au panier|Ajouter/i })
		this.searchInput = page.getByRole("searchbox")
		this.heading = page.getByRole("heading", { level: 1 })
	}

	async goto() {
		await this.page.goto("/produits")
		await this.page.waitForLoadState("networkidle")
	}

	async gotoFirstProduct() {
		const href = await this.productLinks.first().getAttribute("href")
		await this.page.goto(href!)
		await this.page.waitForLoadState("domcontentloaded")
	}

	async hasProducts() {
		return (await this.productLinks.count()) > 0
	}
}
