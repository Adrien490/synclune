import { test, expect } from "../fixtures"

test.describe("Parametres du compte", () => {
	test("la page parametres est accessible", async ({ page }) => {
		await page.goto("/parametres")
		await page.waitForLoadState("domcontentloaded")

		const heading = page.getByRole("heading", { name: /Paramètres/i })
		await expect(heading).toBeVisible()
	})

	test("la section profil affiche le formulaire", async ({ page }) => {
		await page.goto("/parametres")
		await page.waitForLoadState("domcontentloaded")

		// Profile form fields
		const nameInput = page.getByLabel(/Prénom/i)
		await expect(nameInput.first()).toBeVisible()

		// Email should be read-only
		const emailInput = page.getByLabel(/Email/i)
		await expect(emailInput.first()).toBeVisible()
		await expect(emailInput.first()).toBeDisabled()
	})

	test("modifier le prenom met a jour le profil", async ({ page }) => {
		await page.goto("/parametres")
		await page.waitForLoadState("domcontentloaded")

		const nameInput = page.getByLabel(/Prénom/i)
		await expect(nameInput.first()).toBeVisible()

		// Save current name
		const currentName = await nameInput.first().inputValue()

		// Change name
		const newName = `Test-${Date.now().toString().slice(-4)}`
		await nameInput.first().fill(newName)

		const saveButton = page.getByRole("button", { name: /Enregistrer/i })
		test.skip(await saveButton.isDisabled(), "Save button is disabled")

		await saveButton.click()

		// Wait for feedback
		const feedback = page.getByText(/enregistré|mis à jour|sauvegardé/i)
			.or(page.locator('[role="alert"]'))
		await expect(feedback.first()).toBeVisible({ timeout: 5000 })

		// Restore original name
		await nameInput.first().fill(currentName)
		await saveButton.click()
	})

	test("la section securite est presente", async ({ page }) => {
		await page.goto("/parametres")
		await page.waitForLoadState("domcontentloaded")

		const securityHeading = page.getByRole("heading", { name: /Sécurité/i })
			.or(page.getByText(/Mot de passe|Sécurité/i))
		await expect(securityHeading.first()).toBeVisible()
	})

	test("la section RGPD est presente", async ({ page }) => {
		await page.goto("/parametres")
		await page.waitForLoadState("domcontentloaded")

		// GDPR section should have data export or account deletion options
		const gdprSection = page.getByText(/données personnelles|RGPD|supprimer.*compte|exporter/i)
		const gdprCount = await gdprSection.count()
		expect(gdprCount).toBeGreaterThan(0)
	})

	test("la section sessions actives est presente", async ({ page }) => {
		await page.goto("/parametres")
		await page.waitForLoadState("domcontentloaded")

		const sessionsSection = page.getByText(/Sessions actives|Appareils connectés/i)
		await expect(sessionsSection.first()).toBeVisible()
	})

	test("les parametres newsletter sont accessibles", async ({ page }) => {
		await page.goto("/parametres")
		await page.waitForLoadState("domcontentloaded")

		const newsletterSection = page.getByText(/Newsletter/i)
		const newsletterCount = await newsletterSection.count()
		expect(newsletterCount).toBeGreaterThan(0)
	})
})
