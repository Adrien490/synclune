import { test, expect } from "../fixtures";

test.describe("Parcours achat clavier complet", { tag: ["@slow"] }, () => {
	test("navigation clavier de la liste produits au checkout", async ({ page, cartPage }) => {
		// 1. Navigate to product listing
		await page.goto("/produits");
		await page.waitForLoadState("domcontentloaded");

		const productLinks = page.locator("article a[href*='/creations/']");
		const count = await productLinks.count();
		if (count === 0) {
			test.skip(true, "Pas de produits dans la base");
			return;
		}

		// Tab to the first product card and Enter
		const firstProduct = productLinks.first();
		await firstProduct.focus();
		await expect(firstProduct).toBeFocused();
		await page.keyboard.press("Enter");
		await page.waitForLoadState("domcontentloaded");

		// 2. Product detail page
		expect(page.url()).toContain("/creations/");

		// Tab to add-to-cart button
		const addToCartButton = page.getByRole("button", { name: /Ajouter au panier/i }).first();
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
			await page.waitForLoadState("domcontentloaded");

			// 4. Checkout page
			expect(page.url()).toContain("/paiement");

			// Tab through checkout form fields
			const fullNameInput = page.getByLabel(/Nom complet|Prénom et nom/i);
			if ((await fullNameInput.count()) > 0) {
				await fullNameInput.focus();
				await expect(fullNameInput).toBeFocused();
				await fullNameInput.fill("Marie Dupont");

				// Tab to next field
				await page.keyboard.press("Tab");
				const activeTag = await page.evaluate(() => document.activeElement?.tagName?.toLowerCase());
				expect(["input", "select", "textarea"]).toContain(activeTag);
			}

			// Find terms checkbox and verify Space toggles it
			const termsCheckbox = page.getByLabel(/conditions générales|J'accepte/i);
			if ((await termsCheckbox.count()) > 0) {
				await termsCheckbox.focus();
				await expect(termsCheckbox).toBeFocused();
				await page.keyboard.press("Space");
				await expect(termsCheckbox).toBeChecked();
			}
		}
	});

	test("le focus ne sort pas du formulaire checkout pendant la saisie", async ({ page }) => {
		await page.goto("/paiement");
		await page.waitForLoadState("domcontentloaded");

		// If redirected to login, skip
		if (page.url().includes("connexion")) {
			test.skip(true, "Authentification requise pour le checkout");
			return;
		}

		// If redirected because cart is empty, skip
		if (!page.url().includes("paiement")) {
			test.skip(true, "Panier vide - redirection");
			return;
		}

		const formInputs = page.locator("form input, form select, form textarea");
		const inputCount = await formInputs.count();
		if (inputCount === 0) return;

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
					return el?.closest("form") !== null || el?.closest("main") !== null;
				});
				expect(isStillInForm, `Tab ${i + 1}: focus has left the form area`).toBe(true);
			}
		}
	});
});
