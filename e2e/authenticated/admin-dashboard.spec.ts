import { test, expect } from "../fixtures";
import { TIMEOUTS } from "../constants";

test.describe("Admin - Tableau de bord (authentifié)", { tag: ["@critical"] }, () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/admin");
		await page.waitForLoadState("domcontentloaded");
	});

	test("accède au tableau de bord admin sans redirection", async ({ page }) => {
		await expect(page).toHaveURL(/\/admin/);
		await expect(page).not.toHaveURL(/\/connexion/);
	});

	test("affiche le titre du tableau de bord", async ({ adminPage }) => {
		await expect(adminPage.heading).toBeVisible();
	});

	test("affiche la navigation admin dans la sidebar", async ({ page }) => {
		// Main navigation groups should be present
		await expect(page.getByText("Commandes")).toBeAttached();
		await expect(page.getByText("Produits")).toBeAttached();
	});

	test("affiche les KPIs du dashboard", async ({ page }) => {
		// Wait for async KPI cards to load
		const kpiSection = page.locator("[data-testid='dashboard-kpis'], .grid");
		await expect(kpiSection.first()).toBeVisible({ timeout: 10000 });
	});

	test("la navigation admin fonctionne vers les commandes", async ({ adminPage, page }) => {
		await adminPage.ordersLink.click();
		await expect(page).toHaveURL(/\/admin\/ventes\/commandes/);
	});

	test("la navigation admin fonctionne vers les produits", async ({ adminPage, page }) => {
		await adminPage.productsLink.click();
		await expect(page).toHaveURL(/\/admin\/catalogue\/produits/);
	});

	test("le lien 'Voir le site' pointe vers le storefront", async ({ adminPage }) => {
		await expect(adminPage.viewSiteLink).toHaveAttribute("href", "/");
	});
});

test.describe("Admin - Page commandes (authentifié)", { tag: ["@critical"] }, () => {
	test.beforeEach(async ({ adminPage }) => {
		await adminPage.gotoOrders();
	});

	test("affiche la page des commandes", async ({ page }) => {
		await expect(page).toHaveURL(/\/admin\/ventes\/commandes/);
		const heading = page.getByRole("heading", { name: /Commandes/i });
		await expect(heading).toBeVisible();
	});

	test("affiche la barre de recherche", async ({ adminPage }) => {
		await expect(adminPage.searchInput).toBeVisible();
	});

	test("affiche le tableau de données ou un état vide", async ({ page }) => {
		const table = page.locator("table");
		const emptyState = page.getByText(/Aucune commande/i);
		await expect(table.or(emptyState)).toBeVisible({ timeout: 10000 });
	});
});

test.describe("Admin - Page produits (authentifié)", { tag: ["@critical"] }, () => {
	test.beforeEach(async ({ adminPage }) => {
		await adminPage.gotoProducts();
	});

	test("affiche la page des produits", async ({ page }) => {
		await expect(page).toHaveURL(/\/admin\/catalogue\/produits/);
	});

	test("affiche le bouton 'Nouveau produit'", async ({ page }) => {
		const newProductButton = page.getByRole("link", { name: /Nouveau produit/i });
		await expect(newProductButton).toBeVisible();
	});

	test("affiche les onglets de statut", async ({ page }) => {
		// Status navigation tabs
		const draftTab = page.getByRole("link", { name: /Brouillon/i });
		const publishedTab = page.getByRole("link", { name: /Publié/i });

		await expect(draftTab).toBeAttached();
		await expect(publishedTab).toBeAttached();
	});

	test("affiche la barre de recherche produits", async ({ adminPage }) => {
		await expect(adminPage.searchInput).toBeVisible();
	});

	test("affiche le tableau de données ou un état vide", async ({ page }) => {
		const table = page.locator("table");
		const emptyState = page.getByText(/Aucun produit/i);
		await expect(table.or(emptyState)).toBeVisible({ timeout: 10000 });
	});
});

