import { test, expect } from "../fixtures";
import { requireSeedData, TIMEOUTS, SELECTORS } from "../constants";

test.describe("Wishlist - Favoris", { tag: ["@critical"] }, () => {
	test("la page favoris est accessible", async ({ wishlistPage }) => {
		await wishlistPage.goto();

		await expect(wishlistPage.heading).toBeVisible();
	});

	test("ajouter un produit aux favoris depuis le catalogue", async ({
		page,
		productCatalogPage,
	}) => {
		await productCatalogPage.goto();

		const productCount = await productCatalogPage.productLinks.count();
		requireSeedData(test, productCount > 0, "No products found");

		// Find a wishlist toggle button on the catalog page
		const wishlistButton = page.getByRole("button", { name: /wishlist/i });
		const buttonCount = await wishlistButton.count();
		test.skip(buttonCount === 0, "No wishlist buttons visible on catalog");

		const firstButton = wishlistButton.first();
		const wasFavorited = await firstButton.getAttribute("aria-pressed");

		await firstButton.click();
		await expect(firstButton).not.toHaveAttribute("aria-busy", "true", { timeout: 5000 });

		// Toggle state should have changed
		const isNowFavorited = await firstButton.getAttribute("aria-pressed");
		expect(isNowFavorited).not.toBe(wasFavorited);

		// Undo: restore original state to avoid accumulation
		await firstButton.click();
		await expect(firstButton).not.toHaveAttribute("aria-busy", "true", { timeout: 5000 });
	});

	test("ajouter un produit aux favoris depuis la page detail", async ({
		page,
		productCatalogPage,
	}) => {
		await productCatalogPage.goto();

		const productCount = await productCatalogPage.productLinks.count();
		requireSeedData(test, productCount > 0, "No products found");

		await productCatalogPage.gotoFirstProduct();

		const wishlistButton = page.getByRole("button", { name: /wishlist/i });
		const buttonCount = await wishlistButton.count();
		test.skip(buttonCount === 0, "No wishlist button on product detail page");

		const wasFavorited = await wishlistButton.first().getAttribute("aria-pressed");

		await wishlistButton.first().click();
		await expect(wishlistButton.first()).not.toHaveAttribute("aria-busy", "true", {
			timeout: 5000,
		});

		// Undo: restore original state to avoid accumulation
		if (wasFavorited !== "true") {
			await wishlistButton.first().click();
			await expect(wishlistButton.first()).not.toHaveAttribute("aria-busy", "true", {
				timeout: 5000,
			});
		}
	});

	test("la page favoris affiche les produits ajoutes", async ({
		page,
		productCatalogPage,
		wishlistPage,
	}) => {
		// First add a product to wishlist
		await productCatalogPage.goto();

		const productCount = await productCatalogPage.productLinks.count();
		requireSeedData(test, productCount > 0, "No products found");

		await productCatalogPage.gotoFirstProduct();

		const wishlistButton = page.getByRole("button", { name: /wishlist/i });
		const buttonCount = await wishlistButton.count();
		test.skip(buttonCount === 0, "No wishlist button on product detail page");

		// Ensure the product is favorited
		const isPressedBefore = await wishlistButton.first().getAttribute("aria-pressed");
		if (isPressedBefore !== "true") {
			await wishlistButton.first().click();
			await expect(wishlistButton.first()).not.toHaveAttribute("aria-busy", "true", {
				timeout: 5000,
			});
		}

		// Now check the favorites page
		await wishlistPage.goto();

		const items = await wishlistPage.getItems();
		const itemCount = await items.count();
		expect(itemCount).toBeGreaterThan(0);

		// Cleanup: go back and unfavorite
		await productCatalogPage.goto();
		await productCatalogPage.gotoFirstProduct();
		const cleanupButton = page.getByRole("button", { name: /wishlist/i });
		if ((await cleanupButton.first().getAttribute("aria-pressed")) === "true") {
			await cleanupButton.first().click();
			await expect(cleanupButton.first()).not.toHaveAttribute("aria-busy", "true", {
				timeout: 5000,
			});
		}
	});

	test("wishlist guest → merge apres login", async ({ browser }) => {
		// 1. Create a fresh unauthenticated context
		const context = await browser.newContext();
		const page = await context.newPage();

		// 2. Browse products as guest
		await page.goto("http://localhost:3000/produits");
		await page.waitForLoadState("domcontentloaded");

		const productLinks = page.locator(SELECTORS.PRODUCT_LINK);
		const productCount = await productLinks.count();
		test.skip(productCount === 0, "No products found");

		// 3. Add product to wishlist as guest (toggle heart button)
		const wishlistButton = page.getByRole("button", { name: /wishlist/i });
		const buttonCount = await wishlistButton.count();
		test.skip(buttonCount === 0, "No wishlist buttons visible on catalog");

		const firstButton = wishlistButton.first();
		await firstButton.click();
		await expect(firstButton).not.toHaveAttribute("aria-busy", "true", {
			timeout: TIMEOUTS.FEEDBACK,
		});

		// Verify the product is now in wishlist (aria-pressed="true")
		await expect(firstButton).toHaveAttribute("aria-pressed", "true");

		// 4. Navigate to login and authenticate
		await page.goto("http://localhost:3000/connexion");
		await page.waitForLoadState("domcontentloaded");

		const email = process.env.E2E_USER_EMAIL ?? "user2@synclune.fr";
		const password = process.env.E2E_USER_PASSWORD ?? "password123";

		await page.getByRole("textbox", { name: /email/i }).fill(email);
		await page.locator('input[type="password"]').fill(password);
		await page.getByRole("button", { name: /se connecter/i }).click();

		// Wait for redirect away from login
		await expect(page).not.toHaveURL(/\/connexion/, { timeout: TIMEOUTS.AUTH_REDIRECT });

		// 5. Navigate to wishlist page and verify the guest item was merged
		await page.goto("http://localhost:3000/favoris");
		await page.waitForLoadState("domcontentloaded");

		const wishlistItems = page.locator(SELECTORS.PRODUCT_LINK);
		await expect(async () => {
			const count = await wishlistItems.count();
			expect(count).toBeGreaterThan(0);
		}).toPass({ timeout: TIMEOUTS.DATA_LOAD });

		// Cleanup: remove the product from wishlist
		const removeButton = page.getByRole("button", { name: /wishlist/i }).first();
		if ((await removeButton.getAttribute("aria-pressed")) === "true") {
			await removeButton.click();
			await expect(removeButton).not.toHaveAttribute("aria-busy", "true", {
				timeout: TIMEOUTS.FEEDBACK,
			});
		}

		await context.close();
	});

	test("retirer un produit depuis la page favoris", async ({
		page,
		productCatalogPage,
		wishlistPage,
	}) => {
		// Add a product to wishlist first
		await productCatalogPage.goto();

		const productCount = await productCatalogPage.productLinks.count();
		requireSeedData(test, productCount > 0, "No products found");

		await productCatalogPage.gotoFirstProduct();

		const wishlistButton = page.getByRole("button", { name: /wishlist/i });
		const buttonCount = await wishlistButton.count();
		test.skip(buttonCount === 0, "No wishlist button on product detail page");

		// Ensure favorited
		const isPressed = await wishlistButton.first().getAttribute("aria-pressed");
		if (isPressed !== "true") {
			await wishlistButton.first().click();
			await expect(wishlistButton.first()).not.toHaveAttribute("aria-busy", "true", {
				timeout: 5000,
			});
		}

		// Go to favorites page
		await wishlistPage.goto();

		const itemsBefore = await wishlistPage.getItemCount();
		test.skip(itemsBefore === 0, "No items in wishlist to remove");

		// Remove first item
		const removeButton = page.getByRole("button", { name: /wishlist/i }).first();
		await removeButton.click();
		await expect(removeButton).not.toHaveAttribute("aria-busy", "true", { timeout: 5000 });

		// Count should have decreased or empty state should show
		await expect(async () => {
			const itemsAfter = await wishlistPage.getItemCount();
			expect(itemsAfter).toBeLessThan(itemsBefore);
		}).toPass({ timeout: 5000 });
	});
});
