import { test, expect } from "../fixtures";
import { TIMEOUTS } from "../constants";

test.describe("Admin - Tableau de bord (authentifié)", { tag: ["@critical"] }, () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/admin");
		await page.waitForLoadState("domcontentloaded");
	});

	test("accède au tableau de bord admin sans redirection", async ({ page }) => {
		await expect(page).toHaveURL(/\/admin/);
		await expect(page).not.toHaveURL(/\/admin\/connexion/);
	});

	test("affiche le titre du tableau de bord", async ({ adminPage }) => {
		await expect(adminPage.heading).toBeVisible();
	});

	test("affiche la navigation admin dans la sidebar", async ({ page }) => {
		// Scopé à la sidebar : « Commandes »/« Produits » existent aussi ailleurs (KPI, tableaux).
		const sidebar = page.getByRole("navigation", {
			name: "Navigation principale du tableau de bord",
		});
		await expect(sidebar.getByRole("link", { name: /Commandes/i }).first()).toBeVisible();
		// Sur /admin, seul le groupe de la route courante (Pilotage) est déplié :
		// « Produits » vit dans le groupe Catalogue, replié — on l'ouvre d'abord.
		const produitsLink = sidebar.getByRole("link", { name: /Produits/i }).first();
		await expect(async () => {
			if (!(await produitsLink.isVisible())) {
				await page.locator("#nav-group-catalogue").click();
			}
			await expect(produitsLink).toBeVisible({ timeout: 1500 });
		}).toPass({ timeout: TIMEOUTS.DATA_LOAD });
	});

	test("affiche les KPIs du dashboard", async ({ page }) => {
		// Wait for async KPI cards to load
		const kpiSection = page.locator("[data-testid='dashboard-kpis'], .grid");
		await expect(kpiSection.first()).toBeVisible({ timeout: 10000 });
	});

	test("la navigation admin fonctionne vers les commandes", async ({ page }) => {
		const sidebar = page.getByRole("navigation", {
			name: "Navigation principale du tableau de bord",
		});
		await sidebar
			.getByRole("link", { name: /Commandes/i })
			.first()
			.click();
		await expect(page).toHaveURL(/\/admin\/ventes\/commandes/);
	});

	test("la navigation admin fonctionne vers les produits", async ({ page }) => {
		// `adminPage.productsLink` (`.first()` global) tombait sur un lien masqué — on
		// scope à la sidebar, et on déplie le groupe Catalogue (replié sur /admin).
		const sidebar = page.getByRole("navigation", {
			name: "Navigation principale du tableau de bord",
		});
		const produitsLink = sidebar.getByRole("link", { name: /Produits/i }).first();
		await expect(async () => {
			if (!(await produitsLink.isVisible())) {
				await page.locator("#nav-group-catalogue").click();
			}
			await expect(produitsLink).toBeVisible({ timeout: 1500 });
		}).toPass({ timeout: TIMEOUTS.DATA_LOAD });
		await produitsLink.click();
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

	test("affiche la barre de recherche", async ({ page }) => {
		// Le champ existe en double (toolbar desktop + barre mobile) : viser le visible.
		const searchInput = page.getByPlaceholder(/Rechercher/i).filter({ visible: true });
		await expect(searchInput.first()).toBeVisible();
	});

	test("affiche le tableau de données ou un état vide", async ({ page }) => {
		const table = page.getByRole("table");
		const emptyState = page.getByText(/Aucune commande/i);
		await expect(table.or(emptyState).filter({ visible: true }).first()).toBeVisible({
			timeout: 10000,
		});
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

	// Supprimé (migration lean) : plus d'onglets de statut sur la liste produits —
	// le filtre de statut vit désormais dans le sheet « Filtres ».

	test("affiche la barre de recherche produits", async ({ page }) => {
		const searchInput = page.getByPlaceholder(/Rechercher/i).filter({ visible: true });
		await expect(searchInput.first()).toBeVisible();
	});

	test("affiche le tableau de données ou un état vide", async ({ page }) => {
		const table = page.getByRole("table");
		const emptyState = page.getByText(/Aucun produit/i);
		await expect(table.or(emptyState).filter({ visible: true }).first()).toBeVisible({
			timeout: 10000,
		});
	});
});

test.describe("Admin - Dashboard widgets smoke test", { tag: ["@regression"] }, () => {
	test("les cartes KPI du monde lean sont visibles au chargement", async ({ page, adminPage }) => {
		await adminPage.goto();
		await expect(adminPage.heading).toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });

		// KPI lean (lot 6) : CA du mois, à expédier, stock faible, rétractations.
		await expect(page.getByText(/CA encaissé ce mois-ci/i).first()).toBeVisible({
			timeout: TIMEOUTS.DATA_LOAD,
		});
		await expect(page.getByText(/À expédier/i).first()).toBeVisible({
			timeout: TIMEOUTS.DATA_LOAD,
		});
		await expect(page.getByText(/Stock faible/i).first()).toBeVisible({
			timeout: TIMEOUTS.DATA_LOAD,
		});
		await expect(page.getByText(/Rétractations en cours/i).first()).toBeVisible({
			timeout: TIMEOUTS.DATA_LOAD,
		});

		// Suivi du seuil de franchise TVA (art. 293 B CGI).
		await expect(page.getByText(/Franchise de TVA/i).first()).toBeVisible({
			timeout: TIMEOUTS.DATA_LOAD,
		});
		// Commandes par statut.
		await expect(page.getByText(/Commandes par statut/i).first()).toBeVisible({
			timeout: TIMEOUTS.DATA_LOAD,
		});
	});
});

test.describe("Admin - Navigation cross-sections", { tag: ["@regression"] }, () => {
	test("naviguer entre toutes les sections admin", async ({ page }) => {
		const sections = [
			{ url: "/admin", title: /Tableau de bord/i },
			{ url: "/admin/ventes/commandes", title: /Commandes/i },
			{ url: "/admin/catalogue/produits", title: /Produits/i },
			{ url: "/admin/ventes/retractations", title: /Rétractations/i },
			{ url: "/admin/catalogue/collections", title: /Collections/i },
		];

		for (const section of sections) {
			await page.goto(section.url);
			await page.waitForLoadState("domcontentloaded");

			await expect(page).toHaveURL(new RegExp(section.url));
			await expect(page).not.toHaveURL(/\/admin\/connexion/);
		}
	});
});

// Sélecteurs de période/comparaison et export : retirés avec l'ancien dashboard
// (lot 2) — le dashboard lean (lot 6) est un instantané mois/année sans options.
