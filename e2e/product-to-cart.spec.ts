import { test, expect } from "./fixtures";
import { requireSeedData } from "./constants";
import { preseedCookieConsent } from "./helpers/consent";
import { waitForHydratedButton } from "./helpers/hydration";

test.describe("Parcours produit → panier", { tag: ["@critical"] }, () => {
	// Sans consentement pré-seedé, le bandeau cookies (lazy) recouvre la
	// bottom-nav mobile : le tap sur l'onglet Panier expirait en 30s.
	test.beforeEach(async ({ page }) => {
		await preseedCookieConsent(page);
	});

	test("naviguer vers un produit depuis le catalogue et voir les details", async ({
		productCatalogPage,
	}) => {
		await productCatalogPage.goto();

		const count = await productCatalogPage.productLinks.count();
		expect(count, "Seed data required: no products found").toBeGreaterThan(0);

		// Click the first product
		const firstLink = productCatalogPage.productLinks.first();
		await firstLink.click();

		await expect(firstLink.page()).toHaveURL(/\/creations\//);

		// Product page must have: h1 title, price, image, add-to-cart action
		const heading = firstLink.page().getByRole("heading", { level: 1 });
		await expect(heading).toBeVisible();

		const priceText = await firstLink.page().textContent("body");
		expect(priceText).toMatch(/\d+[,.]?\d*\s*€/);

		const images = firstLink.page().locator("img");
		expect(await images.count()).toBeGreaterThan(0);
	});

	test(
		"ajouter un produit au panier depuis la page detail",
		{ tag: ["@smoke"] },
		async ({ page, cartPage, productCatalogPage }) => {
			await productCatalogPage.goto();

			expect(await productCatalogPage.productLinks.count(), "Seed data required").toBeGreaterThan(
				0,
			);

			await productCatalogPage.gotoFirstProduct();

			// Si la fiche exige une sélection de variante, on SÉLECTIONNE puis on
			// ajoute vraiment. L'ancienne branche `else` se contentait de constater
			// le sélecteur de variantes et validait ce @smoke sans jamais rien
			// ajouter au panier.
			if ((await productCatalogPage.addToCartButton.count()) === 0) {
				expect(
					await productCatalogPage.selectAllVariantOptions(),
					"Ni bouton d'ajout direct ni variante sélectionnable sur la fiche",
				).toBe(true);
			}

			await productCatalogPage.addToCartButton.first().click();

			// Wait for cart feedback - either dialog or toast. `.filter({ visible })`
			// avant `.first()` : le live region sr-only « 1 article dans ton
			// panier » matche aussi le texte et faisait une strict violation
			// (puis un pick caché) sur mobile.
			const toastOrFeedback = page.getByText(/ajouté|panier/i);
			await expect(
				cartPage.dialog.or(toastOrFeedback).filter({ visible: true }).first(),
			).toBeVisible({ timeout: 5000 });

			// L'état SERVEUR fait foi : le feedback ci-dessus est optimiste, l'action
			// serveur peut encore être en vol. Le cookie `cart` est httpOnly mais
			// `context.cookies()` le lit (même oracle que wishlist.spec.ts) — on
			// attend qu'il soit réellement écrit avant de recharger.
			await expect
				.poll(
					async () => (await page.context().cookies()).find((c) => c.name === "cart")?.value ?? "",
					{ message: "le cookie cart doit être écrit par l'action serveur", timeout: 10_000 },
				)
				.not.toBe("");

			// Rechargement : le panier est reconstruit côté serveur depuis le cookie.
			// Un ajout purement optimiste (cookie jamais écrit) rendrait ici un
			// panier vide — c'est LA preuve de persistance.
			await page.reload();
			await page.waitForLoadState("domcontentloaded");
			await cartPage.open();
			await expect(cartPage.emptyMessage).not.toBeVisible();
		},
	);

	test("le panier affiche le produit apres ajout", async ({
		page,
		cartPage,
		productCatalogPage,
	}) => {
		await productCatalogPage.goto();

		expect(await productCatalogPage.productLinks.count(), "Seed data required").toBeGreaterThan(0);

		await productCatalogPage.gotoFirstProduct();

		if ((await productCatalogPage.addToCartButton.count()) === 0) {
			test.skip(true, "Product requires SKU selection - skipping cart verification");
			return;
		}

		await productCatalogPage.addToCartButton.first().click();

		// Wait for cart to update, then ensure it's open (cf. remarque strict
		// mode du test précédent : le live region sr-only matche aussi).
		await expect(
			cartPage.dialog
				.or(page.getByText(/ajouté|panier/i))
				.filter({ visible: true })
				.first(),
		).toBeVisible({ timeout: 5000 });

		if (!(await cartPage.dialog.isVisible())) {
			await cartPage.open();
		}

		// Cart should no longer show "empty" message
		await expect(cartPage.emptyMessage).not.toBeVisible();

		// Cart should contain at least one item
		const cartContent = await cartPage.dialog.textContent();
		expect(cartContent).toMatch(/\d+[,.]?\d*\s*€/);
	});

	test("selection de variante et ajout au panier", async ({
		page: _page,
		cartPage,
		productCatalogPage,
	}) => {
		await productCatalogPage.goto();

		const productCount = await productCatalogPage.productLinks.count();
		requireSeedData(test, productCount > 0, "No products found");

		// Find a product with variants
		const result = await productCatalogPage.addFirstVariantProductToCart(cartPage);
		if (result.skipped) {
			if (result.seedData) {
				requireSeedData(test, false, result.reason);
			}
			test.skip(true, result.reason);
			return;
		}

		// Verify the cart shows the product
		await expect(cartPage.emptyMessage).not.toBeVisible();

		// Cart should contain a product with a price
		const cartContent = await cartPage.dialog.textContent();
		expect(cartContent).toMatch(/\d+[,.]?\d*\s*€/);
	});

	test("le parcours recherche → produit fonctionne", async ({ page }) => {
		await page.goto("/produits");
		await page.waitForLoadState("domcontentloaded");

		// Plus de champ inline (2026-08-06) : la recherche passe par le
		// quick-search — déclencheur navbar (desktop, aria-label « Ouvrir la
		// recherche rapide ») ou onglet « Rechercher » de la bottom-nav (mobile,
		// nommé par son libellé visible, PAS d'aria-label). /echerch/i couvre les
		// deux formes.
		await waitForHydratedButton(page, /echerch/i);
		await page
			.getByRole("button", { name: /ouvrir la recherche/i })
			.or(page.getByRole("button", { name: /^Rechercher$/ }))
			.filter({ visible: true })
			.first()
			.click();
		const input = page.getByRole("combobox", { name: /rechercher un bijou/i });
		await input.fill("bague");
		await page.keyboard.press("Enter");
		await expect(page).toHaveURL(/search=bague/, { timeout: 5000 });

		// Either products or empty state should be visible
		await page.waitForLoadState("domcontentloaded");
		const productCards = page.locator('article, [data-product-card], a[href*="/creations/"]');
		const emptyState = page.getByText(/aucun (résultat|produit)/i);

		await expect(productCards.first().or(emptyState).first()).toBeVisible({ timeout: 5000 });
	});
});
