import { test, expect } from "../fixtures"

test.describe("Parcours checkout authentifié", () => {
	test("parcours d'achat complet : produit → panier → paiement → confirmation", async ({
		page,
		cartPage,
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

		// 4. Fill address form (Step 1 of embedded checkout)
		const fullNameInput = page.getByLabel(/Nom complet|Prénom et nom/i)
		const addressInput = page.getByLabel(/^Adresse$|Adresse ligne 1/i)
		const postalCodeInput = page.getByLabel(/Code postal/i)
		const cityInput = page.getByLabel(/Ville/i)
		const phoneInput = page.getByLabel(/Téléphone/i)

		await fullNameInput.fill("Marie Dupont")
		await addressInput.fill("12 rue de la Paix")
		await postalCodeInput.fill("75002")
		await cityInput.fill("Paris")
		await phoneInput.fill("0612345678")

		// Accept terms if checkbox is present
		const termsCheckbox = page.getByLabel(/conditions générales|J'accepte/i)
		if (await termsCheckbox.isVisible()) {
			await termsCheckbox.check()
		}

		// Submit address form
		const continueButton = page.getByRole("button", { name: /Continuer|Valider|Payer/i })
		await expect(continueButton).toBeEnabled()
		await continueButton.click()

		// 5. Wait for Stripe Embedded Checkout to load (Step 2)
		// The embedded checkout renders in an iframe from Stripe
		const stripeFrame = page.frameLocator('iframe[src*="stripe"]').first()

		// Wait for the Stripe checkout form to be ready
		await expect(async () => {
			const frameCount = await page.locator('iframe[src*="stripe"]').count()
			expect(frameCount).toBeGreaterThan(0)
		}).toPass({ timeout: 15000 })

		// 6. Fill payment details in Stripe iframe
		// Stripe Embedded Checkout has its own form - fill test card
		const cardInput = stripeFrame.getByPlaceholder(/numéro de carte|card number/i)
			.or(stripeFrame.locator('[name="cardNumber"]'))
			.or(stripeFrame.locator('#cardNumber'))

		await cardInput.fill("4242424242424242")

		const expiryInput = stripeFrame.getByPlaceholder(/MM \/ AA|expiry/i)
			.or(stripeFrame.locator('[name="cardExpiry"]'))
			.or(stripeFrame.locator('#cardExpiry'))

		await expiryInput.fill("12/30")

		const cvcInput = stripeFrame.getByPlaceholder(/CVC|CVV/i)
			.or(stripeFrame.locator('[name="cardCvc"]'))
			.or(stripeFrame.locator('#cardCvc'))

		await cvcInput.fill("123")

		// Submit payment
		const payButton = stripeFrame.getByRole("button", { name: /Payer|Pay/i })
		await payButton.click()

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
