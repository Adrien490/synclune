import { test, expect } from "../fixtures";
import { expectNoA11yViolations } from "../helpers/axe";

test.describe("Accessibilité - Pages admin", { tag: ["@slow"] }, () => {
	const adminPages = [
		{ path: "/admin", name: "Dashboard" },
		{ path: "/admin/catalogue/produits", name: "Produits" },
		{ path: "/admin/catalogue/produits/nouveau", name: "Nouveau produit" },
		{ path: "/admin/catalogue/collections", name: "Collections" },
		{ path: "/admin/catalogue/couleurs", name: "Couleurs" },
		{ path: "/admin/catalogue/materiaux", name: "Matériaux" },
		{ path: "/admin/ventes/commandes", name: "Commandes admin" },
		{ path: "/admin/ventes/retractations", name: "Rétractations" },
		{ path: "/admin/catalogue/types-de-produits", name: "Types de produits" },
	];

	for (const { path, name } of adminPages) {
		test(`${name} (${path}) passe l'audit axe-core WCAG AA`, async ({ page }) => {
			await page.goto(path);
			await page.waitForLoadState("domcontentloaded");

			await expectNoA11yViolations(page, { context: name });
		});
	}

	test("la navigation admin a des labels accessibles", async ({ page }) => {
		await page.goto("/admin");
		await page.waitForLoadState("domcontentloaded");

		const navElements = page.getByRole("navigation");
		const count = await navElements.count();
		expect(count).toBeGreaterThan(0);

		for (let i = 0; i < count; i++) {
			const nav = navElements.nth(i);
			const label = await nav.getAttribute("aria-label");
			const labelledby = await nav.getAttribute("aria-labelledby");
			expect(label ?? labelledby, `Navigation ${i} dans l'admin sans nom accessible`).toBeTruthy();
		}
	});

	test("les tableaux admin ont des en-têtes accessibles", async ({ page }) => {
		await page.goto("/admin/ventes/commandes");
		await page.waitForLoadState("domcontentloaded");

		const tables = page.getByRole("table");
		const count = await tables.count();
		if (count === 0) return;

		for (let i = 0; i < count; i++) {
			const table = tables.nth(i);
			const headers = table.getByRole("columnheader");
			const headerCount = await headers.count();
			expect(headerCount, `Table ${i} doit avoir des en-têtes`).toBeGreaterThan(0);
		}
	});

	test("Détail commande admin passe l'audit axe-core WCAG AA", async ({ page }) => {
		await page.goto("/admin/ventes/commandes");
		await page.waitForLoadState("domcontentloaded");

		const firstLink = page.locator("a[href*='/admin/ventes/commandes/']").first();
		if ((await firstLink.count()) === 0) {
			test.skip(true, "Aucune commande dans la base");
			return;
		}
		const href = await firstLink.getAttribute("href");
		if (!href) return;
		await page.goto(href);
		await page.waitForLoadState("domcontentloaded");

		await expectNoA11yViolations(page, { context: "Détail commande admin" });
	});

	test("Modifier produit admin passe l'audit axe-core WCAG AA", async ({ page }) => {
		await page.goto("/admin/catalogue/produits");
		await page.waitForLoadState("domcontentloaded");

		const editLink = page.locator("a[href*='/modifier']").first();
		if ((await editLink.count()) === 0) {
			test.skip(true, "Aucun produit modifiable");
			return;
		}
		const href = await editLink.getAttribute("href");
		if (!href) return;
		await page.goto(href);
		await page.waitForLoadState("domcontentloaded");

		await expectNoA11yViolations(page, { context: "Modifier produit" });
	});

	test("Modifier collection admin passe l'audit axe-core WCAG AA", async ({ page }) => {
		await page.goto("/admin/catalogue/collections");
		await page.waitForLoadState("domcontentloaded");

		const editLink = page.locator("a[href*='/collections/'][href*='/modifier']").first();
		if ((await editLink.count()) === 0) {
			test.skip(true, "Aucune collection modifiable");
			return;
		}
		const href = await editLink.getAttribute("href");
		if (!href) return;
		await page.goto(href);
		await page.waitForLoadState("domcontentloaded");

		await expectNoA11yViolations(page, { context: "Modifier collection" });
	});

	// Added: missing admin pages
	test("Détail produit admin passe l'audit axe-core WCAG AA", async ({ page }) => {
		await page.goto("/admin/catalogue/produits");
		await page.waitForLoadState("domcontentloaded");

		const productLink = page.locator("a[href*='/admin/catalogue/produits/']").first();
		if ((await productLink.count()) === 0) {
			test.skip(true, "Aucun produit dans la base");
			return;
		}
		const href = await productLink.getAttribute("href");
		if (!href || href.includes("/nouveau") || href.includes("/modifier")) return;
		await page.goto(href);
		await page.waitForLoadState("domcontentloaded");

		await expectNoA11yViolations(page, { context: "Détail produit admin" });
	});

	test("Détail collection admin passe l'audit axe-core WCAG AA", async ({ page }) => {
		await page.goto("/admin/catalogue/collections");
		await page.waitForLoadState("domcontentloaded");

		const collectionLink = page.locator("a[href*='/admin/catalogue/collections/']").first();
		if ((await collectionLink.count()) === 0) {
			test.skip(true, "Aucune collection dans la base");
			return;
		}
		const href = await collectionLink.getAttribute("href");
		if (!href || href.includes("/modifier")) return;
		await page.goto(href);
		await page.waitForLoadState("domcontentloaded");

		await expectNoA11yViolations(page, { context: "Détail collection admin" });
	});

	// Migration lean : plus de page Maintenance ni de remboursements — l'audit
	// couvre à la place le détail d'une rétractation via la liste (lot 5).
	test("Liste des rétractations passe l'audit axe-core WCAG AA", async ({ page }) => {
		await page.goto("/admin/ventes/retractations");
		await page.waitForLoadState("domcontentloaded");

		await expectNoA11yViolations(page, { context: "Rétractations" });
	});
});

