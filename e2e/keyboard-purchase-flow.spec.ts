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

			// 4. Checkout page
			// Même race que plus haut : `waitForLoadState` rend la main avant que la
			// navigation ne démarre, et l'assertion courait contre l'URL de la fiche
			// produit.
			await page.waitForURL(/\/paiement/);

			// Tab through checkout form fields
			const fullNameInput = page.getByLabel(/Nom complet|Prénom et nom/i);
			if ((await fullNameInput.count()) > 0) {
				await fullNameInput.focus();
				await expect(fullNameInput).toBeFocused();
				await fullNameInput.fill("Marie Dupont");

				// Tab to next field
				await page.keyboard.press("Tab");
				const activeTag = await page.evaluate(() => document.activeElement?.tagName.toLowerCase());
				expect(["input", "select", "textarea"]).toContain(activeTag);
			}

			// ⚠️ Il n'y a PAS de case « j'accepte les CGV » dans ce tunnel :
			// l'acceptation est implicite (« En commandant, tu acceptes… » + lien).
			// Le bloc qui cherchait `getByLabel(/conditions générales|J'accepte/i)`
			// retombait donc sur le LIEN CGV — non cochable — et n'a jamais pu rien
			// prouver. Vérifié au rendu : les 10 contrôles du formulaire sont 8
			// champs de saisie et 2 selects, aucune case à cocher.
		}
	});

	test("validation des erreurs de formulaire checkout au clavier", async ({
		page,
		checkoutPage,
		productCatalogPage,
		cartPage,
	}) => {
		// ⚠️ Ce test skippait EN SILENCE : `/paiement` ne redirige pas sur panier
		// vide, donc la garde d'URL ne se déclenchait jamais, mais l'état « panier
		// vide » n'a aucun bouton de soumission — d'où un `test.skip` systématique.
		// Le panier doit être semé pour que le formulaire existe.
		const seeded = await checkoutPage.gotoWithSeededCart(productCatalogPage, cartPage);
		requireSeedData(test, !seeded.skipped, seeded.skipped ? seeded.reason : "");
		if (seeded.skipped) return;

		await checkoutPage.payButton.focus();
		await page.keyboard.press("Enter");

		// Les champs invalides sont marqués et reliés à leur message.
		const summary = page.getByRole("alert").filter({ hasText: /erreurs? trouvée/ });
		await expect(summary).toBeVisible();
		expect(await page.locator('[aria-invalid="true"]').count()).toBeGreaterThan(0);

		// ⚠️ UNE seule région live doit parler. Avant le 2026-08-07, sept se
		// peuplaient dans le même tick (le résumé `assertive` + une `role="alert"`
		// par champ) et le lecteur d'écran les bousculait toutes.
		const speaking = await page.evaluate(
			() =>
				Array.from(document.querySelectorAll("[aria-live],[role=status],[role=alert]")).filter(
					(el) => el.textContent.trim().length > 0,
				).length,
		);
		expect(speaking, "Une seule région live doit vocaliser à la soumission").toBe(1);

		// Et le focus atterrit sur le résumé, pas sur un champ : c'est lui qui porte
		// les boutons de saut vers chaque erreur.
		await expect(summary).toBeFocused();
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
		const thumbnails = page
			.locator(
				"button[aria-label*='miniature' i], button[aria-label*='thumbnail' i], [data-gallery] button, [role='tablist'] button",
			)
			.first();
		if ((await thumbnails.count()) === 0) {
			// Try generic image gallery buttons
			const galleryButtons = page.locator("[data-gallery] button, .gallery button").first();
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

		// Tab to next thumbnail
		await page.keyboard.press("Tab");
		const focusedTag = await page.evaluate(() => document.activeElement?.tagName.toLowerCase());
		expect(["button", "a", "img"]).toContain(focusedTag);
	});

	test("le focus ne sort pas du formulaire checkout pendant la saisie", async ({
		page,
		checkoutPage,
		productCatalogPage,
		cartPage,
	}) => {
		// Même défaut que ci-dessus, doublé d'un `if (inputCount === 0) return`
		// qui rendait le test VERT sur l'état « panier vide » (zéro champ).
		// `/paiement` ne redirige pas non plus vers `/connexion` : le parcours
		// d'achat est entièrement invité depuis le 2026-07-31.
		const seeded = await checkoutPage.gotoWithSeededCart(productCatalogPage, cartPage);
		requireSeedData(test, !seeded.skipped, seeded.skipped ? seeded.reason : "");
		if (seeded.skipped) return;

		const formInputs = page.locator("form input, form select, form textarea");
		const inputCount = await formInputs.count();
		expect(inputCount, "Le formulaire de checkout doit exposer des champs").toBeGreaterThan(0);

		// Focus the first input
		await formInputs.first().focus();

		// Tab through all form fields — each Tab should stay in a form element
		for (let i = 0; i < Math.min(inputCount, 8); i++) {
			await page.keyboard.press("Tab");
			const isFormElement = await page.evaluate(() => {
				const el = document.activeElement;
				if (!el) return false;
				return (
					["INPUT", "SELECT", "TEXTAREA", "BUTTON"].includes(el.tagName) ||
					el.getAttribute("role") === "checkbox" ||
					el.getAttribute("role") === "combobox"
				);
			});
			// We accept buttons too (submit, checkbox labels)
			if (!isFormElement) {
				// It's OK if focus goes to a button or link within the form context
				const isStillInForm = await page.evaluate(() => {
					const el = document.activeElement;
					return el?.closest("form") !== null || el.closest("main") !== null;
				});
				expect(isStillInForm, `Tab ${i + 1}: focus has left the form area`).toBe(true);
			}
		}
	});
});
