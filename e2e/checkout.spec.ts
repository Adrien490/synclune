import { test, expect } from "./fixtures";
import { requireSeedData } from "./constants";

test.describe("Parcours checkout complet", { tag: ["@critical"] }, () => {
	test.describe("Initiation du checkout depuis le panier", () => {
		test("le bouton de paiement est absent quand le panier est vide", async ({
			page,
			cartPage,
		}) => {
			await page.goto("/");
			await page.waitForLoadState("domcontentloaded");

			await cartPage.open();

			// Verify empty state - no checkout button
			await expect(cartPage.emptyMessage).toBeVisible();
			await expect(cartPage.checkoutLink).not.toBeVisible();
		});

		test("ajouter un produit puis voir le bouton de paiement dans le panier", async ({
			page,
			cartPage,
			productCatalogPage,
		}) => {
			// Navigate to a product
			await productCatalogPage.goto();

			const count = await productCatalogPage.productLinks.count();
			requireSeedData(test, count > 0, "No products found");

			await productCatalogPage.gotoFirstProduct();

			// Try to add to cart
			if ((await productCatalogPage.addToCartButton.count()) === 0) {
				test.skip(true, "Product requires SKU selection - skipping checkout test");
				return;
			}

			await productCatalogPage.addToCartButton.first().click();

			// Wait for cart feedback (dialog or toast)
			const toastOrFeedback = page.getByText(/ajouté|panier/i);
			await expect(cartPage.dialog.or(toastOrFeedback.first())).toBeVisible({ timeout: 5000 });

			// Open cart if not already open
			if (!(await cartPage.dialog.isVisible())) {
				await cartPage.open();
			}

			// Cart should not be empty
			await expect(cartPage.emptyMessage).not.toBeVisible();

			// Should display price
			const cartContent = await cartPage.dialog.textContent();
			expect(cartContent).toMatch(/\d+[,.]?\d*\s*€/);
		});
	});

	test.describe("Page de paiement", () => {
		test("accéder à /paiement sans panier redirige ou affiche un message", async ({ page }) => {
			const _response = await page.goto("/paiement");
			await page.waitForLoadState("domcontentloaded");

			const url = page.url();

			// With empty cart, users should be redirected to homepage or shop
			if (url.includes("/produits") || url.includes("/boutique")) {
				await expect(page).toHaveURL(/\/(produits|boutique)/);
				return;
			}

			// If staying on /paiement, page should show empty cart message or error
			const emptyCartMessage = page.getByText(/panier.*vide|aucun.*article/i);
			const errorMessage = page.getByText(/erreur/i);

			await expect(async () => {
				const hasMessage = (await emptyCartMessage.isVisible()) || (await errorMessage.isVisible());
				expect(
					hasMessage,
					"La page /paiement sans panier devrait afficher un message vide ou erreur",
				).toBe(true);
			}).toPass({ timeout: 5000 });
		});
	});

	test.describe("Page de confirmation", () => {
		test("/paiement/confirmation sans paramètres affiche une erreur ou redirige", async ({
			page,
		}) => {
			await page.goto("/paiement/confirmation");
			await page.waitForLoadState("domcontentloaded");

			const url = page.url();

			// If redirected away from confirmation page, that's valid
			if (!url.includes("/paiement/confirmation")) {
				expect(url).not.toContain("/paiement/confirmation");
				return;
			}

			// If staying on the page, should display an error/not-found message
			const errorIndicator = page.getByText(/erreur|introuvable|not found|commande/i);
			await expect(errorIndicator.first()).toBeVisible();
		});

		test("/paiement/confirmation avec un order_id invalide affiche une erreur", async ({
			page,
		}) => {
			await page.goto("/paiement/confirmation?order_id=invalid-id&order_number=FAKE-000");
			await page.waitForLoadState("domcontentloaded");

			const pageContent = await page.textContent("body");

			// Should display an error state for invalid order
			expect(pageContent).toMatch(/erreur|introuvable|not found|impossible/i);
		});
	});

	// AUDIT-BIZ-001 — le suivi de commande invité. Le CTA « Suivre ma commande » de
	// l'email de confirmation pointait vers un segment inexistant, et les invités
	// (checkout sans compte, chemin de premier ordre) n'avaient AUCUNE surface de
	// suivi. Sans commande réelle en E2E, on vérifie ce qui est vérifiable sans
	// fixture : la route est bien SERVIE (elle n'est pas avalée par le default-deny
	// du proxy) et elle est fail-closed sur un token invalide.
	test.describe("Suivi de commande invité", () => {
		test("/suivi-commande est servie et n'est pas redirigée par le default-deny du proxy", async ({
			page,
		}) => {
			await page.goto(
				"/suivi-commande?commande=CMD-0000000000000-AAAAAAAAAAAA&token=" + "a".repeat(32),
			);
			await page.waitForLoadState("domcontentloaded");

			// Le default-deny du proxy renvoie vers `/`. Un 404 applicatif est le
			// comportement ATTENDU ici (token qui ne correspond à rien) — ce qu'on
			// refuse, c'est l'atterrissage sur l'accueil.
			expect(new URL(page.url()).pathname).toBe("/suivi-commande");
		});

		test("/suivi-commande avec un token invalide ne divulgue rien (fail-closed)", async ({
			page,
		}) => {
			await page.goto(
				"/suivi-commande?commande=CMD-0000000000000-AAAAAAAAAAAA&token=" + "b".repeat(32),
			);
			await page.waitForLoadState("domcontentloaded");

			const body = (await page.textContent("body")) ?? "";
			// Pas d'oracle d'existence : aucun détail de commande ne doit fuiter.
			expect(body).not.toMatch(/adresse de livraison/i);
			expect(body).not.toMatch(/récapitulatif/i);
		});

		test("/suivi-commande sans token est rejetée", async ({ page }) => {
			await page.goto("/suivi-commande?commande=CMD-0000000000000-AAAAAAAAAAAA");
			await page.waitForLoadState("domcontentloaded");

			const body = (await page.textContent("body")) ?? "";
			expect(body).not.toMatch(/adresse de livraison/i);
		});
	});

	test.describe("Page d'annulation", () => {
		test("/paiement/annulation affiche un message de contexte", async ({ page }) => {
			await page.goto("/paiement/annulation");
			await page.waitForLoadState("domcontentloaded");

			// The cancellation page should display context
			const heading = page.getByRole("heading");
			await expect(heading.first()).toBeVisible();

			// Should offer a way to retry or return to shop
			const pageContent = await page.textContent("body");
			expect(pageContent).toMatch(/annul|panier|boutique|réessayer|retour/i);
		});

		test("/paiement/annulation avec raison affiche le message approprié", async ({ page }) => {
			await page.goto("/paiement/annulation?reason=expired");
			await page.waitForLoadState("domcontentloaded");

			const pageContent = await page.textContent("body");
			// Should show relevant content about cancellation
			expect(pageContent).toMatch(/annul|expir|panier|boutique/i);
		});
	});

	test.describe("Page de retour Stripe", () => {
		test("/paiement/retour sans session_id gère le cas d'erreur", async ({ page }) => {
			await page.goto("/paiement/retour");
			await page.waitForLoadState("domcontentloaded");

			const url = page.url();

			// Without session_id, should redirect to confirmation, cancellation, or show error
			if (url.includes("/paiement/confirmation") || url.includes("/paiement/annulation")) {
				// Redirected to an appropriate page
				expect(url).toMatch(/\/paiement\/(confirmation|annulation)/);
				return;
			}

			if (!url.includes("/paiement/retour")) {
				// Redirected elsewhere (e.g., home, shop)
				expect(url).not.toContain("/paiement/retour");
				return;
			}

			// If staying on /paiement/retour, should show loading/error state
			const stateIndicator = page.getByText(/chargement|erreur|redirection|traitement/i);
			await expect(stateIndicator.first()).toBeVisible();
		});
	});
});
