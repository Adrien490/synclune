import { test, expect } from "../fixtures";
import { TIMEOUTS } from "../constants";
import { TEST_RUN_ID } from "../helpers/test-run";

const COLLECTIONS_URL = "/admin/catalogue/collections";

test.describe("Admin - Collections (page)", { tag: ["@regression"] }, () => {
	test.beforeEach(async ({ page }) => {
		await page.goto(COLLECTIONS_URL);
		await page.waitForLoadState("domcontentloaded");
	});

	test("affiche la page avec le titre et le bouton de création", async ({ page }) => {
		await expect(page).toHaveURL(new RegExp(COLLECTIONS_URL));
		const heading = page.getByRole("heading", { name: /Collections/i });
		await expect(heading).toBeVisible();
		const createButton = page
			.getByRole("link", { name: /Nouveau|Créer|Ajouter/i })
			.or(page.getByRole("button", { name: /Nouveau|Créer|Ajouter/i }));
		await expect(createButton.first()).toBeVisible();
	});

	test("affiche le tableau de données ou un état vide", async ({ page }) => {
		const table = page.locator("table");
		const emptyState = page.getByText(/aucune collection/i);
		await expect(table.or(emptyState)).toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });
	});

	test("affiche la barre de recherche", async ({ page }) => {
		const searchInput = page.getByPlaceholder(/Rechercher/i).or(page.getByRole("searchbox"));
		await expect(searchInput.first()).toBeVisible();
	});

	test("la recherche filtre les résultats", async ({ page }) => {
		const table = page.locator("table");
		const emptyState = page.getByText(/aucune collection/i);
		await expect(table.or(emptyState)).toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });

		const tableVisible = await table.isVisible();
		test.skip(!tableVisible, "Pas de collections dans la table");

		const searchInput = page.getByPlaceholder(/Rechercher/i).or(page.getByRole("searchbox"));
		await searchInput.first().fill("zzz_inexistant_xyz");

		await page.waitForTimeout(600);
		const noResults = page.getByText(/aucune collection|aucun résultat/i);
		await expect(noResults).toBeVisible({ timeout: TIMEOUTS.FEEDBACK });
	});

	test("les onglets de statut sont visibles", async ({ page }) => {
		const statusTabs = page
			.getByRole("tab")
			.or(page.getByRole("button", { name: /Tous|Publi|Brouillon|Archiv/i }));
		const tabCount = await statusTabs.count();
		expect(tabCount).toBeGreaterThan(0);
	});

	test("le tri fonctionne", async ({ page }) => {
		const table = page.locator("table");
		const emptyState = page.getByText(/aucune collection/i);
		await expect(table.or(emptyState)).toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });

		const sortButton = page
			.getByRole("button", { name: /Trier/i })
			.or(page.getByRole("combobox", { name: /Trier/i }));
		const sortCount = await sortButton.count();
		test.skip(sortCount === 0, "Pas de bouton de tri visible");

		await sortButton.first().click();
		await page.waitForLoadState("domcontentloaded");
	});
});

test.describe("Admin - Collections (création)", { tag: ["@regression"] }, () => {
	const testName = `Collection Test ${TEST_RUN_ID}`;

	test("crée une nouvelle collection avec succès", async ({ page }) => {
		await page.goto(`${COLLECTIONS_URL}/nouveau`);
		await page.waitForLoadState("domcontentloaded");

		const heading = page.getByRole("heading", { level: 1 });
		await expect(heading).toBeVisible();

		const nameField = page.getByLabel(/Nom/i);
		await expect(nameField.first()).toBeVisible();
		await nameField.first().fill(testName);

		const descriptionField = page.getByLabel(/Description/i).or(page.locator("textarea"));
		if ((await descriptionField.count()) > 0) {
			await descriptionField.first().fill("Collection créée par les tests E2E.");
		}

		const submitButton = page.getByRole("button", { name: /Créer|Enregistrer|Sauvegarder/i });
		await expect(submitButton.first()).toBeEnabled();
		await submitButton.first().click();

		const toast = page.getByText(/créé|succès|enregistré/i);
		await expect(toast.first()).toBeVisible({ timeout: TIMEOUTS.FEEDBACK });
	});
});

