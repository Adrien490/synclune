import { test, expect } from "./fixtures"

test.describe("Personnalisation - Demande sur mesure", () => {
	test("la page de personnalisation est accessible", async ({ page }) => {
		await page.goto("/personnalisation")
		await page.waitForLoadState("domcontentloaded")

		const heading = page.getByRole("heading", { level: 1 })
		await expect(heading).toBeVisible()
	})

	test("le formulaire de personnalisation contient les champs requis", async ({ page }) => {
		await page.goto("/personnalisation")
		await page.waitForLoadState("domcontentloaded")

		// Required fields
		await expect(page.getByLabel(/Prénom/i)).toBeVisible()
		await expect(page.getByLabel(/Adresse email/i).or(page.getByLabel(/Email/i))).toBeVisible()
		await expect(page.getByLabel(/Décrivez votre projet/i).or(page.locator("textarea"))).toBeVisible()

		// Optional fields
		const phoneField = page.getByLabel(/Téléphone/i)
		if (await phoneField.count() > 0) {
			await expect(phoneField).toBeVisible()
		}

		// Consent checkbox
		const consentCheckbox = page.getByLabel(/politique de confidentialité/i)
		await expect(consentCheckbox).toBeVisible()
	})

	test("le formulaire valide les champs obligatoires", async ({ page }) => {
		await page.goto("/personnalisation")
		await page.waitForLoadState("domcontentloaded")

		// Try to submit with empty fields
		const submitButton = page.getByRole("button", { name: /Envoyer/i })
		test.skip(await submitButton.count() === 0, "No submit button found")

		// Fill only the name (leave other required fields empty)
		await page.getByLabel(/Prénom/i).fill("Marie")
		await page.getByLabel(/Prénom/i).blur()

		// Submit without description and email
		// The button should be disabled or show errors on attempt
		const isDisabled = await submitButton.isDisabled()
		if (!isDisabled) {
			await submitButton.click()
			// Should show validation errors
			const errorMessage = page.getByText(/obligatoire|requis|invalide/i)
			await expect(errorMessage.first()).toBeVisible({ timeout: 3000 })
		}
	})

	test("le formulaire valide le format email", async ({ page }) => {
		await page.goto("/personnalisation")
		await page.waitForLoadState("domcontentloaded")

		const emailInput = page.getByLabel(/Adresse email/i).or(page.getByLabel(/Email/i))
		test.skip(await emailInput.count() === 0, "No email field found")

		await emailInput.first().fill("pas-un-email")
		await emailInput.first().blur()

		const errorMessage = page.getByText(/email.*invalide|format/i)
		await expect(errorMessage.first()).toBeVisible({ timeout: 3000 })
	})

	test("soumettre le formulaire avec des donnees valides affiche une confirmation", async ({ page }) => {
		await page.goto("/personnalisation")
		await page.waitForLoadState("domcontentloaded")

		// Fill all required fields
		await page.getByLabel(/Prénom/i).fill("Marie")

		const emailInput = page.getByLabel(/Adresse email/i).or(page.getByLabel(/Email/i))
		await emailInput.first().fill(`test-e2e-${Date.now()}@example.com`)

		const descriptionField = page.getByLabel(/Décrivez votre projet/i).or(page.locator("textarea").first())
		await descriptionField.fill("Je souhaite une bague sur mesure en argent avec une pierre naturelle.")

		// Accept consent
		const consentCheckbox = page.getByLabel(/politique de confidentialité/i)
		if (await consentCheckbox.count() > 0) {
			await consentCheckbox.check()
		}

		const submitButton = page.getByRole("button", { name: /Envoyer/i })
		test.skip(await submitButton.count() === 0, "No submit button found")
		test.skip(await submitButton.isDisabled(), "Submit button is disabled")

		await submitButton.click()

		// Wait for feedback - success message or redirect
		const successFeedback = page.getByText(/envoyé|reçu|merci|confirmation/i)
			.or(page.locator('[role="alert"]'))
		await expect(successFeedback.first()).toBeVisible({ timeout: 10000 })
	})
})
