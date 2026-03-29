import { test, expect } from "../fixtures";
import { requireSeedData } from "../constants";

test.describe("Gestion du panier - Manipulation des articles", { tag: ["@critical"] }, () => {
	test.beforeEach(async ({ productCatalogPage, cartPage }) => {
		// Add a product to cart before each test
		await productCatalogPage.goto();

		const productCount = await productCatalogPage.productLinks.count();
		requireSeedData(test, productCount > 0, "No products found");

		await productCatalogPage.gotoFirstProduct();

		const addButtonCount = await productCatalogPage.addToCartButton.count();
		test.skip(addButtonCount === 0, "Product requires SKU selection");

		await productCatalogPage.addToCartButton.first().click();
		await expect(cartPage.dialog).toBeVisible({ timeout: 5000 });
	});

	test("le panier affiche les contrôles de quantité", async ({ cartPage }) => {
		const quantityInput = cartPage.dialog.getByRole("spinbutton");
		await expect(quantityInput).toBeVisible();

		const decrementButton = cartPage.dialog.getByLabel(/Diminuer la quantité|Quantité minimale/i);
		await expect(decrementButton).toBeVisible();

		const incrementButton = cartPage.dialog.getByLabel(/Augmenter la quantité|Quantité maximale/i);
		await expect(incrementButton).toBeVisible();
	});

	test("incrémenter la quantité met à jour la valeur affichée", async ({ cartPage }) => {
		const quantityInput = cartPage.dialog.getByRole("spinbutton");
		const initialValue = await quantityInput.inputValue();

		const incrementButton = cartPage.dialog.getByLabel(/Augmenter la quantité/i);

		// Skip if increment is disabled (max quantity = 1)
		if (await incrementButton.isDisabled()) {
			test.skip(true, "Product has max quantity of 1");
			return;
		}

		await incrementButton.click();

		// Wait for optimistic update
		await expect(async () => {
			const newValue = await quantityInput.inputValue();
			expect(parseInt(newValue)).toBe(parseInt(initialValue) + 1);
		}).toPass({ timeout: 5000 });
	});

	test("décrémenter la quantité est désactivé quand quantité = 1", async ({ cartPage }) => {
		const quantityInput = cartPage.dialog.getByRole("spinbutton");
		const value = await quantityInput.inputValue();

		if (parseInt(value) === 1) {
			const decrementButton = cartPage.dialog.getByLabel(/Diminuer la quantité|Quantité minimale/i);
			await expect(decrementButton).toBeDisabled();
		}
	});

	test("le bouton supprimer est visible pour chaque article", async ({ cartPage }) => {
		const removeButton = cartPage.dialog.getByLabel(/Supprimer .* du panier/i);
		await expect(removeButton.first()).toBeVisible();
	});

	test("cliquer sur supprimer affiche la boîte de dialogue de confirmation", async ({
		cartPage,
	}) => {
		const removeButton = cartPage.dialog.getByLabel(/Supprimer .* du panier/i);
		await removeButton.first().click();

		// Confirmation dialog should appear
		const dialogTitle = cartPage.dialog.page().getByRole("heading", {
			name: /Retirer ce produit/i,
		});
		await expect(dialogTitle).toBeVisible({ timeout: 5000 });

		// Cancel and Confirm buttons should be visible
		const cancelButton = cartPage.dialog.page().getByRole("button", { name: /Annuler/i });
		await expect(cancelButton).toBeVisible();

		const confirmButton = cartPage.dialog.page().getByRole("button", { name: /^Retirer$/i });
		await expect(confirmButton).toBeVisible();
	});

	test("annuler la suppression ferme la boîte de dialogue sans supprimer", async ({ cartPage }) => {
		const removeButton = cartPage.dialog.getByLabel(/Supprimer .* du panier/i);
		await removeButton.first().click();

		// Wait for confirmation dialog
		const dialogTitle = cartPage.dialog.page().getByRole("heading", {
			name: /Retirer ce produit/i,
		});
		await expect(dialogTitle).toBeVisible({ timeout: 5000 });

		// Click cancel
		const cancelButton = cartPage.dialog.page().getByRole("button", { name: /Annuler/i });
		await cancelButton.click();

		// Dialog should close, item should still be present
		await expect(dialogTitle).not.toBeVisible({ timeout: 3000 });
		await expect(cartPage.emptyMessage).not.toBeVisible();
	});

	test("confirmer la suppression retire l'article du panier", async ({ cartPage }) => {
		const removeButton = cartPage.dialog.getByLabel(/Supprimer .* du panier/i);
		await removeButton.first().click();

		// Wait for confirmation dialog
		const dialogTitle = cartPage.dialog.page().getByRole("heading", {
			name: /Retirer ce produit/i,
		});
		await expect(dialogTitle).toBeVisible({ timeout: 5000 });

		// Click confirm
		const confirmButton = cartPage.dialog.page().getByRole("button", { name: /^Retirer$/i });
		await confirmButton.click();

		// Cart should show empty state (we only added one item)
		await expect(cartPage.emptyMessage).toBeVisible({ timeout: 10000 });
	});

	test("le panier affiche un prix total", async ({ cartPage }) => {
		// Total/subtotal should be visible in the cart dialog
		const totalText = cartPage.dialog.getByText(/Total|Sous-total/i);
		await expect(totalText.first()).toBeVisible();

		// Should contain a price with € symbol
		const priceText = cartPage.dialog.getByText(/€/);
		await expect(priceText.first()).toBeVisible();
	});

	test("le panier affiche le nom du produit", async ({ cartPage }) => {
		// Product name should be visible as a link or text
		const productLink = cartPage.dialog
			.getByRole("link")
			.filter({ hasNot: cartPage.dialog.page().locator("[aria-label*='Fermer']") });
		const linkCount = await productLink.count();

		// At least one product link (besides close/checkout)
		expect(linkCount).toBeGreaterThan(0);
	});
});

test.describe("Panier - État vide", { tag: ["@regression"] }, () => {
	test("le panier vide affiche un message et des liens", async ({ page, cartPage }) => {
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");

		await cartPage.open();

		// Empty cart message
		await expect(cartPage.emptyMessage).toBeVisible();

		// Should have links to shop
		await expect(cartPage.shopLink).toBeVisible();
	});

	test("le lien 'Découvrir la boutique' fonctionne depuis le panier vide", async ({
		page,
		cartPage,
	}) => {
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");

		await cartPage.open();
		await expect(cartPage.emptyMessage).toBeVisible();

		await cartPage.shopLink.click();
		await page.waitForLoadState("domcontentloaded");

		// Should navigate to products page
		await expect(page).toHaveURL(/\/produits|\/collections/);
	});
});
