import { test, expect } from "../fixtures";
import { TIMEOUTS } from "../constants";
import { TEST_RUN_ID } from "../helpers/test-run";

const DISCOUNTS_URL = "/admin/marketing/discounts";

test.describe("Admin - Codes promo (page)", { tag: ["@regression"] }, () => {
	test.beforeEach(async ({ page }) => {
		await page.goto(DISCOUNTS_URL);
		await page.waitForLoadState("domcontentloaded");
	});

	test("affiche la page avec le titre et le bouton de création", async ({ page }) => {
		await expect(page).toHaveURL(new RegExp(DISCOUNTS_URL));
		const heading = page.getByRole("heading", { name: /Codes promo|Promotions|Discounts/i });
		await expect(heading).toBeVisible();
		const createButton = page.getByRole("button", { name: /Créer|Ajouter|Nouveau/i });
		await expect(createButton.first()).toBeVisible();
	});

	test("affiche le tableau de données ou un état vide", async ({ page }) => {
		const table = page.locator("table");
		const emptyState = page.getByText(/aucun code|aucune promotion/i);
		await expect(table.or(emptyState)).toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });
	});

	test("affiche la barre de recherche", async ({ page }) => {
		const searchInput = page.getByPlaceholder(/Rechercher/i).or(page.getByRole("searchbox"));
		await expect(searchInput.first()).toBeVisible();
	});

	test("la recherche filtre les résultats", async ({ page }) => {
		const table = page.locator("table");
		const emptyState = page.getByText(/aucun code|aucune promotion/i);
		await expect(table.or(emptyState)).toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });

		const tableVisible = await table.isVisible();
		test.skip(!tableVisible, "Pas de codes promo dans la table");

		const searchInput = page.getByPlaceholder(/Rechercher/i).or(page.getByRole("searchbox"));
		await searchInput.first().fill("ZZZ_INEXISTANT_XYZ");

		await page.waitForTimeout(600);
		const noResults = page.getByText(/aucun code|aucun résultat|aucune promotion/i);
		await expect(noResults).toBeVisible({ timeout: TIMEOUTS.FEEDBACK });
	});

	test("les filtres de type sont disponibles", async ({ page }) => {
		const filterButton = page
			.getByRole("button", { name: /Filtres|Filtrer/i })
			.or(page.getByRole("button", { name: /Type/i }));
		const hasFilter = (await filterButton.count()) > 0;
		test.skip(!hasFilter, "Pas de bouton filtre visible");

		await filterButton.first().click();

		// Should show filter options (percentage, fixed amount)
		const filterContent = page.getByText(/Pourcentage|Montant fixe|PERCENTAGE|FIXED/i);
		await expect(filterContent.first()).toBeVisible({ timeout: TIMEOUTS.FEEDBACK });
	});
});

test.describe("Admin - Codes promo (création)", { tag: ["@regression"] }, () => {
	const testCode = `E2E${TEST_RUN_ID}`.toUpperCase().slice(0, 20);

	test("ouvre le dialogue de création", async ({ page }) => {
		await page.goto(DISCOUNTS_URL);
		await page.waitForLoadState("domcontentloaded");

		const createButton = page.getByRole("button", { name: /Créer|Ajouter|Nouveau/i });
		await createButton.first().click();

		const dialog = page.getByRole("dialog");
		await expect(dialog).toBeVisible({ timeout: TIMEOUTS.FEEDBACK });
	});

	test("crée un code promo pourcentage avec succès", async ({ page }) => {
		await page.goto(DISCOUNTS_URL);
		await page.waitForLoadState("domcontentloaded");

		const createButton = page.getByRole("button", { name: /Créer|Ajouter|Nouveau/i });
		await createButton.first().click();

		const dialog = page.getByRole("dialog");
		await expect(dialog).toBeVisible({ timeout: TIMEOUTS.FEEDBACK });

		// Fill code
		const codeInput = dialog.getByLabel(/Code/i);
		await codeInput.first().fill(testCode);

		// Select type (percentage)
		const typeSelect = dialog.getByLabel(/Type/i).or(dialog.getByRole("combobox"));
		if ((await typeSelect.count()) > 0) {
			await typeSelect.first().click();
			const percentOption = page.getByRole("option", { name: /Pourcentage|Percentage/i });
			if ((await percentOption.count()) > 0) {
				await percentOption.first().click();
			}
		}

		// Fill value
		const valueInput = dialog.getByLabel(/Valeur|Montant/i);
		if ((await valueInput.count()) > 0) {
			await valueInput.first().fill("10");
		}

		const submitButton = dialog.getByRole("button", { name: /Créer|Enregistrer|Sauvegarder/i });
		await expect(submitButton.first()).toBeEnabled();
		await submitButton.first().click();

		await expect(dialog).not.toBeVisible({ timeout: TIMEOUTS.FEEDBACK });
		const toast = page.getByText(/créé|succès/i);
		await expect(toast.first()).toBeVisible({ timeout: TIMEOUTS.FEEDBACK });
	});
});

