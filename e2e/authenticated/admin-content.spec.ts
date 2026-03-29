import { test, expect } from "../fixtures";
import { TIMEOUTS } from "../constants";

test.describe("Admin - Annonces", { tag: ["@regression"] }, () => {
	test.beforeEach(async ({ adminPage }) => {
		await adminPage.gotoAnnouncements();
	});

	test("affiche la page avec le titre", async ({ page }) => {
		const heading = page.getByRole("heading", { name: /Annonces/i });
		await expect(heading).toBeVisible();

		const description = page.getByText(/annonces promotionnelles/i);
		await expect(description).toBeVisible();
	});

	test("affiche le tableau ou un etat vide", async ({ page }) => {
		const table = page.locator("table");
		const emptyState = page.getByText(/Aucune annonce/i);
		await expect(table.or(emptyState)).toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });
	});

	test("le bouton de creation est present", async ({ page }) => {
		const createButton = page.getByRole("button", { name: /Créer|Nouvelle|Ajouter/i });
		await expect(createButton).toBeVisible();
	});

	test("le formulaire de creation s'ouvre et contient les champs requis", async ({ page }) => {
		const createButton = page.getByRole("button", { name: /Créer|Nouvelle|Ajouter/i });
		await createButton.click();

		// Dialog should open with form fields
		const dialog = page.getByRole("dialog");
		await expect(dialog).toBeVisible({ timeout: TIMEOUTS.FEEDBACK });

		// Required fields
		await expect(dialog.getByLabel(/Message/i)).toBeVisible();

		// Optional fields
		const linkInput = dialog.getByLabel(/Lien$/i).or(dialog.getByLabel(/^Lien$/i));
		const linkVisible = await linkInput.isVisible();
		if (linkVisible) {
			await expect(linkInput).toBeVisible();
		}
	});

	test("les actions de ligne sont disponibles", async ({ page }) => {
		const table = page.locator("table");
		const emptyState = page.getByText(/Aucune annonce/i);
		await expect(table.or(emptyState)).toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });

		const tableVisible = await table.isVisible();
		test.skip(!tableVisible, "Pas d'annonces dans la table");

		const actionsButton = table
			.locator("tbody tr")
			.first()
			.getByRole("button", { name: /Actions/i });
		await actionsButton.click();

		const actionOptions = page.getByRole("menuitem");
		const optionCount = await actionOptions.count();
		expect(optionCount).toBeGreaterThan(0);
	});
});

test.describe("Admin - FAQ CRUD", { tag: ["@regression"] }, () => {
	test.beforeEach(async ({ adminPage }) => {
		await adminPage.gotoFaq();
	});

	test("affiche la page avec le titre", async ({ page }) => {
		const heading = page.getByRole("heading", { name: /Questions fréquentes/i });
		await expect(heading).toBeVisible();
	});

	test("affiche la liste des FAQ ou un etat vide", async ({ page }) => {
		const faqItem = page.locator("[class*='rounded-lg'][class*='border']").first();
		const emptyState = page.getByText(/Aucune question FAQ/i);
		await expect(faqItem.or(emptyState)).toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });
	});

	test("le bouton de creation est present", async ({ page }) => {
		const createButton = page.getByRole("button", { name: /Créer|Nouvelle|Ajouter/i });
		await expect(createButton).toBeVisible();
	});

	test("le formulaire de creation s'ouvre et contient les champs requis", async ({ page }) => {
		const createButton = page.getByRole("button", { name: /Créer|Nouvelle|Ajouter/i });
		await createButton.click();

		const dialog = page.getByRole("dialog");
		await expect(dialog).toBeVisible({ timeout: TIMEOUTS.FEEDBACK });

		// Question field should be present
		const questionField = dialog.getByLabel(/Question/i);
		await expect(questionField).toBeVisible();
	});

	test("les boutons d'edition et suppression sont presents", async ({ page }) => {
		const faqItems = page.locator("[class*='rounded-lg'][class*='border'][class*='bg-card']");
		const firstItem = faqItems.first();
		const itemVisible = await firstItem.isVisible().catch(() => false);
		test.skip(!itemVisible, "Pas de FAQ items");

		// Edit button
		const editButton = firstItem.getByRole("button", { name: /Modifier/i });
		await expect(editButton).toBeVisible();

		// Delete button
		const deleteButton = firstItem.getByRole("button", { name: /Supprimer/i });
		await expect(deleteButton).toBeVisible();
	});
});
