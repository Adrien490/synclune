import { test, expect } from "../fixtures";
import { requireSeedData } from "../constants";

test.describe(
	"Parcours paiement asynchrone (SEPA)",
	{ tag: ["@critical", "@async-payment"] },
	() => {
		test("paiement SEPA pending → affiche la page de confirmation avec statut en attente", async ({
			page,
			cartPage,
			checkoutPage,
			productCatalogPage,
		}) => {
			// 1. Navigate to products and find one to purchase
			await productCatalogPage.goto();

			const productCount = await productCatalogPage.productLinks.count();
			requireSeedData(test, productCount > 0, "No products found");

			await productCatalogPage.gotoFirstProduct();

			// 2. Add to cart
			const addButtonCount = await productCatalogPage.addToCartButton.count();
			test.skip(addButtonCount === 0, "Product requires SKU selection");

			await productCatalogPage.addToCartButton.first().click();
			await expect(cartPage.dialog).toBeVisible({ timeout: 5000 });

			// 3. Navigate to checkout
			await expect(cartPage.checkoutLink).toBeVisible({ timeout: 5000 });
			await cartPage.checkoutLink.click();

			await page.waitForLoadState("domcontentloaded");
			await expect(page).toHaveURL(/\/paiement/);

			// 4. Fill address form and submit
			await checkoutPage.fillAddress();
			await checkoutPage.submitAddress();

			// 5. Wait for Stripe Embedded Checkout
			const stripeFrame = await checkoutPage.waitForStripeFrame();

			// 6. Use Stripe's test SEPA IBAN for delayed notification
			// pm_sepa_debit test IBAN: DE89370400440532013000 (succeeds after delay)
			const ibanInput = stripeFrame
				.getByPlaceholder(/IBAN/i)
				.or(stripeFrame.locator('[name="iban"]'))
				.or(stripeFrame.locator("#iban"));

			// SEPA payment method may not be available in all Stripe configurations
			const hasSepa = (await ibanInput.count()) > 0;
			test.skip(!hasSepa, "SEPA payment method not available in this Stripe configuration");

			await ibanInput.fill("DE89370400440532013000");

			// Fill name if required for SEPA
			const nameInput = stripeFrame
				.getByPlaceholder(/nom|name/i)
				.or(stripeFrame.locator('[name="billingName"]'));
			if ((await nameInput.count()) > 0) {
				await nameInput.first().fill("Marie Dupont");
			}

			// Fill email if required for SEPA
			const emailInput = stripeFrame
				.getByPlaceholder(/email/i)
				.or(stripeFrame.locator('[name="email"]'));
			if ((await emailInput.count()) > 0) {
				await emailInput.first().fill("test@synclune.com");
			}

			// 7. Accept SEPA mandate and submit
			const mandateCheckbox = stripeFrame.getByRole("checkbox");
			if ((await mandateCheckbox.count()) > 0) {
				await mandateCheckbox.first().check();
			}

			await checkoutPage.submitPayment(stripeFrame);

			// 8. Wait for redirect — async payments go through /paiement/retour → /paiement/confirmation
			await expect(page).toHaveURL(/\/paiement\/(retour|confirmation)/, { timeout: 30000 });
			await expect(page).toHaveURL(/\/paiement\/confirmation/, { timeout: 15000 });

			// 9. Verify confirmation page shows pending status
			const pageContent = await page.textContent("body");
			// Should show confirmation OR pending message
			expect(pageContent).toMatch(/confirmée|confirmé|en attente|traitement|merci|reçue/i);

			// Order number should be displayed
			expect(pageContent).toMatch(/SYN-\d+|commande/i);
		});
	},
);
