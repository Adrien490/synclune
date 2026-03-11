import { test, expect } from "../fixtures";
import { TIMEOUTS } from "../constants";

const REFUNDS_URL = "/admin/ventes/remboursements";

test.describe("Admin - Remboursements (page)", { tag: ["@regression"] }, () => {
	test.beforeEach(async ({ page }) => {
		await page.goto(REFUNDS_URL);
		await page.waitForLoadState("domcontentloaded");
	});

	test("affiche la page avec le titre", async ({ page }) => {
		await expect(page).toHaveURL(new RegExp(REFUNDS_URL));
		const heading = page.getByRole("heading", { name: /Remboursement/i });
		await expect(heading).toBeVisible();
	});

	test("affiche le tableau de données ou un état vide", async ({ page }) => {
		const table = page.locator("table");
		const emptyState = page.getByText(/aucun remboursement/i);
		await expect(table.or(emptyState)).toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });
	});

	test("affiche la barre de recherche", async ({ page }) => {
		const searchInput = page.getByPlaceholder(/Rechercher/i).or(page.getByRole("searchbox"));
		await expect(searchInput.first()).toBeVisible();
	});

	test("la recherche filtre les résultats", async ({ page }) => {
		const table = page.locator("table");
		const emptyState = page.getByText(/aucun remboursement/i);
		await expect(table.or(emptyState)).toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });

		const tableVisible = await table.isVisible();
		test.skip(!tableVisible, "Pas de remboursements dans la table");

		const searchInput = page.getByPlaceholder(/Rechercher/i).or(page.getByRole("searchbox"));
		await searchInput.first().fill("zzz_inexistant_xyz");

		await page.waitForTimeout(600);
		const noResults = page.getByText(/aucun remboursement|aucun résultat/i);
		await expect(noResults).toBeVisible({ timeout: TIMEOUTS.FEEDBACK });
	});

	test("le tableau affiche les colonnes attendues", async ({ page }) => {
		const table = page.locator("table");
		const tableVisible = await table.isVisible();
		test.skip(!tableVisible, "Pas de table visible");

		const headers = table.locator("thead th, thead [role='columnheader']");
		const headerCount = await headers.count();
		expect(headerCount).toBeGreaterThan(0);
	});
});

test.describe("Admin - Remboursements (actions)", { tag: ["@regression"] }, () => {
	test.beforeEach(async ({ page }) => {
		await page.goto(REFUNDS_URL);
		await page.waitForLoadState("domcontentloaded");
	});

	test("les actions de ligne sont disponibles", async ({ page }) => {
		const table = page.locator("table");
		const emptyState = page.getByText(/aucun remboursement/i);
		await expect(table.or(emptyState)).toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });

		const tableVisible = await table.isVisible();
		test.skip(!tableVisible, "Pas de remboursements dans la table");

		const actionsButton = table
			.locator("tbody tr")
			.first()
			.getByRole("button", { name: /Actions/i });
		await actionsButton.click();

		// Should show at least one action option
		const actionOptions = page.getByRole("menuitem");
		const optionCount = await actionOptions.count();
		expect(optionCount).toBeGreaterThan(0);
	});

	test("sélectionner une ligne affiche la toolbar de sélection", async ({ page }) => {
		const table = page.locator("table");
		const emptyState = page.getByText(/aucun remboursement/i);
		await expect(table.or(emptyState)).toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });

		const tableVisible = await table.isVisible();
		test.skip(!tableVisible, "Pas de remboursements dans la table");

		const firstRowCheckbox = table.locator("tbody tr").first().getByRole("checkbox");
		await firstRowCheckbox.check();

		const selectionToolbar = page.getByText(/sélectionné/i);
		await expect(selectionToolbar).toBeVisible({ timeout: TIMEOUTS.FEEDBACK });
	});

	test("la page de création requiert un orderId", async ({ page }) => {
		// Navigate to create page without orderId - should redirect
		await page.goto("/admin/ventes/remboursements/nouveau");
		await page.waitForLoadState("domcontentloaded");

		// Should redirect to orders page or show error
		const isOnRefundCreate = page.url().includes("/nouveau");
		if (!isOnRefundCreate) {
			// Redirected as expected
			await expect(page).toHaveURL(/\/admin\/ventes\/commandes/);
		} else {
			// Should show validation message about missing order
			const errorMessage = page.getByText(/commande|orderId|obligatoire/i);
			await expect(errorMessage.first()).toBeVisible({ timeout: TIMEOUTS.FEEDBACK });
		}
	});
});
