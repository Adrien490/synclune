import type { Locator, Page } from "@playwright/test"
import { expect } from "@playwright/test"
import type { CartPage } from "./cart.page"

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
		await this.page.waitForLoadState("domcontentloaded")
		await expect(this.heading).toBeVisible()
	}

	async gotoFirstProduct() {
		const href = await this.productLinks.first().getAttribute("href")
		await this.page.goto(href!)
		await this.page.waitForLoadState("domcontentloaded")
	}

	async hasProducts() {
		return (await this.productLinks.count()) > 0
	}

	/**
	 * Navigate to catalog, pick the first product, add it to cart, and
	 * wait for the cart dialog to appear. Skips the test if no products
	 * or no add-to-cart button is found (variant selection required).
	 */
	async addFirstProductToCart(cartPage: CartPage) {
		await this.goto()

		const productCount = await this.productLinks.count()
		if (productCount === 0) {
			return { skipped: true as const, reason: "Seed data required: no products found" }
		}

		await this.gotoFirstProduct()

		const addButtonCount = await this.addToCartButton.count()
		if (addButtonCount === 0) {
			return { skipped: true as const, reason: "Product requires SKU selection" }
		}

		await this.addToCartButton.first().click()
		await expect(cartPage.dialog).toBeVisible({ timeout: 5000 })

		return { skipped: false as const }
	}
}
