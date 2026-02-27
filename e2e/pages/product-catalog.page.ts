import type { Locator, Page } from "@playwright/test"
import { expect } from "@playwright/test"
import type { CartPage } from "./cart.page"
import { SELECTORS } from "../constants"

type AddToCartResult =
	| { skipped: false }
	| { skipped: true; reason: string; seedData: boolean }

export class ProductCatalogPage {
	readonly productLinks: Locator
	readonly addToCartButton: Locator
	readonly searchInput: Locator
	readonly heading: Locator

	constructor(private page: Page) {
		this.productLinks = page.locator(SELECTORS.PRODUCT_LINK)
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
	 * Check if the current product detail page has a variant selector.
	 */
	async hasVariantSelector(): Promise<boolean> {
		const variantRegion = this.page.getByRole("region", { name: /Choisissez vos options/i })
		return (await variantRegion.count()) > 0
	}

	/**
	 * Select a color variant by clicking the first available color radio.
	 */
	async selectFirstAvailableColor(): Promise<boolean> {
		const colorGroup = this.page.getByRole("radiogroup", { name: /Sélection de couleur/i })
		if (await colorGroup.count() === 0) return false

		const availableColor = colorGroup.getByRole("radio").filter({ hasNot: this.page.locator("[disabled]") }).first()
		if (await availableColor.count() === 0) return false

		await availableColor.click()
		return true
	}

	/**
	 * Select a material variant by clicking the first available material radio.
	 */
	async selectFirstAvailableMaterial(): Promise<boolean> {
		const materialGroup = this.page.getByRole("radiogroup", { name: /Sélection de matériau/i })
		if (await materialGroup.count() === 0) return false

		const availableMaterial = materialGroup.getByRole("radio").filter({ hasNot: this.page.locator("[disabled]") }).first()
		if (await availableMaterial.count() === 0) return false

		await availableMaterial.click()
		return true
	}

	/**
	 * Select a size variant by clicking the first available size radio.
	 */
	async selectFirstAvailableSize(): Promise<boolean> {
		const sizeGroup = this.page.getByRole("radiogroup", { name: /Sélection de taille/i })
		if (await sizeGroup.count() === 0) return false

		const availableSize = sizeGroup.getByRole("radio").filter({ hasNot: this.page.locator("[disabled]") }).first()
		if (await availableSize.count() === 0) return false

		await availableSize.click()
		return true
	}

	/**
	 * Select all required variant options to enable the add-to-cart button.
	 * Returns true if all options were selected, false if not possible.
	 */
	async selectAllVariantOptions(): Promise<boolean> {
		if (!await this.hasVariantSelector()) return false

		await this.selectFirstAvailableColor()
		await this.selectFirstAvailableMaterial()
		await this.selectFirstAvailableSize()

		// Wait for add-to-cart button to become enabled
		const addButton = this.page.getByRole("button", { name: /Ajouter au panier/i })
		try {
			await expect(addButton.first()).toBeEnabled({ timeout: 5000 })
			return true
		} catch {
			return false
		}
	}

	/**
	 * Navigate to catalog, pick the first product, add it to cart, and
	 * wait for the cart dialog to appear. Skips the test if no products
	 * or no add-to-cart button is found (variant selection required).
	 */
	async addFirstProductToCart(cartPage: CartPage): Promise<AddToCartResult> {
		await this.goto()

		const productCount = await this.productLinks.count()
		if (productCount === 0) {
			return { skipped: true, reason: "No products found", seedData: true }
		}

		await this.gotoFirstProduct()

		const addButtonCount = await this.addToCartButton.count()
		if (addButtonCount === 0) {
			return { skipped: true, reason: "Product requires SKU selection", seedData: false }
		}

		await this.addToCartButton.first().click()
		await expect(cartPage.dialog).toBeVisible({ timeout: 5000 })

		return { skipped: false }
	}

	/**
	 * Navigate to catalog, pick the first product with variants, select all
	 * required options, and add to cart.
	 * Returns skip reason or success.
	 */
	async addFirstVariantProductToCart(cartPage: CartPage): Promise<AddToCartResult> {
		await this.goto()

		const productCount = await this.productLinks.count()
		if (productCount === 0) {
			return { skipped: true, reason: "No products found", seedData: true }
		}

		// Try each product to find one with variant selector
		for (let i = 0; i < Math.min(productCount, 5); i++) {
			const href = await this.productLinks.nth(i).getAttribute("href")
			await this.page.goto(href!)
			await this.page.waitForLoadState("domcontentloaded")

			if (await this.hasVariantSelector()) {
				const selected = await this.selectAllVariantOptions()
				if (selected) {
					await this.addToCartButton.first().click()
					await expect(cartPage.dialog).toBeVisible({ timeout: 5000 })
					return { skipped: false }
				}
			}
		}

		return { skipped: true, reason: "No product with selectable variants found", seedData: false }
	}
}
