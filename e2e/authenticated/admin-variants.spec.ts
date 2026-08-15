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

	const table = page.getByRole("table").first();
	const emptyState = page.getByText(/aucun produit/i);
	await expect(table.or(emptyState).first()).toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });

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
		const table = page.getByRole("table").first();
		const emptyState = page.getByText(/Aucune variante/i).first();
		await expect(table.or(emptyState).first()).toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });
	});

	test("le bouton Nouvelle variante est present", async ({ page }) => {
		const newButton = page.getByRole("link", { name: /Nouvelle variante/i });
		await expect(newButton).toBeVisible();
	});

	test("la recherche de variantes fonctionne", async ({ page }) => {
		const table = page.getByRole("table").first();
		const emptyState = page.getByText(/Aucune variante/i).first();
		await expect(table.or(emptyState).first()).toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });

		const tableVisible = await table.isVisible();
		test.skip(!tableVisible, "Pas de variantes dans la table");

		const searchInput = page
			.getByPlaceholder(/Rechercher/i)
			.filter({ visible: true })
			.first();
		await searchInput.fill("zzz_inexistant_xyz");

		// La frappe peut précéder l'hydratation : on re-tente jusqu'à ce que l'URL
		// porte la recherche.
		await expect(async () => {
			if (!page.url().includes("search=")) {
				await searchInput.fill("zzz_inexistant_xyz");
			}
			expect(page.url()).toContain("search=");
		}).toPass({ timeout: TIMEOUTS.DATA_LOAD });

		const noResults = page
			.getByText(/Aucune variante|aucun résultat/i)
			.filter({ visible: true })
			.first();
		await expect(noResults).toBeVisible({ timeout: TIMEOUTS.FEEDBACK });
	});

	test("le tableau affiche les colonnes attendues", async ({ page }) => {
		const table = page.getByRole("table").first();
		const tableVisible = await table.isVisible();
		test.skip(!tableVisible, "Pas de table visible");

		const headers = table.locator("thead th, thead [role='columnheader']");
		const headerCount = await headers.count();
		expect(headerCount).toBeGreaterThanOrEqual(4);
	});

	test("les actions de ligne sont disponibles", async ({ page }) => {
		const table = page.getByRole("table").first();
		const emptyState = page.getByText(/Aucune variante/i).first();
		await expect(table.or(emptyState).first()).toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });

		const tableVisible = await table.isVisible();
		test.skip(!tableVisible, "Pas de variantes dans la table");

		const actionsButton = table
			.locator("tbody tr")
			.first()
			.getByRole("button", { name: /Actions/i });
		const actionOptions = page.getByRole("menuitem");
		// Le clic peut précéder l'hydratation : on re-tente jusqu'à l'ouverture du menu.
		await expect(async () => {
			await actionsButton.click();
			await expect(actionOptions.first()).toBeVisible({ timeout: 1500 });
		}).toPass({ timeout: 10000 });

		const optionCount = await actionOptions.count();
		expect(optionCount).toBeGreaterThan(0);
	});

	test("le stock affiche un badge avec code couleur", async ({ page }) => {
		const table = page.getByRole("table").first();
		const tableVisible = await table.isVisible();
		test.skip(!tableVisible, "Pas de table visible");

		// Stock column should display badges (le Badge maison se repère par son slot,
		// pas par un fragment de classe Tailwind)
		const stockBadges = table.locator("tbody tr").first().locator('[data-slot="badge"]');
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
		await expect(page.getByLabel(/Prix de vente final/i).first()).toBeVisible();
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

		// Pricing section — lean : `priceCents` est un OVERRIDE optionnel du prix
		// produit, et le « prix avant réduction » n'existe plus.
		const priceInput = page.getByLabel(/Prix de vente final/i);
		await expect(priceInput).toBeVisible();

		const inventoryInput = page.getByLabel(/Quantité en stock/i);
		await expect(inventoryInput).toBeVisible();

		// Submit button (plus de bouton Annuler : le retour passe par le header)
		const createButton = page.getByRole("button", { name: /Créer la variante/i });
		await expect(createButton).toBeVisible();
	});

	// Supprimé (migration lean) : le prix de la variante est un OVERRIDE optionnel
	// de `Product.priceCents` — il n'y a plus de validation « prix requis ».

	// Supprimé (migration lean) : plus de bouton « Annuler » sur le formulaire de
	// variante — le retour passe par le header.

	// Supprimé (migration lean) : la variante par défaut ne se coche plus dans le
	// formulaire — c'est l'item « Variante par défaut » des actions de ligne.
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

		const table = page.getByRole("table").first();
		const emptyState = page.getByText(/Aucune variante/i).first();
		await expect(table.or(emptyState).first()).toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });

		const tableVisible = await table.isVisible();
		test.skip(!tableVisible, "Pas de variantes dans la table");

		const actionsButton = table
			.locator("tbody tr")
			.first()
			.getByRole("button", { name: /Actions/i });
		// Le clic peut précéder l'hydratation : on re-tente jusqu'à l'ouverture du menu.
		await expect(async () => {
			await actionsButton.click();
			await expect(page.getByRole("menuitem").first()).toBeVisible({ timeout: 1500 });
		}).toPass({ timeout: 10000 });

		// Should expose edit and delete options (exact : « Modifier le prix » existe aussi)
		const editOption = page.getByRole("menuitem", { name: "Modifier", exact: true });
		await expect(editOption).toBeVisible({ timeout: TIMEOUTS.FEEDBACK });

		const deleteOption = page.getByRole("menuitem", { name: /Supprimer/i });
		await expect(deleteOption).toBeVisible();
	});

	test("la suppression ouvre une boite de confirmation", async ({ page }) => {
		await page.goto(`/admin/catalogue/produits/${productSlug}/variantes`);
		await page.waitForLoadState("domcontentloaded");

		const table = page.getByRole("table").first();
		const emptyState = page.getByText(/Aucune variante/i).first();
		await expect(table.or(emptyState).first()).toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });

		const tableVisible = await table.isVisible();
		test.skip(!tableVisible, "Pas de variantes dans la table");

		const actionsButton = table
			.locator("tbody tr")
			.first()
			.getByRole("button", { name: /Actions/i });
		// Le clic peut précéder l'hydratation : on re-tente jusqu'à l'ouverture du menu.
		await expect(async () => {
			await actionsButton.click();
			await expect(page.getByRole("menuitem").first()).toBeVisible({ timeout: 1500 });
		}).toPass({ timeout: 10000 });

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

		const sortOptions = page.getByRole("option").or(page.getByRole("menuitem"));
		// Le clic peut précéder l'hydratation : on re-tente jusqu'à l'ouverture.
		await expect(async () => {
			await sortButton.first().click();
			await expect(sortOptions.first()).toBeVisible({ timeout: 1500 });
		}).toPass({ timeout: 10000 });

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
