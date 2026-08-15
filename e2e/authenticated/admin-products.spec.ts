import { test, expect } from "../fixtures";

test.describe("Admin - Gestion des produits", { tag: ["@regression"] }, () => {
	test("la page catalogue est accessible", async ({ adminPage }) => {
		await adminPage.gotoProducts();

		const heading = adminPage.page.getByRole("heading", { name: /Produits/i });
		await expect(heading).toBeVisible();
	});

	test("le bouton nouveau produit est visible", async ({ page, adminPage }) => {
		await adminPage.gotoProducts();

		const newProductButton = page
			.getByRole("link", { name: /Nouveau|Ajouter/i })
			.or(page.getByRole("button", { name: /Nouveau|Ajouter/i }));
		await expect(newProductButton.first()).toBeVisible();
	});

	// Supprimé (migration lean) : plus d'onglets de statut sur la liste produits —
	// le filtre de statut (`active`) vit dans le sheet « Filtres ».

	test("la recherche de produits fonctionne", async ({ page, adminPage }) => {
		await adminPage.gotoProducts();

		const searchInput = page.getByPlaceholder(/Rechercher/i).or(page.getByRole("searchbox"));
		const searchCount = await searchInput.count();
		test.skip(searchCount === 0, "No search input on products page");

		await searchInput.first().fill("test");

		// Wait for filtered results
		await page.waitForLoadState("domcontentloaded");

		// Table or empty state should be visible
		const table = page.getByRole("table");
		const emptyState = page.getByText(/aucun produit/i);
		await expect(table.or(emptyState).first()).toBeVisible({ timeout: 5000 });
	});

	test("le tableau des produits affiche les colonnes attendues", async ({ page, adminPage }) => {
		await adminPage.gotoProducts();

		const table = page.getByRole("table");
		const tableVisible = await table.isVisible();
		test.skip(!tableVisible, "No products table visible - may be empty");

		// Check for expected column headers
		const headers = table.locator("thead th, thead [role='columnheader']");
		const headerCount = await headers.count();
		expect(headerCount).toBeGreaterThan(0);
	});

	test("naviguer vers la creation de produit", async ({ page, adminPage }) => {
		await adminPage.gotoProducts();

		const newProductButton = page.getByRole("link", { name: /Nouveau|Ajouter/i });
		const buttonCount = await newProductButton.count();
		test.skip(buttonCount === 0, "No new product button found");

		await newProductButton.first().click();
		await page.waitForLoadState("domcontentloaded");

		// Should be on a product creation page
		await expect(page).toHaveURL(/\/admin\/catalogue\/produits\/(nouveau|new|create)/i);

		const heading = page.getByRole("heading", { level: 1 });
		await expect(heading).toBeVisible();
	});

	test("le formulaire de creation produit contient les champs requis", async ({
		page,
		adminPage,
	}) => {
		await adminPage.gotoProducts();

		const newProductButton = page.getByRole("link", { name: /Nouveau|Ajouter/i });
		const buttonCount = await newProductButton.count();
		test.skip(buttonCount === 0, "No new product button found");

		await newProductButton.first().click();
		await page.waitForLoadState("domcontentloaded");

		// Check for core product fields (lean : « Titre du bijou »)
		const nameField = page.getByLabel(/Titre du bijou/i);
		await expect(nameField.first()).toBeVisible();

		const descriptionField = page.getByLabel(/Description/i).or(page.locator("textarea"));
		await expect(descriptionField.first()).toBeVisible();
	});

	test("la navigation entre sections admin fonctionne", async ({ page, adminPage }) => {
		await adminPage.goto();

		// Les liens `.first()` globaux du page-object tombent sur des doublons masqués :
		// on scope à la sidebar visible.
		const sidebar = page.getByRole("navigation", {
			name: "Navigation principale du tableau de bord",
		});

		// Navigate to products — le groupe Catalogue est replié sur /admin.
		const produitsLink = sidebar.getByRole("link", { name: /Produits/i }).first();
		await expect(async () => {
			if (!(await produitsLink.isVisible())) {
				await page.locator("#nav-group-catalogue").click();
			}
			await expect(produitsLink).toBeVisible({ timeout: 1500 });
		}).toPass({ timeout: 10000 });
		await produitsLink.click();
		await expect(page).toHaveURL(/\/admin\/catalogue\/produits/);

		// Navigate to orders
		await sidebar
			.getByRole("link", { name: /Commandes/i })
			.first()
			.click();
		await expect(page).toHaveURL(/\/admin\/ventes\/commandes/);

		// Back to dashboard
		await adminPage.goto();
		await expect(adminPage.heading).toBeVisible();
	});
});
