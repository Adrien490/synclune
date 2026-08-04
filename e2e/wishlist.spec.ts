import { test, expect } from "./fixtures";
import { requireSeedData } from "./constants";

/*
 * ⚠️ Sélecteurs : les aria-labels du bouton favoris sont 100 % français
 * (« Ajouter (…) aux favoris » / « Retirer (…) des favoris », wishlist-button.tsx).
 * Jusqu'à l'audit wishlist 2026-08-01, cette suite cherchait /wishlist/i — un
 * motif qui ne matchait AUCUN élément du DOM : `buttonCount` valait toujours 0
 * et les `test.skip(buttonCount === 0)` neutralisaient 4 tests sur 5 en silence,
 * à chaque run, sous le tag @critical. Les skips sont remplacés par des
 * assertions dures : produits seedés sans bouton favoris = échec, pas un skip.
 */
const TOGGLE_BUTTON_NAME = /(Ajouter|Retirer).*favoris/i;

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

		const wishlistButton = page.getByRole("button", { name: TOGGLE_BUTTON_NAME });
		expect(await wishlistButton.count(), "wishlist buttons on catalog").toBeGreaterThan(0);

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

		const wishlistButton = page.getByRole("button", { name: TOGGLE_BUTTON_NAME });
		expect(await wishlistButton.count(), "wishlist button on PDP").toBeGreaterThan(0);

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

		const wishlistButton = page.getByRole("button", { name: TOGGLE_BUTTON_NAME });
		expect(await wishlistButton.count(), "wishlist button on PDP").toBeGreaterThan(0);

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
		const cleanupButton = page.getByRole("button", { name: TOGGLE_BUTTON_NAME });
		if ((await cleanupButton.first().getAttribute("aria-pressed")) === "true") {
			await cleanupButton.first().click();
			await expect(cleanupButton.first()).not.toHaveAttribute("aria-busy", "true", {
				timeout: 5000,
			});
		}
	});

	/*
	 * Le test « wishlist guest → merge apres login » a été retiré au retrait de
	 * l'espace client (2026-07-31).
	 *
	 * Il connectait un compte CLIENT pour vérifier que la wishlist invité était
	 * fusionnée dans celle du compte. Les deux moitiés ont disparu : il n'y a plus de
	 * compte client à connecter (`disableSignUp`), et `mergeWishlists` a été supprimée
	 * avec le hook post-login de Better Auth.
	 *
	 * Le nouveau contrat est plus simple, et couvert par les tests ci-dessus : la
	 * wishlist invité N'EST PLUS fusionnée — elle vit entièrement dans le cookie
	 * `wishlist` (Product IDs, 30 jours renouvelés à chaque interaction ; retrait
	 * de la base 2026-08-03).
	 */

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

		const wishlistButton = page.getByRole("button", { name: TOGGLE_BUTTON_NAME });
		expect(await wishlistButton.count(), "wishlist button on PDP").toBeGreaterThan(0);

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
		expect(itemsBefore, "wishlist items after adding one").toBeGreaterThan(0);

		// Remove first item — sur /favoris, tous les coeurs sont en état
		// « Retirer … des favoris » (isInWishlist forcé à true)
		const removeButton = page.getByRole("button", { name: /Retirer.*favoris/i }).first();
		await removeButton.click();
		await expect(removeButton).not.toHaveAttribute("aria-busy", "true", { timeout: 5000 });

		// Count should have decreased or empty state should show
		await expect(async () => {
			const itemsAfter = await wishlistPage.getItemCount();
			expect(itemsAfter).toBeLessThan(itemsBefore);
		}).toPass({ timeout: 5000 });
	});
});
