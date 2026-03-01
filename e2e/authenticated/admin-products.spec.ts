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

	test("les onglets de statut sont visibles", async ({ page, adminPage }) => {
		await adminPage.gotoProducts();

		// Status tabs/filters should be present
		const statusFilters = page
			.getByRole("tab")
			.or(page.getByRole("button", { name: /Tous|Actif|Brouillon|Archivé/i }));
		const filterCount = await statusFilters.count();
		expect(filterCount).toBeGreaterThan(0);
	});

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
		await expect(table.or(emptyState)).toBeVisible({ timeout: 5000 });
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

		// Check for core product fields
		const nameField = page.getByLabel(/Nom/i);
		await expect(nameField.first()).toBeVisible();

		const descriptionField = page.getByLabel(/Description/i).or(page.locator("textarea"));
		await expect(descriptionField.first()).toBeVisible();
	});

	test("la navigation entre sections admin fonctionne", async ({ page, adminPage }) => {
		await adminPage.goto();

		// Navigate to products
		await adminPage.productsLink.click();
		await expect(page).toHaveURL(/\/admin\/catalogue\/produits/);

		// Navigate to orders
		await adminPage.ordersLink.click();
		await expect(page).toHaveURL(/\/admin\/ventes\/commandes/);

		// Back to dashboard
		await adminPage.goto();
		await expect(adminPage.heading).toBeVisible();
	});
});