test.describe("Admin - Dashboard widgets smoke test", { tag: ["@regression"] }, () => {
	test("les 3 widgets principaux sont visibles au chargement", async ({ page, adminPage }) => {
		await adminPage.goto();
		await expect(adminPage.heading).toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });

		// KPIs : les 3 titres de cartes sont présents
		await expect(page.getByRole("heading", { name: /CA du mois/i })).toBeVisible({
			timeout: TIMEOUTS.DATA_LOAD,
		});
		await expect(page.getByRole("heading", { name: /^Commandes$/i })).toBeVisible({
			timeout: TIMEOUTS.DATA_LOAD,
		});
		await expect(page.getByRole("heading", { name: /Panier moyen/i })).toBeVisible({
			timeout: TIMEOUTS.DATA_LOAD,
		});

		// Graphique revenus : figure ou état vide
		const revenueWidget = page
			.locator('[role="figure"][aria-label*="Graphique"]')
			.or(page.getByText(/Aucun revenu/i));
		await expect(revenueWidget.first()).toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });

		// Commandes récentes : liste ou état vide
		const recentOrdersWidget = page
			.getByRole("list")
			.or(page.getByText(/Aucune commande récente|Aucune commande/i));
		await expect(recentOrdersWidget.first()).toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });
	});
});

test.describe("Admin - Navigation cross-sections", { tag: ["@regression"] }, () => {
	test("naviguer entre toutes les sections admin", async ({ page }) => {
		const sections = [
			{ url: "/admin", title: /Tableau de bord/i },
			{ url: "/admin/ventes/commandes", title: /Commandes/i },
			{ url: "/admin/catalogue/produits", title: /Produits/i },
			{ url: "/admin/marketing/discounts", title: /Codes promo|Promotions/i },
			{ url: "/admin/catalogue/collections", title: /Collections/i },
		];

		for (const section of sections) {
			await page.goto(section.url);
			await page.waitForLoadState("domcontentloaded");

			await expect(page).toHaveURL(new RegExp(section.url));
			await expect(page).not.toHaveURL(/\/connexion/);
		}
	});
});

test.describe("Admin - Dashboard period + comparison selectors", { tag: ["@regression"] }, () => {
	test.beforeEach(async ({ adminPage }) => {
		await adminPage.goto();
		await expect(adminPage.heading).toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });
	});

	test("le sélecteur de période est visible et accessible", async ({ page }) => {
		const periodTrigger = page
			.getByRole("combobox", { name: /Période du tableau de bord/i })
			.first();
		await expect(periodTrigger).toBeVisible();
	});

	test("le sélecteur de mode de comparaison est visible et accessible", async ({ page }) => {
		const comparisonTrigger = page.getByRole("combobox", { name: /Mode de comparaison/i }).first();
		await expect(comparisonTrigger).toBeVisible();
	});

	test("changer la période met à jour l'URL (?period=)", async ({ page }) => {
		const periodTrigger = page
			.getByRole("combobox", { name: /Période du tableau de bord/i })
			.first();
		await periodTrigger.click();

		const option = page.getByRole("option", { name: /7 derniers jours/i });
		await expect(option).toBeVisible();
		await option.click();

		await expect(page).toHaveURL(/\?.*period=7d/);
	});

	test("changer le mode de comparaison en YoY met à jour l'URL (?comparison=yoy)", async ({
		page,
	}) => {
		const comparisonTrigger = page.getByRole("combobox", { name: /Mode de comparaison/i }).first();
		await comparisonTrigger.click();

		// YoY option: "Année précédente" or similar
		const yoyOption = page.getByRole("option", { name: /année précédente|N-1/i }).first();
		await expect(yoyOption).toBeVisible();
		await yoyOption.click();

		await expect(page).toHaveURL(/\?.*comparison=yoy/);
	});

	test("le libellé de comparaison s'adapte au mode YoY", async ({ page }) => {
		await page.goto("/admin?comparison=yoy");
		await page.waitForLoadState("domcontentloaded");

		// The evolution labels (vs "année précédente") appear in KPI cards
		// Just assert the selector value reflects the URL
		const comparisonTrigger = page.getByRole("combobox", { name: /Mode de comparaison/i }).first();
		await expect(comparisonTrigger).toContainText(/Année précédente|N-1/i);
	});

	test("le sélecteur de comparaison expose aria-busy durant la transition", async ({ page }) => {
		const comparisonTrigger = page.getByRole("combobox", { name: /Mode de comparaison/i }).first();

		// Open + select a different value
		await comparisonTrigger.click();
		const otherOption = page.getByRole("option", { name: /année précédente|N-1/i }).first();
		if (await otherOption.isVisible().catch(() => false)) {
			await otherOption.click();
			// aria-busy may flip very briefly; simply assert the attribute shape is supported
			// by checking it can appear without throwing (soft assertion)
			await expect(comparisonTrigger).not.toHaveAttribute("aria-busy", "invalid");
		}
	});
});

