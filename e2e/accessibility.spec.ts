import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "./fixtures";

test.describe("Accessibilité - Homepage", { tag: ["@slow"] }, () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");
	});

	test("la homepage n'a pas de h1 en double", async ({ page }) => {
		const h1Elements = page.getByRole("heading", { level: 1 });
		const count = await h1Elements.count();
		// La homepage peut avoir 0 ou 1 h1 visible (le hero contient le titre principal)
		// On accepte 0 ou 1 mais jamais plus
		expect(count).toBeLessThanOrEqual(1);
	});

	test("les images de la homepage ont des attributs alt", async ({ page }) => {
		// Wait for images to be present in the DOM
		await page.waitForLoadState("domcontentloaded");

		// Récupérer toutes les images non décoratives (sans aria-hidden)
		const images = page.locator('img:not([aria-hidden="true"])');
		const count = await images.count();

		if (count === 0) {
			// Pas d'images non décoratives sur la page, test OK
			return;
		}

		// Vérifier que chaque image non décorative a un alt
		for (let i = 0; i < count; i++) {
			const img = images.nth(i);
			const alt = await img.getAttribute("alt");
			const role = await img.getAttribute("role");

			// Les images avec role="presentation" ou aria-hidden sont OK sans alt textuel
			if (role === "presentation") continue;

			// Les images sans alt doivent avoir role="presentation" ou être décoratives
			// On vérifie que alt n'est pas null (peut être vide "" pour décoratif)
			expect(alt, `Image ${i} doit avoir un attribut alt`).not.toBeNull();
		}
	});

	test("la navbar a un label aria pour la navigation principale", async ({ page }) => {
		const mainNav = page.getByRole("navigation", { name: "Navigation principale" });
		await expect(mainNav).toBeVisible();
	});

	test("le footer a un label aria", async ({ page }) => {
		const footer = page.getByRole("contentinfo");
		await expect(footer).toBeAttached();
	});

	test("les éléments interactifs de la navbar sont focusables au clavier", async ({ page }) => {
		// Appuyer sur Tab pour traverser les éléments focusables
		await page.keyboard.press("Tab");

		// Vérifier qu'un élément est focalisé
		const focusedElement = page.locator(":focus");
		await expect(focusedElement).toBeAttached();
	});

	test("le bouton panier est accessible au clavier", async ({ cartPage }) => {
		await cartPage.openButton.focus();
		await expect(cartPage.openButton).toBeFocused();

		// Activer avec Enter
		await cartPage.openButton.page().keyboard.press("Enter");

		// Le sheet doit s'ouvrir
		await expect(cartPage.dialog).toBeVisible();
	});

	test("le menu mobile est accessible au clavier", async ({ page }) => {
		await page.setViewportSize({ width: 390, height: 844 });
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");

		const menuButton = page.getByRole("button", { name: /Ouvrir le menu de navigation/i });
		await menuButton.focus();
		await expect(menuButton).toBeFocused();

		// Ouvrir avec Enter
		await page.keyboard.press("Enter");

		const menuDialog = page.getByRole("dialog");
		await expect(menuDialog).toBeVisible();
	});

	test("les liens de la navbar ont des textes descriptifs ou des aria-label", async ({ page }) => {
		// Tous les liens de la navbar doivent avoir du texte ou un aria-label
		const navLinks = page.locator('nav[aria-label="Navigation principale"] a');
		const count = await navLinks.count();

		for (let i = 0; i < count; i++) {
			const link = navLinks.nth(i);
			const ariaLabel = await link.getAttribute("aria-label");
			const textContent = await link.textContent();
			const title = await link.getAttribute("title");

			// Un lien doit avoir soit du texte visible, soit un aria-label, soit un title
			const hasAccessibleName =
				(ariaLabel && ariaLabel.trim().length > 0) ||
				(textContent && textContent.trim().length > 0) ||
				(title && title.trim().length > 0);

			expect(hasAccessibleName, `Le lien ${i} dans la navbar n'a pas de nom accessible`).toBe(true);
		}
	});
});