test.describe("Admin - Codes promo (modification)", { tag: ["@regression"] }, () => {
	test.beforeEach(async ({ page }) => {
		await page.goto(DISCOUNTS_URL);
		await page.waitForLoadState("domcontentloaded");
	});

	test("ouvre l'édition via les actions de ligne", async ({ page }) => {
		const table = page.locator("table");
		const emptyState = page.getByText(/aucun code|aucune promotion/i);
		await expect(table.or(emptyState)).toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });

		const tableVisible = await table.isVisible();
		test.skip(!tableVisible, "Pas de codes promo à modifier");

		const actionsButton = table
			.locator("tbody tr")
			.first()
			.getByRole("button", { name: /Actions/i });
		await actionsButton.click();

		const editOption = page.getByRole("menuitem", { name: /Éditer|Modifier/i });
		await expect(editOption).toBeVisible({ timeout: TIMEOUTS.FEEDBACK });
	});

	test("duplique un code promo", async ({ page }) => {
		const table = page.locator("table");
		const emptyState = page.getByText(/aucun code|aucune promotion/i);
		await expect(table.or(emptyState)).toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });

		const tableVisible = await table.isVisible();
		test.skip(!tableVisible, "Pas de codes promo à dupliquer");

		const actionsButton = table
			.locator("tbody tr")
			.first()
			.getByRole("button", { name: /Actions/i });
		await actionsButton.click();

		const duplicateOption = page.getByRole("menuitem", { name: /Dupliquer/i });
		const hasDuplicate = (await duplicateOption.count()) > 0;
		test.skip(!hasDuplicate, "Pas d'option dupliquer");

		await duplicateOption.click();

		const toast = page.getByText(/dupliqué|succès|créé/i);
		await expect(toast.first()).toBeVisible({ timeout: TIMEOUTS.FEEDBACK });
	});

	test("toggle le statut d'un code promo", async ({ page }) => {
		const table = page.locator("table");
		const emptyState = page.getByText(/aucun code|aucune promotion/i);
		await expect(table.or(emptyState)).toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });

		const tableVisible = await table.isVisible();
		test.skip(!tableVisible, "Pas de codes promo pour toggle");

		const actionsButton = table
			.locator("tbody tr")
			.first()
			.getByRole("button", { name: /Actions/i });
		await actionsButton.click();

		const toggleOption = page.getByRole("menuitem", { name: /Activer|Désactiver/i });
		const hasToggle = (await toggleOption.count()) > 0;
		test.skip(!hasToggle, "Pas d'option toggle");

		await toggleOption.first().click();

		// May show confirmation dialog
		const confirmDialog = page.getByRole("alertdialog");
		if (await confirmDialog.isVisible()) {
			const confirmButton = confirmDialog.getByRole("button", {
				name: /Confirmer|Activer|Désactiver/i,
			});
			await confirmButton.click();
		}

		const toast = page.getByText(/activé|désactivé|modifié|succès/i);
		await expect(toast.first()).toBeVisible({ timeout: TIMEOUTS.FEEDBACK });
	});
});

test.describe("Admin - Codes promo (opérations bulk)", { tag: ["@regression"] }, () => {
	test.beforeEach(async ({ page }) => {
		await page.goto(DISCOUNTS_URL);
		await page.waitForLoadState("domcontentloaded");
	});

	test("sélectionner une ligne affiche la toolbar de sélection", async ({ page }) => {
		const table = page.locator("table");
		const emptyState = page.getByText(/aucun code|aucune promotion/i);
		await expect(table.or(emptyState)).toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });

		const tableVisible = await table.isVisible();
		test.skip(!tableVisible, "Pas de codes promo dans la table");

		const firstRowCheckbox = table.locator("tbody tr").first().getByRole("checkbox");
		await firstRowCheckbox.check();

		const selectionToolbar = page.getByText(/sélectionné/i);
		await expect(selectionToolbar).toBeVisible({ timeout: TIMEOUTS.FEEDBACK });
	});

	test("le menu bulk expose les actions", async ({ page }) => {
		const table = page.locator("table");
		const emptyState = page.getByText(/aucun code|aucune promotion/i);
		await expect(table.or(emptyState)).toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });

		const tableVisible = await table.isVisible();
		test.skip(!tableVisible, "Pas de codes promo dans la table");

		const firstRowCheckbox = table.locator("tbody tr").first().getByRole("checkbox");
		await firstRowCheckbox.check();

		const bulkMenuButton = page
			.getByRole("toolbar")
			.getByRole("button", { name: /Ouvrir le menu/i })
			.or(page.getByRole("button", { name: /Ouvrir le menu/i }).last());
		await expect(bulkMenuButton).toBeVisible({ timeout: TIMEOUTS.FEEDBACK });
		await bulkMenuButton.click();

		await expect(page.getByRole("menuitem", { name: /Supprimer/i })).toBeVisible();
	});
});
