import { test, expect } from "../fixtures";

test.describe("Retours et remboursements", { tag: ["@regression"] }, () => {
	test("la page commandes est accessible", async ({ orderPage }) => {
		await orderPage.goto();

		await expect(orderPage.heading).toBeVisible();
	});

	test("les commandes affichent un bouton de retour si eligible", async ({ page, orderPage }) => {
		await orderPage.goto();

		const hasOrders = await orderPage.hasOrders();
		test.skip(!hasOrders, "No orders available for return test");

		// Click on the first order to see details
		const orderRows = await orderPage.getOrderRows();
		const firstOrderLink = orderRows.first().getByRole("link").first();
		await firstOrderLink.click();

		await page.waitForLoadState("domcontentloaded");

		// Order detail page should display order heading
		const heading = page.getByRole("heading", { level: 1 });
		await expect(heading).toBeVisible();

		// Check for return/refund button on order detail
		const returnButton = page
			.getByRole("button", { name: /Retour|Remboursement|Retourner/i })
			.or(page.getByRole("link", { name: /Retour|Remboursement/i }));
		const returnVisible = await returnButton.isVisible();

		if (returnVisible) {
			await expect(returnButton).toBeEnabled();
		} else {
			// Order is not eligible for return - verify status explains why
			const orderStatus = page
				.getByText(/Statut/i)
				.locator("..")
				.getByText(/Livr|En cours|Expédi|Annul|En attente/i);
			await expect(orderStatus.first()).toBeVisible();
			test.skip(true, "Order not eligible for return");
		}
	});

	test("la vue detail de commande affiche les informations", async ({ page, orderPage }) => {
		await orderPage.goto();

		const hasOrders = await orderPage.hasOrders();
		test.skip(!hasOrders, "No orders available");

		const orderRows = await orderPage.getOrderRows();
		const firstOrderLink = orderRows.first().getByRole("link").first();
		await firstOrderLink.click();

		await page.waitForLoadState("domcontentloaded");

		// Order detail should show heading with order number
		const heading = page.getByRole("heading", { level: 1 });
		await expect(heading).toBeVisible();
		await expect(heading).toHaveText(/SYN-\d+/);

		// Should display specific order information sections
		const orderInfo = page.getByText(/Total/i);
		await expect(orderInfo.first()).toBeVisible();
	});
});
