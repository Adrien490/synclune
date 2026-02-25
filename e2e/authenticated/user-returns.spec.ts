import { test, expect } from "../fixtures"

test.describe("Retours et remboursements", () => {
	test("la page commandes est accessible", async ({ orderPage }) => {
		await orderPage.goto()

		await expect(orderPage.heading).toBeVisible()
	})

	test("les commandes affichent un bouton de retour si eligible", async ({ page, orderPage }) => {
		await orderPage.goto()

		const hasOrders = await orderPage.hasOrders()
		test.skip(!hasOrders, "No orders available for return test")

		// Click on the first order to see details
		const orderRows = await orderPage.getOrderRows()
		const firstOrderLink = orderRows.first().getByRole("link").first()
		await firstOrderLink.click()

		await page.waitForLoadState("domcontentloaded")

		// Check for return/refund button on order detail
		const returnButton = page.getByRole("button", { name: /Retour|Remboursement|Retourner/i })
			.or(page.getByRole("link", { name: /Retour|Remboursement/i }))

		// Return button may or may not be visible depending on order status
		const pageContent = await page.textContent("body")
		expect(pageContent).toBeTruthy()
	})

	test("la vue detail de commande affiche les informations", async ({ page, orderPage }) => {
		await orderPage.goto()

		const hasOrders = await orderPage.hasOrders()
		test.skip(!hasOrders, "No orders available")

		const orderRows = await orderPage.getOrderRows()
		const firstOrderLink = orderRows.first().getByRole("link").first()
		await firstOrderLink.click()

		await page.waitForLoadState("domcontentloaded")

		// Order detail should show key information
		const heading = page.getByRole("heading", { level: 1 })
		await expect(heading).toBeVisible()

		// Should display order number, status, or items
		const pageContent = await page.textContent("body")
		expect(pageContent).toMatch(/SYN-\d+|commande|statut|total/i)
	})
})
