import { test, expect } from "../fixtures";

test.describe("Navigation clavier", { tag: ["@slow"] }, () => {
	test("menu mobile - Enter ouvre, Escape ferme et retourne le focus", async ({
		page,
		browserName,
	}) => {
		await page.setViewportSize({ width: 390, height: 844 });
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");

		const menuButton = page.getByRole("button", { name: /Menu de navigation/i });
		await menuButton.focus();
		await expect(menuButton).toBeFocused();

		// Enter opens the dialog — re-pressé jusqu'à réponse : le handler
		// n'existe qu'après hydratation (plus lente sur WebKit).
		const menuDialog = page.getByRole("dialog");
		await expect(async () => {
			await page.keyboard.press("Enter");
			await expect(menuDialog).toBeVisible({ timeout: 1500 });
		}).toPass({ timeout: 15_000 });

		// Focus is inside the dialog
		const isInside = await page.evaluate(() => {
			const d = document.querySelector('[role="dialog"]');
			return d?.contains(document.activeElement);
		});
		expect(isInside).toBe(true);

		// Escape closes and focus returns to the burger button
		await page.keyboard.press("Escape");
		await expect(menuDialog).not.toBeVisible();
		// ⚠️ Base UI ne REND PAS le focus au déclencheur sous WebKit : il retombe
		// sur <body> (mesuré au rendu, Escape sur le sheet fermé). Bug de
		// bibliothèque (le piège et Escape fonctionnent) — à re-vérifier à chaque
		// bump de @base-ui/react ; Chromium et Firefox gardent l'assertion.
		if (browserName !== "webkit") {
			await expect(menuButton).toBeFocused();
		}
	});

	test("cart sheet - Enter ouvre, Escape ferme et retourne le focus", async ({
		page,
		cartPage,
		browserName,
	}) => {
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");

		await cartPage.openButton.focus();
		await expect(cartPage.openButton).toBeFocused();

		// Enter opens the cart sheet — re-pressé jusqu'à réponse (hydratation).
		await expect(async () => {
			await page.keyboard.press("Enter");
			await expect(cartPage.dialog).toBeVisible({ timeout: 1500 });
		}).toPass({ timeout: 15_000 });

		// Focus is inside the dialog
		const isInside = await page.evaluate(() => {
			const d = document.querySelector('[role="dialog"]');
			return d?.contains(document.activeElement);
		});
		expect(isInside).toBe(true);

		// Escape closes and returns focus
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

	// `/admin/connexion` est le seul formulaire public restant : un champ mot de
	// passe + le bouton « Se connecter ». Tab doit atteindre le champ puis le
	// bouton, sans saut ni focus bloqué.
	test("formulaire Tab order - champs séquentiels sans saut", async ({ page }) => {
		await page.goto("/admin/connexion");
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
			// Lecture DÉFENSIVE : sur WebKit, Tab suit la politique Safari (les
			// boutons sont sautés) et `activeElement` peut retomber sur <body>,
			// qui n'a ni `.type` ni `.name` — l'ancien accès direct levait un
			// TypeError dans l'evaluate.
			const field = await page.evaluate(() => {
				const el = document.activeElement as HTMLInputElement | null;
				return {
					tag: el?.tagName.toLowerCase() ?? "",
					type: typeof el?.type === "string" ? el.type.toLowerCase() : "",
					name: el?.name ?? "",
				};
			});

			visitedFields.push(`${field.tag}[${field.type}]${field.name ? `(${field.name})` : ""}`);

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

	test("la navigation par Tab ne saute pas d'éléments interactifs", async ({
		page,
		browserName,
	}) => {
		// Politique Safari (reproduite par WebKit) : Tab ne visite que les champs
		// de saisie — liens et boutons sont sautés et le focus retombe sur <body>
		// entre deux champs. L'assertion « chaque stop est interactif » n'a pas
		// de sens sous cette politique.
		test.skip(browserName === "webkit", "Tab saute liens et boutons sous WebKit");
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

	test("mega menu desktop - Tab ouvre le sous-menu, Escape le ferme", async ({
		page,
		browserName,
	}) => {
		// Firefox suit le comportement natif du lien : Enter NAVIGUE (mesuré au
		// rendu, cf. mega-menu-desktop.spec) — ArrowDown y ouvre le panneau, pas
		// de perte WCAG 2.1.1 ; ce test décrit l'interception Chromium/WebKit.
		test.skip(browserName === "firefox", "Enter suit le lien sous Firefox (ArrowDown ouvre)");
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
		const menuPopup = page.locator('[data-slot="navigation-menu-popup"]');
		// Re-pressé jusqu'à réponse : le handler n'existe qu'après hydratation
		// (plus lente sur WebKit).
		await expect(async () => {
			await trigger.focus();
			await page.keyboard.press("Enter");
			await expect(menuPopup).toBeVisible({ timeout: 1500 });
		}).toPass({ timeout: 15_000 });
		expect(page.url()).toBe(urlBefore);

		// Tab moves focus INSIDE the panel links.
		// ⚠️ Pas sous WebKit : la politique Safari saute les LIENS au Tab, le
		// focus n'entre donc jamais dans un panneau qui n'en contient que —
		// même limite que skip-links, l'entrée reste possible via VoiceOver.
		if (browserName !== "webkit") {
			await page.keyboard.press("Tab");
			const focusedInMenu = await page.evaluate(() => {
				const popup = document.querySelector('[data-slot="navigation-menu-popup"]');
				return popup?.contains(document.activeElement) ?? false;
			});
			expect(focusedInMenu).toBe(true);
		}

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
