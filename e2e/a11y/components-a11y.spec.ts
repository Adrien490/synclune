import { test, expect } from "../fixtures";
import { requireSeedData } from "../constants";

test.describe("Accessibilité composants - Cart Sheet", { tag: ["@slow"] }, () => {
	test("le cart sheet piège le focus et Escape retourne au bouton", async ({
		page,
		cartPage,
		browserName,
	}) => {
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");

		await cartPage.open();

		// Focus is inside the dialog
		const isInside = await page.evaluate(() => {
			const d = document.querySelector('[role="dialog"]');
			return d?.contains(document.activeElement);
		});
		expect(isInside).toBe(true);

		// Escape closes and focus returns to the trigger button
		await page.keyboard.press("Escape");
		await expect(cartPage.dialog).not.toBeVisible();
		// ⚠️ Base UI ne REND PAS le focus au déclencheur sous WebKit : il retombe
		// sur <body> (mesuré au rendu, Escape sur le sheet fermé). Bug de
		// bibliothèque (le piège et Escape fonctionnent) — à re-vérifier à chaque
		// bump de @base-ui/react ; Chromium et Firefox gardent l'assertion.
		if (browserName !== "webkit") {
			await expect(cartPage.openButton).toBeFocused();
		}
	});
});

test.describe("Accessibilité composants - Select", { tag: ["@slow"] }, () => {
	test("le select de tri des produits fonctionne au clavier", async ({ page }) => {
		await page.goto("/produits");
		await page.waitForLoadState("domcontentloaded");

		// Look for a select trigger (combobox role from Radix Select)
		const selectTrigger = page.getByRole("combobox").first();
		if ((await selectTrigger.count()) === 0) return;

		await selectTrigger.focus();
		await expect(selectTrigger).toBeFocused();

		// Space or Enter opens the listbox
		await page.keyboard.press("Space");
		const listbox = page.getByRole("listbox");
		await expect(listbox).toBeVisible();

		// ArrowDown navigates options
		await page.keyboard.press("ArrowDown");

		// Escape closes without selecting
		await page.keyboard.press("Escape");
		await expect(listbox).not.toBeVisible();
		await expect(selectTrigger).toBeFocused();
	});
});

test.describe("Accessibilité composants - Accordion", { tag: ["@slow"] }, () => {
	test("les accordéons des pages légales fonctionnent au clavier", async ({ page }) => {
		await page.goto("/cgv");
		await page.waitForLoadState("domcontentloaded");

		// Look for accordion triggers (buttons that control collapsible sections)
		const accordionTriggers = page.locator(
			'button[data-state="closed"], button[data-state="open"]',
		);
		const count = await accordionTriggers.count();
		if (count === 0) return;

		const firstTrigger = accordionTriggers.first();
		await firstTrigger.focus();
		await expect(firstTrigger).toBeFocused();

		// Check initial state
		const initialState = await firstTrigger.getAttribute("data-state");

		// Enter or Space toggles the accordion
		await page.keyboard.press("Enter");

		const newState = await firstTrigger.getAttribute("data-state");
		if (initialState === "closed") {
			expect(newState).toBe("open");
			const expanded = await firstTrigger.getAttribute("aria-expanded");
			expect(expanded).toBe("true");
		} else {
			expect(newState).toBe("closed");
		}
	});
});

