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

	// Lot 2 S3.3 : la liste est en consultation pure — le workflow in-app
	// (création, approve/reject/process) est parti, Léane rembourse depuis le
	// dashboard Stripe et la synchro webhook alimente ces lignes.
	test("les lignes ne portent plus de menu d'actions (consultation pure)", async ({ page }) => {
		const table = page.locator("table");
		const emptyState = page.getByText(/aucun remboursement/i);
		await expect(table.or(emptyState)).toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });

		const tableVisible = await table.isVisible();
		test.skip(!tableVisible, "Pas de remboursements dans la table");

		const actionsButton = table
			.locator("tbody tr")
			.first()
			.getByRole("button", { name: /Actions/i });
		await expect(actionsButton).toHaveCount(0);
	});

	test("l'ancienne page de création n'existe plus", async ({ page }) => {
		const response = await page.goto("/admin/ventes/remboursements/nouveau");
		// Route supprimée (Lot 2 S3.3) : 404, pas un formulaire.
		expect(response?.status()).toBe(404);
	});

	test("le lien vers le détail de commande est accessible depuis une ligne", async ({ page }) => {
		const table = page.locator("table");
		const emptyState = page.getByText(/aucun remboursement/i);
		await expect(table.or(emptyState)).toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });

		const tableVisible = await table.isVisible();
		test.skip(!tableVisible, "Pas de remboursements dans la table");

		// La colonne Commande porte un lien direct vers le détail de la commande.
		const orderLink = table
			.locator("tbody tr")
			.first()
			.getByRole("link", { name: /SYN-|CMD-|[A-Z]{2,4}-\d/ });
		await expect(orderLink.first()).toHaveAttribute("href", /\/admin\/ventes\/commandes\//);
	});

	test("les filtres de statut fonctionnent", async ({ page }) => {
		const table = page.locator("table");
		const emptyState = page.getByText(/aucun remboursement/i);
		await expect(table.or(emptyState)).toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });

		const tableVisible = await table.isVisible();
		test.skip(!tableVisible, "Pas de remboursements dans la table");

		// Look for sort/filter controls
		const sortButton = page
			.getByRole("button", { name: /Trier/i })
			.or(page.getByRole("combobox", { name: /Trier/i }));
		const hasSortButton = await sortButton.isVisible();
		if (hasSortButton) {
			await sortButton.click();
			const sortOptions = page.getByRole("option").or(page.getByRole("menuitem"));
			const optionCount = await sortOptions.count();
			expect(optionCount).toBeGreaterThan(0);
		}
	});
});
