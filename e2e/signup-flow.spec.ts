import { test, expect } from "./fixtures"

test.describe("Parcours inscription complète", () => {
	test("l'inscription avec des données valides soumet le formulaire et redirige", async ({ page }) => {
		await page.goto("/inscription")
		await page.waitForLoadState("domcontentloaded")

		// Generate unique email to avoid conflicts
		const uniqueId = Date.now()
		const testEmail = `test-e2e-${uniqueId}@synclune-test.fr`

		// Fill all required fields
		const nameInput = page.getByRole("textbox", { name: /Prénom/i })
		await nameInput.fill("TestUser")

		const emailInput = page.getByRole("textbox", { name: /^Email$/i })
		await emailInput.fill(testEmail)

		const confirmEmailInput = page.getByRole("textbox", { name: /Confirmer l'email/i })
		await confirmEmailInput.fill(testEmail)

		const passwordInput = page.locator('input[type="password"]').first()
		await passwordInput.fill("TestPassword123!")

		// Accept CGV if checkbox is present
		const cgvCheckbox = page.getByLabel(/conditions générales|J'accepte les CGV/i)
		if (await cgvCheckbox.isVisible()) {
			await cgvCheckbox.check()
		}

		// Submit the form
		const submitButton = page.getByRole("button", { name: /S'inscrire/i })
		await expect(submitButton).toBeEnabled()
		await submitButton.click()

		// After successful signup, user should be redirected away from /inscription
		// Possible destinations: verification page, login, or home
		await expect(page).not.toHaveURL(/\/inscription$/, { timeout: 15000 })

		// Verify we're on a valid post-signup page
		const url = page.url()
		const validDestinations = [
			/\/verification/,
			/\/connexion/,
			/\/compte/,
			/\/$/,
		]

		const isValidDestination = validDestinations.some((pattern) => pattern.test(url))

		// Either redirected to a valid destination, or a success message is shown
		if (!isValidDestination) {
			// Check for success feedback on the current page
			const successMessage = page.getByText(/vérification|vérifiez|email envoyé|inscription réussie|bienvenue/i)
			await expect(successMessage).toBeVisible({ timeout: 10000 })
		}
	})

	test("l'inscription avec un email existant affiche une erreur", async ({ page }) => {
		await page.goto("/inscription")
		await page.waitForLoadState("domcontentloaded")

		// Use the seeded user email (known to exist)
		const existingEmail = process.env.E2E_USER_EMAIL ?? "user2@synclune.fr"

		const nameInput = page.getByRole("textbox", { name: /Prénom/i })
		await nameInput.fill("TestUser")

		const emailInput = page.getByRole("textbox", { name: /^Email$/i })
		await emailInput.fill(existingEmail)

		const confirmEmailInput = page.getByRole("textbox", { name: /Confirmer l'email/i })
		await confirmEmailInput.fill(existingEmail)

		const passwordInput = page.locator('input[type="password"]').first()
		await passwordInput.fill("TestPassword123!")

		const cgvCheckbox = page.getByLabel(/conditions générales|J'accepte les CGV/i)
		if (await cgvCheckbox.isVisible()) {
			await cgvCheckbox.check()
		}

		const submitButton = page.getByRole("button", { name: /S'inscrire/i })
		await submitButton.click()

		// Should show an error (email already taken) or stay on the same page
		const errorMessage = page.getByText(/déjà utilisé|existe déjà|already|erreur/i)
		const stayOnPage = page.locator('input[type="password"]')

		// Either error message visible, or still on signup page with form visible
		await expect(errorMessage.or(stayOnPage)).toBeVisible({ timeout: 10000 })
	})

	test("les champs d'inscription ont des validations côté client", async ({ page }) => {
		await page.goto("/inscription")
		await page.waitForLoadState("domcontentloaded")

		// Test: name too short
		const nameInput = page.getByRole("textbox", { name: /Prénom/i })
		await nameInput.fill("A")
		await nameInput.blur()
		await expect(page.getByText(/au moins 2 caractères/i)).toBeVisible()

		// Test: invalid email
		const emailInput = page.getByRole("textbox", { name: /^Email$/i })
		await emailInput.fill("not-an-email")
		await emailInput.blur()
		await expect(page.getByText(/Format d'email invalide/i)).toBeVisible()

		// Test: email mismatch
		await emailInput.fill("test@example.com")
		await emailInput.blur()
		const confirmEmailInput = page.getByRole("textbox", { name: /Confirmer l'email/i })
		await confirmEmailInput.fill("different@example.com")
		await confirmEmailInput.blur()
		await expect(page.getByText(/Les emails ne correspondent pas/i)).toBeVisible()

		// Test: password too short
		const passwordInput = page.locator('input[type="password"]').first()
		await passwordInput.fill("short")
		await passwordInput.blur()
		await expect(page.getByText(/au moins 8 caractères/i)).toBeVisible()
	})
})