test.describe("Admin - Collections (modification)", { tag: ["@regression"] }, () => {
	test.beforeEach(async ({ page }) => {
		await page.goto(COLLECTIONS_URL);
		await page.waitForLoadState("domcontentloaded");
	});

	test("ouvre l'édition via les actions de ligne", async ({ page }) => {
		const table = page.locator("table");
		const emptyState = page.getByText(/aucune collection/i);
		await expect(table.or(emptyState)).toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });

		const tableVisible = await table.isVisible();
		test.skip(!tableVisible, "Pas de collections à modifier");

		const actionsButton = table
			.locator("tbody tr")
			.first()
			.getByRole("button", { name: /Actions/i });
		await actionsButton.click();

		const editOption = page.getByRole("menuitem", { name: /Éditer|Modifier/i });
		await expect(editOption).toBeVisible({ timeout: TIMEOUTS.FEEDBACK });
	});

	test("naviguer vers le détail d'une collection", async ({ page }) => {
		const table = page.locator("table");
		const emptyState = page.getByText(/aucune collection/i);
		await expect(table.or(emptyState)).toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });

		const tableVisible = await table.isVisible();
		test.skip(!tableVisible, "Pas de collections dans la table");

		const collectionLink = table.locator("tbody tr").first().getByRole("link").first();
		await collectionLink.click();
		await page.waitForLoadState("domcontentloaded");

		await expect(page).toHaveURL(/\/admin\/catalogue\/collections\//);
		const heading = page.getByRole("heading", { level: 1 });
		await expect(heading).toBeVisible();
	});
});

test.describe("Admin - Collections (suppression)", { tag: ["@regression"] }, () => {
	test("supprime une collection via les actions de ligne", async ({ page }) => {
		await page.goto(COLLECTIONS_URL);
		await page.waitForLoadState("domcontentloaded");

		const table = page.locator("table");
		const emptyState = page.getByText(/aucune collection/i);
		await expect(table.or(emptyState)).toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });

		const tableVisible = await table.isVisible();
		test.skip(!tableVisible, "Pas de collections à supprimer");

		// Find a test collection to delete (created by E2E)
		const testRow = table.locator("tbody tr").filter({ hasText: TEST_RUN_ID });
		const hasTestRow = (await testRow.count()) > 0;
		test.skip(!hasTestRow, "Pas de collection de test à supprimer");

		const actionsButton = testRow.first().getByRole("button", { name: /Actions/i });
		await actionsButton.click();

		const deleteOption = page.getByRole("menuitem", { name: /Supprimer/i });
		await expect(deleteOption).toBeVisible({ timeout: TIMEOUTS.FEEDBACK });
		await deleteOption.click();

		const confirmDialog = page.getByRole("alertdialog");
		await expect(confirmDialog).toBeVisible({ timeout: TIMEOUTS.FEEDBACK });

		const confirmButton = confirmDialog.getByRole("button", {
			name: /Supprimer|Confirmer/i,
		});
		await confirmButton.click();

		await expect(confirmDialog).not.toBeVisible({ timeout: TIMEOUTS.FEEDBACK });
		const successFeedback = page.getByText(/supprimé|succès/i);
		await expect(successFeedback.first()).toBeVisible({ timeout: TIMEOUTS.FEEDBACK });
	});
});

test.describe("Admin - Collections (opérations bulk)", { tag: ["@regression"] }, () => {
	test.beforeEach(async ({ page }) => {
		await page.goto(COLLECTIONS_URL);
		await page.waitForLoadState("domcontentloaded");
	});

	test("sélectionner une ligne affiche la toolbar de sélection", async ({ page }) => {
		const table = page.locator("table");
		const emptyState = page.getByText(/aucune collection/i);
		await expect(table.or(emptyState)).toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });

		const tableVisible = await table.isVisible();
		test.skip(!tableVisible, "Pas de collections dans la table");

		const firstRowCheckbox = table.locator("tbody tr").first().getByRole("checkbox");
		await firstRowCheckbox.check();

		const selectionToolbar = page.getByText(/sélectionné/i);
		await expect(selectionToolbar).toBeVisible({ timeout: TIMEOUTS.FEEDBACK });
	});

	test("le menu bulk expose les actions", async ({ page }) => {
		const table = page.locator("table");
		const emptyState = page.getByText(/aucune collection/i);
		await expect(table.or(emptyState)).toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });

		const tableVisible = await table.isVisible();
		test.skip(!tableVisible, "Pas de collections dans la table");

		const firstRowCheckbox = table.locator("tbody tr").first().getByRole("checkbox");
		await firstRowCheckbox.check();

		const bulkMenuButton = page
			.getByRole("toolbar")
			.getByRole("button", { name: /Ouvrir le menu/i })
			.or(page.getByRole("button", { name: /Ouvrir le menu/i }).last());
		await expect(bulkMenuButton).toBeVisible({ timeout: TIMEOUTS.FEEDBACK });
		await bulkMenuButton.click();

		await expect(page.getByRole("menuitem", { name: /Supprimer/i })).toBeVisible();
		await expect(page.getByRole("menuitem", { name: /Archiver/i })).toBeVisible();
	});
});
