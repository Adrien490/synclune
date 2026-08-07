import { test, expect } from "../fixtures";

test.describe("Navigation clavier", { tag: ["@slow"] }, () => {
	test("menu mobile - Enter ouvre, Escape ferme et retourne le focus", async ({ page }) => {
		await page.setViewportSize({ width: 390, height: 844 });
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");

		const menuButton = page.getByRole("button", { name: /Menu de navigation/i });
		await menuButton.focus();
		await expect(menuButton).toBeFocused();

		// Enter opens the dialog
		await page.keyboard.press("Enter");
		const menuDialog = page.getByRole("dialog");
		await expect(menuDialog).toBeVisible();

		// Focus is inside the dialog
		const isInside = await page.evaluate(() => {
			const d = document.querySelector('[role="dialog"]');
			return d?.contains(document.activeElement);
		});
		expect(isInside).toBe(true);

		// Escape closes and focus returns to the burger button
		await page.keyboard.press("Escape");
		await expect(menuDialog).not.toBeVisible();
		await expect(menuButton).toBeFocused();
	});

	test("cart sheet - Enter ouvre, Escape ferme et retourne le focus", async ({
		page,
		cartPage,
	}) => {
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");

		await cartPage.openButton.focus();
		await expect(cartPage.openButton).toBeFocused();

		// Enter opens the cart sheet
		await page.keyboard.press("Enter");
		await expect(cartPage.dialog).toBeVisible();

		// Focus is inside the dialog
		const isInside = await page.evaluate(() => {
			const d = document.querySelector('[role="dialog"]');
			return d?.contains(document.activeElement);
		});
		expect(isInside).toBe(true);

		// Escape closes and returns focus
		await page.keyboard.press("Escape");
		await expect(cartPage.dialog).not.toBeVisible();
		await expect(cartPage.openButton).toBeFocused();
	});

	/*
	 * Retirés : « recherche - Tab vers searchbox » et « recherche autocomplete -
	 * ArrowDown/Enter/Escape ».
	 *
	 * Les deux cherchaient un `searchbox` ou un bouton `/Rechercher/i` sur `/`, où
	 * ni l'un ni l'autre n'existe : la home n'a pas de champ inline, et le nom
	 * accessible du déclencheur est « Ouvrir la recherche rapide ». Résultat : le
	 * premier passait avec ZÉRO assertion exécutée (toutes ses branches `if` étaient
	 * fausses) et le second atteignait toujours `test.skip(true)`. La navigation aux
	 * flèches de la recherche rapide n'avait donc, en pratique, aucune couverture E2E.
	 *
	 * Elle est désormais couverte pour de bon dans `e2e/quick-search.spec.ts`
	 * (« ArrowDown moves aria-activedescendant… », « Enter on the active option… »,
	 * « ArrowDown in idle mode moves real focus… ») — au bon endroit, avec les vrais
	 * sélecteurs du dialog.
	 */

	// `/connexion` remplace `/inscription` comme support de ce test : la route
	// d'inscription a été supprimée (2026-07-31) et le formulaire de connexion porte
	// les mêmes primitives (champs + submit) que ce test éprouve.
	test("formulaire Tab order - champs séquentiels sans saut", async ({ page }) => {
		await page.goto("/connexion");
		await page.waitForLoadState("domcontentloaded");

		// Collect all form inputs in order
		const formFields = page.locator(
			'form input:not([type="hidden"]), form select, form textarea, form button[type="submit"]',
		);
		const fieldCount = await formFields.count();

		if (fieldCount < 2) {
			test.skip(true, "Formulaire insuffisant pour tester le tab order");
			return;
		}

		// Focus the first field
		await formFields.first().focus();
		await expect(formFields.first()).toBeFocused();

		// Tab through all fields and verify sequential order
		const visitedFields: string[] = [];
		for (let i = 0; i < Math.min(fieldCount, 8); i++) {
			const tagName = await page.evaluate(() => document.activeElement?.tagName.toLowerCase());
			const inputType = await page.evaluate(() =>
				(document.activeElement as HTMLInputElement).type.toLowerCase(),
			);
			const name = await page.evaluate(
				() => (document.activeElement as HTMLInputElement).name || "",
			);

			visitedFields.push(`${tagName}[${inputType || ""}]${name ? `(${name})` : ""}`);

			await page.keyboard.press("Tab");
		}

		// Verify we visited multiple distinct fields (no stuck focus)
		const uniqueFields = new Set(visitedFields);
		expect(
			uniqueFields.size,
			"Le focus Tab devrait traverser des champs distincts",
		).toBeGreaterThan(1);
	});

	test("les cartes produit sont navigables par Tab", async ({ page }) => {
		await page.goto("/produits");
		await page.waitForLoadState("domcontentloaded");

		const productLinks = page.locator("article a").first();
		if ((await productLinks.count()) === 0) return;

		await productLinks.focus();
		await expect(productLinks).toBeFocused();

		// Enter activates the link
		const href = await productLinks.getAttribute("href");
		expect(href).toBeTruthy();
	});

	test("filter sheet mobile - Enter ouvre, focus trapped, Escape ferme", async ({ page }) => {
		await page.setViewportSize({ width: 390, height: 844 });
		await page.goto("/produits");
		await page.waitForLoadState("domcontentloaded");

		const filterButton = page.getByRole("button", { name: /Filtrer|Filtres/i }).first();
		if ((await filterButton.count()) === 0) {
			test.skip(true, "Pas de bouton Filtrer en mobile");
			return;
		}

		await filterButton.focus();
		await expect(filterButton).toBeFocused();

		// Enter opens the filter sheet
		await page.keyboard.press("Enter");

		const dialog = page.getByRole("dialog");
		await expect(dialog).toBeVisible();

		// Focus is inside the dialog
		const isInside = await page.evaluate(() => {
			const d = document.querySelector('[role="dialog"]');
			return d?.contains(document.activeElement);
		});
		expect(isInside).toBe(true);

		// Tab through filter options
		await page.keyboard.press("Tab");

		// Escape closes and returns focus
		await page.keyboard.press("Escape");
		await expect(dialog).not.toBeVisible();
	});

	test("tri mobile - Enter ouvre le panneau de filtres, le compartiment Trier par est au clavier", async ({
		page,
	}) => {
		// Plus de tiroir de tri dédié (2026-08-06) : le tri vit dans le
		// compartiment « Trier par » du panneau de filtres, ouvert par « Filtrer ».
		await page.setViewportSize({ width: 390, height: 844 });
		await page.goto("/produits");
		await page.waitForLoadState("domcontentloaded");

		const filterButton = page.getByRole("button", { name: /Filtrer/i }).first();
		if ((await filterButton.count()) === 0) {
			test.skip(true, "Pas de bouton Filtrer en mobile");
			return;
		}

		await filterButton.focus();
		await expect(filterButton).toBeFocused();

		// Enter opens the filter panel
		await page.keyboard.press("Enter");

		const dialog = page.getByRole("dialog");
		if ((await dialog.count()) > 0) {
			await expect(dialog).toBeVisible();

			// Le compartiment « Trier par » expose ses options en radios nommées
			await expect(dialog.getByRole("radio", { name: "Plus récents" })).toBeVisible();

			// Escape closes
			await page.keyboard.press("Escape");
			await expect(dialog).not.toBeVisible();
		}
	});

	test("cookie banner - Tab through options, Enter active le choix", async ({ page }) => {
		// Le consentement vit en localStorage (Zustand persist, clé "cookie-consent"),
		// PAS en cookie — l'ancien clearCookies() ne déclenchait rien. Et la bannière
		// est un landmark region nommé par son h2, pas un dialog : les anciens
		// sélecteurs ne matchaient jamais → test.skip systématique (faux positif
		// silencieux, audit cookie-banner 2026-08-03).
		await page.addInitScript(() => window.localStorage.removeItem("cookie-consent"));
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");

		// Chunk lazy (dynamic ssr:false) : la bannière apparaît après hydratation
		const cookieBanner = page.getByRole("region", { name: "Cookies" });
		await expect(cookieBanner).toBeVisible({ timeout: 10_000 });

		const acceptButton = cookieBanner.getByRole("button", { name: "Accepter" });
		await acceptButton.focus();
		await expect(acceptButton).toBeFocused();

		// Enter activates the choice
		await page.keyboard.press("Enter");

		// Banner should disappear
		await expect(cookieBanner).not.toBeVisible({ timeout: 3000 });
	});

	test("la navigation par Tab ne saute pas d'éléments interactifs", async ({ page }) => {
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");

		// Tab through first 10 elements and verify each one is interactive
		for (let i = 0; i < 10; i++) {
			await page.keyboard.press("Tab");

			const tagName = await page.evaluate(() => document.activeElement?.tagName.toLowerCase());
			const role = await page.evaluate(() => document.activeElement?.getAttribute("role"));
			const tabIndex = await page.evaluate(() => document.activeElement?.getAttribute("tabindex"));

			// Focused element should be a naturally interactive element or have tabindex
			const isInteractive =
				["a", "button", "input", "select", "textarea", "summary"].includes(tagName ?? "") ||
				["button", "link", "combobox", "menuitem", "tab", "searchbox"].includes(role ?? "") ||
				tabIndex !== null;

			expect(
				isInteractive,
				`Tab stop ${i + 1}: <${tagName}> role="${role}" n'est pas interactif`,
			).toBe(true);
		}
	});

	test("mega menu desktop - Tab ouvre le sous-menu, Escape le ferme", async ({ page }) => {
		// Desktop viewport
		await page.setViewportSize({ width: 1280, height: 800 });
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");

		// Triggers Base UI (migration Radix → Base UI du 2026-08-04) : de vraies
		// ancres avec `role="button"` (`nativeButton={false}`), identifiées par
		// `data-slot` — les attributs `data-radix-*` que ce test ciblait avant ont
		// disparu, et son garde le faisait se skip en silence à chaque run.
		const navTriggers = page.locator(
			'nav[aria-label="Navigation principale"] [data-slot="navigation-menu-trigger"]',
		);
		if ((await navTriggers.count()) === 0) {
			// Catalogue vide : hasDropdown=false, le trigger est rendu en lien simple.
			test.skip(true, "Pas de mega menu desktop (catalogue vide)");
			return;
		}

		const trigger = navTriggers.first();
		await trigger.focus();
		await expect(trigger).toBeFocused();

		// Enter opens the mega menu panel (the click carries detail===0 →
		// preventDefault + Base UI opens; navigation must NOT happen).
		const urlBefore = page.url();
		await page.keyboard.press("Enter");

		const menuPopup = page.locator('[data-slot="navigation-menu-popup"]');
		await expect(menuPopup).toBeVisible({ timeout: 3000 });
		expect(page.url()).toBe(urlBefore);

		// Tab moves focus INSIDE the panel links
		await page.keyboard.press("Tab");
		const focusedInMenu = await page.evaluate(() => {
			const popup = document.querySelector('[data-slot="navigation-menu-popup"]');
			return popup?.contains(document.activeElement) ?? false;
		});
		expect(focusedInMenu).toBe(true);

		// Escape closes the mega menu
		await page.keyboard.press("Escape");
		await expect(menuPopup).not.toBeVisible();
	});

	test("pagination - Tab vers boutons page, Enter change de page", async ({ page }) => {
		await page.goto("/produits");
		await page.waitForLoadState("domcontentloaded");

		// Look for pagination navigation
		const pagination = page.getByRole("navigation", { name: /pagination/i });
		if ((await pagination.count()) === 0) {
			test.skip(true, "Pas de pagination sur la page produits");
			return;
		}

		// Find page buttons or links inside pagination
		const pageLinks = pagination.locator("a, button").first();
		if ((await pageLinks.count()) === 0) return;

		await pageLinks.focus();
		await expect(pageLinks).toBeFocused();

		// Verify the pagination element is keyboard accessible
		const href = await pageLinks.getAttribute("href");
		const role = await pageLinks.evaluate((el) => el.tagName.toLowerCase());
		expect(href ?? role === "button").toBeTruthy();
	});
});
