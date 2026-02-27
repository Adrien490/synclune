import { test, expect } from "../fixtures"
import { TIMEOUTS } from "../constants"

test.describe("Flux d'authentification", { tag: ["@critical"] }, () => {
	test("login UI reussi redirige vers le compte", { tag: ["@smoke"] }, async ({ page, authPage }) => {
		// Clear existing auth state by navigating to a logout-like flow
		await page.goto("/connexion")
		await page.waitForLoadState("domcontentloaded")

		const email = process.env.E2E_USER_EMAIL ?? "user2@synclune.fr"
		const password = process.env.E2E_USER_PASSWORD ?? "password123"

		await authPage.emailInput.fill(email)
		await authPage.passwordInput.fill(password)
		await authPage.submitButton.click()

		// Should redirect away from login page
		await expect(page).not.toHaveURL(/\/connexion/, { timeout: TIMEOUTS.AUTH_REDIRECT })

		// Should be on account or home page
		const url = page.url()
		expect(url).toMatch(/\/(compte|$)/)
	})

	test("login avec des identifiants invalides affiche une erreur", async ({ page, authPage }) => {
		await authPage.goto()

		await authPage.emailInput.fill("invalid@nonexistent.com")
		await authPage.passwordInput.fill("wrongpassword123")
		await authPage.submitButton.click()

		// Should show error message and stay on login page
		const errorMessage = page.getByText(/identifiants|incorrect|invalide|erreur/i)
			.or(page.locator('[role="alert"]'))
		await expect(errorMessage.first()).toBeVisible({ timeout: TIMEOUTS.FEEDBACK })
		await expect(page).toHaveURL(/\/connexion/)
	})

	test("deconnexion redirige vers l'accueil ou la connexion", async ({ page }) => {
		// Start on the account page (authenticated via storage state)
		await page.goto("/compte")
		await page.waitForLoadState("domcontentloaded")
		await expect(page).not.toHaveURL(/\/connexion/)

		// Find and click logout button/link
		const logoutButton = page.getByRole("button", { name: /Déconnexion|Se déconnecter/i })
			.or(page.getByRole("link", { name: /Déconnexion|Se déconnecter/i }))

		const logoutCount = await logoutButton.count()
		test.skip(logoutCount === 0, "No logout button found on account page")

		await logoutButton.first().click()

		// Should redirect to homepage or login
		await expect(async () => {
			const url = page.url()
			expect(url).toMatch(/\/(connexion|$)/)
		}).toPass({ timeout: TIMEOUTS.AUTH_REDIRECT })
	})

	test("acces a /compte sans auth redirige vers la connexion", async ({ browser }) => {
		// Create a fresh context without auth state
		const context = await browser.newContext()
		const page = await context.newPage()

		await page.goto("http://localhost:3000/compte")
		await page.waitForLoadState("domcontentloaded")

		await expect(page).toHaveURL(/\/connexion/, { timeout: TIMEOUTS.AUTH_REDIRECT })

		await context.close()
	})

	test("3D Secure checkout avec carte test", async ({
		page,
		cartPage,
		checkoutPage,
		productCatalogPage,
	}) => {
		// 1. Add a product to cart
		await productCatalogPage.goto()

		const productCount = await productCatalogPage.productLinks.count()
		test.skip(productCount === 0, "No products found")

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

		// 3. Fill address and submit
		await checkoutPage.fillAddress()
		await checkoutPage.submitAddress()

		// 4. Use 3D Secure test card (requires authentication)
		const stripeFrame = await checkoutPage.waitForStripeFrame()
		await checkoutPage.fillStripeCard(stripeFrame, "4000000000003220")
		await checkoutPage.submitPayment(stripeFrame)

		// 5. Stripe 3DS challenge should appear (in iframe or popup)
		// Wait for either: 3DS iframe, confirmation page, or redirect
		await expect(async () => {
			const has3DS = await page.locator('iframe[src*="stripe"]').count() > 1
			const hasConfirmation = page.url().includes("/paiement/confirmation")
			const hasReturn = page.url().includes("/paiement/retour")
			expect(has3DS || hasConfirmation || hasReturn).toBe(true)
		}).toPass({ timeout: 30000 })
	})
})
