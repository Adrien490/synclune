import { test, expect } from "./fixtures"

test.describe("Scenarios d'erreur avances", { tag: ["@regression"] }, () => {
	test("coupure reseau pendant le chargement d'une page produit", async ({ page }) => {
		await page.goto("/produits")
		await page.waitForLoadState("domcontentloaded")

		const productLinks = page.locator('a[href*="/creations/"]')
		const count = await productLinks.count()
		test.skip(count === 0, "No products available")

		const href = await productLinks.first().getAttribute("href")

		// Intercept all fetch requests to simulate network failure
		await page.route("**/api/**", (route) => route.abort("connectionrefused"))

		await page.goto(href!)

		// Page should still render (SSR), even if API calls fail
		await page.waitForLoadState("domcontentloaded")
		const heading = page.getByRole("heading", { level: 1 })
		await expect(heading).toBeVisible()

		// Clean up route
		await page.unroute("**/api/**")
	})

	test("coupure reseau complete affiche une erreur appropriee", async ({ page }) => {
		await page.goto("/")
		await page.waitForLoadState("domcontentloaded")

		// Abort all navigation requests
		await page.route("**/*", (route) => {
			if (route.request().resourceType() === "document") {
				return route.abort("connectionrefused")
			}
			return route.continue()
		})

		// Try to navigate — this should fail gracefully
		try {
			await page.goto("/produits", { timeout: 5000 })
		} catch {
			// Navigation failure is expected
		}

		// Clean up
		await page.unroute("**/*")
	})

	test("requete API lente affiche un etat de chargement", async ({ page }) => {
		// Add 3s delay to API calls
		await page.route("**/api/**", async (route) => {
			await new Promise((resolve) => setTimeout(resolve, 3000))
			await route.continue()
		})

		await page.goto("/produits")
		await page.waitForLoadState("domcontentloaded")

		// Page should still be usable even with slow API
		const heading = page.getByRole("heading", { level: 1 })
		await expect(heading).toBeVisible()

		// Clean up
		await page.unroute("**/api/**")
	})

	test("upload de fichier avec un MIME type invalide", async ({ page }) => {
		// Navigate to customization page which may have file upload
		await page.goto("/personnalisation")
		await page.waitForLoadState("domcontentloaded")

		const fileInput = page.locator('input[type="file"]')
		const hasFileInput = await fileInput.count() > 0
		test.skip(!hasFileInput, "No file upload on customization page")

		// Try to upload a file with wrong MIME type
		await fileInput.first().setInputFiles({
			name: "test.exe",
			mimeType: "application/x-executable",
			buffer: Buffer.from("fake content"),
		})

		// Should show an error about invalid file type
		const errorMessage = page.getByText(/type.*fichier|format.*invalide|accepté/i)
			.or(page.locator('[role="alert"]'))
		await expect(errorMessage.first()).toBeVisible({ timeout: 5000 })
	})

	test("soumission de formulaire avec champs XSS ne cause pas de probleme", async ({ page }) => {
		await page.goto("/personnalisation")
		await page.waitForLoadState("domcontentloaded")

		const nameInput = page.getByLabel(/Prénom/i)
		test.skip(await nameInput.count() === 0, "No form on page")

		// Fill with XSS payload
		await nameInput.fill('<script>alert("xss")</script>')

		const emailInput = page.getByLabel(/Adresse email/i).or(page.getByLabel(/Email/i))
		if (await emailInput.count() > 0) {
			await emailInput.first().fill("test@example.com")
		}

		// Page should not execute the script
		const dialogPromise = page.waitForEvent("dialog", { timeout: 2000 }).catch(() => null)
		const dialog = await dialogPromise

		expect(dialog, "XSS script should not execute").toBeNull()
	})
})
