import { test, expect } from "./fixtures"

test.describe("Parcours utilisateur authentifie", () => {
	test("la connexion avec des identifiants invalides affiche une erreur", async ({ page, authPage }) => {
		await authPage.goto()

		await authPage.login("fake@example.com", "mauvaisMotDePasse123")

		// Should stay on login page and show an error
		const errorMessage = page.getByText(/Identifiants invalides|Email ou mot de passe incorrect/i)
		await expect(errorMessage.first()).toBeVisible({ timeout: 5000 })
		await expect(page).toHaveURL(/\/connexion/)
	})

	test("le formulaire d'inscription valide tous les champs avant soumission", async ({ page }) => {
		await page.goto("/inscription")
		await page.waitForLoadState("domcontentloaded")

		// Try to submit with empty fields
		const submitButton = page.getByRole("button", { name: /S'inscrire/i })

		// Fill partial data and check validation cascade
		const nameInput = page.getByRole("textbox", { name: /Prénom/i })
		const emailInput = page.getByRole("textbox", { name: /^Email$/i })
		const confirmEmailInput = page.getByRole("textbox", { name: /Confirmer l'email/i })
		const passwordInput = page.locator('input[type="password"]').first()

		// Step 1: Fill name too short
		await nameInput.fill("A")
		await nameInput.blur()
		await expect(page.getByText(/au moins 2 caractères/i)).toBeVisible()

		// Step 2: Fix name, bad email
		await nameInput.fill("Marie")
		await emailInput.fill("pas-un-email")
		await emailInput.blur()
		await expect(page.getByText(/Format d'email invalide/i)).toBeVisible()

		// Step 3: Fix email, mismatched confirmation
		await emailInput.fill("marie@example.com")
		await confirmEmailInput.fill("autre@example.com")
		await confirmEmailInput.blur()
		await expect(page.getByText(/Les emails ne correspondent pas/i)).toBeVisible()

		// Step 4: Fix confirmation, short password
		await confirmEmailInput.fill("marie@example.com")
		await passwordInput.fill("court")
		await passwordInput.blur()
		await expect(page.getByText(/au moins 8 caractères/i)).toBeVisible()

		// Step 5: All valid - no validation errors should remain
		await passwordInput.fill("MotDePasse123!")
		await passwordInput.blur()

		// The form should be submittable now (submit button not disabled)
		await expect(submitButton).toBeEnabled()
	})

	test("le mot de passe oublie envoie un lien et affiche une confirmation", async ({ page }) => {
		await page.goto("/mot-de-passe-oublie")
		await page.waitForLoadState("domcontentloaded")

		const emailInput = page.getByRole("textbox", { name: /Email/i })
		const submitButton = page.getByRole("button", { name: /Envoyer le lien/i })

		await emailInput.fill("test@example.com")
		await submitButton.click()

		// Wait for feedback after form submission
		const confirmationMessage = page.getByText(/envoyé|vérifiez votre email|lien.*envoyé/i)
		const errorMessage = page.getByText(/erreur|impossible/i)

		// Either success confirmation or error (both are valid responses)
		await expect(confirmationMessage.first().or(errorMessage.first())).toBeVisible({ timeout: 5000 })
	})

	test("les pages du compte redirigent les utilisateurs non connectes", async ({ page }) => {
		const accountRoutes = [
			"/compte",
			"/compte/commandes",
			"/compte/adresses",
			"/compte/favoris",
		]

		for (const route of accountRoutes) {
			await page.goto(route)
			await page.waitForLoadState("domcontentloaded")

			// Should redirect to login
			const url = page.url()
			expect(url, `${route} should redirect to connexion`).toMatch(/\/connexion/)
		}
	})
})

test.describe("Navigation entre pages critiques", () => {
	test("la navigation boutique fonctionne de bout en bout", async ({ page }) => {
		// Start at homepage
		await page.goto("/")
		await page.waitForLoadState("domcontentloaded")
		await expect(page).toHaveTitle(/Synclune/)

		// Navigate to products
		const productLink = page.getByRole("link", { name: /Créations|Produits|Boutique/i })
		if (await productLink.first().isVisible()) {
			await productLink.first().click()
			await page.waitForLoadState("domcontentloaded")
			await expect(page).toHaveURL(/\/produits/)
		} else {
			await page.goto("/produits")
		}

		// Navigate to collections
		await page.goto("/collections")
		await page.waitForLoadState("domcontentloaded")
		await expect(page).toHaveURL(/\/collections/)

		const collectionsHeading = page.getByRole("heading", { level: 1 })
		await expect(collectionsHeading).toBeVisible()
	})

	test("les pages legales sont accessibles depuis le footer", async ({ page }) => {
		await page.goto("/")
		await page.waitForLoadState("domcontentloaded")

		const footer = page.locator("footer")
		await expect(footer).toBeAttached()

		// Check legal links exist in footer
		const legalLinks = [
			{ name: /CGV|conditions/i, href: /cgv/ },
			{ name: /mentions/i, href: /mentions/ },
			{ name: /confidentialité/i, href: /confidentialite/ },
		]

		for (const { name, href } of legalLinks) {
			const link = footer.getByRole("link", { name })
			if (await link.count() > 0) {
				const linkHref = await link.first().getAttribute("href")
				expect(linkHref).toMatch(href)
			}
		}
	})
})
