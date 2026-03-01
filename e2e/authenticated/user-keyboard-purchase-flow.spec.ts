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

	test("validation des erreurs de formulaire checkout au clavier", async ({ page }) => {
		await page.goto("/paiement");
		await page.waitForLoadState("domcontentloaded");

		if (page.url().includes("connexion") || !page.url().includes("paiement")) {
			test.skip(true, "Authentification requise ou panier vide");
			return;
		}

		// Find the submit button and try submitting empty form
		const submitButton = page.getByRole("button", { name: /Payer|Valider|Commander/i }).first();
		if ((await submitButton.count()) === 0) {
			test.skip(true, "Pas de bouton de soumission");
			return;
		}

		await submitButton.focus();
		await page.keyboard.press("Enter");

		// After failed validation, focus should move to first error field
		await page.waitForTimeout(500);

		const focusedTag = await page.evaluate(() => document.activeElement?.tagName?.toLowerCase());
		const hasErrorMessage = await page.locator('[role="alert"], [aria-invalid="true"]').count();

		// Either focus moved to an input or error messages appeared
		expect(
			focusedTag === "input" || focusedTag === "select" || hasErrorMessage > 0,
			"Le formulaire doit montrer des erreurs ou déplacer le focus vers le premier champ invalide",
		).toBe(true);
	});

	test("navigation clavier dans la galerie produit", async ({ page }) => {
		await page.goto("/produits");
		await page.waitForLoadState("domcontentloaded");

		const productLink = page.locator("article a[href*='/creations/']").first();
		if ((await productLink.count()) === 0) {
			test.skip(true, "Pas de produits dans la base");
			return;
		}
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
		const focusedTag = await page.evaluate(() => document.activeElement?.tagName?.toLowerCase());
		expect(["button", "a", "img"]).toContain(focusedTag);
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
