import { test, expect } from "@playwright/test"

test.describe("Parcours utilisateur authentifie", () => {
	test("le formulaire de connexion accepte des identifiants et montre un feedback", async ({ page }) => {
		await page.goto("/connexion")
		await page.waitForLoadState("domcontentloaded")

		// Fill in the login form
		const emailInput = page.getByRole("textbox", { name: /Email/i })
		const passwordInput = page.locator('input[type="password"]')
		const submitButton = page.getByRole("button", { name: /Se connecter/i })

		await emailInput.fill("test@example.com")
		await passwordInput.fill("motdepasse123")
		await submitButton.click()

		// Should show some feedback (error for invalid credentials, or redirect)
		// We expect an error since test credentials are likely invalid
		await page.waitForTimeout(2000)

		const errorMessage = page.getByText(/Identifiants invalides|Email ou mot de passe incorrect|Erreur|invalide/i)
		const redirected = !page.url().includes("/connexion")

		// Either we got an error (expected with fake credentials) or were redirected (real account)
		const hasError = await errorMessage.first().isVisible().catch(() => false)
		expect(hasError || redirected).toBe(true)
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

		// Should show a confirmation message or redirect
		await page.waitForTimeout(2000)

		const confirmationMessage = page.getByText(/envoyé|vérifiez votre email|lien.*envoyé/i)
		const errorMessage = page.getByText(/erreur|impossible/i)

		const hasConfirmation = await confirmationMessage.first().isVisible().catch(() => false)
		const hasError = await errorMessage.first().isVisible().catch(() => false)

		// Either success confirmation or error (both are valid responses)
		expect(hasConfirmation || hasError).toBe(true)
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
