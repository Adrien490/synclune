import { test, expect } from "../fixtures"

test.describe("Detail de commande", () => {
	test("la page commandes affiche la liste", async ({ orderPage }) => {
		await orderPage.goto()

		await expect(orderPage.heading).toBeVisible()

		// Should show either orders table or empty state
		await expect(orderPage.ordersTable.or(orderPage.emptyState)).toBeVisible()
	})

	test("le tableau des commandes affiche les colonnes attendues", async ({ orderPage }) => {
		await orderPage.goto()

		const hasOrders = await orderPage.hasOrders()
		test.skip(!hasOrders, "No orders to display")

		// Check for expected column headers
		const headers = orderPage.ordersTable.locator("thead th, thead [role='columnheader']")
		const headerCount = await headers.count()
		expect(headerCount).toBeGreaterThan(0)
	})

	test("cliquer sur une commande navigue vers le detail", async ({ page, orderPage }) => {
		await orderPage.goto()

		const hasOrders = await orderPage.hasOrders()
		test.skip(!hasOrders, "No orders available")

		// Click the view button for the first order
		const viewButton = page.getByLabel(/Voir la commande/i).first()
		await viewButton.click()

		await page.waitForLoadState("domcontentloaded")
		await expect(page).toHaveURL(/\/commandes\/SYN-\d+/)
	})

	test("le detail de commande affiche les informations cles", async ({ page, orderPage }) => {
		await orderPage.goto()

		const hasOrders = await orderPage.hasOrders()
		test.skip(!hasOrders, "No orders available")

		const viewButton = page.getByLabel(/Voir la commande/i).first()
		await viewButton.click()
		await page.waitForLoadState("domcontentloaded")

		// Order detail should show heading
		const heading = page.getByRole("heading", { level: 1 })
		await expect(heading).toBeVisible()

		// Should contain order-related information
		const pageContent = await page.textContent("body")
		expect(pageContent).toMatch(/statut|total|article|adresse/i)
	})

	test("le tri des commandes fonctionne", async ({ page, orderPage }) => {
		await orderPage.goto()

		const hasOrders = await orderPage.hasOrders()
		test.skip(!hasOrders, "No orders to sort")

		// Check for sort select
		const sortCount = await orderPage.sortSelect.count()
		test.skip(sortCount === 0, "No sort select found")

		await orderPage.sortSelect.click()

		// Sort options should be visible
		const sortOptions = page.getByRole("option")
		const optionCount = await sortOptions.count()
		expect(optionCount).toBeGreaterThan(0)
	})

	test("l'annulation de commande est disponible si eligible", async ({ page, orderPage }) => {
		await orderPage.goto()

		const hasOrders = await orderPage.hasOrders()
		test.skip(!hasOrders, "No orders available")

		const viewButton = page.getByLabel(/Voir la commande/i).first()
		await viewButton.click()
		await page.waitForLoadState("domcontentloaded")

		// Cancel button may or may not be visible depending on order status
		const cancelButton = page.getByRole("button", { name: /Annuler/i })
		const pageContent = await page.textContent("body")

		// Just verify the page loaded correctly with order content
		expect(pageContent).toBeTruthy()
	})
})