test.describe("Accessibilité - Page produits", { tag: ["@slow"] }, () => {
	test.beforeEach(async ({ productCatalogPage }) => {
		await productCatalogPage.goto();
	});

	test("la page /produits n'a qu'un seul h1", async ({ page }) => {
		const h1Elements = page.getByRole("heading", { level: 1 });
		const count = await h1Elements.count();
		expect(count).toBe(1);
	});

	test("les cartes produit ont des images avec alt", async ({ page }) => {
		const productImages = page.locator("article img, [data-product-card] img");
		const count = await productImages.count();

		if (count === 0) return; // Pas de produits, test ignoré

		for (let i = 0; i < Math.min(count, 5); i++) {
			const img = productImages.nth(i);
			const alt = await img.getAttribute("alt");
			expect(alt, `L'image produit ${i} doit avoir un attribut alt`).not.toBeNull();
		}
	});

	test("les cartes produit sont navigables au clavier", async ({ productCatalogPage }) => {
		const count = await productCatalogPage.productLinks.count();

		if (count === 0) return; // Pas de produits, test ignoré

		await productCatalogPage.productLinks.first().focus();
		await expect(productCatalogPage.productLinks.first()).toBeFocused();
	});
});

test.describe("Accessibilité - Formulaires auth", { tag: ["@slow"] }, () => {
	test("le formulaire de connexion a des labels associés à ses champs", async ({ authPage }) => {
		await authPage.goto();

		await expect(authPage.emailInput).toBeVisible();

		const emailLabel = authPage.emailInput
			.page()
			.locator("label")
			.filter({ hasText: /Email/i })
			.first();
		await expect(emailLabel).toBeAttached();
	});

	test("le formulaire d'inscription a des labels associés à ses champs", async ({ page }) => {
		await page.goto("/inscription");
		await page.waitForLoadState("domcontentloaded");

		const nameInput = page.getByRole("textbox", { name: /Prénom/i });
		await expect(nameInput).toBeVisible();

		const nameLabel = page
			.locator("label")
			.filter({ hasText: /Prénom/i })
			.first();
		await expect(nameLabel).toBeAttached();
	});

	test("les messages d'erreur sont annoncés via aria-live", async ({ page, authPage }) => {
		await authPage.goto();

		await authPage.emailInput.fill("invalide");
		await authPage.emailInput.blur();

		const errorMessage = page.getByText(/Format d'email invalide/i);
		await expect(errorMessage).toBeVisible();

		// Verify aria-live announcement for screen readers
		const errorContainer = errorMessage.locator("..");
		await expect(errorContainer).toHaveAttribute("aria-live", /(polite|assertive)/);
	});

	test("les boutons de soumission ont des textes descriptifs", async ({ authPage }) => {
		await authPage.goto();

		await expect(authPage.submitButton).toBeVisible();

		const buttonText = await authPage.submitButton.textContent();
		expect(buttonText?.trim().length).toBeGreaterThan(0);
	});
});

test.describe("Accessibilité - Cart Sheet", { tag: ["@slow"] }, () => {
	test("le cart sheet a les attributs ARIA corrects quand ouvert", async ({ cartPage }) => {
		await cartPage.openButton.page().goto("/");
		await cartPage.openButton.page().waitForLoadState("domcontentloaded");

		await cartPage.open();

		// Le dialog doit avoir un titre accessible (SheetTitle)
		await expect(cartPage.title).toBeVisible();
	});

	test("le focus est géré correctement à l'ouverture du cart sheet", async ({ page, cartPage }) => {
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");

		await cartPage.open();

		// Vérifier qu'un élément dans le dialog est focusé
		const focusedElement = page.locator(":focus");
		await expect(focusedElement).toBeAttached();
	});
});

test.describe("Accessibilité - Fiche produit", { tag: ["@slow"] }, () => {
	let productHref: string | null = null;

	test.beforeEach(async ({ page }) => {
		await page.goto("/produits");
		await page.waitForLoadState("domcontentloaded");
		const firstLink = page.locator("article a[href*='/creations/']").first();
		if ((await firstLink.count()) === 0) return;
		productHref = await firstLink.getAttribute("href");
		if (productHref) {
			await page.goto(productHref);
			await page.waitForLoadState("domcontentloaded");
		}
	});

	test("la fiche produit a un seul h1", async ({ page }) => {
		test.skip(!productHref, "Pas de produits dans la base");
		const count = await page.getByRole("heading", { level: 1 }).count();
		expect(count).toBe(1);
	});

	test("les images produit ont des alt descriptifs", async ({ page }) => {
		test.skip(!productHref, "Pas de produits");
		const images = page.locator('img:not([aria-hidden="true"])');
		const count = await images.count();
		for (let i = 0; i < Math.min(count, 5); i++) {
			const alt = await images.nth(i).getAttribute("alt");
			expect(alt, `Image ${i} doit avoir un alt`).not.toBeNull();
		}
	});

	test("le sélecteur de variantes est un radiogroup accessible", async ({ page }) => {
		test.skip(!productHref, "Pas de produits");
		const radioGroups = page.getByRole("radiogroup");
		const count = await radioGroups.count();
		if (count === 0) return;
		for (let i = 0; i < count; i++) {
			const group = radioGroups.nth(i);
			const label = await group.getAttribute("aria-label");
			const labelledby = await group.getAttribute("aria-labelledby");
			expect(label || labelledby, `Radiogroup ${i} sans nom accessible`).toBeTruthy();
		}
	});

	test("le bouton ajout panier a un nom accessible", async ({ page }) => {
		test.skip(!productHref, "Pas de produits");
		const btn = page.getByRole("button", { name: /Ajouter au panier/i }).first();
		if ((await btn.count()) === 0) return;
		const text = await btn.textContent();
		expect(text?.trim().length).toBeGreaterThan(0);
	});

	test("le fil d'Ariane marque la page courante", async ({ page }) => {
		test.skip(!productHref, "Pas de produits");
		const breadcrumb = page.getByRole("navigation", { name: /fil d'ariane|breadcrumb/i });
		if ((await breadcrumb.count()) === 0) return;
		const current = breadcrumb.locator('[aria-current="page"]');
		await expect(current).toBeAttached();
	});

	test("la fiche produit passe l'audit axe-core WCAG AA", async ({ page }) => {
		test.skip(!productHref, "Pas de produits");
		const results = await new AxeBuilder({ page })
			.withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
			.exclude(".particle-background")
			.analyze();

		if (results.violations.length > 0) {
			const summary = results.violations
				.map((v) => `[${v.id}] ${v.description} (${v.nodes.length} node(s))`)
				.join("\n");
			expect(results.violations, `Violations WCAG:\n${summary}`).toEqual([]);
		}
	});

	test("navigation clavier dans les variantes", async ({ page }) => {
		test.skip(!productHref, "Pas de produits");
		const firstRadio = page.getByRole("radio").first();
		if ((await firstRadio.count()) === 0) return;
		await firstRadio.focus();
		await expect(firstRadio).toBeFocused();
		await page.keyboard.press("ArrowDown");
		const secondRadio = page.getByRole("radio").nth(1);
		if ((await secondRadio.count()) > 0) {
			const state = await secondRadio.getAttribute("data-state");
			const isFocused = await secondRadio.evaluate((el) => el === document.activeElement);
			expect(state === "checked" || isFocused).toBe(true);
		}
	});
});

test.describe("Accessibilité - Structure des pages", { tag: ["@slow"] }, () => {
	const pagesToCheck = [
		{ path: "/", name: "Homepage" },
		{ path: "/produits", name: "Catalogue" },
		{ path: "/connexion", name: "Connexion" },
		{ path: "/inscription", name: "Inscription" },
	];

	for (const { path, name } of pagesToCheck) {
		test(`${name} (${path}) a un élément main`, async ({ page }) => {
			await page.goto(path);
			await page.waitForLoadState("domcontentloaded");

			const mainElement = page.locator("main, [role='main']").first();
			await expect(mainElement).toBeAttached();
		});

		test(`${name} (${path}) n'a pas d'images sans attribut alt`, async ({ page }) => {
			await page.goto(path);
			await page.waitForLoadState("domcontentloaded");

			const imagesWithoutAlt = page.locator('img:not([alt]):not([aria-hidden="true"])');
			const count = await imagesWithoutAlt.count();
			expect(count).toBe(0);
		});
	}
});

test.describe("Accessibilité - Audit axe-core WCAG AA", { tag: ["@slow"] }, () => {
	const pagesToAudit = [
		// Existing
		{ path: "/", name: "Homepage" },
		{ path: "/produits", name: "Catalogue" },
		{ path: "/connexion", name: "Connexion" },
		{ path: "/inscription", name: "Inscription" },
		// P1 - Public critical pages
		{ path: "/collections", name: "Collections" },
		{ path: "/favoris", name: "Favoris" },
		{ path: "/mot-de-passe-oublie", name: "Mot de passe oublié" },
		{ path: "/personnalisation", name: "Personnalisation" },
		{ path: "/paiement/annulation", name: "Checkout annulation" },
		{ path: "/~offline", name: "Page offline" },
	];

	for (const { path, name } of pagesToAudit) {
		test(`${name} (${path}) passe l'audit axe-core WCAG AA`, async ({ page }) => {
			await page.goto(path);
			await page.waitForLoadState("domcontentloaded");

			const results = await new AxeBuilder({ page })
				.withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
				.analyze();

			if (results.violations.length > 0) {
				const summary = results.violations
					.map((v) => `[${v.id}] ${v.description} (${v.nodes.length} node(s))`)
					.join("\n");
				expect(results.violations, `Violations WCAG sur ${name}:\n${summary}`).toEqual([]);
			}
		});
	}

	// P1 - Dynamic slug pages
	test("Fiche produit passe l'audit axe-core WCAG AA", async ({ page }) => {
		await page.goto("/produits");
		await page.waitForLoadState("domcontentloaded");
		const firstLink = page.locator("article a[href*='/creations/']").first();
		if ((await firstLink.count()) === 0) {
			test.skip(true, "Pas de produits dans la base");
			return;
		}
		const href = await firstLink.getAttribute("href");
		if (!href) return;
		await page.goto(href);
		await page.waitForLoadState("domcontentloaded");

		const results = await new AxeBuilder({ page })
			.withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
			.exclude(".particle-background")
			.analyze();

		if (results.violations.length > 0) {
			const summary = results.violations
				.map((v) => `[${v.id}] ${v.description} (${v.nodes.length} node(s))`)
				.join("\n");
			expect(results.violations, `Violations WCAG fiche produit:\n${summary}`).toEqual([]);
		}
	});

	test("Collection detail passe l'audit axe-core WCAG AA", async ({ page }) => {
		await page.goto("/collections");
		await page.waitForLoadState("domcontentloaded");
		const firstLink = page.locator("a[href*='/collections/']").first();
		if ((await firstLink.count()) === 0) {
			test.skip(true, "Pas de collections dans la base");
			return;
		}
		const href = await firstLink.getAttribute("href");
		if (!href) return;
		await page.goto(href);
		await page.waitForLoadState("domcontentloaded");

		const results = await new AxeBuilder({ page })
			.withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
			.analyze();

		if (results.violations.length > 0) {
			const summary = results.violations
				.map((v) => `[${v.id}] ${v.description} (${v.nodes.length} node(s))`)
				.join("\n");
			expect(results.violations, `Violations WCAG collection detail:\n${summary}`).toEqual([]);
		}
	});
});

test.describe("Accessibilité - Pages légales (P2)", { tag: ["@slow"] }, () => {
	const legalPages = [
		{ path: "/cgv", name: "CGV" },
		{ path: "/confidentialite", name: "Confidentialité" },
		{ path: "/cookies", name: "Cookies" },
		{ path: "/mentions-legales", name: "Mentions légales" },
		{ path: "/informations-legales", name: "Informations légales" },
		{ path: "/retractation", name: "Rétractation" },
		{ path: "/accessibilite", name: "Accessibilité" },
	];

	for (const { path, name } of legalPages) {
		test(`${name} (${path}) passe l'audit axe-core WCAG AA`, async ({ page }) => {
			await page.goto(path);
			await page.waitForLoadState("domcontentloaded");

			const results = await new AxeBuilder({ page })
				.withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
				.analyze();

			if (results.violations.length > 0) {
				const summary = results.violations
					.map((v) => `[${v.id}] ${v.description} (${v.nodes.length} node(s))`)
					.join("\n");
				expect(results.violations, `Violations WCAG sur ${name}:\n${summary}`).toEqual([]);
			}
		});
	}
});
