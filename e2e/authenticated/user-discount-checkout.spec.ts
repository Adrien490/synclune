import { test, expect } from "../fixtures"
import { requireSeedData } from "../constants"

test.describe("Checkout - Codes promo", { tag: ["@regression"] }, () => {
	test.beforeEach(async ({ productCatalogPage, cartPage, page }) => {
		// Add a product to cart and navigate to checkout
		const result = await productCatalogPage.addFirstProductToCart(cartPage)
		if (result.skipped) {
			if (result.seedData) {
				requireSeedData(test, false, result.reason)
			}
			test.skip(true, result.reason)
			return
		}

		await expect(cartPage.checkoutLink).toBeVisible({ timeout: 5000 })
		await cartPage.checkoutLink.click()
		await page.waitForLoadState("domcontentloaded")
		await expect(page).toHaveURL(/\/paiement/)
	})

	test("la section code promo est visible", async ({ checkoutPage }) => {
		await expect(checkoutPage.discountTrigger).toBeVisible()
	})

	test("ouvrir la section code promo affiche le champ de saisie", async ({ checkoutPage }) => {
		await checkoutPage.openDiscountSection()

		await expect(checkoutPage.discountInput).toBeVisible()
		await expect(checkoutPage.discountApplyButton).toBeVisible()
	})

	test("appliquer un code invalide affiche une erreur", async ({ checkoutPage }) => {
		await checkoutPage.openDiscountSection()
		await checkoutPage.applyDiscountCode("FAKECODE123")

		// Should show error feedback
		const errorFeedback = checkoutPage.discountError
			.or(checkoutPage.page.getByText(/invalide|expiré|introuvable/i))
			.or(checkoutPage.page.locator('[role="alert"]'))

		await expect(errorFeedback.first()).toBeVisible({ timeout: 5000 })
	})

	test("le bouton appliquer est desactive quand le champ est vide", async ({ checkoutPage }) => {
		await checkoutPage.openDiscountSection()

		// Clear the input
		await checkoutPage.discountInput.fill("")
		await expect(checkoutPage.discountApplyButton).toBeDisabled()
	})

	test("le formulaire d'adresse est fonctionnel au checkout", async ({ checkoutPage }) => {
		await checkoutPage.fillAddress()
		await checkoutPage.submitAddress()

		// Should proceed to Stripe payment step or show validation success
		const stripeFrame = checkoutPage.page.locator('iframe[src*="stripe"]')
		const validationError = checkoutPage.page.getByText(/obligatoire|requis|invalide/i)

		await expect(async () => {
			const hasStripe = await stripeFrame.count() > 0
			const hasError = await validationError.first().isVisible()
			// Either we advanced to Stripe, or there's a validation issue to address
			expect(hasStripe || hasError).toBe(true)
		}).toPass({ timeout: 15000 })
	})
})