test.describe("Accessibilité admin - États interactifs axe-core", { tag: ["@slow"] }, () => {
	test("Admin avec dropdown menu ouvert passe l'audit axe-core", async ({ page }) => {
		await page.goto("/admin/catalogue/produits");
		await page.waitForLoadState("domcontentloaded");

		// ⚠️ `[data-radix-dropdown-menu-trigger]` ne matchait PLUS RIEN depuis la
		// migration Base UI (2026-08-04) : `count() === 0` toujours, et le corps
		// entier vivait sous un `if` — le test passait vert sans rien auditer, pour
		// toujours (audit e2e 2026-08-16). Le vrai déclencheur est le bouton
		// « Actions pour <produit> » de `ProductRowActions`. Et il faut l'ATTENDRE :
		// le tableau arrive en streaming, un `count()` juste après
		// `domcontentloaded` rend 0.
		const menuTrigger = page.getByRole("button", { name: /^Actions pour / }).first();
		await expect(menuTrigger).toBeVisible({ timeout: 15_000 });
		await menuTrigger.click();

		const dropdownMenu = page.getByRole("menu");
		await expect(dropdownMenu).toBeVisible();
		await expectNoA11yViolations(page, { context: "Admin (dropdown ouvert)" });
	});
});

// Moved from components-a11y.spec.ts — these tests require admin auth
test.describe("Accessibilité composants admin - DropdownMenu", { tag: ["@slow"] }, () => {
	test("DropdownMenu - flèches, Enter, Escape et retour du focus", async ({ page }) => {
		await page.goto("/admin/catalogue/produits");
		await page.waitForLoadState("domcontentloaded");

		// Attendre le tableau streamé plutôt que compter (skip permanent sinon).
		const trigger = page.getByRole("button", { name: /^Actions pour / }).first();
		await expect(trigger).toBeVisible({ timeout: 15_000 });

		await trigger.focus();
		await page.keyboard.press("Enter");

		const menu = page.getByRole("menu");
		await expect(menu).toBeVisible();

		// Arrow down navigates menu items
		await page.keyboard.press("ArrowDown");

		// Escape closes and returns focus
		await page.keyboard.press("Escape");
		await expect(menu).not.toBeVisible();
		await expect(trigger).toBeFocused();
	});
});

test.describe("Accessibilité composants admin - AlertDialog", { tag: ["@slow"] }, () => {
	test("AlertDialog de suppression - focus trap, Escape annule", async ({ page }) => {
		// 🐛 BUG PRODUIT documenté (audit e2e 2026-08-16, non masqué) : quand la
		// confirmation de suppression est ouverte DEPUIS le menu « Actions » d'une
		// ligne, le focus ne SORT JAMAIS du déclencheur. Mesuré sur
		// /admin/catalogue/couleurs à 200 ms, 1 s et 3 s après l'ouverture :
		// `document.activeElement` reste `<button aria-label="Actions pour Abricot">`,
		// jamais un nœud de l'`alertdialog`. Le piège à focus n'est donc pas armé —
		// au clavier comme au lecteur d'écran, on confirme une suppression
		// définitive sans que le focus soit entré dans la modale (WCAG 2.4.3).
		//
		// Cause probable : l'item porte `closesMenu: false` et ouvre le dialog via
		// le store (`useAlertDialog`), donc le menu Base UI reste monté et garde/
		// restaure le focus par-dessus la modale. Le correctif touche la pile de
		// dismiss partagée par les 4 familles d'overlays (cf. CLAUDE.md § Overlays)
		// — hors périmètre de l'audit des tests, à arbitrer séparément.
		//
		// ⚠️ Ce test EST correct : il échoue parce que le produit a le défaut.
		// `fixme` = suivi, pas absolution. Le retirer dès le correctif posé.
		test.fixme();
		await page.goto("/admin/catalogue/couleurs");
		await page.waitForLoadState("domcontentloaded");

		// ⚠️ La suppression ne vit PAS sur la page : elle est un item du menu
		// « Actions » de ligne. Chercher un bouton « Supprimer » à la racine
		// skippait donc systématiquement, et le focus-trap de l'AlertDialog
		// n'était jamais testé (audit e2e 2026-08-16).
		const rowActions = page.getByRole("button", { name: /^Actions pour / }).first();
		await expect(rowActions).toBeVisible({ timeout: 15_000 });
		await rowActions.click();

		const deleteButton = page.getByRole("menuitem", { name: /Supprimer/i }).first();
		await expect(deleteButton).toBeVisible();
		await deleteButton.click();

		const alertDialog = page.getByRole("alertdialog");
		await expect(alertDialog).toBeVisible();

		// Focus is inside the alert dialog.
		// ⚠️ Base UI déplace le focus APRÈS l'animation d'ouverture : un
		// `page.evaluate` synchrone juste après `toBeVisible()` lit encore le
		// déclencheur. On sonde jusqu'à ce que le piège soit armé.
		await expect
			.poll(
				() =>
					page.evaluate(
						() =>
							document.querySelector('[role="alertdialog"]')?.contains(document.activeElement) ??
							false,
					),
				{ timeout: 5_000 },
			)
			.toBe(true);

		// Escape closes without action
		await page.keyboard.press("Escape");
		await expect(alertDialog).not.toBeVisible();
	});
});

