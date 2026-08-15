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

		// L'état persisté (cookie `wishlist`) fait foi : `aria-pressed` bascule en
		// OPTIMISTE dès le clic, et un clic pré-hydratation ne produit rien. On
		// re-clique jusqu'à ce que le cookie bascule réellement.
		const readCookie = async () =>
			(await page.context().cookies()).find((c) => c.name === "wishlist")?.value ?? "";

		const before = await readCookie();
		await expect(async () => {
			if ((await readCookie()) === before) {
				await firstButton.click();
			}
			expect(await readCookie()).not.toBe(before);
		}).toPass({ timeout: 20_000 });

		// Undo: restore original state to avoid accumulation
		const after = await readCookie();
		await expect(async () => {
			if ((await readCookie()) === after) {
				await firstButton.click();
			}
			expect(await readCookie()).not.toBe(after);
		}).toPass({ timeout: 20_000 });
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

		// Même garde que le test catalogue : le cookie `wishlist` fait foi.
		const readCookie = async () =>
			(await page.context().cookies()).find((c) => c.name === "wishlist")?.value ?? "";

		const before = await readCookie();
		await expect(async () => {
			if ((await readCookie()) === before) {
				await wishlistButton.first().click();
			}
			expect(await readCookie()).not.toBe(before);
		}).toPass({ timeout: 20_000 });

		// Undo: restore original state to avoid accumulation
		const after = await readCookie();
		await expect(async () => {
			if ((await readCookie()) === after) {
				await wishlistButton.first().click();
			}
			expect(await readCookie()).not.toBe(after);
		}).toPass({ timeout: 20_000 });
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

		// Ensure the product is favorited. ⚠️ `aria-pressed` bascule en OPTIMISTE
		// dès le clic : naviguer à ce moment annule l'action serveur et le cookie
		// n'est jamais écrit. La preuve de persistance, c'est le cookie `wishlist`.
		await expect(async () => {
			if ((await wishlistButton.first().getAttribute("aria-pressed")) !== "true") {
				await wishlistButton.first().click();
			}
			const cookies = await page.context().cookies();
			expect(cookies.find((c) => c.name === "wishlist")?.value ?? "").not.toBe("");
		}).toPass({ timeout: 20_000 });

		// Now check the favorites page
		await wishlistPage.goto();

		// La grille arrive en streaming après `domcontentloaded` : on attend.
		await expect
			.poll(async () => wishlistPage.getItemCount(), { timeout: 10_000 })
			.toBeGreaterThan(0);

		// Cleanup: go back and unfavorite
		await productCatalogPage.goto();
		await productCatalogPage.gotoFirstProduct();
		const cleanupButton = page.getByRole("button", { name: TOGGLE_BUTTON_NAME });
		if ((await cleanupButton.first().getAttribute("aria-pressed")) === "true") {
			await cleanupButton.first().click();
			// Best-effort : laisse l'action serveur réécrire le cookie avant de
			// clore le contexte (pas d'assertion — c'est du nettoyage).
			await expect
				.poll(
					async () =>
						(await page.context().cookies()).find((c) => c.name === "wishlist")?.value ?? "",
					{ timeout: 10_000 },
				)
				.toBe("")
				.catch(() => {});
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

		// Ensure favorited — même garde que ci-dessus : c'est le cookie `wishlist`
		// qui prouve que l'action serveur a persisté le favori.
		await expect(async () => {
			if ((await wishlistButton.first().getAttribute("aria-pressed")) !== "true") {
				await wishlistButton.first().click();
			}
			const cookies = await page.context().cookies();
			expect(cookies.find((c) => c.name === "wishlist")?.value ?? "").not.toBe("");
		}).toPass({ timeout: 20_000 });

		// Go to favorites page
		await wishlistPage.goto();

		// La grille arrive en streaming après `domcontentloaded` : on attend.
		await expect
			.poll(async () => wishlistPage.getItemCount(), {
				message: "wishlist items after adding one",
				timeout: 10_000,
			})
			.toBeGreaterThan(0);
		const itemsBefore = await wishlistPage.getItemCount();

		// Remove first item — sur /favoris, tous les coeurs sont en état
		// « Retirer … des favoris » (isInWishlist forcé à true)
		const removeButton = page.getByRole("button", { name: /Retirer.*favoris/i }).first();
		await removeButton.click();
		// Pas d'attente sur aria-busy : l'item (et son bouton) disparaît du DOM
		// dès le retrait optimiste — la baisse du compte ci-dessous fait foi.

		// Count should have decreased or empty state should show
		await expect(async () => {
			const itemsAfter = await wishlistPage.getItemCount();
			expect(itemsAfter).toBeLessThan(itemsBefore);
		}).toPass({ timeout: 5000 });
	});
});
