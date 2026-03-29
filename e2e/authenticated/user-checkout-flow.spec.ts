import { test, expect } from "../fixtures";
import { requireSeedData } from "../constants";

test.describe("Parcours checkout authentifié", { tag: ["@critical"] }, () => {
	test(
		"parcours d'achat complet : produit → panier → paiement → confirmation",
		{ tag: ["@smoke"] },
		async ({ page, cartPage, checkoutPage, productCatalogPage }) => {
			// 1. Add product to cart using POM helper
			const result = await productCatalogPage.addFirstProductToCart(cartPage);
			if (result.skipped) {
				if (result.seedData) {
					requireSeedData(test, false, result.reason);
				}
				test.skip(true, result.reason);
				return;
			}

			// 2. Navigate to checkout
			await expect(cartPage.checkoutLink).toBeVisible({ timeout: 5000 });
			await cartPage.checkoutLink.click();

			await page.waitForLoadState("domcontentloaded");
			await expect(page).toHaveURL(/\/paiement/);

			// 4. Fill address form and submit
			await checkoutPage.fillAddress();
			await checkoutPage.submitAddress();

			// 5. Wait for Stripe Embedded Checkout and fill card
			const stripeFrame = await checkoutPage.waitForStripeFrame();
			await checkoutPage.fillStripeCard(stripeFrame);
			await checkoutPage.submitPayment(stripeFrame);

			// 7. Wait for redirect to confirmation
			// Stripe processes payment → redirect to /paiement/retour → /paiement/confirmation
			await expect(page).toHaveURL(/\/paiement\/(retour|confirmation)/, { timeout: 30000 });
			await expect(page).toHaveURL(/\/paiement\/confirmation/, { timeout: 15000 });

			// 8. Verify confirmation page content
			const pageContent = await page.textContent("body");
			expect(pageContent).toMatch(/confirmée|confirmé|merci|reçue/i);

			// Order number should be displayed
			expect(pageContent).toMatch(/SYN-\d+|commande/i);
		},
	);

	test("le checkout affiche le formulaire d'adresse avec les champs requis", async ({
		page,
		cartPage,
		productCatalogPage,
	}) => {
		const result = await productCatalogPage.addFirstProductToCart(cartPage);
		if (result.skipped) {
			if (result.seedData) {
				requireSeedData(test, false, result.reason);
			}
			test.skip(true, result.reason);
			return;
		}

		await cartPage.checkoutLink.click();
		await page.waitForLoadState("domcontentloaded");
		await expect(page).toHaveURL(/\/paiement/);

		// Verify address form fields are present
		await expect(page.getByLabel(/Nom complet|Prénom et nom/i)).toBeVisible();
		await expect(page.getByLabel(/^Adresse$|Adresse ligne 1/i)).toBeVisible();
		await expect(page.getByLabel(/Code postal/i)).toBeVisible();
		await expect(page.getByLabel(/Ville/i)).toBeVisible();
		await expect(page.getByLabel(/Téléphone/i)).toBeVisible();
	});

	test("paiement échoué avec carte refusée affiche une erreur", async ({
		page,
		cartPage,
		checkoutPage,
		productCatalogPage,
	}) => {
		// 1. Add product to cart using POM helper
		const result = await productCatalogPage.addFirstProductToCart(cartPage);
		if (result.skipped) {
			if (result.seedData) {
				requireSeedData(test, false, result.reason);
			}
			test.skip(true, result.reason);
			return;
		}

		// 2. Navigate to checkout
		await expect(cartPage.checkoutLink).toBeVisible({ timeout: 5000 });
		await cartPage.checkoutLink.click();

		await page.waitForLoadState("domcontentloaded");
		await expect(page).toHaveURL(/\/paiement/);

		// 3. Fill address form and submit
		await checkoutPage.fillAddress();
		await checkoutPage.submitAddress();

		// 4. Wait for Stripe and fill DECLINED test card
		const stripeFrame = await checkoutPage.waitForStripeFrame();
		await checkoutPage.fillStripeCard(stripeFrame, "4000000000000002");
		await checkoutPage.submitPayment(stripeFrame);

		// 7. Stripe should display a decline error within its iframe
		// The error message appears in the Stripe form, not on a separate page
		const errorMessage = stripeFrame
			.getByText(/refusée|declined|échoué|failed|error/i)
			.or(stripeFrame.locator('[class*="error"]').first());
		await expect(errorMessage).toBeVisible({ timeout: 15000 });

		// 8. Should NOT redirect to confirmation page
		await expect(page).not.toHaveURL(/\/paiement\/confirmation/, { timeout: 5000 });
	});

	test("la page d'annulation affiche le message et le lien de reprise", async ({ page }) => {
		await page.goto("/paiement/annulation");
		await page.waitForLoadState("domcontentloaded");

		// Should display cancellation heading
		const heading = page.getByRole("heading").first();
		await expect(heading).toBeVisible();

		// Description should mention order not finalized
		const description = page.getByText(/n'a pas été finalisée/i);
		await expect(description).toBeVisible();

		// Should have a "Reprendre ma commande" button linking to /paiement
		const retryButton = page.getByRole("link", { name: /Reprendre ma commande/i });
		await expect(retryButton).toBeVisible();
		await expect(retryButton).toHaveAttribute("href", /\/paiement/);

		// Should have a contact link
		const contactLink = page.getByRole("link", { name: /M'écrire/i });
		await expect(contactLink).toBeVisible();
	});

	test("la page d'annulation avec raison affiche un conseil contextuel", async ({ page }) => {
		await page.goto("/paiement/annulation?reason=card_declined");
		await page.waitForLoadState("domcontentloaded");

		// Should display contextual tip for card declined
		const tip = page.getByText(/carte.*activée|banque/i);
		await expect(tip).toBeVisible();

		// Reassurance message
		const reassurance = page.getByText(/panier.*sauvegardés/i);
		await expect(reassurance).toBeVisible();
	});

	test("le checkout valide les champs d'adresse obligatoires", async ({
		page,
		cartPage,
		productCatalogPage,
	}) => {
		const result = await productCatalogPage.addFirstProductToCart(cartPage);
		if (result.skipped) {
			if (result.seedData) {
				requireSeedData(test, false, result.reason);
			}
			test.skip(true, result.reason);
			return;
		}

		await cartPage.checkoutLink.click();
		await page.waitForLoadState("domcontentloaded");

		// Try to submit without filling the form
		const _continueButton = page.getByRole("button", { name: /Continuer|Valider|Payer/i });

		// Fill only partial data to trigger validation
		const fullNameInput = page.getByLabel(/Nom complet|Prénom et nom/i);
		await fullNameInput.fill("A");
		await fullNameInput.blur();

		// Should show validation errors
		const errorMessage = page.getByText(/au moins|obligatoire|requis|invalide/i);
		await expect(errorMessage.first()).toBeVisible({ timeout: 5000 });
	});
});
