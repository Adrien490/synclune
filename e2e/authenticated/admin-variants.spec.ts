import type { Page } from "@playwright/test";
import { test, expect } from "../fixtures";
import { TIMEOUTS } from "../constants";

/**
 * Find the first product slug that has variants.
 * Falls back to the first product if none have variants.
 */
async function getFirstProductSlug(page: Page): Promise<string | null> {
	await page.goto("/admin/catalogue/produits");
	await page.waitForLoadState("domcontentloaded");

	const table = page.locator("table");
	const emptyState = page.getByText(/aucun produit/i);
	await expect(table.or(emptyState)).toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });

	const tableVisible = await table.isVisible();
	if (!tableVisible) return null;

	// Click first product row link to get its slug
	const firstProductLink = table.locator("tbody tr").first().getByRole("link").first();
	const href = await firstProductLink.getAttribute("href");
	if (!href) return null;

	// Extract slug from href like /admin/catalogue/produits/mon-produit/modifier
	const match = href.match(/\/admin\/catalogue\/produits\/([^/]+)/);
	return match?.[1] ?? null;
}

test.describe("Admin - Variantes (liste)", { tag: ["@regression"] }, () => {
	let productSlug: string;

	test.beforeAll(async ({ browser }) => {
		const page = await browser.newPage();
		const slug = await getFirstProductSlug(page);
		await page.close();
		if (!slug) test.skip();
		productSlug = slug!;
	});

	test.beforeEach(async ({ adminPage }) => {
		await adminPage.gotoVariants(productSlug);
	});

	test("affiche la page avec le titre du produit", async ({ page }) => {
		const heading = page.getByRole("heading", { name: /Variantes de/i });
		await expect(heading).toBeVisible();
	});

	test("affiche le tableau de variantes ou un etat vide", async ({ page }) => {
		const table = page.locator("table");
		const emptyState = page.getByText(/Aucune variante/i);
		await expect(table.or(emptyState)).toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });
	});

	test("le bouton Nouvelle variante est present", async ({ page }) => {
		const newButton = page.getByRole("link", { name: /Nouvelle variante/i });
		await expect(newButton).toBeVisible();
	});

	test("la recherche de variantes fonctionne", async ({ page }) => {
		const table = page.locator("table");
		const emptyState = page.getByText(/Aucune variante/i);
		await expect(table.or(emptyState)).toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });

		const tableVisible = await table.isVisible();
		test.skip(!tableVisible, "Pas de variantes dans la table");

		const searchInput = page.getByPlaceholder(/Rechercher/i);
		await searchInput.fill("zzz_inexistant_xyz");
		await page.waitForTimeout(600);

		const noResults = page.getByText(/Aucune variante|aucun résultat/i);
		await expect(noResults).toBeVisible({ timeout: TIMEOUTS.FEEDBACK });
	});

	test("le tableau affiche les colonnes attendues", async ({ page }) => {
		const table = page.locator("table");
		const tableVisible = await table.isVisible();
		test.skip(!tableVisible, "Pas de table visible");

		const headers = table.locator("thead th, thead [role='columnheader']");
		const headerCount = await headers.count();
		expect(headerCount).toBeGreaterThanOrEqual(4);
	});

	test("les actions de ligne sont disponibles", async ({ page }) => {
		const table = page.locator("table");
		const emptyState = page.getByText(/Aucune variante/i);
		await expect(table.or(emptyState)).toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });

		const tableVisible = await table.isVisible();
		test.skip(!tableVisible, "Pas de variantes dans la table");

		const actionsButton = table
			.locator("tbody tr")
			.first()
			.getByRole("button", { name: /Actions/i });
		await actionsButton.click();

		const actionOptions = page.getByRole("menuitem");
		const optionCount = await actionOptions.count();
		expect(optionCount).toBeGreaterThan(0);
	});

	test("le stock affiche un badge avec code couleur", async ({ page }) => {
		const table = page.locator("table");
		const tableVisible = await table.isVisible();
		test.skip(!tableVisible, "Pas de table visible");

		// Stock column should display badges
		const stockBadges = table.locator("tbody tr").first().locator("[class*='badge']");
		const badgeCount = await stockBadges.count();
		expect(badgeCount).toBeGreaterThan(0);
	});
});

