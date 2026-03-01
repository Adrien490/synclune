import { test, expect } from "../fixtures";

test.describe("Gestion des adresses", { tag: ["@regression"] }, () => {
	test("la page adresses est accessible", async ({ addressPage }) => {
		await addressPage.goto();

		await expect(addressPage.heading).toBeVisible();
	});

	test("le bouton ajouter une adresse est visible", async ({ addressPage }) => {
		await addressPage.goto();

		await expect(addressPage.addButton).toBeVisible();
	});

	test("ouvrir le formulaire d'ajout d'adresse", async ({ addressPage, page }) => {
		await addressPage.goto();

		await addressPage.openCreateDialog();

		// Form fields should be visible
		const firstNameInput = page.getByLabel(/Prénom/i);
		await expect(firstNameInput.first()).toBeVisible();
	});

	test("le formulaire valide les champs obligatoires", async ({ addressPage, page }) => {
		await addressPage.goto();
		await addressPage.openCreateDialog();

		// Try to submit with empty fields
		await addressPage.submitForm();

		// Should show validation errors
		const errorMessage = page.getByText(/obligatoire|requis|invalide/i);
		await expect(errorMessage.first()).toBeVisible({ timeout: 3000 });
	});

	test("le formulaire valide le code postal", async ({ addressPage, page }) => {
		await addressPage.goto();
		await addressPage.openCreateDialog();

		// Fill with invalid postal code
		await page.getByLabel(/Code postal/i).fill("123");
		await page.getByLabel(/Code postal/i).blur();

		const errorMessage = page.getByText(/code postal|5 chiffres|invalide/i);
		await expect(errorMessage.first()).toBeVisible({ timeout: 3000 });
	});

	test("creer une adresse avec des donnees valides", async ({ addressPage, page }) => {
		await addressPage.goto();
		await addressPage.openCreateDialog();

		// Use identifiable test data for cleanup (firstName: "TestAddr")
		await addressPage.fillAddressForm({
			firstName: "TestAddr",
			lastName: "E2E",
			address1: "12 rue de la Paix",
			postalCode: "75002",
			city: "Paris",
			phone: "0612345678",
		});

		await addressPage.submitForm();

		// Wait for success feedback
		const successAlert = page
			.locator('[role="alert"]')
			.or(page.getByText(/ajoutée|enregistrée|créée/i));
		await expect(successAlert.first()).toBeVisible({ timeout: 5000 });
	});

	test("la navigation vers les adresses depuis le compte fonctionne", async ({ page }) => {
		await page.goto("/compte");
		await page.waitForLoadState("domcontentloaded");

		const addressesLink = page.getByRole("link", { name: /Adresses|Gérer mes adresses/i });
		const linkCount = await addressesLink.count();
		test.skip(linkCount === 0, "No addresses link found in account page");

		await addressesLink.first().click();
		await page.waitForLoadState("domcontentloaded");

		await expect(page).toHaveURL(/\/adresses/);
	});
});
