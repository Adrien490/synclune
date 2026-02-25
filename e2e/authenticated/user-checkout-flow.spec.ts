import { test, expect } from "../fixtures"

test.describe("Parcours checkout authentifié", () => {
	test("parcours d'achat complet : produit → panier → paiement → confirmation", async ({
		page,
		cartPage,
		checkoutPage,
		productCatalogPage,
	}) => {
		// 1. Navigate to products and find one to purchase
		await productCatalogPage.goto()

		const productCount = await productCatalogPage.productLinks.count()
		test.skip(productCount === 0, "Seed data required: no products found")

		await productCatalogPage.gotoFirstProduct()

		// 2. Add to cart
		const addButtonCount = await productCatalogPage.addToCartButton.count()
		test.skip(addButtonCount === 0, "Product requires SKU selection")

		await productCatalogPage.addToCartButton.first().click()

		// Wait for cart to open
		await expect(cartPage.dialog).toBeVisible({ timeout: 5000 })

		// 3. Navigate to checkout
		await expect(cartPage.checkoutLink).toBeVisible({ timeout: 5000 })
		await cartPage.checkoutLink.click()

		await page.waitForLoadState("domcontentloaded")
		await expect(page).toHaveURL(/\/paiement/)

		// 4. Fill address form and submit
		await checkoutPage.fillAddress()
		await checkoutPage.submitAddress()

		// 5. Wait for Stripe Embedded Checkout and fill card
		const stripeFrame = await checkoutPage.waitForStripeFrame()
		await checkoutPage.fillStripeCard(stripeFrame)
		await checkoutPage.submitPayment(stripeFrame)

		// 7. Wait for redirect to confirmation
		// Stripe processes payment → redirect to /paiement/retour → /paiement/confirmation
		await expect(page).toHaveURL(/\/paiement\/(retour|confirmation)/, { timeout: 30000 })
		await expect(page).toHaveURL(/\/paiement\/confirmation/, { timeout: 15000 })

		// 8. Verify confirmation page content
		const pageContent = await page.textContent("body")
		expect(pageContent).toMatch(/confirmée|confirmé|merci|reçue/i)

		// Order number should be displayed
		expect(pageContent).toMatch(/SYN-\d+|commande/i)
	})

	test("le checkout affiche le formulaire d'adresse avec les champs requis", async ({
		page,
		cartPage,
		productCatalogPage,
	}) => {
		// Add a product to cart first
		await productCatalogPage.goto()
		test.skip(await productCatalogPage.productLinks.count() === 0, "Seed data required")

		await productCatalogPage.gotoFirstProduct()
		test.skip(await productCatalogPage.addToCartButton.count() === 0, "Product requires SKU selection")

		await productCatalogPage.addToCartButton.first().click()
		await expect(cartPage.dialog).toBeVisible({ timeout: 5000 })
		await cartPage.checkoutLink.click()

		await page.waitForLoadState("domcontentloaded")
		await expect(page).toHaveURL(/\/paiement/)

		// Verify address form fields are present
		await expect(page.getByLabel(/Nom complet|Prénom et nom/i)).toBeVisible()
		await expect(page.getByLabel(/^Adresse$|Adresse ligne 1/i)).toBeVisible()
		await expect(page.getByLabel(/Code postal/i)).toBeVisible()
		await expect(page.getByLabel(/Ville/i)).toBeVisible()
		await expect(page.getByLabel(/Téléphone/i)).toBeVisible()
	})

	test("paiement échoué avec carte refusée affiche une erreur", async ({
		page,
		cartPage,
		checkoutPage,
		productCatalogPage,
	}) => {
		// 1. Navigate to products and add one to cart
		await productCatalogPage.goto()

		const productCount = await productCatalogPage.productLinks.count()
		test.skip(productCount === 0, "Seed data required: no products found")

		await productCatalogPage.gotoFirstProduct()

		const addButtonCount = await productCatalogPage.addToCartButton.count()
		test.skip(addButtonCount === 0, "Product requires SKU selection")

		await productCatalogPage.addToCartButton.first().click()
		await expect(cartPage.dialog).toBeVisible({ timeout: 5000 })

		// 2. Navigate to checkout
		await expect(cartPage.checkoutLink).toBeVisible({ timeout: 5000 })
		await cartPage.checkoutLink.click()

		await page.waitForLoadState("domcontentloaded")
		await expect(page).toHaveURL(/\/paiement/)

		// 3. Fill address form and submit
		await checkoutPage.fillAddress()
		await checkoutPage.submitAddress()

		// 4. Wait for Stripe and fill DECLINED test card
		const stripeFrame = await checkoutPage.waitForStripeFrame()
		await checkoutPage.fillStripeCard(stripeFrame, "4000000000000002")
		await checkoutPage.submitPayment(stripeFrame)

		// 7. Stripe should display a decline error within its iframe
		// The error message appears in the Stripe form, not on a separate page
		const errorMessage = stripeFrame.getByText(/refusée|declined|échoué|failed|error/i)
			.or(stripeFrame.locator('[class*="error"]').first())
		await expect(errorMessage).toBeVisible({ timeout: 15000 })

		// 8. Should NOT redirect to confirmation page
		await expect(page).not.toHaveURL(/\/paiement\/confirmation/, { timeout: 5000 })
	})

	test("le checkout valide les champs d'adresse obligatoires", async ({
		page,
		cartPage,
		productCatalogPage,
	}) => {
		await productCatalogPage.goto()
		test.skip(await productCatalogPage.productLinks.count() === 0, "Seed data required")

		await productCatalogPage.gotoFirstProduct()
		test.skip(await productCatalogPage.addToCartButton.count() === 0, "Product requires SKU selection")

		await productCatalogPage.addToCartButton.first().click()
		await expect(cartPage.dialog).toBeVisible({ timeout: 5000 })
		await cartPage.checkoutLink.click()

		await page.waitForLoadState("domcontentloaded")

		// Try to submit without filling the form
		const continueButton = page.getByRole("button", { name: /Continuer|Valider|Payer/i })

		// Fill only partial data to trigger validation
		const fullNameInput = page.getByLabel(/Nom complet|Prénom et nom/i)
		await fullNameInput.fill("A")
		await fullNameInput.blur()

		// Should show validation errors
		const errorMessage = page.getByText(/au moins|obligatoire|requis|invalide/i)
		await expect(errorMessage.first()).toBeVisible({ timeout: 5000 })
	})
})
