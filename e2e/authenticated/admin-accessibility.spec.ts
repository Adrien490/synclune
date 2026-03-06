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
		{ path: "/admin/ventes/remboursements", name: "Remboursements" },
		{ path: "/admin/marketing/avis", name: "Avis" },
		{ path: "/admin/marketing/discounts", name: "Discounts" },
		{ path: "/admin/marketing/newsletter", name: "Newsletter" },
		{ path: "/admin/marketing/personnalisations", name: "Personnalisations" },
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

	test("Nouveau remboursement admin passe l'audit axe-core WCAG AA", async ({ page }) => {
		await page.goto("/admin/ventes/remboursements/nouveau");
		await page.waitForLoadState("domcontentloaded");

		await expectNoA11yViolations(page, { context: "Nouveau remboursement" });
	});
});

test.describe("Accessibilité admin - États interactifs axe-core", { tag: ["@slow"] }, () => {
	test("Admin avec dropdown menu ouvert passe l'audit axe-core", async ({ page }) => {
		await page.goto("/admin/catalogue/produits");
		await page.waitForLoadState("domcontentloaded");

		const menuTrigger = page.locator("[data-radix-dropdown-menu-trigger]").first();
		if ((await menuTrigger.count()) > 0) {
			await menuTrigger.click();
			const dropdownMenu = page.getByRole("menu");
			await expect(dropdownMenu).toBeVisible();
			await expectNoA11yViolations(page, { context: "Admin (dropdown ouvert)" });
		}
	});
});

// Moved from components-a11y.spec.ts — these tests require admin auth
test.describe("Accessibilité composants admin - DropdownMenu", { tag: ["@slow"] }, () => {
	test("DropdownMenu - flèches, Enter, Escape et retour du focus", async ({ page }) => {
		await page.goto("/admin/catalogue/produits");
		await page.waitForLoadState("domcontentloaded");

		const trigger = page.getByRole("button", { name: /Actions/i }).first();
		if ((await trigger.count()) === 0) {
			test.skip(true, "Pas de bouton Actions sur cette page");
			return;
		}

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
		await page.goto("/admin/catalogue/couleurs");
		await page.waitForLoadState("domcontentloaded");

		// Find a delete button that triggers an AlertDialog
		const deleteButton = page.getByRole("button", { name: /Supprimer/i }).first();
		if ((await deleteButton.count()) === 0) {
			test.skip(true, "Pas de bouton Supprimer sur cette page");
			return;
		}

		await deleteButton.click();

		const alertDialog = page.getByRole("alertdialog");
		await expect(alertDialog).toBeVisible();

		// Focus is inside the alert dialog
		const isInside = await page.evaluate(() => {
			const d = document.querySelector('[role="alertdialog"]');
			return d?.contains(document.activeElement);
		});
		expect(isInside).toBe(true);

		// Escape closes without action
		await page.keyboard.press("Escape");
		await expect(alertDialog).not.toBeVisible();
	});
});

test.describe("Accessibilité composants admin - Tabs", { tag: ["@slow"] }, () => {
	test("Tabs - ArrowRight/ArrowLeft change l'onglet actif", async ({ page }) => {
		await page.goto("/admin");
		await page.waitForLoadState("domcontentloaded");

		const tabList = page.getByRole("tablist").first();
		if ((await tabList.count()) === 0) {
			test.skip(true, "Pas de tabs sur cette page");
			return;
		}

		const tabs = tabList.getByRole("tab");
		const tabCount = await tabs.count();
		if (tabCount < 2) return;

		// Focus the first tab
		await tabs.first().focus();
		await expect(tabs.first()).toBeFocused();

		// ArrowRight moves to next tab
		await page.keyboard.press("ArrowRight");
		await expect(tabs.nth(1)).toBeFocused();

		// ArrowLeft moves back
		await page.keyboard.press("ArrowLeft");
		await expect(tabs.first()).toBeFocused();
	});
});

test.describe("Accessibilité composants admin - Switch", { tag: ["@slow"] }, () => {
	test("Switch - Space toggle et aria-checked", async ({ page }) => {
		await page.goto("/admin/catalogue/couleurs");
		await page.waitForLoadState("domcontentloaded");

		const switchEl = page.getByRole("switch").first();
		if ((await switchEl.count()) === 0) {
			test.skip(true, "Pas de switch sur cette page");
			return;
		}

		const initialChecked = await switchEl.getAttribute("aria-checked");
		await switchEl.focus();
		await expect(switchEl).toBeFocused();

		// Space toggles the switch
		await page.keyboard.press("Space");
		const newChecked = await switchEl.getAttribute("aria-checked");
		expect(newChecked).not.toBe(initialChecked);

		// Toggle back
		await page.keyboard.press("Space");
		const restoredChecked = await switchEl.getAttribute("aria-checked");
		expect(restoredChecked).toBe(initialChecked);
	});
});

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

		const menu = page.getByRole("menu");
		await menu.waitFor({ state: "visible", timeout: 3000 }).catch(() => {});
		if ((await menu.count()) > 0) {
			await expect(menu).toBeVisible();

			// ArrowDown navigates menu items
			await page.keyboard.press("ArrowDown");

			// Escape closes
			await page.keyboard.press("Escape");
			await expect(menu).not.toBeVisible();
		}
	});
});
