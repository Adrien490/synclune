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
			// (le live region sr-only matche aussi : union filtrée visible, cf. product-to-cart)
			await expect(
				cartPage.dialog.or(toastOrFeedback).filter({ visible: true }).first(),
			).toBeVisible({ timeout: 5000 });

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
		test("/paiement sans panier reste sur l'URL et affiche l'état vide", async ({ page }) => {
			await page.goto("/paiement");
			await page.waitForLoadState("domcontentloaded");

			// La page ne redirige PAS : état vide explicite, CTA vers les créations.
			expect(new URL(page.url()).pathname).toBe("/paiement");
			await expect(page.getByText(/Ton panier est vide/i)).toBeVisible();
			await expect(page.getByRole("link", { name: /Voir les créations/i })).toBeVisible();
		});

		test("/paiement avec panier rend le récapitulatif hébergé (pays + bouton Stripe)", async ({
			checkoutPage,
			productCatalogPage,
			cartPage,
		}) => {
			const seeded = await checkoutPage.gotoWithSeededCart(productCatalogPage, cartPage);
			test.skip(seeded.skipped, seeded.skipped ? seeded.reason : "");

			// Le pays fixe les frais de port ET verrouille l'adresse Stripe.
			await expect(checkoutPage.countrySelect).toHaveValue("FR");
			await expect(checkoutPage.payButton).toBeEnabled();
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
		test("/paiement/retour sans session_id rend « Commande introuvable »", async ({ page }) => {
			await page.goto("/paiement/retour");
			await page.waitForLoadState("domcontentloaded");

			// Pas de redirection : la landing explique et renvoie vers la boutique.
			expect(new URL(page.url()).pathname).toBe("/paiement/retour");
			await expect(page.getByRole("heading", { name: /Commande introuvable/i })).toBeVisible();
		});

		test("/paiement/retour avec une session inconnue ne divulgue rien", async ({ page }) => {
			await page.goto("/paiement/retour?session_id=cs_test_inconnu_000");
			await page.waitForLoadState("domcontentloaded");

			await expect(page.getByRole("heading", { name: /Commande introuvable/i })).toBeVisible();
		});
	});
});
