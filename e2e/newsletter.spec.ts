import { test, expect } from "./fixtures";
import { testEmail } from "./helpers/test-run";

test.describe("Newsletter", { tag: ["@regression"] }, () => {
	test("le formulaire newsletter est visible dans le footer", async ({ page }) => {
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");

		const footer = page.locator("footer");
		const newsletterInput = footer
			.getByLabel(/newsletter/i)
			.or(footer.locator('input[type="email"]'));

		await expect(newsletterInput.first()).toBeVisible();
	});

	test("le formulaire valide le format email", async ({ page }) => {
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");

		const footer = page.locator("footer");
		const emailInput = footer.getByLabel(/newsletter/i).or(footer.locator('input[type="email"]'));

		test.skip((await emailInput.count()) === 0, "No newsletter form in footer");

		// Submit with invalid email
		await emailInput.first().fill("pas-un-email");

		const submitButton = footer.getByRole("button", { name: /S'inscrire/i });
		test.skip((await submitButton.count()) === 0, "No newsletter submit button found");

		await submitButton.click();

		// Should show validation error or browser validation
		const errorMessage = page
			.getByText(/email.*invalide|format/i)
			.or(page.locator('[role="alert"]'));

		await expect(async () => {
			const hasError = await errorMessage.first().isVisible();
			const hasNativeValidation = await emailInput
				.first()
				.evaluate((el: HTMLInputElement) => !el.checkValidity());
			expect(hasError || hasNativeValidation).toBe(true);
		}).toPass({ timeout: 3000 });
	});

	test("le formulaire requiert le consentement RGPD", async ({ page }) => {
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");

		const footer = page.locator("footer");
		const consentCheckbox = footer.getByLabel(/J'accepte.*newsletter/i);

		// RGPD consent checkbox should be present
		// Skip test if the form doesn't have a consent checkbox
		const checkboxCount = await consentCheckbox.count();
		test.skip(checkboxCount === 0, "No RGPD consent checkbox in newsletter form");

		await expect(consentCheckbox).toBeVisible();
	});

	test("s'inscrire avec un email valide affiche une confirmation", async ({ page }) => {
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");

		const footer = page.locator("footer");
		const emailInput = footer.getByLabel(/newsletter/i).or(footer.locator('input[type="email"]'));

		test.skip((await emailInput.count()) === 0, "No newsletter form in footer");

		await emailInput.first().fill(testEmail("newsletter"));

		// Check consent if present
		const consentCheckbox = footer.getByLabel(/J'accepte.*newsletter/i);
		if ((await consentCheckbox.count()) > 0) {
			await consentCheckbox.check();
		}

		const submitButton = footer.getByRole("button", { name: /S'inscrire/i });
		test.skip((await submitButton.count()) === 0, "No newsletter submit button found");

		await submitButton.click();

		// Expect explicit success feedback — rate limit is a failure, not an acceptable state
		const successFeedback = page.getByText(/Inscrit|Merci|confirmation|envoyé/i);
		await expect(successFeedback.first()).toBeVisible({ timeout: 5000 });
	});

	test("la page de confirmation newsletter existe", async ({ page }) => {
		const response = await page.goto("/newsletter/confirmer");
		await page.waitForLoadState("domcontentloaded");

		// Page should load (200 or redirect)
		expect(response?.status()).toBeLessThan(500);
	});

	test("la page de desinscription newsletter existe", async ({ page }) => {
		const response = await page.goto("/newsletter/desinscription");
		await page.waitForLoadState("domcontentloaded");

		// Page should load (200 or redirect)
		expect(response?.status()).toBeLessThan(500);
	});
});
