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

	// @regression address-country-hidden-input — l'ancienne assertion acceptait
	// n'importe quel [role="alert"] : l'alerte d'ERREUR (pays manquant du FormData,
	// champ disabled) suffisait à faire passer le test. On exige le message de succès.
	test(
		"creer une adresse avec des donnees valides",
		{ tag: ["@smoke"] },
		async ({ addressPage, page }) => {
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

			// Le message de succès explicite — PAS un [role="alert"] générique
			// (l'alerte d'erreur destructive porte aussi role="alert")
			const successMessage = page.getByText(/ajoutée|enregistrée|créée/i);
			await expect(successMessage.first()).toBeVisible({ timeout: 5000 });
		},
	);

	/**
	 * @regression gated-form-submit — une double soumission ne crée qu'une adresse.
	 *
	 * Le bouton `disabled` pendant le pending ne couvre pas la touche Entrée, et
	 * `useActionState` sérialise les dispatchs au lieu de les ignorer : deux
	 * pressions rapides créaient donc deux adresses identiques.
	 */
	test(
		"une double soumission rapide ne crée qu'une seule adresse",
		{ tag: ["@smoke"] },
		async ({ addressPage, page }) => {
			await addressPage.goto();
			await addressPage.openCreateDialog();

			await addressPage.fillAddressForm({
				firstName: "TestDouble",
				lastName: "E2E",
				address1: "8 avenue des Tests",
				postalCode: "44000",
				city: "Nantes",
				phone: "0612345678",
			});

			// Entrée depuis un champ : contourne le `disabled` du bouton.
			const phoneInput = page.getByLabel(/Téléphone/i).first();
			await phoneInput.press("Enter");
			await phoneInput.press("Enter");

			const successMessage = page.getByText(/ajoutée|enregistrée|créée/i);
			await expect(successMessage.first()).toBeVisible({ timeout: 5000 });

			await addressPage.goto();
			await expect(page.getByText("TestDouble")).toHaveCount(1);
		},
	);

	test("la navigation vers les adresses depuis le compte fonctionne", async ({ page }) => {
		await page.goto("/commandes");
		await page.waitForLoadState("domcontentloaded");

		const addressesLink = page.getByRole("link", { name: /Adresses|Gérer mes adresses/i });
		const linkCount = await addressesLink.count();
		test.skip(linkCount === 0, "No addresses link found in account page");

		await addressesLink.first().click();
		await page.waitForLoadState("domcontentloaded");

		await expect(page).toHaveURL(/\/adresses/);
	});
});
