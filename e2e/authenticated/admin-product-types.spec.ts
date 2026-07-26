import { test, expect } from "../fixtures";
import { TIMEOUTS } from "../constants";
import { TEST_RUN_ID } from "../helpers/test-run";

const PRODUCT_TYPES_URL = "/admin/catalogue/types-de-produits";

test.describe("Admin - Types de bijoux (page)", { tag: ["@regression"] }, () => {
	test.beforeEach(async ({ page }) => {
		await page.goto(PRODUCT_TYPES_URL);
		await page.waitForLoadState("domcontentloaded");
	});

	test("affiche la page avec le titre et le bouton de création", async ({ page }) => {
		await expect(page).toHaveURL(new RegExp(PRODUCT_TYPES_URL));
		const heading = page.getByRole("heading", { name: /Types de bijoux/i });
		await expect(heading).toBeVisible();
		const createButton = page.getByRole("button", { name: /Créer un type/i });
		await expect(createButton).toBeVisible();
	});

	test("affiche le tableau de données ou un état vide", async ({ page }) => {
		const table = page.locator("table");
		const emptyState = page.getByText(/aucun type/i);
		await expect(table.or(emptyState)).toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });
	});

	test("affiche la barre de recherche", async ({ page }) => {
		const searchInput = page.getByPlaceholder(/Rechercher par label, slug/i);
		await expect(searchInput).toBeVisible();
	});

	test("la recherche filtre les résultats", async ({ page }) => {
		const table = page.locator("table");
		const emptyState = page.getByText(/aucun type/i);
		await expect(table.or(emptyState)).toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });

		const tableVisible = await table.isVisible();
		test.skip(!tableVisible, "Pas de types de bijoux dans la table");

		const searchInput = page.getByPlaceholder(/Rechercher par label, slug/i);
		await searchInput.fill("zzz_inexistant_xyz");

		await page.waitForTimeout(600); // debounce live search
		const noResults = page.getByText(/aucun type|aucun résultat/i);
		await expect(noResults).toBeVisible({ timeout: TIMEOUTS.FEEDBACK });
	});
});

test.describe("Admin - Types de bijoux (création)", { tag: ["@regression"] }, () => {
	const testLabel = `Type Test ${TEST_RUN_ID}`;

	test.beforeEach(async ({ page }) => {
		await page.goto(PRODUCT_TYPES_URL);
		await page.waitForLoadState("domcontentloaded");
	});

	test("ouvre le dialogue de création au clic sur le bouton", async ({ page }) => {
		const createButton = page.getByRole("button", { name: /Créer un type/i });
		await createButton.click();

		const dialog = page.getByRole("dialog");
		await expect(dialog).toBeVisible({ timeout: TIMEOUTS.FEEDBACK });
		await expect(dialog.getByRole("heading", { name: /Créer un type de produit/i })).toBeVisible();
	});

	test("valide que le champ label est requis", async ({ page }) => {
		const createButton = page.getByRole("button", { name: /Créer un type/i });
		await createButton.click();

		const dialog = page.getByRole("dialog");
		await expect(dialog).toBeVisible({ timeout: TIMEOUTS.FEEDBACK });

		// Submit without filling required field
		const submitButton = dialog.getByRole("button", { name: /^Créer$/i });
		await expect(submitButton).toBeDisabled();
	});

	test("crée un nouveau type de bijou avec succès", async ({ page }) => {
		const createButton = page.getByRole("button", { name: /Créer un type/i });
		await createButton.click();

		const dialog = page.getByRole("dialog");
		await expect(dialog).toBeVisible({ timeout: TIMEOUTS.FEEDBACK });

		// Fill label
		const labelInput = dialog.getByLabel(/Label/i);
		await labelInput.fill(testLabel);

		// Fill optional description
		const descriptionInput = dialog.getByLabel(/Description/i);
		await descriptionInput.fill("Type créé par les tests E2E automatisés.");

		// Submit
		const submitButton = dialog.getByRole("button", { name: /^Créer$/i });
		await expect(submitButton).toBeEnabled();
		await submitButton.click();

		// Dialog closes and success toast appears
		await expect(dialog).not.toBeVisible({ timeout: TIMEOUTS.FEEDBACK });
		const toast = page.getByText(/créé|succès/i);
		await expect(toast.first()).toBeVisible({ timeout: TIMEOUTS.FEEDBACK });

		// New entry appears in the table
		const table = page.locator("table");
		await expect(table).toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });
		await expect(page.getByText(testLabel)).toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });
	});
});

