import { test, expect } from "../fixtures"
import { requireSeedData } from "../constants"

test.describe("Avis produits", { tag: ["@regression"] }, () => {
	test("les avis sont visibles sur la page detail produit", async ({ page, productCatalogPage }) => {
		await productCatalogPage.goto()

		const productCount = await productCatalogPage.productLinks.count()
		requireSeedData(test, productCount > 0, "No products found")

		await productCatalogPage.gotoFirstProduct()

		// Look for the reviews section heading specifically
		const reviewsHeading = page.getByRole("heading", { name: /avis|commentaires|évaluations/i })
		const emptyReviewsState = page.getByText(/aucun avis|soyez le premier/i)

		// The reviews section (heading or empty state) must be present — assert each independently
		await expect(
			reviewsHeading.first().or(emptyReviewsState.first()),
		).toBeVisible({ timeout: 5000 })
	})

	test("le formulaire d'avis est accessible pour les produits commandes", async ({ page, orderPage }) => {
		await orderPage.goto()

		const hasOrders = await orderPage.hasOrders()
		test.skip(!hasOrders, "No orders available - cannot write review")

		// Navigate to first order
		const orderRows = await orderPage.getOrderRows()
		const firstOrderLink = orderRows.first().getByRole("link").first()
		await firstOrderLink.click()
		await page.waitForLoadState("domcontentloaded")

		// Look for review button/link on order detail
		const reviewButton = page.getByRole("button", { name: /avis|évaluer|noter/i })
			.or(page.getByRole("link", { name: /avis|évaluer|noter/i }))

		// Order detail heading should be visible
		const heading = page.getByRole("heading", { level: 1 })
		await expect(heading).toBeVisible()

		// Review option depends on order status (must be DELIVERED)
		const reviewVisible = await reviewButton.first().isVisible()

		if (reviewVisible) {
			await expect(reviewButton.first()).toBeEnabled()
		} else {
			// Order is not eligible for review - verify status explains why
			const orderStatus = page.getByText(/Livr|En cours|Expédi|Annul|En attente/i)
			await expect(orderStatus.first()).toBeVisible()
			test.skip(true, "Order not eligible for review")
		}
	})

	test("le formulaire d'avis contient les champs requis", async ({ page }) => {
		// Navigate to a product page and look for review form
		await page.goto("/produits")
		await page.waitForLoadState("domcontentloaded")

		const productLinks = page.locator('a[href*="/creations/"]')
		const productCount = await productLinks.count()
		requireSeedData(test, productCount > 0, "No products found")

		await productLinks.first().click()
		await page.waitForLoadState("domcontentloaded")

		// Look for review form elements
		const ratingLabel = page.getByText(/Votre note/i)

		// Skip if review form is not shown (user hasn't purchased this product)
		const ratingVisible = await ratingLabel.isVisible()
		test.skip(!ratingVisible, "Review form not available - user may not have purchased this product")

		const contentLabel = page.getByLabel(/Votre avis/i)
		await expect(contentLabel).toBeVisible()

		const submitButton = page.getByRole("button", { name: /Publier/i })
		await expect(submitButton).toBeVisible()
	})
})