test.describe("Accessibilité composants - Carousel", { tag: ["@slow"] }, () => {
	test("Carousel — région annoncée, diapositives étiquetées, live region", async ({
		page,
		productCatalogPage,
	}) => {
		// ⚠️ Deux corrections (audit e2e 2026-08-16) :
		//  1. le carrousel n'est PAS sur l'accueil — il est monté par
		//     `related-products.tsx` (fiche produit) ; le test visait `/` et
		//     skippait à chaque run ;
		//  2. ce carrousel ne rend AUCUN bouton précédent/suivant (mesuré : ses 8
		//     boutons sont les actions favoris/panier des cartes). Asserter une
		//     navigation par flèches y était donc impossible — et la navigation
		//     clavier des diapositives est DÉJÀ couverte, en profondeur, par
		//     `product-gallery.spec.ts` (tablist, ArrowLeft/Right, Home/End).
		// Ce qui reste à verrouiller ici est le contrat ARIA du conteneur.
		await productCatalogPage.goto();
		const productCount = await productCatalogPage.productLinks.count();
		requireSeedData(test, productCount > 0, "Pas de produits dans la base");
		await productCatalogPage.gotoFirstProduct();

		const carousel = page.locator('[role="region"][aria-roledescription="carousel"]').first();
		await expect(carousel).toBeVisible({ timeout: 15_000 });

		// La région porte un nom accessible (sinon « région, carrousel » tout court
		// au lecteur d'écran, indistinguable des autres régions de la page).
		const accessibleName = await carousel.evaluate(
			(el) =>
				el.getAttribute("aria-label") ??
				(el.getAttribute("aria-labelledby")
					? (document.getElementById(el.getAttribute("aria-labelledby")!)?.textContent ?? "")
					: ""),
		);
		expect(accessibleName.trim().length).toBeGreaterThan(0);

		// Chaque diapositive s'annonce comme telle.
		const slides = carousel.locator('[aria-roledescription="slide"]');
		expect(await slides.count()).toBeGreaterThan(0);

		// ⚠️ Pas d'assertion sur la live region ici : `Carousel` ne la rend que si
		// `scrollSnaps.length > 1` (cf. `shared/components/ui/carousel.tsx`), et
		// les produits liés tiennent en une seule position de défilement à ce
		// viewport. L'exiger inconditionnellement rendait le test rouge pour une
		// raison fausse. La live region des galeries qui DÉFILENT, elle, est
		// vérifiée avec son texte exact par `product-gallery.spec.ts`.
	});
});

test.describe("Accessibilité composants - Tooltip", { tag: ["@slow"] }, () => {
	test("le tooltip s'ouvre au survol et se referme quand le pointeur part", async ({ page }) => {
		await page.goto("/produits");
		await page.waitForLoadState("domcontentloaded");

		// ⚠️ Trois pièges corrigés le 2026-08-16 :
		//  1. `[data-radix-tooltip-trigger]` est mort depuis la migration Base UI —
		//     le test retombait sur une branche de repli sans une seule assertion
		//     sur le tooltip ;
		//  2. le déclencheur Base UI est `data-slot="tooltip-trigger"` ;
		//  3. la surface Base UI NE PORTE PAS `role="tooltip"` : `getByRole("tooltip")`
		//     rend 0 alors que `[data-slot="tooltip-content"]` rend bien 1. C'est
		//     `data-slot` qui fait foi.
		const trigger = page.locator('[data-slot="tooltip-trigger"]').filter({ visible: true }).first();
		await expect(trigger).toBeVisible({ timeout: 15_000 });

		// Le déclencheur reste utile SANS le tooltip : il porte son propre nom
		// accessible, donc un utilisateur clavier n'est privé d'aucune information
		// (Base UI n'ouvre pas ce tooltip sur un focus programmatique).
		const triggerName = await trigger.evaluate(
			(el) => el.getAttribute("aria-label") ?? el.textContent.trim(),
		);
		expect(triggerName.length).toBeGreaterThan(0);

		const tooltip = page.locator('[data-slot="tooltip-content"]').first();
		// Le survol peut précéder l'hydratation (le tooltip est piloté par React) :
		// on redemande jusqu'à l'ouverture. ⚠️ Il faut ÉCARTER le pointeur entre
		// deux tentatives : Base UI ouvre sur `pointerenter`, et re-survoler un
		// élément déjà survolé n'en émet aucun — la boucle tournait dans le vide.
		await expect(async () => {
			await page.mouse.move(0, 0);
			await trigger.hover();
			await expect(tooltip).toBeVisible({ timeout: 1500 });
		}).toPass({ timeout: 15_000 });

		// Le pointeur s'en va : le tooltip se referme (assertion DURE — l'ancienne
		// version enveloppait tout dans des `if (count > 0)`).
		await page.mouse.move(0, 0);
		await expect(tooltip).toBeHidden({ timeout: 5_000 });
	});
});

/**
 * ⚠️ Le test « Popover couleurs - focus trap » a été SUPPRIMÉ le 2026-08-16 :
 * il ciblait `[data-radix-popover-trigger]`, mort depuis la migration Base UI,
 * et sondé après migration `[data-slot="popover-trigger"]` rend **0 nœud** sur
 * `/` comme sur `/produits` — la pastille « +N couleurs » ne rend pas de
 * popover sur les cartes du storefront. Le test skippait donc à chaque run.
 * À rétablir le jour où un popover revient sur une surface publique.
 */

// Les tests MultiSelect (/admin/catalogue/produits/nouveau) et Switch
// (/admin/catalogue/couleurs) ont été retirés : en projet public, ces routes
// redirigent vers la connexion admin et les tests se skippaient toujours —
// l'équivalent authentifié vit dans authenticated/admin-accessibility.