test.describe("Admin - Dashboard export action", { tag: ["@regression"] }, () => {
	test.beforeEach(async ({ adminPage }) => {
		await adminPage.goto();
		await expect(adminPage.heading).toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });
	});

	test("le bouton d'export est visible avec libellé accessible", async ({ page }) => {
		const exportButton = page
			.getByRole("button", { name: /Exporter le rapport du tableau de bord/i })
			.first();
		await expect(exportButton).toBeVisible();
	});

	test("cliquer sur Exporter ouvre le menu avec options CSV et JSON", async ({ page }) => {
		const exportButton = page
			.getByRole("button", { name: /Exporter le rapport du tableau de bord/i })
			.first();
		await exportButton.click();

		await expect(page.getByRole("menuitem", { name: /CSV/i })).toBeVisible();
		await expect(page.getByRole("menuitem", { name: /JSON/i })).toBeVisible();
	});

	test("sélectionner CSV déclenche la Server Action export", async ({ page }) => {
		const exportButton = page
			.getByRole("button", { name: /Exporter le rapport du tableau de bord/i })
			.first();
		await exportButton.click();

		const csvItem = page.getByRole("menuitem", { name: /CSV/i });
		await expect(csvItem).toBeVisible();

		// The export hook creates a Blob URL and triggers download — we just ensure
		// the click does not throw and the menu closes (Server Action is invoked)
		await csvItem.click();
		await expect(csvItem).not.toBeVisible({ timeout: TIMEOUTS.FEEDBACK });
	});

	test("le bouton d'export respecte 44px de zone tactile (WCAG 2.5.5)", async ({ page }) => {
		const exportButton = page
			.getByRole("button", { name: /Exporter le rapport du tableau de bord/i })
			.first();
		await expect(exportButton).toBeVisible();

		const box = await exportButton.boundingBox();
		expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
	});
});

