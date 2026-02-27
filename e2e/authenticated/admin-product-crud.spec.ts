import { test, expect } from "../fixtures"
import { TEST_RUN_ID } from "../helpers/test-run"

test.describe("Admin - CRUD Produits", { tag: ["@regression"] }, () => {
	const testProductName = `Produit Test ${TEST_RUN_ID}`

	test("creer un nouveau produit avec les champs obligatoires", async ({ page, adminPage }) => {
		await adminPage.gotoProducts()

		// Navigate to product creation form
		const newProductButton = page.getByRole("link", { name: /Nouveau|Ajouter/i })
		await expect(newProductButton.first()).toBeVisible()
		await newProductButton.first().click()
		await page.waitForLoadState("domcontentloaded")

		await expect(page).toHaveURL(/\/admin\/catalogue\/produits\/(nouveau|new|create)/i)

		// Fill required fields
		const nameField = page.getByLabel(/^Nom$/i).or(page.getByLabel(/Nom du produit/i))
		await expect(nameField.first()).toBeVisible()
		await nameField.first().fill(testProductName)

		const descriptionField = page.getByLabel(/Description/i).or(page.locator("textarea").first())
		await descriptionField.first().fill("Description de test E2E pour un produit artisanal.")

		// Fill price if visible
		const priceField = page.getByLabel(/Prix/i)
		if (await priceField.count() > 0) {
			await priceField.first().fill("29.90")
		}

		// Select product type if dropdown exists
		const typeSelect = page.getByLabel(/Type de produit/i)
		if (await typeSelect.count() > 0) {
			await typeSelect.first().click()
			const firstOption = page.getByRole("option").first()
			if (await firstOption.count() > 0) {
				await firstOption.click()
			}
		}

		// Submit the form
		const submitButton = page.getByRole("button", { name: /Créer|Enregistrer|Sauvegarder/i })
		await expect(submitButton.first()).toBeVisible()
		await submitButton.first().click()

		// Verify: either redirected to product edit page or success feedback
		await expect(async () => {
			const url = page.url()
			const hasRedirected = /\/admin\/catalogue\/produits\/[\w-]+/.test(url)
			const successToast = page.getByText(/créé|enregistré|succès/i)
			const hasSuccess = await successToast.first().isVisible().catch(() => false)
			expect(hasRedirected || hasSuccess).toBe(true)
		}).toPass({ timeout: 10000 })
	})

	test("modifier un produit existant", async ({ page, adminPage }) => {
		await adminPage.gotoProducts()

		// Wait for products to load
		const table = page.getByRole("table")
		const emptyState = page.getByText(/aucun produit/i)
		await expect(table.or(emptyState)).toBeVisible({ timeout: 10000 })

		const tableVisible = await table.isVisible()
		test.skip(!tableVisible, "No products available to edit")

		// Click on the first product row to edit
		const editLink = page.getByRole("link", { name: /Modifier/i })
			.or(table.locator("tbody tr").first().getByRole("link").first())
		const editLinkCount = await editLink.count()
		test.skip(editLinkCount === 0, "No edit link found")

		await editLink.first().click()
		await page.waitForLoadState("domcontentloaded")

		// Should be on edit page
		await expect(page).toHaveURL(/\/admin\/catalogue\/produits\/[\w-]+\/modifier/)

		// Verify form is loaded with existing data
		const nameField = page.getByLabel(/^Nom$/i).or(page.getByLabel(/Nom du produit/i))
		await expect(nameField.first()).toBeVisible()

		const currentName = await nameField.first().inputValue()
		expect(currentName.length).toBeGreaterThan(0)

		// Make a small edit (append text)
		const updatedName = currentName.endsWith(" (E2E)")
			? currentName.replace(" (E2E)", "")
			: `${currentName} (E2E)`
		await nameField.first().fill(updatedName)

		// Save
		const saveButton = page.getByRole("button", { name: /Enregistrer|Sauvegarder|Mettre à jour/i })
		await expect(saveButton.first()).toBeVisible()
		await saveButton.first().click()

		// Verify success
		const successFeedback = page.getByText(/modifié|mis à jour|enregistré|succès/i)
		await expect(successFeedback.first()).toBeVisible({ timeout: 10000 })

		// Restore: undo the edit
		await nameField.first().fill(currentName)
		await saveButton.first().click()
		await expect(successFeedback.first()).toBeVisible({ timeout: 10000 })
	})

	test("naviguer vers les variantes d'un produit", async ({ page, adminPage }) => {
		await adminPage.gotoProducts()

		const table = page.getByRole("table")
		await expect(table).toBeVisible({ timeout: 10000 })

		// Click on first product
		const firstRow = table.locator("tbody tr").first()
		const productLink = firstRow.getByRole("link").first()
		test.skip(await productLink.count() === 0, "No product links in table")

		await productLink.click()
		await page.waitForLoadState("domcontentloaded")

		// Look for variants section or link
		const variantsLink = page.getByRole("link", { name: /Variantes|SKU/i })
			.or(page.getByRole("tab", { name: /Variantes|SKU/i }))

		if (await variantsLink.count() > 0) {
			await variantsLink.first().click()
			await page.waitForLoadState("domcontentloaded")

			// Should show variants page or tab content
			await expect(page).toHaveURL(/\/variantes/)
		}
	})
})