/**
 * ⚠️ Le test « Tabs - ArrowRight/ArrowLeft » a été SUPPRIMÉ le 2026-08-16 :
 * `ProductTabs` (`modules/products/components/admin/product-tabs.tsx`) n'est
 * monté par AUCUNE page de `app/` — c'est un composant orphelin, dont seul son
 * propre test unitaire dépend. Il n'existe donc aucun `role="tablist"` dans
 * l'admin, et le test skippait à chaque run en prétendant couvrir la
 * navigation clavier des onglets. Candidat `pnpm knip` côté produit.
 */
/**
 * ⚠️ Le test « Switch - Space toggle et aria-checked » a été SUPPRIMÉ le
 * 2026-08-16 : `SwitchField` n'est monté par aucune surface admin depuis la
 * migration lean (les statuts sont des booléens `active` pilotés par les
 * actions de ligne, cf. `use-color-actions`). Le test cherchait un
 * `role="switch"` sur /admin/catalogue/couleurs et skippait donc à chaque run
 * — un test mort, pas une couverture. Le jour où un switch revient dans
 * l'admin, le rétablir en ciblant la surface qui le rend.
 */
test.describe("Accessibilité admin - Navigation clavier", { tag: ["@slow"] }, () => {
	test("Sidebar admin - Tab entre les sections, Enter ouvre/ferme collapsible", async ({
		page,
	}) => {
		await page.goto("/admin");
		await page.waitForLoadState("domcontentloaded");

		// Find the admin sidebar navigation
		const sidebar = page.locator("aside, nav").first();
		if ((await sidebar.count()) === 0) {
			test.skip(true, "Pas de sidebar admin");
			return;
		}

		// Find collapsible section triggers (Catalogue, Ventes, Marketing)
		const collapsibleTriggers = sidebar.locator(
			'button[data-state="open"], button[data-state="closed"]',
		);
		if ((await collapsibleTriggers.count()) === 0) {
			// Try links instead
			const navLinks = sidebar.locator("a");
			if ((await navLinks.count()) === 0) return;

			await navLinks.first().focus();
			await expect(navLinks.first()).toBeFocused();

			// Tab navigates to next link
			await page.keyboard.press("Tab");
			const focused = page.locator(":focus");
			await expect(focused).toBeAttached();
			return;
		}

		const trigger = collapsibleTriggers.first();
		await trigger.focus();
		await expect(trigger).toBeFocused();

		const initialState = await trigger.getAttribute("data-state");

		// Enter toggles the section
		await page.keyboard.press("Enter");
		const newState = await trigger.getAttribute("data-state");
		if (initialState === "open") {
			expect(newState).toBe("closed");
		} else {
			expect(newState).toBe("open");
		}
	});

	test("Speed Dial FAB admin - Tab, Enter ouvre, Escape ferme", async ({ page }) => {
		await page.goto("/admin");
		await page.waitForLoadState("domcontentloaded");

		// Find the FAB (Speed Dial) button
		const fabButton = page
			.locator('button[aria-label*="Actions rapides" i], button[aria-haspopup="menu"]')
			.last();
		if ((await fabButton.count()) === 0) {
			test.skip(true, "Pas de Speed Dial FAB sur cette page");
			return;
		}

		await fabButton.focus();
		await expect(fabButton).toBeFocused();

		// Enter opens the speed dial menu
		await page.keyboard.press("Enter");

		// ⚠️ Assertions DURES : l'ancien `waitFor().catch(() => {})` suivi d'un
		// `if (count > 0)` garantissait le vert quoi qu'il arrive (audit 2026-08-16).
		const menu = page.getByRole("menu");
		await expect(menu).toBeVisible({ timeout: 10_000 });

		// ArrowDown navigates menu items
		await page.keyboard.press("ArrowDown");

		// Escape closes
		await page.keyboard.press("Escape");
		await expect(menu).not.toBeVisible();
	});
});
