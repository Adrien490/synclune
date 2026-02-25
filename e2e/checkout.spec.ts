import { test, expect } from "@playwright/test"

test.describe("Parcours checkout complet", () => {
	test.describe("Initiation du checkout depuis le panier", () => {
		test("le bouton de paiement est absent quand le panier est vide", async ({ page }) => {
			await page.goto("/")
			await page.waitForLoadState("domcontentloaded")

			// Open cart sheet
			const cartButton = page.getByRole("button", { name: /Ouvrir mon panier/i })
			await cartButton.click()

			const cartDialog = page.getByRole("dialog")
			await expect(cartDialog).toBeVisible()

			// Verify empty state - no checkout button
			await expect(cartDialog.getByText(/Votre panier est vide/i)).toBeVisible()
			const checkoutButton = cartDialog.getByRole("link", { name: /Passer commande|Commander|Paiement/i })
			await expect(checkoutButton).not.toBeVisible()
		})

		test("ajouter un produit puis voir le bouton de paiement dans le panier", async ({ page }) => {
			// Navigate to a product
			await page.goto("/produits")
			await page.waitForLoadState("networkidle")

			const productLinks = page.locator('a[href*="/creations/"]')
			const count = await productLinks.count()

			if (count === 0) {
				test.skip(true, "Seed data required: no products found")
				return
			}

			await productLinks.first().click()
			await page.waitForLoadState("domcontentloaded")

			// Try to add to cart
			const addToCartButton = page.getByRole("button", {
				name: /Ajouter au panier|Ajouter/i,
			})

			if (await addToCartButton.count() === 0) {
				test.skip(true, "Product requires SKU selection - skipping checkout test")
				return
			}

			await addToCartButton.first().click()

			// Wait for cart feedback
			await page.waitForTimeout(2000)

			// Open cart if not already open
			const cartDialog = page.getByRole("dialog")
			if (!await cartDialog.isVisible().catch(() => false)) {
				const cartButton = page.getByRole("button", { name: /Ouvrir mon panier/i })
				await cartButton.click()
				await expect(cartDialog).toBeVisible()
			}

			// Cart should not be empty
			await expect(cartDialog.getByText(/Votre panier est vide/i)).not.toBeVisible()

			// Should display price
			const cartContent = await cartDialog.textContent()
			expect(cartContent).toMatch(/\d+[,.]?\d*\s*€/)
		})
	})

	test.describe("Page de paiement", () => {
		test("accéder à /paiement sans panier redirige ou affiche un message", async ({ page }) => {
			// Trying to access payment page directly without a cart should handle gracefully
			const response = await page.goto("/paiement")
			await page.waitForLoadState("domcontentloaded")

			// Should either redirect or show an appropriate message
			const url = page.url()
			const pageContent = await page.textContent("body")

			const isHandled =
				url.includes("/produits") ||
				url.includes("/boutique") ||
				url.includes("/connexion") ||
				url === page.url() && (
					pageContent?.match(/panier.*vide|aucun.*article|erreur/i) !== null ||
					response?.status() === 404
				)

			expect(isHandled).toBe(true)
		})
	})

	test.describe("Page de confirmation", () => {
		test("/paiement/confirmation sans paramètres affiche une erreur ou redirige", async ({ page }) => {
			await page.goto("/paiement/confirmation")
			await page.waitForLoadState("domcontentloaded")

			const url = page.url()
			const pageContent = await page.textContent("body")

			// Should either redirect or show error state
			const isHandled =
				!url.includes("/paiement/confirmation") ||
				pageContent?.match(/erreur|introuvable|not found|commande/i) !== null

			expect(isHandled).toBe(true)
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
			const pageContent = await page.textContent("body")

			// Should either redirect or show loading/error state
			const isHandled =
				!url.includes("/paiement/retour") ||
				pageContent?.match(/chargement|erreur|redirection|traitement/i) !== null ||
				url.includes("/paiement/confirmation") ||
				url.includes("/paiement/annulation")

			expect(isHandled).toBe(true)
		})
	})
})
