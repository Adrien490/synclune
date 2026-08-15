import { test, expect } from "./fixtures";
import { requireSeedData } from "./constants";

test.describe("Parcours achat clavier complet", { tag: ["@slow"] }, () => {
	test("navigation clavier de la liste produits au checkout", async ({ page, cartPage }) => {
		// 1. Navigate to product listing
		await page.goto("/produits");
		await page.waitForLoadState("domcontentloaded");

		const productLinks = page.locator("article a[href*='/creations/']");
		// La grille arrive en streaming derrière un `Suspense` : compter juste après
		// `domcontentloaded` rend 0 par intermittence, et ce test se SKIPPAIT alors
		// en annonçant « pas de produits dans la base ».
		await productLinks.first().waitFor({ state: "attached", timeout: 15000 });
		const count = await productLinks.count();
		requireSeedData(test, count > 0, "Pas de produits dans la base");

		// Tab to the first product card and Enter
		const firstProduct = productLinks.first();
		await firstProduct.focus();
		await expect(firstProduct).toBeFocused();
		await page.keyboard.press("Enter");

		// 2. Product detail page
		// ⚠️ `waitForLoadState("domcontentloaded")` rend la main IMMÉDIATEMENT quand
		// le document courant est déjà chargé — donc avant même que la navigation
		// déclenchée par Enter ne démarre. L'assertion d'URL qui suivait courait
		// contre /produits et échouait par intermittence, sur un parcours clavier
		// pourtant fonctionnel (vérifié au rendu : Enter navigue bien).
		await page.waitForURL(/\/creations\//);

		// Tab to add-to-cart button
		// Le bloc d'achat est un client component : sans attendre son montage,
		// `count()` rend 0 et le test se skippe en annonçant « produit
		// indisponible » — un motif faux, le produit étant en stock.
		const addToCartButton = page.getByRole("button", { name: /ajouter.*au panier/i }).first();
		await addToCartButton.waitFor({ state: "attached", timeout: 15000 }).catch(() => {
			/* produit réellement indisponible */
		});
		if ((await addToCartButton.count()) === 0) {
			test.skip(true, "Pas de bouton ajout panier (produit indisponible)");
			return;
		}

		// If there are variant radios, interact with them first
		const radios = page.getByRole("radio");
		if ((await radios.count()) > 0) {
			const firstRadio = radios.first();
			await firstRadio.focus();
			await expect(firstRadio).toBeFocused();

			// ArrowDown to change variant
			await page.keyboard.press("ArrowDown");
		}

		// Focus and activate add-to-cart
		await addToCartButton.focus();
		await expect(addToCartButton).toBeFocused();
		await page.keyboard.press("Enter");

		// 3. Cart sheet should open
		await expect(cartPage.dialog).toBeVisible({ timeout: 5000 });

		// Verify focus is inside the dialog
		const focusInDialog = await page.evaluate(() => {
			const d = document.querySelector('[role="dialog"]');
			return d?.contains(document.activeElement);
		});
		expect(focusInDialog).toBe(true);

		// Tab to the checkout link
		const checkoutLink = cartPage.checkoutLink;
		if ((await checkoutLink.count()) > 0) {
			await checkoutLink.focus();
			await expect(checkoutLink).toBeFocused();
			await page.keyboard.press("Enter");

			// 4. Checkout page — HÉBERGÉ (lot 3) : la page n'a plus que le select
			// « Pays de livraison » et le bouton « Payer avec Stripe ». Le parcours
			// clavier s'arrête ici : la suite se joue sur checkout.stripe.com.
			await page.waitForURL(/\/paiement/);

			const countrySelect = page.getByLabel(/Pays de livraison/i);
			await countrySelect.focus();
			await expect(countrySelect).toBeFocused();

			await page.keyboard.press("Tab");
			const payButton = page.getByRole("button", { name: /Payer avec Stripe/i });
			await expect(payButton).toBeVisible();
		}
	});

	test("navigation clavier dans la galerie produit", async ({ page }) => {
		await page.goto("/produits");
		await page.waitForLoadState("domcontentloaded");

		const productLink = page.locator("article a[href*='/creations/']").first();
		// Idem : la grille est streamée, `count()` immédiat rend 0 par intermittence.
		await productLink.waitFor({ state: "attached", timeout: 15000 });
		const href = await productLink.getAttribute("href");
		if (!href) return;
		await page.goto(href);
		await page.waitForLoadState("domcontentloaded");

		// Look for thumbnail buttons in the product gallery
		// ⚠️ `.filter({ visible: true })` : la PDP rend plusieurs copies de la
		// galerie (bascules CSS) — le `.first()` nu tombait sur une miniature
		// masquée, que `focus()` ne peut pas atteindre (« inactive »).
		const thumbnails = page
			.locator(
				"button[aria-label*='miniature' i], button[aria-label*='thumbnail' i], [data-gallery] button, [role='tablist'] button",
			)
			.filter({ visible: true })
			.first();
		if ((await thumbnails.count()) === 0) {
			// Try generic image gallery buttons
			const galleryButtons = page
				.locator("[data-gallery] button, .gallery button")
				.filter({ visible: true })
				.first();
			if ((await galleryButtons.count()) === 0) {
				test.skip(true, "Pas de galerie avec miniatures");
				return;
			}
			await galleryButtons.focus();
			await expect(galleryButtons).toBeFocused();
			return;
		}

		await thumbnails.focus();
		await expect(thumbnails).toBeFocused();

		// Tab to next thumbnail. WebKit suit la politique Safari : Tab saute les
		// boutons/liens et retombe sur <body> — on l'admet là-bas uniquement.
		await page.keyboard.press("Tab");
		const focusedTag = await page.evaluate(() => document.activeElement?.tagName.toLowerCase());
		const allowed =
			test.info().project.name.includes("webkit") || test.info().project.name.includes("mobile")
				? ["button", "a", "img", "body"]
				: ["button", "a", "img"];
		expect(allowed).toContain(focusedTag);
	});
});