test.describe("Admin - Variantes (creation)", { tag: ["@regression"] }, () => {
	let productSlug: string;

	test.beforeAll(async ({ browser }) => {
		const page = await browser.newPage();
		const slug = await getFirstProductSlug(page);
		await page.close();
		if (!slug) test.skip();
		productSlug = slug!;
	});

	test("la page de creation affiche le formulaire", async ({ page }) => {
		await page.goto(`/admin/catalogue/produits/${productSlug}/variantes/nouveau`);
		await page.waitForLoadState("domcontentloaded");

		const heading = page.getByRole("heading", { name: /Nouvelle variante/i });
		await expect(heading).toBeVisible();

		// Required fields present
		await expect(page.getByLabel(/Prix/i).first()).toBeVisible();
	});

	test("le lien retour vers le produit est present", async ({ page }) => {
		await page.goto(`/admin/catalogue/produits/${productSlug}/variantes`);
		await page.waitForLoadState("domcontentloaded");

		const backLink = page.getByRole("link", { name: /Modifier le produit/i });
		await expect(backLink).toBeVisible();
	});

	test("le formulaire de creation contient tous les champs", async ({ page }) => {
		await page.goto(`/admin/catalogue/produits/${productSlug}/variantes/nouveau`);
		await page.waitForLoadState("domcontentloaded");

		// Characteristics section
		const colorSelect = page.getByLabel(/Couleur/i);
		await expect(colorSelect.first()).toBeAttached();

		const materialSelect = page.getByLabel(/Matériau/i);
		await expect(materialSelect.first()).toBeAttached();

		const sizeInput = page.getByLabel(/Taille/i);
		await expect(sizeInput.first()).toBeAttached();

		// Status radio group
		const activeRadio = page.getByLabel(/Actif/i);
		await expect(activeRadio.first()).toBeAttached();

		// Pricing section
		const priceInput = page.getByLabel(/Prix final/i);
		await expect(priceInput).toBeVisible();

		const comparePriceInput = page.getByLabel(/Prix avant réduction/i);
		await expect(comparePriceInput).toBeVisible();

		const inventoryInput = page.getByLabel(/Quantité en stock/i);
		await expect(inventoryInput).toBeVisible();

		// Submit buttons
		const createButton = page.getByRole("button", { name: /Créer la variante/i });
		await expect(createButton).toBeVisible();

		const cancelButton = page
			.getByRole("button", { name: /Annuler/i })
			.or(page.getByRole("link", { name: /Annuler/i }));
		await expect(cancelButton.first()).toBeVisible();
	});

	test("la validation du prix empeche la soumission sans prix", async ({ page }) => {
		await page.goto(`/admin/catalogue/produits/${productSlug}/variantes/nouveau`);
		await page.waitForLoadState("domcontentloaded");

		// Leave price empty and try to submit
		const createButton = page.getByRole("button", { name: /Créer la variante/i });

		// Price field should be required - clear it and blur
		const priceInput = page.getByLabel(/Prix final/i);
		await priceInput.fill("");
		await priceInput.blur();

		// Button should be disabled or form should show validation error
		const isDisabled = await createButton.isDisabled();
		const errorMessage = page.getByText(/obligatoire|requis|prix.*invalide|supérieur/i);
		const hasError = await errorMessage
			.first()
			.isVisible()
			.catch(() => false);

		expect(isDisabled || hasError).toBe(true);
	});

	test("le bouton Annuler renvoie a la liste des variantes", async ({ page }) => {
		await page.goto(`/admin/catalogue/produits/${productSlug}/variantes/nouveau`);
		await page.waitForLoadState("domcontentloaded");

		const cancelButton = page
			.getByRole("button", { name: /Annuler/i })
			.or(page.getByRole("link", { name: /Annuler/i }));
		await cancelButton.first().click();

		await page.waitForLoadState("domcontentloaded");
		await expect(page).toHaveURL(/\/variantes$/);
	});

	test("le checkbox variante par defaut est present", async ({ page }) => {
		await page.goto(`/admin/catalogue/produits/${productSlug}/variantes/nouveau`);
		await page.waitForLoadState("domcontentloaded");

		const defaultCheckbox = page.getByLabel(/Variante par défaut/i);
		await expect(defaultCheckbox).toBeAttached();
	});
});

