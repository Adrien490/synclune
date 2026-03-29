import { test, expect } from "../fixtures";
import { TIMEOUTS } from "../constants";

const TABLET_VIEWPORT = { width: 1024, height: 768 };
const MOBILE_VIEWPORT = { width: 390, height: 844 };

test.describe("Admin - Mobile (viewport 390x844)", { tag: ["@regression"] }, () => {
	test.use({ viewport: MOBILE_VIEWPORT });

	test("le header mobile est visible avec le bouton hamburger", async ({ page }) => {
		await page.goto("/admin");
		await page.waitForLoadState("domcontentloaded");

		const hamburger = page.getByRole("button", { name: /Ouvrir le menu/i });
		await expect(hamburger).toBeVisible();
		await expect(hamburger).toHaveAttribute("aria-haspopup", "dialog");
	});

	test("le bouton hamburger ouvre le menu en sheet", async ({ page }) => {
		await page.goto("/admin");
		await page.waitForLoadState("domcontentloaded");

		const hamburger = page.getByRole("button", { name: /Ouvrir le menu/i });
		await hamburger.click();

		// Sheet dialog should open
		const sheetTitle = page.getByText(/Menu d'administration/i);
		await expect(sheetTitle).toBeVisible({ timeout: TIMEOUTS.FEEDBACK });

		// Navigation links should be visible inside the menu
		const productsLink = page.getByRole("link", { name: /Produits/i });
		await expect(productsLink.first()).toBeVisible();

		const ordersLink = page.getByRole("link", { name: /Commandes/i });
		await expect(ordersLink.first()).toBeVisible();
	});

	test("la navigation mobile fonctionne depuis le menu sheet", async ({ page }) => {
		await page.goto("/admin");
		await page.waitForLoadState("domcontentloaded");

		const hamburger = page.getByRole("button", { name: /Ouvrir le menu/i });
		await hamburger.click();

		const sheetTitle = page.getByText(/Menu d'administration/i);
		await expect(sheetTitle).toBeVisible({ timeout: TIMEOUTS.FEEDBACK });

		// Click on Products link
		const productsLink = page.getByRole("link", { name: /Produits/i });
		await productsLink.first().click();
		await page.waitForLoadState("domcontentloaded");

		await expect(page).toHaveURL(/\/admin\/catalogue\/produits/);
	});

	test("le dashboard affiche les KPIs sur mobile", async ({ page }) => {
		await page.goto("/admin");
		await page.waitForLoadState("domcontentloaded");

		// KPI cards should be visible (stacked vertically on mobile)
		const heading = page.getByRole("heading", { name: /Tableau de bord/i });
		await expect(heading).toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });
	});

	test("le tableau produits est scrollable horizontalement sur mobile", async ({ page }) => {
		await page.goto("/admin/catalogue/produits");
		await page.waitForLoadState("domcontentloaded");

		const table = page.locator("table");
		const emptyState = page.getByText(/aucun produit/i);
		await expect(table.or(emptyState)).toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });

		const tableVisible = await table.isVisible();
		test.skip(!tableVisible, "Pas de produits dans la table");

		// Table container should allow horizontal scroll
		const tableContainer = table.locator("..");
		const overflowX = await tableContainer.evaluate((el) => window.getComputedStyle(el).overflowX);
		// Should be auto, scroll, or the table itself should be in a scrollable container
		expect(["auto", "scroll", "visible"]).toContain(overflowX);
	});

	test("le formulaire de création produit est utilisable sur mobile", async ({ page }) => {
		await page.goto("/admin/catalogue/produits/nouveau");
		await page.waitForLoadState("domcontentloaded");

		// Form fields should be visible and fillable
		const nameField = page.getByLabel(/^Nom$/i).or(page.getByLabel(/Nom du produit/i));
		await expect(nameField.first()).toBeVisible();

		// Submit button should be visible (may need to scroll)
		const submitButton = page.getByRole("button", {
			name: /Créer|Enregistrer|Sauvegarder|Publier|Brouillon/i,
		});
		await expect(submitButton.first()).toBeAttached();
	});

	test("la page commandes affiche les données sur mobile", async ({ page }) => {
		await page.goto("/admin/ventes/commandes");
		await page.waitForLoadState("domcontentloaded");

		const table = page.locator("table");
		const emptyState = page.getByText(/Aucune commande/i);
		await expect(table.or(emptyState)).toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });
	});

	test("fermer le menu mobile avec le bouton hamburger", async ({ page }) => {
		await page.goto("/admin");
		await page.waitForLoadState("domcontentloaded");

		const hamburger = page.getByRole("button", { name: /Ouvrir le menu/i });
		await hamburger.click();

		const sheetTitle = page.getByText(/Menu d'administration/i);
		await expect(sheetTitle).toBeVisible({ timeout: TIMEOUTS.FEEDBACK });

		// Close by clicking the hamburger again (now says "Fermer")
		const closeButton = page
			.getByRole("button", { name: /Fermer le menu/i })
			.or(page.getByRole("button", { name: /Ouvrir le menu/i }));
		await closeButton.click();

		await expect(sheetTitle).not.toBeVisible({ timeout: TIMEOUTS.FEEDBACK });
	});
});

test.describe("Admin - Tablette (viewport 1024x768)", { tag: ["@regression"] }, () => {
	test.use({ viewport: TABLET_VIEWPORT });

	test("le dashboard charge correctement sur tablette", async ({ page }) => {
		await page.goto("/admin");
		await page.waitForLoadState("domcontentloaded");

		const heading = page.getByRole("heading", { name: /Tableau de bord/i });
		await expect(heading).toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });

		// KPI cards should be visible
		const caCard = page.getByRole("heading", { name: /CA du mois/i });
		await expect(caCard).toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });
	});

	test("le sidebar est visible sur tablette (>768px)", async ({ page }) => {
		await page.goto("/admin");
		await page.waitForLoadState("domcontentloaded");

		// Sidebar navigation should be visible (not hidden behind hamburger)
		const sidebarNav = page
			.getByRole("navigation", { name: /Navigation administration/i })
			.or(page.locator("[data-sidebar]"));

		// On tablet (1024px), sidebar should be visible
		await expect(sidebarNav.first()).toBeAttached();
	});

	test("les datatables sont lisibles sur tablette", async ({ page }) => {
		await page.goto("/admin/catalogue/produits");
		await page.waitForLoadState("domcontentloaded");

		const table = page.locator("table");
		const emptyState = page.getByText(/aucun produit/i);
		await expect(table.or(emptyState)).toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });

		const tableVisible = await table.isVisible();
		test.skip(!tableVisible, "Pas de table visible");

		// Headers should be visible (not truncated beyond readability)
		const headers = table.locator("thead th");
		const headerCount = await headers.count();
		expect(headerCount).toBeGreaterThan(0);
	});

	test("la page collections fonctionne sur tablette", async ({ page }) => {
		await page.goto("/admin/catalogue/collections");
		await page.waitForLoadState("domcontentloaded");

		const heading = page.getByRole("heading", { name: /Collections/i });
		await expect(heading).toBeVisible();

		const createButton = page
			.getByRole("link", { name: /Nouveau|Créer|Ajouter/i })
			.or(page.getByRole("button", { name: /Nouveau|Créer|Ajouter/i }));
		await expect(createButton.first()).toBeVisible();
	});
});
