import { test, expect } from "../fixtures";
import { TIMEOUTS } from "../constants";
import { TEST_RUN_ID } from "../helpers/test-run";

const COLORS_URL = "/admin/catalogue/couleurs";

test.describe("Admin - Couleurs (page)", { tag: ["@regression"] }, () => {
	test.beforeEach(async ({ page }) => {
		await page.goto(COLORS_URL);
		await page.waitForLoadState("domcontentloaded");
	});

	test("affiche la page avec le titre et le bouton de création", async ({ page }) => {
		await expect(page).toHaveURL(new RegExp(COLORS_URL));
		const heading = page.getByRole("heading", { name: /Couleurs/i });
		await expect(heading).toBeVisible();
		const createButton = page.getByRole("button", { name: /Créer|Ajouter|Nouveau/i });
		await expect(createButton.first()).toBeVisible();
	});

	test("affiche le tableau de données ou un état vide", async ({ page }) => {
		const table = page.locator("table");
		const emptyState = page.getByText(/aucune couleur/i);
		await expect(table.or(emptyState)).toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });
	});

	test("affiche la barre de recherche", async ({ page }) => {
		const searchInput = page.getByPlaceholder(/Rechercher/i).or(page.getByRole("searchbox"));
		await expect(searchInput.first()).toBeVisible();
	});

	test("la recherche filtre les résultats", async ({ page }) => {
		const table = page.locator("table");
		const emptyState = page.getByText(/aucune couleur/i);
		await expect(table.or(emptyState)).toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });

		const tableVisible = await table.isVisible();
		test.skip(!tableVisible, "Pas de couleurs dans la table");

		const searchInput = page.getByPlaceholder(/Rechercher/i).or(page.getByRole("searchbox"));
		await searchInput.first().fill("zzz_inexistant_xyz");

		await page.waitForTimeout(600);
		const noResults = page.getByText(/aucune couleur|aucun résultat/i);
		await expect(noResults).toBeVisible({ timeout: TIMEOUTS.FEEDBACK });
	});
});

test.describe("Admin - Couleurs (création)", { tag: ["@regression"] }, () => {
	const testLabel = `Couleur ${TEST_RUN_ID}`;

	test("ouvre le dialogue de création au clic sur le bouton", async ({ page }) => {
		await page.goto(COLORS_URL);
		await page.waitForLoadState("domcontentloaded");

		const createButton = page.getByRole("button", { name: /Créer|Ajouter|Nouveau/i });
		await createButton.first().click();

		const dialog = page.getByRole("dialog");
		await expect(dialog).toBeVisible({ timeout: TIMEOUTS.FEEDBACK });
	});

	test("crée une nouvelle couleur avec succès", async ({ page }) => {
		await page.goto(COLORS_URL);
		await page.waitForLoadState("domcontentloaded");

		const createButton = page.getByRole("button", { name: /Créer|Ajouter|Nouveau/i });
		await createButton.first().click();

		const dialog = page.getByRole("dialog");
		await expect(dialog).toBeVisible({ timeout: TIMEOUTS.FEEDBACK });

		const nameInput = dialog.getByLabel(/Nom/i);
		await nameInput.fill(testLabel);

		const hexInput = dialog.getByLabel(/Hex|Code couleur|Couleur/i);
		if ((await hexInput.count()) > 0) {
			await hexInput.first().fill("#FF5733");
		}

		const submitButton = dialog.getByRole("button", { name: /Créer|Enregistrer|Sauvegarder/i });
		await expect(submitButton.first()).toBeEnabled();
		await submitButton.first().click();

		await expect(dialog).not.toBeVisible({ timeout: TIMEOUTS.FEEDBACK });
		const toast = page.getByText(/créé|succès/i);
		await expect(toast.first()).toBeVisible({ timeout: TIMEOUTS.FEEDBACK });

		const table = page.locator("table");
		await expect(table).toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });
		await expect(page.getByText(testLabel)).toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });
	});
});

