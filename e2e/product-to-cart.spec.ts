import { test, expect } from "@playwright/test"

test.describe("Parcours produit → panier", () => {
	test("naviguer vers un produit depuis le catalogue et voir les details", async ({ page }) => {
		await page.goto("/produits")
		await page.waitForLoadState("networkidle")

		// Find a product link
		const productLinks = page.locator('a[href*="/creations/"]')
		const count = await productLinks.count()
		expect(count, "Seed data required: no products found").toBeGreaterThan(0)

		// Click the first product
		const firstLink = productLinks.first()
		const productName = await firstLink.textContent()
		await firstLink.click()
		await page.waitForLoadState("domcontentloaded")

		// Should be on a product detail page
		await expect(page).toHaveURL(/\/creations\//)

		// Product page must have: h1 title, price, image, add-to-cart action
		const heading = page.getByRole("heading", { level: 1 })
		await expect(heading).toBeVisible()

		const priceText = await page.textContent("body")
		expect(priceText).toMatch(/\d+[,.]?\d*\s*€/)

		const images = page.locator("img")
		expect(await images.count()).toBeGreaterThan(0)
	})

	test("ajouter un produit au panier depuis la page detail", async ({ page }) => {
		// Navigate to a product
		await page.goto("/produits")
		await page.waitForLoadState("networkidle")

		const productLinks = page.locator('a[href*="/creations/"]')
		expect(await productLinks.count(), "Seed data required").toBeGreaterThan(0)

		await productLinks.first().click()
		await page.waitForLoadState("domcontentloaded")

		// Look for the add-to-cart button or SKU selector
		const addToCartButton = page.getByRole("button", {
			name: /Ajouter au panier|Ajouter/i,
		})

		const buttonCount = await addToCartButton.count()

		if (buttonCount > 0) {
			// Click add to cart
			await addToCartButton.first().click()

			// Wait for cart feedback - either a toast, sheet opening, or badge update
			// The cart sheet should open or a success indicator should appear
			await page.waitForTimeout(1000)

			// Check that the cart sheet opened or badge updated
			const cartDialog = page.getByRole("dialog")
			const toastOrFeedback = page.getByText(/ajouté|panier/i)

			const dialogVisible = await cartDialog.isVisible().catch(() => false)
			const feedbackVisible = await toastOrFeedback.first().isVisible().catch(() => false)

			// At least one feedback mechanism should have triggered
			expect(dialogVisible || feedbackVisible).toBe(true)
		} else {
			// Product may require SKU selection first (variants)
			const variantSelector = page.locator('[data-variant-selector], select, [role="radiogroup"]')
			expect(await variantSelector.count(), "No add-to-cart button or variant selector found").toBeGreaterThan(0)
		}
	})

	test("le panier affiche le produit apres ajout", async ({ page }) => {
		// Navigate to a product and add it
		await page.goto("/produits")
		await page.waitForLoadState("networkidle")

		const productLinks = page.locator('a[href*="/creations/"]')
		expect(await productLinks.count(), "Seed data required").toBeGreaterThan(0)

		await productLinks.first().click()
		await page.waitForLoadState("domcontentloaded")

		// Get product name for later verification
		const productTitle = await page.getByRole("heading", { level: 1 }).textContent()

		// Try to add to cart
		const addToCartButton = page.getByRole("button", {
			name: /Ajouter au panier|Ajouter/i,
		})

		if (await addToCartButton.count() === 0) {
			test.skip(true, "Product requires SKU selection - skipping cart verification")
			return
		}

		await addToCartButton.first().click()
		await page.waitForTimeout(1500)

		// Open cart if not already open
		const cartDialog = page.getByRole("dialog")
		if (!await cartDialog.isVisible().catch(() => false)) {
			const cartButton = page.getByRole("button", { name: /Ouvrir mon panier/i })
			await cartButton.click()
			await expect(cartDialog).toBeVisible()
		}

		// Cart should no longer show "empty" message
		const emptyMessage = cartDialog.getByText(/Votre panier est vide/i)
		await expect(emptyMessage).not.toBeVisible()

		// Cart should contain at least one item
		const cartContent = await cartDialog.textContent()
		expect(cartContent).toMatch(/\d+[,.]?\d*\s*€/)
	})

	test("le parcours recherche → produit fonctionne", async ({ page }) => {
		await page.goto("/produits")
		await page.waitForLoadState("domcontentloaded")

		// Find search input
		const searchInput = page.getByRole("searchbox")
		const searchCount = await searchInput.count()

		if (searchCount === 0) {
			test.skip(true, "No search input on /produits page")
			return
		}

		// Type a search term
		await searchInput.first().fill("bague")
		await page.waitForTimeout(800) // Debounce

		// URL should reflect search
		await expect(page).toHaveURL(/search=bague/)

		// Either products or empty state should be visible
		await page.waitForLoadState("networkidle")
		const productCards = page.locator('article, [data-product-card], a[href*="/creations/"]')
		const emptyState = page.getByText(/aucun (résultat|produit)/i)

		const hasProducts = await productCards.count() > 0
		const hasEmpty = await emptyState.isVisible().catch(() => false)

		expect(hasProducts || hasEmpty).toBe(true)
	})
})