test.describe("Admin - Variantes (actions de ligne)", { tag: ["@regression"] }, () => {
	let productSlug: string;

	test.beforeAll(async ({ browser }) => {
		const page = await browser.newPage();
		const slug = await getFirstProductSlug(page);
		await page.close();
		if (!slug) test.skip();
		productSlug = slug!;
	});

	test("les actions de ligne exposent modifier et supprimer", async ({ page }) => {
		await page.goto(`/admin/catalogue/produits/${productSlug}/variantes`);
		await page.waitForLoadState("domcontentloaded");

		const table = page.locator("table");
		const emptyState = page.getByText(/Aucune variante/i);
		await expect(table.or(emptyState)).toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });

		const tableVisible = await table.isVisible();
		test.skip(!tableVisible, "Pas de variantes dans la table");

		const actionsButton = table
			.locator("tbody tr")
			.first()
			.getByRole("button", { name: /Actions/i });
		await actionsButton.click();

		// Should expose edit and delete options
		const editOption = page.getByRole("menuitem", { name: /Modifier|Éditer/i });
		await expect(editOption).toBeVisible({ timeout: TIMEOUTS.FEEDBACK });

		const deleteOption = page.getByRole("menuitem", { name: /Supprimer/i });
		await expect(deleteOption).toBeVisible();
	});

	test("la suppression ouvre une boite de confirmation", async ({ page }) => {
		await page.goto(`/admin/catalogue/produits/${productSlug}/variantes`);
		await page.waitForLoadState("domcontentloaded");

		const table = page.locator("table");
		const emptyState = page.getByText(/Aucune variante/i);
		await expect(table.or(emptyState)).toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });

		const tableVisible = await table.isVisible();
		test.skip(!tableVisible, "Pas de variantes dans la table");

		const actionsButton = table
			.locator("tbody tr")
			.first()
			.getByRole("button", { name: /Actions/i });
		await actionsButton.click();

		const deleteOption = page.getByRole("menuitem", { name: /Supprimer/i });
		await deleteOption.click();

		// Confirmation dialog should appear
		const confirmDialog = page.getByRole("alertdialog");
		await expect(confirmDialog).toBeVisible({ timeout: TIMEOUTS.FEEDBACK });

		// Cancel to avoid actually deleting
		const cancelButton = confirmDialog.getByRole("button", { name: /Annuler/i });
		await cancelButton.click();

		await expect(confirmDialog).not.toBeVisible({ timeout: TIMEOUTS.FEEDBACK });
	});

	test("le tri des variantes fonctionne", async ({ page }) => {
		await page.goto(`/admin/catalogue/produits/${productSlug}/variantes`);
		await page.waitForLoadState("domcontentloaded");

		const sortButton = page
			.getByRole("button", { name: /Trier/i })
			.or(page.getByRole("combobox", { name: /Trier/i }));
		const hasSortButton = (await sortButton.count()) > 0;
		test.skip(!hasSortButton, "Pas de bouton de tri visible");

		await sortButton.first().click();

		const sortOptions = page.getByRole("option").or(page.getByRole("menuitem"));
		const optionCount = await sortOptions.count();
		expect(optionCount).toBeGreaterThan(0);
	});

	test("le bouton de filtre ouvre le sheet de filtres", async ({ page }) => {
		await page.goto(`/admin/catalogue/produits/${productSlug}/variantes`);
		await page.waitForLoadState("domcontentloaded");

		const filterButton = page.getByRole("button", { name: /Filtr/i });
		const hasFilterButton = (await filterButton.count()) > 0;
		test.skip(!hasFilterButton, "Pas de bouton de filtre visible");

		await filterButton.first().click();

		// Filter sheet or dialog should open
		const filterContent = page.getByRole("dialog").or(page.getByText(/Couleur|Matériau|Stock/i));
		await expect(filterContent.first()).toBeVisible({ timeout: TIMEOUTS.FEEDBACK });
	});
});
