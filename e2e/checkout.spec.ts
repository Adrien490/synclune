import { test, expect } from "./fixtures"
import { requireSeedData } from "./constants"

test.describe("Parcours checkout complet", () => {
	test.describe("Initiation du checkout depuis le panier", () => {
		test("le bouton de paiement est absent quand le panier est vide", async ({ page, cartPage }) => {
			await page.goto("/")
			await page.waitForLoadState("domcontentloaded")

			await cartPage.open()

			// Verify empty state - no checkout button
			await expect(cartPage.emptyMessage).toBeVisible()
			await expect(cartPage.checkoutLink).not.toBeVisible()
		})

		test("ajouter un produit puis voir le bouton de paiement dans le panier", async ({ page, cartPage, productCatalogPage }) => {
			// Navigate to a product
			await productCatalogPage.goto()

			const count = await productCatalogPage.productLinks.count()
			requireSeedData(test, count > 0, "No products found")

			await productCatalogPage.gotoFirstProduct()

			// Try to add to cart
			if (await productCatalogPage.addToCartButton.count() === 0) {
				test.skip(true, "Product requires SKU selection - skipping checkout test")
				return
			}

			await productCatalogPage.addToCartButton.first().click()

			// Wait for cart feedback (dialog or toast)
			const toastOrFeedback = page.getByText(/ajouté|panier/i)
			await expect(cartPage.dialog.or(toastOrFeedback.first())).toBeVisible({ timeout: 5000 })

			// Open cart if not already open
			if (!await cartPage.dialog.isVisible()) {
				await cartPage.open()
			}

			// Cart should not be empty
			await expect(cartPage.emptyMessage).not.toBeVisible()

			// Should display price
			const cartContent = await cartPage.dialog.textContent()
			expect(cartContent).toMatch(/\d+[,.]?\d*\s*€/)
		})
	})

	test.describe("Page de paiement", () => {
		test("accéder à /paiement sans panier redirige ou affiche un message", async ({ page }) => {
			const response = await page.goto("/paiement")
			await page.waitForLoadState("domcontentloaded")

			const url = page.url()

			// Unauthenticated users should be redirected to login
			if (url.includes("/connexion")) {
				await expect(page).toHaveURL(/\/connexion/)
				return
			}

			// Authenticated users with empty cart should see an empty state or be redirected to shop
			if (url.includes("/produits") || url.includes("/boutique")) {
				await expect(page).toHaveURL(/\/(produits|boutique)/)
				return
			}

			// If staying on /paiement, page should show empty cart message or error
			const emptyCartMessage = page.getByText(/panier.*vide|aucun.*article/i)
			const errorMessage = page.getByText(/erreur/i)

			await expect(async () => {
				const hasMessage = await emptyCartMessage.isVisible() ||
					await errorMessage.isVisible() ||
					response?.status() === 404
				expect(hasMessage).toBe(true)
			}).toPass({ timeout: 5000 })
		})
	})

	test.describe("Page de confirmation", () => {
		test("/paiement/confirmation sans paramètres affiche une erreur ou redirige", async ({ page }) => {
			await page.goto("/paiement/confirmation")
			await page.waitForLoadState("domcontentloaded")

			const url = page.url()

			// If redirected away from confirmation page, that's valid
			if (!url.includes("/paiement/confirmation")) {
				expect(url).not.toContain("/paiement/confirmation")
				return
			}

			// If staying on the page, should display an error/not-found message
			const errorIndicator = page.getByText(/erreur|introuvable|not found|commande/i)
			await expect(errorIndicator.first()).toBeVisible()
		})

		test("/paiement/confirmation avec un order_id invalide affiche une erreur", async ({ page }) => {
			await page.goto("/paiement/confirmation?order_id=invalid-id&order_number=FAKE-000")
			await page.waitForLoadState("domcontentloaded")

			const pageContent = await page.textContent("body")

			// Should display an error state for invalid order
			expect(pageContent).toMatch(/erreur|introuvable|not found|impossible/i)
		})
	})

	test.describe("Page d'annulation", () => {
		test("/paiement/annulation affiche un message de contexte", async ({ page }) => {
			await page.goto("/paiement/annulation")
			await page.waitForLoadState("domcontentloaded")

			// The cancellation page should display context
			const heading = page.getByRole("heading")
			await expect(heading.first()).toBeVisible()

			// Should offer a way to retry or return to shop
			const pageContent = await page.textContent("body")
			expect(pageContent).toMatch(/annul|panier|boutique|réessayer|retour/i)
		})

		test("/paiement/annulation avec raison affiche le message approprié", async ({ page }) => {
			await page.goto("/paiement/annulation?reason=expired")
			await page.waitForLoadState("domcontentloaded")

			const pageContent = await page.textContent("body")
			// Should show relevant content about cancellation
			expect(pageContent).toMatch(/annul|expir|panier|boutique/i)
		})
	})

	test.describe("Page de retour Stripe", () => {
		test("/paiement/retour sans session_id gère le cas d'erreur", async ({ page }) => {
			await page.goto("/paiement/retour")
			await page.waitForLoadState("domcontentloaded")

			const url = page.url()

			// Without session_id, should redirect to confirmation, cancellation, or show error
			if (url.includes("/paiement/confirmation") || url.includes("/paiement/annulation")) {
				// Redirected to an appropriate page
				expect(url).toMatch(/\/paiement\/(confirmation|annulation)/)
				return
			}

			if (!url.includes("/paiement/retour")) {
				// Redirected elsewhere (e.g., home, shop)
				expect(url).not.toContain("/paiement/retour")
				return
			}

			// If staying on /paiement/retour, should show loading/error state
			const stateIndicator = page.getByText(/chargement|erreur|redirection|traitement/i)
			await expect(stateIndicator.first()).toBeVisible()
		})
	})
})
