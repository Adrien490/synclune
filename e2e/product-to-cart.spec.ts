import { test, expect } from "./fixtures"
import { requireSeedData } from "./constants"

test.describe("Parcours produit → panier", () => {
	test("naviguer vers un produit depuis le catalogue et voir les details", async ({ productCatalogPage }) => {
		await productCatalogPage.goto()

		const count = await productCatalogPage.productLinks.count()
		expect(count, "Seed data required: no products found").toBeGreaterThan(0)

		// Click the first product
		const firstLink = productCatalogPage.productLinks.first()
		await firstLink.click()

		await expect(firstLink.page()).toHaveURL(/\/creations\//)

		// Product page must have: h1 title, price, image, add-to-cart action
		const heading = firstLink.page().getByRole("heading", { level: 1 })
		await expect(heading).toBeVisible()

		const priceText = await firstLink.page().textContent("body")
		expect(priceText).toMatch(/\d+[,.]?\d*\s*€/)

		const images = firstLink.page().locator("img")
		expect(await images.count()).toBeGreaterThan(0)
	})

	test("ajouter un produit au panier depuis la page detail", async ({ page, cartPage, productCatalogPage }) => {
		await productCatalogPage.goto()

		expect(await productCatalogPage.productLinks.count(), "Seed data required").toBeGreaterThan(0)

		await productCatalogPage.gotoFirstProduct()

		const buttonCount = await productCatalogPage.addToCartButton.count()

		if (buttonCount > 0) {
			await productCatalogPage.addToCartButton.first().click()

			// Wait for cart feedback - either dialog or toast
			const toastOrFeedback = page.getByText(/ajouté|panier/i)
			await expect(cartPage.dialog.or(toastOrFeedback.first())).toBeVisible({ timeout: 5000 })
		} else {
			// Product may require SKU selection first (variants)
			const variantSelector = page.locator('[data-variant-selector], select, [role="radiogroup"]')
			expect(await variantSelector.count(), "No add-to-cart button or variant selector found").toBeGreaterThan(0)
		}
	})

	test("le panier affiche le produit apres ajout", async ({ page, cartPage, productCatalogPage }) => {
		await productCatalogPage.goto()

		expect(await productCatalogPage.productLinks.count(), "Seed data required").toBeGreaterThan(0)

		await productCatalogPage.gotoFirstProduct()

		if (await productCatalogPage.addToCartButton.count() === 0) {
			test.skip(true, "Product requires SKU selection - skipping cart verification")
			return
		}

		await productCatalogPage.addToCartButton.first().click()

		// Wait for cart to update, then ensure it's open
		await expect(cartPage.dialog.or(page.getByText(/ajouté|panier/i).first())).toBeVisible({ timeout: 5000 })

		if (!await cartPage.dialog.isVisible()) {
			await cartPage.open()
		}

		// Cart should no longer show "empty" message
		await expect(cartPage.emptyMessage).not.toBeVisible()

		// Cart should contain at least one item
		const cartContent = await cartPage.dialog.textContent()
		expect(cartContent).toMatch(/\d+[,.]?\d*\s*€/)
	})

	test("le parcours recherche → produit fonctionne", async ({ page, productCatalogPage }) => {
		await page.goto("/produits")
		await page.waitForLoadState("domcontentloaded")

		const searchCount = await productCatalogPage.searchInput.count()

		if (searchCount === 0) {
			test.skip(true, "No search input on /produits page")
			return
		}

		// Type a search term and wait for URL to update (debounce-aware)
		await productCatalogPage.searchInput.first().fill("bague")
		await expect(page).toHaveURL(/search=bague/, { timeout: 5000 })

		// Either products or empty state should be visible
		await page.waitForLoadState("domcontentloaded")
		const productCards = page.locator('article, [data-product-card], a[href*="/creations/"]')
		const emptyState = page.getByText(/aucun (résultat|produit)/i)

		await expect(productCards.first().or(emptyState)).toBeVisible({ timeout: 5000 })
	})
})
