import { test, expect } from "./fixtures";
import { requireSeedData } from "./constants";
import { preseedCookieConsent } from "./helpers/consent";

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

			const buttonCount = await productCatalogPage.addToCartButton.count();

			if (buttonCount > 0) {
				await productCatalogPage.addToCartButton.first().click();

				// Wait for cart feedback - either dialog or toast. `.filter({ visible })`
				// avant `.first()` : le live region sr-only « 1 article dans ton
				// panier » matche aussi le texte et faisait une strict violation
				// (puis un pick caché) sur mobile.
				const toastOrFeedback = page.getByText(/ajouté|panier/i);
				await expect(
					cartPage.dialog.or(toastOrFeedback).filter({ visible: true }).first(),
				).toBeVisible({ timeout: 5000 });
			} else {
				// Product may require SKU selection first (variants)
				const variantSelector = page
					.getByRole("region", { name: /Choisis tes options/i })
					.or(page.locator('[role="radiogroup"]'));
				expect(
					await variantSelector.count(),
					"No add-to-cart button or variant selector found",
				).toBeGreaterThan(0);
			}
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
		// nommé par son libellé visible, PAS d'aria-label).
		await page.waitForFunction(() => {
			const buttons = [...document.querySelectorAll("button")].filter((b) =>
				/echerch/i.test(b.getAttribute("aria-label") ?? b.textContent),
			);
			return (
				buttons.length > 0 &&
				buttons.some((b) => Object.keys(b).some((key) => key.startsWith("__reactProps")))
			);
		});
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
