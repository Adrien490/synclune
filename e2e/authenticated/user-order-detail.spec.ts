import { test, expect } from "../fixtures"

test.describe("Detail de commande", { tag: ["@regression"] }, () => {
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

		// Order detail should show heading with order number
		const heading = page.getByRole("heading", { level: 1 })
		await expect(heading).toBeVisible()
		await expect(heading).toHaveText(/SYN-\d+/)

		// Should display order total
		await expect(page.getByText(/Total/i).first()).toBeVisible()
	})

	test("le tri des commandes fonctionne", async ({ page, orderPage }) => {
		await orderPage.goto()

		const hasOrders = await orderPage.hasOrders()
		test.skip(!hasOrders, "No orders to sort")

		// Check for sort select
		const sortCount = await orderPage.sortSelect.count()
		test.skip(sortCount === 0, "No sort select found")

		// Capture the initial order of items before sorting
		const orderRowsBefore = await orderPage.getOrderRows()
		const countBefore = await orderRowsBefore.count()
		test.skip(countBefore < 2, "Need at least 2 orders to verify sort")

		const firstOrderTextBefore = await orderRowsBefore.first().textContent()

		// Open the sort select and pick a different option
		await orderPage.sortSelect.click()

		const sortOptions = page.getByRole("option")
		const optionCount = await sortOptions.count()
		expect(optionCount).toBeGreaterThan(0)

		// Select the last option (likely a different sort order)
		await sortOptions.last().click()

		// Verify the order has actually changed by comparing first row content
		await expect(async () => {
			const orderRowsAfter = await orderPage.getOrderRows()
			const firstOrderTextAfter = await orderRowsAfter.first().textContent()
			expect(firstOrderTextAfter).not.toBe(firstOrderTextBefore)
		}).toPass({ timeout: 5000 })
	})

	test("l'annulation de commande est disponible si eligible", async ({ page, orderPage }) => {
		await orderPage.goto()

		const hasOrders = await orderPage.hasOrders()
		test.skip(!hasOrders, "No orders available")

		const viewButton = page.getByLabel(/Voir la commande/i).first()
		await viewButton.click()
		await page.waitForLoadState("domcontentloaded")

		// Order heading should be visible (page loaded correctly)
		const heading = page.getByRole("heading", { level: 1 })
		await expect(heading).toBeVisible()

		// Check if cancel button is visible (depends on order status)
		const cancelButton = page.getByRole("button", { name: /Annuler/i })
		const cancelVisible = await cancelButton.isVisible()

		if (cancelVisible) {
			await expect(cancelButton).toBeEnabled()
		} else {
			// Order is not eligible for cancellation - verify status explains why
			const orderStatus = page.getByText(/Livr|Expédi|Annul|Rembours/i)
			await expect(orderStatus.first()).toBeVisible()
			test.skip(true, "Order not eligible for cancellation")
		}
	})
})
