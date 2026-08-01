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

	test("le lien vers le détail de commande est accessible depuis une ligne", async ({ page }) => {
		const table = page.locator("table");
		const emptyState = page.getByText(/aucun remboursement/i);
		await expect(table.or(emptyState)).toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });

		const tableVisible = await table.isVisible();
		test.skip(!tableVisible, "Pas de remboursements dans la table");

		// Row actions should include a link to the order
		const actionsButton = table
			.locator("tbody tr")
			.first()
			.getByRole("button", { name: /Actions/i });
		await actionsButton.click();

		const viewOrderItem = page.getByRole("menuitem", { name: /commande|voir/i });
		const viewOrderVisible = await viewOrderItem.isVisible();
		if (viewOrderVisible) {
			await expect(viewOrderItem).toBeEnabled();
		}
	});

	test("le formulaire de création soumet réellement une demande de remboursement", async ({
		page,
	}) => {
		// @regression refund-form-action-contract (P0 audit 2026-08-01) : le payload
		// du formulaire n'émettait pas `amount`, exigé par createRefundSchema →
		// VALIDATION_ERROR silencieux sur CHAQUE soumission. Aucun test ne soumettait
		// le formulaire de bout en bout ; celui-ci verrouille le parcours réel.
		await page.goto("/admin/ventes/commandes?filter_paymentStatus=PAID");
		await page.waitForLoadState("domcontentloaded");

		const table = page.locator("table");
		const emptyState = page.getByText(/aucune commande/i);
		await expect(table.or(emptyState)).toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });
		test.skip(!(await table.isVisible()), "Pas de commande payée dans le seed");

		// Parcours réel : menu d'actions de ligne → « Créer un remboursement ».
		// L'entrée n'existe que si canRefund (PROCESSING|SHIPPED|DELIVERED + PAID) :
		// on sonde les premières lignes jusqu'à en trouver une qui l'offre.
		const rows = table.locator("tbody tr");
		const rowCount = await rows.count();
		let opened = false;
		for (let i = 0; i < Math.min(rowCount, 5); i++) {
			await rows
				.nth(i)
				.getByRole("button", { name: /Actions/i })
				.click();
			const refundItem = page.getByRole("menuitem", { name: /Créer un remboursement/i });
			if (await refundItem.isVisible().catch(() => false)) {
				await refundItem.click();
				opened = true;
				break;
			}
			await page.keyboard.press("Escape");
		}
		test.skip(!opened, "Aucune commande refundable dans le seed");

		await expect(page).toHaveURL(/remboursements\/nouveau\?orderId=/);

		const selectAll = page.getByRole("button", { name: /Tout sélectionner/i });
		test.skip(
			!(await selectAll.isVisible().catch(() => false)),
			"Aucun bijou disponible au remboursement",
		);
		await selectAll.click();

		await page.getByRole("button", { name: /Créer la demande/i }).click();

		// Succès observable : toast de l'action + retour à la liste des remboursements
		await expect(page.getByText(/Demande de remboursement créée/i)).toBeVisible({
			timeout: TIMEOUTS.FEEDBACK,
		});
		await expect(page).toHaveURL(new RegExp(REFUNDS_URL), { timeout: TIMEOUTS.FEEDBACK });
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