test.describe("Admin - Couleurs (modification)", { tag: ["@regression"] }, () => {
	test("ouvre le dialogue d'édition via les actions de ligne", async ({ page }) => {
		await page.goto(COLORS_URL);
		await page.waitForLoadState("domcontentloaded");

		const table = page.locator("table");
		const emptyState = page.getByText(/aucune couleur/i);
		await expect(table.or(emptyState)).toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });

		const tableVisible = await table.isVisible();
		test.skip(!tableVisible, "Pas de couleurs à modifier");

		const actionsButton = table
			.locator("tbody tr")
			.first()
			.getByRole("button", { name: /Actions/i });
		await actionsButton.click();

		const editOption = page.getByRole("menuitem", { name: /Éditer|Modifier/i });
		await expect(editOption).toBeVisible({ timeout: TIMEOUTS.FEEDBACK });
		await editOption.click();

		const dialog = page.getByRole("dialog");
		await expect(dialog).toBeVisible({ timeout: TIMEOUTS.FEEDBACK });

		const nameInput = dialog.getByLabel(/Nom/i);
		const currentName = await nameInput.inputValue();
		expect(currentName.length).toBeGreaterThan(0);
	});
});

test.describe("Admin - Couleurs (actions)", { tag: ["@regression"] }, () => {
	test.beforeEach(async ({ page }) => {
		await page.goto(COLORS_URL);
		await page.waitForLoadState("domcontentloaded");
	});

	test("duplique une couleur via les actions de ligne", async ({ page }) => {
		const table = page.locator("table");
		const emptyState = page.getByText(/aucune couleur/i);
		await expect(table.or(emptyState)).toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });

		const tableVisible = await table.isVisible();
		test.skip(!tableVisible, "Pas de couleurs à dupliquer");

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

	test("toggle le statut via les actions de ligne", async ({ page }) => {
		const table = page.locator("table");
		const emptyState = page.getByText(/aucune couleur/i);
		await expect(table.or(emptyState)).toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });

		const tableVisible = await table.isVisible();
		test.skip(!tableVisible, "Pas de couleurs pour toggle");

		const actionsButton = table
			.locator("tbody tr")
			.first()
			.getByRole("button", { name: /Actions/i });
		await actionsButton.click();

		const toggleOption = page.getByRole("menuitem", { name: /Activer|Désactiver/i });
		const hasToggle = (await toggleOption.count()) > 0;
		test.skip(!hasToggle, "Pas d'option toggle statut");

		await toggleOption.first().click();

		const toast = page.getByText(/activé|désactivé|modifié|succès/i);
		await expect(toast.first()).toBeVisible({ timeout: TIMEOUTS.FEEDBACK });
	});

	test("sélectionner une ligne affiche la toolbar de sélection", async ({ page }) => {
		const table = page.locator("table");
		const emptyState = page.getByText(/aucune couleur/i);
		await expect(table.or(emptyState)).toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });

		const tableVisible = await table.isVisible();
		test.skip(!tableVisible, "Pas de couleurs dans la table");

		const firstRowCheckbox = table.locator("tbody tr").first().getByRole("checkbox");
		await firstRowCheckbox.check();

		const selectionToolbar = page.getByText(/sélectionné/i);
		await expect(selectionToolbar).toBeVisible({ timeout: TIMEOUTS.FEEDBACK });
	});
});

test.describe("Admin - Couleurs (suppression)", { tag: ["@regression"] }, () => {
	const labelToDelete = `Couleur Suppr ${TEST_RUN_ID}`;

	test("crée puis supprime une couleur", async ({ page }) => {
		await page.goto(COLORS_URL);
		await page.waitForLoadState("domcontentloaded");

		// Create
		const createButton = page.getByRole("button", { name: /Créer|Ajouter|Nouveau/i });
		await createButton.first().click();

		const dialog = page.getByRole("dialog");
		await expect(dialog).toBeVisible({ timeout: TIMEOUTS.FEEDBACK });
		await dialog.getByLabel(/Nom/i).fill(labelToDelete);

		const hexInput = dialog.getByLabel(/Hex|Code couleur|Couleur/i);
		if ((await hexInput.count()) > 0) {
			await hexInput.first().fill("#123456");
		}

		const submitButton = dialog.getByRole("button", { name: /Créer|Enregistrer/i });
		await submitButton.first().click();
		await expect(dialog).not.toBeVisible({ timeout: TIMEOUTS.FEEDBACK });

		// Wait for row
		const table = page.locator("table");
		await expect(table).toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });
		const newRow = table.locator("tbody tr").filter({ hasText: labelToDelete });
		await expect(newRow).toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });

		// Delete
		const actionsButton = newRow.getByRole("button", { name: /Actions/i });
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

		await expect(newRow).not.toBeVisible({ timeout: TIMEOUTS.FEEDBACK });
		const successFeedback = page.getByText(/supprimé|succès/i);
		await expect(successFeedback.first()).toBeVisible({ timeout: TIMEOUTS.FEEDBACK });
	});
});
