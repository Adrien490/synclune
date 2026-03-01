import { test, expect } from "../fixtures";

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