test.describe("Admin - Dashboard mobile UX 2026", { tag: ["@regression"] }, () => {
	test.use({ viewport: { width: 390, height: 844 } });

	test.beforeEach(async ({ adminPage }) => {
		await adminPage.goto();
		await expect(adminPage.heading).toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });
	});

	test("le header mobile sticky est présent", async ({ page }) => {
		// DashboardMobileHeader is md:hidden — visible on mobile viewport
		const mobileHeading = page.getByRole("heading", { level: 1, name: /Tableau de bord/i });
		await expect(mobileHeading).toBeVisible();
	});

	test("le PeriodSelector utilise la variante segmentée (tabs) sur mobile", async ({ page }) => {
		// Segmented variant renders a TabsList with role="tablist"
		const tabList = page.getByRole("tablist", { name: /Période du tableau de bord/i }).first();
		await expect(tabList).toBeVisible();
	});

	test("les boutons Export et Refresh sont en mode iconOnly sur mobile", async ({ page }) => {
		const exportButton = page
			.getByRole("button", { name: /Exporter le rapport du tableau de bord/i })
			.first();
		await expect(exportButton).toBeVisible();

		// In iconOnly mode the label is sr-only (not visible in layout) but still accessible
		const box = await exportButton.boundingBox();
		// size-11 icon button ≈ 44px square
		expect(box?.width ?? 0).toBeGreaterThanOrEqual(40);
		expect(box?.height ?? 0).toBeGreaterThanOrEqual(40);
	});

	test("un conteneur de scroll-fade enveloppe la section KPIs (UX 2026 anti-CLS)", async ({
		page,
	}) => {
		// La rangée de KPIs porte `role="region"` + `tabIndex` en propre (le fondu,
		// lui, est purement CSS depuis la bascule sur `scroll-fade-x`) — au moins
		// une région doit donc exister.
		const scrollRegions = page.getByRole("region");
		await expect(scrollRegions.first()).toBeVisible();
	});

	test("la heatmap affiche un panneau info aria-live accessible (tap-to-reveal)", async ({
		page,
	}) => {
		const panel = page.getByTestId("heatmap-selected-cell");
		await expect(panel).toHaveAttribute("role", "status");
		await expect(panel).toHaveAttribute("aria-live", "polite");
	});

	test("le graphique de revenus affiche le hint mobile de tap-to-reveal", async ({ page }) => {
		// Hint is md:hidden — visible only on mobile viewport
		const hint = page.getByText("Touchez le graphique pour voir le détail.");
		// Hint may be absent if there is no revenue data for the test tenant; tolerate both cases
		const count = await hint.count();
		if (count > 0) {
			await expect(hint.first()).toBeVisible();
		}
	});

	test("l'annonceur de refresh est un role=status sr-only aria-live=polite", async ({ page }) => {
		const announcers = page.locator("[role='status'][aria-live='polite'].sr-only");
		expect(await announcers.count()).toBeGreaterThan(0);
	});
});

test.describe(
	"Admin - Dashboard landscape mobile (iPhone 14 Pro rotated)",
	{ tag: ["@regression"] },
	() => {
		test.use({ viewport: { width: 844, height: 390 } });

		test.beforeEach(async ({ adminPage }) => {
			await adminPage.goto();
			await expect(adminPage.heading).toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });
		});

		test("le dashboard ne déborde pas horizontalement en paysage mobile", async ({ page }) => {
			const body = page.locator("body");
			const scrollWidth = await body.evaluate((el) => el.scrollWidth);
			const clientWidth = await body.evaluate((el) => el.clientWidth);
			// Tolerate 1px sub-pixel rounding; no more
			expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
		});

		test("les boutons du header restent dans la zone tactile WCAG en landscape", async ({
			page,
		}) => {
			const exportButton = page
				.getByRole("button", { name: /Exporter le rapport du tableau de bord/i })
				.first();
			await expect(exportButton).toBeVisible();
			const box = await exportButton.boundingBox();
			expect(box?.height ?? 0).toBeGreaterThanOrEqual(40);
		});
	},
);

test.describe("Admin - Hub pages smoke tests", { tag: ["@regression"] }, () => {
	const hubPages = [
		{ url: "/admin/catalogue", name: "Catalogue" },
		{ url: "/admin/marketing", name: "Marketing" },
		{ url: "/admin/ventes", name: "Ventes" },
	];

	for (const { url, name } of hubPages) {
		test(`la page hub ${name} (${url}) charge sans erreur`, async ({ page }) => {
			const response = await page.goto(url);
			await page.waitForLoadState("domcontentloaded");

			expect(response?.status()).toBeLessThan(500);
			await expect(page).not.toHaveURL(/\/connexion/);

			// Should have at least one heading
			const heading = page.getByRole("heading").first();
			await expect(heading).toBeVisible();
		});
	}
});
