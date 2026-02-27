import { test, expect } from "../fixtures"

test.describe("Admin - Gestion des commandes", { tag: ["@regression"] }, () => {
	test("la page commandes affiche la liste avec les colonnes attendues", async ({ page, adminPage }) => {
		await adminPage.gotoOrders()

		await expect(page).toHaveURL(/\/admin\/ventes\/commandes/)

		const heading = page.getByRole("heading", { name: /Commandes/i })
		await expect(heading).toBeVisible()

		// Wait for table or empty state
		const table = page.getByRole("table")
		const emptyState = page.getByText(/Aucune commande/i)
		await expect(table.or(emptyState)).toBeVisible({ timeout: 10000 })
	})

	test("cliquer sur une commande affiche le detail", async ({ page, adminPage }) => {
		await adminPage.gotoOrders()

		const table = page.getByRole("table")
		await expect(table.or(page.getByText(/Aucune commande/i))).toBeVisible({ timeout: 10000 })

		const tableVisible = await table.isVisible()
		test.skip(!tableVisible, "No orders table visible")

		const rows = table.locator("tbody tr")
		const rowCount = await rows.count()
		test.skip(rowCount === 0, "No orders in table")

		// Click on the first order
		const firstOrderLink = rows.first().getByRole("link").first()
		await firstOrderLink.click()
		await page.waitForLoadState("domcontentloaded")

		// Should navigate to order detail
		await expect(page).toHaveURL(/\/admin\/ventes\/commandes\//)

		// Order detail should show key info
		const orderHeading = page.getByRole("heading", { level: 1 })
		await expect(orderHeading).toBeVisible()
	})

	test("le detail de commande affiche le statut et les articles", async ({ page, adminPage }) => {
		await adminPage.gotoOrders()

		const table = page.getByRole("table")
		await expect(table.or(page.getByText(/Aucune commande/i))).toBeVisible({ timeout: 10000 })
		test.skip(!await table.isVisible(), "No orders table visible")

		const rows = table.locator("tbody tr")
		test.skip(await rows.count() === 0, "No orders in table")

		await rows.first().getByRole("link").first().click()
		await page.waitForLoadState("domcontentloaded")

		// Verify order detail sections
		// Status badge
		const statusBadge = page.getByText(
			/En attente|Confirmée|En préparation|Expédiée|Livrée|Annulée|Remboursée/i,
		)
		await expect(statusBadge.first()).toBeVisible()

		// Order total
		await expect(page.getByText(/Total/i).first()).toBeVisible()
	})

	test("la transition de statut commande est possible pour les commandes eligibles", async ({ page, adminPage }) => {
		await adminPage.gotoOrders()

		const table = page.getByRole("table")
		await expect(table.or(page.getByText(/Aucune commande/i))).toBeVisible({ timeout: 10000 })
		test.skip(!await table.isVisible(), "No orders table visible")

		const rows = table.locator("tbody tr")
		test.skip(await rows.count() === 0, "No orders in table")

		// Navigate to first order detail
		await rows.first().getByRole("link").first().click()
		await page.waitForLoadState("domcontentloaded")

		// Look for status transition controls (button or select)
		const statusControls = page.getByRole("button", { name: /Marquer|Confirmer|Expédier|Livrer|Statut/i })
			.or(page.getByRole("combobox", { name: /Statut/i }))

		if (await statusControls.count() > 0) {
			// Status transition control exists — verify it's interactive
			await expect(statusControls.first()).toBeEnabled()
		} else {
			// Order may not be eligible for transition (e.g., already delivered or cancelled)
			const status = page.getByText(/Livrée|Annulée|Remboursée/i)
			await expect(status.first()).toBeVisible()
			test.skip(true, "Order not eligible for status transition")
		}
	})

	test("la page remboursements est accessible", async ({ page }) => {
		await page.goto("/admin/ventes/remboursements")
		await page.waitForLoadState("domcontentloaded")

		await expect(page).toHaveURL(/\/admin\/ventes\/remboursements/)
		await expect(page).not.toHaveURL(/\/connexion/)

		const heading = page.getByRole("heading", { name: /Remboursements/i })
		await expect(heading).toBeVisible()
	})

	test("initier un remboursement depuis la page remboursements", async ({ page }) => {
		await page.goto("/admin/ventes/remboursements/nouveau")
		await page.waitForLoadState("domcontentloaded")

		// Should be on the refund initiation page
		await expect(page).toHaveURL(/\/admin\/ventes\/remboursements\/nouveau/)

		// Verify refund form is present
		const heading = page.getByRole("heading", { level: 1 })
		await expect(heading).toBeVisible()

		// Check for key form fields
		const orderField = page.getByLabel(/Commande|Numéro/i)
			.or(page.getByPlaceholder(/commande|SYN/i))
		const reasonField = page.getByLabel(/Raison|Motif/i)
			.or(page.locator("textarea"))

		// At minimum, the page should have some form of input for creating a refund
		const hasOrderField = await orderField.count() > 0
		const hasReasonField = await reasonField.count() > 0

		expect(hasOrderField || hasReasonField, "Refund form should have order or reason fields").toBe(true)
	})

	test("la recherche de commandes fonctionne", async ({ page, adminPage }) => {
		await adminPage.gotoOrders()

		const searchInput = page.getByPlaceholder(/Rechercher/i)
			.or(page.getByRole("searchbox"))
		test.skip(await searchInput.count() === 0, "No search input on orders page")

		// Search for a known pattern
		await searchInput.first().fill("SYN-")
		await page.waitForLoadState("domcontentloaded")

		// Table or empty state should still be visible
		const table = page.getByRole("table")
		const emptyState = page.getByText(/Aucune commande/i)
		await expect(table.or(emptyState)).toBeVisible({ timeout: 5000 })
	})
})
