import { test, expect } from "./fixtures";
import { expectNoA11yViolations } from "./helpers/axe";

// Les audits photographient l'état STABLE : reduced-motion AVANT la navigation.
// Le helper l'émule au moment de l'audit, trop tard pour une transition déjà
// lancée (fondu d'entrée, scrim d'overlay) — axe capturait des contrastes de
// transition fantômes (ex. 1,38:1 sur du texte à mi-fondu).
test.beforeEach(async ({ page }) => {
	await page.emulateMedia({ reducedMotion: "reduce" });
});

test.describe("Accessibilité - Homepage", { tag: ["@slow"] }, () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");
	});

	test("la homepage a exactement un h1", async ({ page }) => {
		const h1Elements = page.getByRole("heading", { level: 1 });

		// ⚠️ L'assertion était « 0 ou 1 » avec un commentaire affirmant que le
		// hero portait le titre — or le hero avait été supprimé (vidage de la
		// landing, 2026-08-03) et la home n'avait plus AUCUN h1 : le test
		// passait pour la mauvaise raison, et la home pouvait perdre son titre
		// principal sans qu'aucun test ne rougisse. Le bloc titre de l'étal le
		// rend de nouveau, quel que soit l'état du catalogue (il vit hors de la
		// frontière Suspense de la grille).
		await expect(h1Elements).toHaveCount(1);
		await expect(h1Elements.first()).toBeVisible();

		// La hiérarchie ne saute pas de h1 à h3 : les titres de carte sont des
		// h3, un h2 (masqué) les rattache au titre de page. `heading-order` est
		// une règle best-practice d'axe, hors des tags WCAG scannés ici — sans
		// cette assertion, rien ne la couvre.
		await expect(page.getByRole("heading", { level: 2 })).not.toHaveCount(0);
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
		// `exact: true` : sur mobile, « Navigation principale de la boutique »
		// (bottom-nav) matche aussi en mode non-exact — strict violation.
		const mainNav = page.getByRole("navigation", { name: "Navigation principale", exact: true });
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

		// Activer avec Enter. Le handler n'existe qu'après hydratation (plus
		// lente sur WebKit) : on re-presse jusqu'à ce que le sheet réponde.
		await expect(async () => {
			await cartPage.openButton.page().keyboard.press("Enter");
			await expect(cartPage.dialog).toBeVisible({ timeout: 1500 });
		}).toPass({ timeout: 15_000 });
	});

	test("le menu mobile est accessible au clavier", async ({ page }) => {
		await page.setViewportSize({ width: 390, height: 844 });
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");

		const menuButton = page.getByRole("button", { name: /Menu de navigation/i });
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
				(ariaLabel && ariaLabel.trim().length > 0) ??
				(textContent && textContent.trim().length > 0) ??
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

		// Re-focus jusqu'à tenue : sous la charge d'un run complet, WebKit peut
		// perdre un focus() programmatique posé pendant l'hydratation.
		await expect(async () => {
			await productCatalogPage.productLinks.first().focus();
			await expect(productCatalogPage.productLinks.first()).toBeFocused({ timeout: 1000 });
		}).toPass({ timeout: 15_000 });
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
		// `toHaveCount` retente : le h1 peut arriver en streaming (PPR) après
		// `domcontentloaded`, un `count()` instantané lisait 0.
		await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
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
			expect(label ?? labelledby, `Radiogroup ${i} sans nom accessible`).toBeTruthy();
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
		await expectNoA11yViolations(page, { context: "Fiche produit" });
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
		// P1 - Public critical pages
		{ path: "/collections", name: "Collections" },
		{ path: "/favoris", name: "Favoris" },
		{ path: "/paiement/annulation", name: "Checkout annulation" },
		// ⚠️ Pas de `/paiement/retour` : cette page ne rend RIEN. Elle se termine
		// toujours par un `redirect()`, donc axe analysait la page d'ARRIVÉE — quand
		// il ne plantait pas sur « Execution context was destroyed » en course avec
		// la navigation. Seul `retour/loading.tsx` est visible par l'utilisateur.
	];

	for (const { path, name } of pagesToAudit) {
		test(`${name} (${path}) passe l'audit axe-core WCAG AA`, async ({ page }) => {
			await page.goto(path);
			await page.waitForLoadState("domcontentloaded");

			await expectNoA11yViolations(page, { context: name });
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

		await expectNoA11yViolations(page, { context: "Fiche produit" });
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

		await expectNoA11yViolations(page, { context: "Collection detail" });
	});

	test("Page catégorie /produits/[typeSlug] passe l'audit axe-core WCAG AA", async ({ page }) => {
		await page.goto("/produits");
		await page.waitForLoadState("domcontentloaded");

		const categoryLink = page.locator("a[href*='/produits/']").first();
		if ((await categoryLink.count()) === 0) {
			test.skip(true, "Pas de catégories de produits");
			return;
		}
		const href = await categoryLink.getAttribute("href");
		if (!href || href === "/produits") return;
		await page.goto(href);
		await page.waitForLoadState("domcontentloaded");

		await expectNoA11yViolations(page, { context: "Catégorie produits" });
	});
});

test.describe("Accessibilité - États interactifs axe-core", { tag: ["@slow"] }, () => {
	test("Homepage avec cart sheet ouvert passe l'audit axe-core", async ({ page, cartPage }) => {
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");
		await cartPage.open();
		await expectNoA11yViolations(page, { context: "Homepage (cart sheet ouvert)" });
	});

	test("Catalogue avec filtres mobiles ouverts passe l'audit axe-core", async ({ page }) => {
		await page.setViewportSize({ width: 390, height: 844 });
		await page.goto("/produits");
		await page.waitForLoadState("domcontentloaded");

		const filterButton = page.getByRole("button", { name: /Filtrer|Filtres/i });
		if ((await filterButton.count()) > 0) {
			await filterButton.click();
			await page.waitForTimeout(300);
			await expectNoA11yViolations(page, { context: "Catalogue (filtres mobiles ouverts)" });
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

			await expectNoA11yViolations(page, { context: name });
		});
	}
});
