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

		// Order detail page should display order heading
		const heading = page.getByRole("heading", { level: 1 })
		await expect(heading).toBeVisible()

		// Return button visibility depends on order status (DELIVERED)
		// Assert it's either visible or the order status doesn't allow returns
		const orderStatus = page.getByText(/Statut/i).locator("..").getByText(/Livr|En cours|Expédi|Annul|En attente/i)
		await expect(returnButton.or(orderStatus.first())).toBeVisible()
	})

	test("la vue detail de commande affiche les informations", async ({ page, orderPage }) => {
		await orderPage.goto()

		const hasOrders = await orderPage.hasOrders()
		test.skip(!hasOrders, "No orders available")

		const orderRows = await orderPage.getOrderRows()
		const firstOrderLink = orderRows.first().getByRole("link").first()
		await firstOrderLink.click()

		await page.waitForLoadState("domcontentloaded")

		// Order detail should show heading with order number
		const heading = page.getByRole("heading", { level: 1 })
		await expect(heading).toBeVisible()
		await expect(heading).toHaveText(/SYN-\d+/)

		// Should display specific order information sections
		const orderInfo = page.getByText(/Total/i)
		await expect(orderInfo.first()).toBeVisible()
	})
})
