import { test, expect } from "./fixtures";
import { requireSeedData } from "./constants";
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

		// L'étal de la home rend les photos produit : zéro image = seed absent
		// (skip local, échec CI), pas un vert silencieux.
		requireSeedData(test, count > 0, "Aucune image non décorative sur la homepage (seed absent)");

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

			// Un lien doit avoir soit du texte visible, soit un aria-label, soit un
			// title. ⚠️ L'ancienne chaîne `(a && …) ?? (b && …)` court-circuitait
			// sur `aria-label=""` : `"" && …` vaut `""` (falsy mais PAS nullish),
			// le `??` ne repliait jamais sur le texte et le test échouait/passait
			// pour la mauvaise raison. `some` dit ce qu'on veut : au moins une
			// source NON VIDE (et non « non nullish », d'où le refus de `??`).
			const hasAccessibleName = [ariaLabel, textContent, title].some(
				(source) => (source ?? "").trim().length > 0,
			);

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

		requireSeedData(test, count > 0, "Aucune carte produit sur /produits (seed absent)");

		for (let i = 0; i < Math.min(count, 5); i++) {
			const img = productImages.nth(i);
			const alt = await img.getAttribute("alt");
			expect(alt, `L'image produit ${i} doit avoir un attribut alt`).not.toBeNull();
		}
	});

	test("les cartes produit sont navigables au clavier", async ({ productCatalogPage }) => {
		const count = await productCatalogPage.productLinks.count();

		requireSeedData(test, count > 0, "Aucun lien produit sur /produits (seed absent)");

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
		test.skip(count === 0, "Produit sans sélecteur de variantes (pas de radiogroup)");
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
		test.skip((await btn.count()) === 0, "Produit à options : pas de bouton d'ajout direct");
		const text = await btn.textContent();
		expect(text?.trim().length).toBeGreaterThan(0);
	});

	test("le fil d'Ariane marque la page courante", async ({ page }) => {
		test.skip(!productHref, "Pas de produits");
		const breadcrumb = page.getByRole("navigation", { name: /fil d'ariane|breadcrumb/i });
		test.skip((await breadcrumb.count()) === 0, "Pas de fil d'Ariane sur cette fiche");
		const current = breadcrumb.locator('[aria-current="page"]');
		await expect(current).toBeAttached();
	});

	test("la fiche produit passe l'audit axe-core WCAG AA", async ({ page }) => {
		test.skip(!productHref, "Pas de produits");
		await expectNoA11yViolations(page, { context: "Fiche produit" });
	});

	test("navigation clavier dans les variantes", async ({ page }) => {
		test.skip(!productHref, "Pas de produits");
		// Sélecteurs maison (`useRadioGroupKeyboard`, ARIA APG) : les flèches font
		// du roving focus DANS le premier groupe. ⚠️ L'ancienne version acceptait
		// `data-state === "checked"` (attribut Radix, mort depuis Base UI — jamais
		// posé) OU le focus, sous double `if` : elle ne pouvait pas échouer. On
		// assert désormais LE comportement : ArrowDown déplace le focus sur la
		// deuxième option du groupe.
		const firstGroup = page.getByRole("radiogroup").first();
		test.skip((await firstGroup.count()) === 0, "Produit sans sélecteur de variantes");
		const radios = firstGroup.getByRole("radio");
		test.skip((await radios.count()) < 2, "Une seule option : rien à parcourir aux flèches");

		await radios.first().focus();
		await expect(radios.first()).toBeFocused();
		await page.keyboard.press("ArrowDown");
		await expect(radios.nth(1)).toBeFocused();
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
		test.skip((await filterButton.count()) === 0, "Pas de bouton Filtrer en mobile");
		await filterButton.click();
		// Attente déterministe (l'ancien waitForTimeout(300) espérait la fin d'une
		// animation) : le panneau est un dialog, on attend sa visibilité.
		await expect(page.getByRole("dialog")).toBeVisible();
		await expectNoA11yViolations(page, { context: "Catalogue (filtres mobiles ouverts)" });
	});

	test("Quick-search ouverte passe l'audit axe-core", async ({ page, searchPage }) => {
		// `searchPage.open()` attend l'hydratation du déclencheur puis la
		// visibilité du dialog — surface jamais auditée par axe jusqu'ici.
		await searchPage.open();
		await expect(searchPage.searchInput).toBeVisible();

		await expectNoA11yViolations(page, { context: "Quick-search (dialog ouvert)" });
	});

	test("ConfirmDialog « Vider le panier » ouvert passe l'audit axe-core", async ({
		page,
		productCatalogPage,
		cartPage,
	}) => {
		// Le bouton « Vider le panier » n'existe qu'avec au moins un article :
		// même semis que le tunnel (cf. checkout-accessibility).
		const seeded = await productCatalogPage.addFirstProductToCart(cartPage);
		requireSeedData(test, !seeded.skipped, seeded.skipped ? seeded.reason : "");
		if (seeded.skipped) return;

		await cartPage.open();
		await page.getByRole("button", { name: /Vider le panier/i }).click();

		const alertDialog = page.getByRole("alertdialog");
		await expect(alertDialog).toBeVisible();
		await expect(alertDialog.getByText(/Vider ton panier \?/i)).toBeVisible();

		await expectNoA11yViolations(page, { context: "ConfirmDialog (vider le panier)" });
	});

	test("Formulaire de connexion admin EN ERREUR passe l'audit axe-core", async ({ page }) => {
		// `/admin/connexion` est publique (hors garde) : l'état d'erreur — alerte
		// assertive focusée après un mauvais mot de passe — est donc auditable
		// sans session. C'est le seul formulaire public du site, et son état
		// d'erreur n'était couvert par aucun audit axe.
		await page.goto("/admin/connexion");
		await page.waitForLoadState("domcontentloaded");

		const passwordInput = page.getByRole("textbox", { name: /Mot de passe/i });
		await passwordInput.fill("mauvais-mot-de-passe-e2e");
		// La soumission peut précéder l'hydratation : re-soumettre jusqu'à l'alerte.
		const errorAlert = page.getByRole("alert").filter({ hasText: /Mot de passe incorrect/i });
		await expect(async () => {
			if (!(await errorAlert.isVisible())) {
				await page
					.getByRole("button", { name: /Se connecter/i })
					.click({ timeout: 1000 })
					.catch(() => {});
			}
			await expect(errorAlert).toBeVisible({ timeout: 2000 });
		}).toPass({ timeout: 15_000 });

		await expectNoA11yViolations(page, { context: "Connexion admin (erreur)" });
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