test.describe("Admin - Types de bijoux (modification)", { tag: ["@regression"] }, () => {
	test.beforeEach(async ({ page }) => {
		await page.goto(PRODUCT_TYPES_URL);
		await page.waitForLoadState("domcontentloaded");
	});

	test("ouvre le dialogue d'édition via les actions de ligne", async ({ page }) => {
		const table = page.locator("table");
		const emptyState = page.getByText(/aucun type/i);
		await expect(table.or(emptyState)).toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });

		const tableVisible = await table.isVisible();
		test.skip(!tableVisible, "Pas de types de bijoux à modifier");

		// Cibler une ligne NON SYSTÈME : un type système n'expose que « Voir (lecture
		// seule) ». `.first()` tombait sur lui selon l'ordre de tri et le test
		// s'auto-skippait — vert sans rien vérifier. On reconnaît un type système à son
		// interrupteur « Actif » verrouillé.
		const editableRow = table
			.locator("tbody tr")
			.filter({ has: page.locator('[role="switch"]:not([disabled])') })
			.first();
		const hasEditableRow = (await editableRow.count()) > 0;
		test.skip(!hasEditableRow, "Aucun type non-système à modifier");

		await editableRow.getByRole("button", { name: /Actions/i }).click();

		const editOption = page.getByRole("menuitem", { name: /Éditer/i });
		await expect(editOption).toBeVisible({ timeout: TIMEOUTS.FEEDBACK });
		await editOption.click();

		// Dialog opens in update mode
		const dialog = page.getByRole("dialog");
		await expect(dialog).toBeVisible({ timeout: TIMEOUTS.FEEDBACK });
		await expect(
			dialog.getByRole("heading", { name: /Modifier le type de produit/i }),
		).toBeVisible();

		// Label field should be pre-filled
		const labelInput = dialog.getByLabel(/Label/i);
		const currentLabel = await labelInput.inputValue();
		expect(currentLabel.length).toBeGreaterThan(0);
	});
});

test.describe("Admin - Types de bijoux (suppression)", { tag: ["@regression"] }, () => {
	const labelToDelete = `Type Suppression ${TEST_RUN_ID}`;

	test("crée puis supprime un type de bijou", async ({ page }) => {
		await page.goto(PRODUCT_TYPES_URL);
		await page.waitForLoadState("domcontentloaded");

		// Step 1: Create a type to delete
		const createButton = page.getByRole("button", { name: /Créer un type/i });
		await createButton.click();

		const dialog = page.getByRole("dialog");
		await expect(dialog).toBeVisible({ timeout: TIMEOUTS.FEEDBACK });
		await dialog.getByLabel(/Label/i).fill(labelToDelete);
		await dialog.getByRole("button", { name: /^Créer$/i }).click();
		await expect(dialog).not.toBeVisible({ timeout: TIMEOUTS.FEEDBACK });

		// Wait for the new row to appear
		const table = page.locator("table");
		await expect(table).toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });
		const newRow = table.locator("tbody tr").filter({ hasText: labelToDelete });
		await expect(newRow).toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });

		// Step 2: Open row actions and delete
		const actionsButton = newRow.getByRole("button", { name: /Actions/i });
		await actionsButton.click();

		const deleteOption = page.getByRole("menuitem", { name: /Supprimer/i });
		await expect(deleteOption).toBeVisible({ timeout: TIMEOUTS.FEEDBACK });
		await deleteOption.click();

		// Step 3: Confirm deletion in the alert dialog
		const confirmDialog = page.getByRole("alertdialog");
		await expect(confirmDialog).toBeVisible({ timeout: TIMEOUTS.FEEDBACK });
		await expect(confirmDialog.getByText(labelToDelete)).toBeVisible();

		const confirmButton = confirmDialog.getByRole("button", {
			name: /Supprimer|Confirmer/i,
		});
		await confirmButton.click();

		// Step 4: Row disappears and success feedback shown
		await expect(newRow).not.toBeVisible({ timeout: TIMEOUTS.FEEDBACK });
		const successFeedback = page.getByText(/supprimé|succès/i);
		await expect(successFeedback.first()).toBeVisible({ timeout: TIMEOUTS.FEEDBACK });
	});

	test("bloque la suppression si le type est lié à des produits actifs", async ({ page }) => {
		await page.goto(PRODUCT_TYPES_URL);
		await page.waitForLoadState("domcontentloaded");

		const table = page.locator("table");
		const emptyState = page.getByText(/aucun type/i);
		await expect(table.or(emptyState)).toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });

		const tableVisible = await table.isVisible();
		test.skip(!tableVisible, "Pas de types dans la table");

		// Find a row that has products (non-zero count in column)
		const rowWithProducts = table.locator("tbody tr").filter({ hasNotText: "0" }).first();

		const hasRowWithProducts = (await rowWithProducts.count()) > 0;
		test.skip(!hasRowWithProducts, "Aucun type lié à des produits actifs");

		const actionsButton = rowWithProducts.getByRole("button", { name: /Actions/i });
		await actionsButton.click();

		const deleteOption = page.getByRole("menuitem", { name: /Supprimer/i });
		if ((await deleteOption.count()) === 0) {
			test.skip(true, "Pas d'option supprimer (type système)");
		}
		await deleteOption.click();

		const confirmDialog = page.getByRole("alertdialog");
		await expect(confirmDialog).toBeVisible({ timeout: TIMEOUTS.FEEDBACK });

		// Warning message about active products should be visible
		await expect(confirmDialog.getByText(/produit(s) actif(s)|Impossible/i)).toBeVisible();
	});
});
