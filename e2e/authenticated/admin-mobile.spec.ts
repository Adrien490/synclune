import { test, expect } from "../fixtures";
import { TIMEOUTS } from "../constants";

const TABLET_VIEWPORT = { width: 1024, height: 768 };
const MOBILE_VIEWPORT = { width: 390, height: 844 };

/**
 * Le déclencheur du menu admin mobile est le 4ᵉ onglet de la BOTTOM BAR, libellé
 * `aria-label="Menu de navigation"` — il n'y a pas de hamburger dans le header.
 * Ces tests visaient `/Ouvrir le menu/i`, un nom accessible qui n'existe nulle
 * part dans `/admin` : ils ne pouvaient pas passer, et le shell mobile n'avait donc
 * aucune couverture E2E réelle.
 */
const MENU_TRIGGER = /Menu de navigation/i;

test.describe("Admin - Mobile (viewport 390x844)", { tag: ["@regression"] }, () => {
	test.use({ viewport: MOBILE_VIEWPORT });

	test("la bottom bar expose les onglets d'accès rapide + le menu", async ({ page }) => {
		await page.goto("/admin");
		await page.waitForLoadState("domcontentloaded");

		const bottomBar = page.getByRole("navigation", {
			name: "Navigation principale administration",
		});
		await expect(bottomBar).toBeVisible();

		const menuTrigger = page.getByRole("button", { name: MENU_TRIGGER });
		await expect(menuTrigger).toBeVisible();
		await expect(menuTrigger).toHaveAttribute("aria-haspopup", "dialog");
		// `aria-controls` doit désigner la SheetContent (WCAG 4.1.2).
		await expect(menuTrigger).toHaveAttribute("aria-controls", "admin-menu-sheet-content");
	});

	test("l'onglet actif porte aria-current=page", async ({ page }) => {
		await page.goto("/admin/catalogue/produits");
		await page.waitForLoadState("domcontentloaded");

		const activeTab = page.locator('[aria-current="page"]');
		await expect(activeTab.first()).toBeVisible();
	});

	test("le déclencheur ouvre le menu en sheet", async ({ page }) => {
		await page.goto("/admin");
		await page.waitForLoadState("domcontentloaded");

		await page.getByRole("button", { name: MENU_TRIGGER }).click();

		const sheet = page.locator("#admin-menu-sheet-content");
		await expect(sheet).toBeVisible({ timeout: TIMEOUTS.FEEDBACK });
		await expect(page.getByRole("button", { name: MENU_TRIGGER })).toHaveAttribute(
			"aria-expanded",
			"true",
		);

		// Navigation links should be visible inside the menu
		await expect(sheet.getByRole("link", { name: /Produits/i }).first()).toBeVisible();
		await expect(sheet.getByRole("link", { name: /Commandes/i }).first()).toBeVisible();
	});

	test("la navigation mobile fonctionne depuis le menu sheet", async ({ page }) => {
		await page.goto("/admin");
		await page.waitForLoadState("domcontentloaded");

		await page.getByRole("button", { name: MENU_TRIGGER }).click();

		const sheet = page.locator("#admin-menu-sheet-content");
		await expect(sheet).toBeVisible({ timeout: TIMEOUTS.FEEDBACK });

		await sheet
			.getByRole("link", { name: /Produits/i })
			.first()
			.click();
		await page.waitForLoadState("domcontentloaded");

		await expect(page).toHaveURL(/\/admin\/catalogue\/produits/);
		// Le sheet se ferme à la navigation (effect sur `pathname`).
		await expect(sheet).toBeHidden({ timeout: TIMEOUTS.FEEDBACK });
	});

	test("le header mobile affiche un retour sur une route de détail, pas sur une liste", async ({
		page,
	}) => {
		await page.goto("/admin/catalogue/produits");
		await page.waitForLoadState("domcontentloaded");

		const header = page.locator("header[aria-label='En-tête mobile administration']");
		await expect(header).toBeVisible();
		// Route de liste : pas de retour.
		await expect(header.getByRole("button", { name: /^Retour$/ })).toHaveCount(0);
	});

	test("une seule affordance de retour sur une fiche de détail (règle projet)", async ({
		page,
	}) => {
		await page.goto("/admin/catalogue/produits");
		await page.waitForLoadState("domcontentloaded");

		const firstProduct = page.locator('a[href^="/admin/catalogue/produits/"]').first();
		if ((await firstProduct.count()) === 0) test.skip(true, "Aucun produit seedé");
		await firstProduct.click();
		await page.waitForLoadState("domcontentloaded");

		// Le chevron du header est la SEULE affordance de retour : aucun lien
		// « ← Produits » dans le corps de page ne doit s'y ajouter.
		await expect(page.getByRole("button", { name: /^Retour$/ })).toHaveCount(1);
		await expect(page.getByRole("link", { name: /^Produits$/ })).toHaveCount(0);
	});

	test("la fiche de détail n'a qu'un seul h1", async ({ page }) => {
		await page.goto("/admin/catalogue/produits");
		await page.waitForLoadState("domcontentloaded");

		const firstProduct = page.locator('a[href^="/admin/catalogue/produits/"]').first();
		if ((await firstProduct.count()) === 0) test.skip(true, "Aucun produit seedé");
		await firstProduct.click();
		await page.waitForLoadState("domcontentloaded");

		// Le titre du header mobile est du chrome (`<p>`), pas un second `<h1>`.
		await expect(page.locator("h1")).toHaveCount(1);
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

	test("Échap ferme le menu mobile", async ({ page }) => {
		await page.goto("/admin");
		await page.waitForLoadState("domcontentloaded");

		await page.getByRole("button", { name: MENU_TRIGGER }).click();

		const sheet = page.locator("#admin-menu-sheet-content");
		await expect(sheet).toBeVisible({ timeout: TIMEOUTS.FEEDBACK });

		// Le libellé du déclencheur est STABLE (l'état est porté par aria-expanded),
		// donc on ne peut pas le retrouver par un nom « Fermer ».
		await page.keyboard.press("Escape");

		await expect(sheet).toBeHidden({ timeout: TIMEOUTS.FEEDBACK });
		await expect(page.getByRole("button", { name: MENU_TRIGGER })).toHaveAttribute(
			"aria-expanded",
			"false",
		);
	});

	test("la recherche du menu filtre les pages de navigation", async ({ page }) => {
		await page.goto("/admin");
		await page.waitForLoadState("domcontentloaded");

		await page.getByRole("button", { name: MENU_TRIGGER }).click();
		const sheet = page.locator("#admin-menu-sheet-content");
		await expect(sheet).toBeVisible({ timeout: TIMEOUTS.FEEDBACK });

		// Accent-insensible : « materiaux » doit trouver « Matériaux ».
		await sheet.locator('input[type="search"]').fill("materiaux");

		await expect(sheet.getByRole("link", { name: /Matériaux/i })).toBeVisible();
		await expect(sheet.getByRole("link", { name: /^Commandes$/i })).toHaveCount(0);
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

		// Nom accessible réel de la sidebar desktop (le `.or([data-sidebar])`
		// précédent masquait le fait que le nom ciblé n'existait pas).
		const sidebarNav = page.getByRole("navigation", {
			name: "Navigation principale du tableau de bord",
		});
		await expect(sidebarNav).toBeVisible();

		// Corollaire : la bottom bar mobile ne doit PAS coexister au-delà de md.
		await expect(
			page.getByRole("navigation", { name: "Navigation principale administration" }),
		).toBeHidden();
	});

	test("⌘B réduit la sidebar en rail d'icônes (et non en la faisant disparaître)", async ({
		page,
	}) => {
		await page.goto("/admin");
		await page.waitForLoadState("domcontentloaded");

		const sidebar = page.locator('nav[data-slot="sidebar"]');
		await expect(sidebar).toHaveAttribute("data-state", "expanded");

		await page.getByRole("button", { name: /Masquer le menu/i }).click();

		await expect(sidebar).toHaveAttribute("data-state", "collapsed");
		// `icon` et non `offcanvas` : les icônes restent visibles et cliquables.
		await expect(sidebar).toHaveAttribute("data-collapsible", "icon");
		await expect(page.getByRole("link", { name: /Commandes/i }).first()).toBeVisible();
	});

	test("l'état replié de la sidebar survit à un rechargement", async ({ page }) => {
		await page.goto("/admin");
		await page.waitForLoadState("domcontentloaded");

		await page.getByRole("button", { name: /Masquer le menu/i }).click();
		const sidebar = page.locator('nav[data-slot="sidebar"]');
		await expect(sidebar).toHaveAttribute("data-state", "collapsed");

		// Le cookie `sidebar_state` est désormais RELU côté serveur.
		await page.reload();
		await page.waitForLoadState("domcontentloaded");
		await expect(page.locator('nav[data-slot="sidebar"]')).toHaveAttribute(
			"data-state",
			"collapsed",
		);
	});

	test("le KPI « À expédier » mène à la liste filtrée", async ({ page }) => {
		await page.goto("/admin");
		await page.waitForLoadState("domcontentloaded");

		const kpi = page.getByRole("link", { name: /À expédier/i });
		if ((await kpi.count()) === 0) test.skip(true, "Aucune commande à expédier seedée");

		await kpi.first().click();
		await page.waitForLoadState("domcontentloaded");

		// `fulfillmentStatus` a été absorbé par `status` (audit V2, Lot 4) :
		// `appendToShipParams()` n'émet plus que ces deux dimensions.
		await expect(page).toHaveURL(/filter_paymentStatus=PAID/);
		await expect(page).toHaveURL(/filter_status=PENDING/);
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
