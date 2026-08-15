import type { Page } from "@playwright/test";

import { VIEWPORTS, requireSeedData } from "./constants";
import { test, expect } from "./fixtures";

/**
 * Quick Search Dialog — end-to-end flow.
 *
 * Covers keyboard shortcut, typing debounce, listbox role, arrow navigation,
 * Escape close + focus return, and recent searches persistence.
 *
 * These tests are intentionally tolerant of empty catalogs (CI) — they assert
 * structural contracts (roles, URLs, focus) rather than specific products.
 *
 * ⚠️ Deux périmètres à ne pas confondre :
 * - `#qs-results` (`RESULTS_CONTAINER_ID`) = périmètre de **navigation**, présent
 *   dans les deux modes. C'est lui qu'on cible pour « le panneau est là ».
 * - `#qs-listbox` (`LISTBOX_ID`) = périmètre **ARIA**, présent uniquement en mode
 *   recherche (≥ 3 caractères) et ne contenant QUE des `group`/`option` — les
 *   messages, la suggestion et le CTA sont dehors. F3 (2026-05-29) préservé :
 *   aucun listbox en idle.
 *
 * Pour « le dialog est ouvert », utiliser `getByRole("dialog")` : quatre tests
 * assertaient un listbox champ vide et échouaient depuis que le rôle est devenu
 * conditionnel.
 *
 * En **mode idle**, le roving déplace le **focus DOM réel** (`[data-qs-option]:focus`)
 * et il n'y a PAS d'`aria-activedescendant` — c'est l'état correct, pas un défaut.
 */
/**
 * Le déclencheur VISIBLE du viewport courant : la barre de la navbar est
 * `hidden lg:inline-flex` (desktop), la bottom-nav porte l'onglet
 * « Rechercher » (mobile) — le locator desktop seul rendait les 13 tests
 * du dialog inexécutables sur mobile-chrome/mobile-webkit.
 */
function quickSearchTrigger(page: Page) {
	return page
		.getByRole("button", { name: /ouvrir la recherche rapide/i })
		.or(page.getByRole("button", { name: /^Rechercher$/ }))
		.filter({ visible: true })
		.first();
}

test.describe("Quick Search Dialog", { tag: ["@critical"] }, () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");
	});

	test("Cmd+K opens the dialog and focuses the search input", async ({ page }) => {
		const modifier = process.platform === "darwin" ? "Meta" : "Control";
		// Le listener clavier n'existe qu'après hydratation : on re-presse
		// jusqu'à ce que le dialog réponde.
		await expect(async () => {
			await page.keyboard.press(`${modifier}+KeyK`);
			await expect(page.getByRole("dialog")).toBeVisible({ timeout: 1500 });
		}).toPass({ timeout: 15_000 });

		const input = page.getByRole("combobox", { name: /rechercher un bijou/i });
		await expect(input).toBeFocused();
	});

	test("trigger button opens the dialog", async ({ page }) => {
		const trigger = quickSearchTrigger(page);
		await trigger.click();

		await expect(page.getByRole("dialog")).toBeVisible();
		// Le conteneur de résultats existe dans les deux modes ; seul son rôle change.
		await expect(page.locator("#qs-results")).toBeVisible();
	});

	test("typing less than 3 characters shows the hint", async ({ page }) => {
		await quickSearchTrigger(page).click();

		const input = page.getByRole("combobox", { name: /rechercher un bijou/i });
		await input.fill("ba");

		await expect(page.getByText(/au moins 3 caractères/i)).toBeVisible();
	});

	test("typing a query activates search mode (combobox aria-expanded=true)", async ({ page }) => {
		await quickSearchTrigger(page).click();

		const input = page.getByRole("combobox", { name: /rechercher un bijou/i });
		await input.fill("bague");

		// Wait for debounce to fire (300ms) + transition to settle
		await expect(input).toHaveAttribute("aria-expanded", "true", { timeout: 2000 });
	});

	test("Escape closes the dialog and restores focus to the trigger", async ({ page }) => {
		const trigger = quickSearchTrigger(page);
		await trigger.click();

		const dialog = page.getByRole("dialog");
		await expect(dialog).toBeVisible();

		await page.keyboard.press("Escape");
		await expect(dialog).not.toBeVisible();
		await expect(trigger).toBeFocused();
	});

	test("pressing Enter on a typed query navigates to /produits?search=...", async ({ page }) => {
		await quickSearchTrigger(page).click();

		const input = page.getByRole("combobox", { name: /rechercher un bijou/i });
		await input.fill("bague");
		await page.keyboard.press("Enter");

		await expect(page).toHaveURL(/\/produits\?search=bague/i, { timeout: 5000 });
	});

	test("the results container becomes a listbox only in search mode", async ({ page }) => {
		await quickSearchTrigger(page).click();

		const listbox = page.getByRole("listbox", { name: /résultats de recherche/i });
		// Champ vide → mode idle : le conteneur existe mais n'est pas un listbox.
		await expect(page.locator("#qs-results")).toBeVisible();
		await expect(listbox).toHaveCount(0);

		const input = page.getByRole("combobox", { name: /rechercher un bijou/i });
		await input.fill("bague");
		await expect(input).toHaveAttribute("aria-expanded", "true", { timeout: 2000 });

		await expect(listbox).toBeVisible();
	});

	/**
	 * L'entrée mobile est l'onglet « Rechercher » de la bottom-nav (zone du pouce),
	 * pas une icône en haut de navbar : celle-ci a été retirée (double affordance).
	 * L'onglet portait auparavant une loupe mais était un LIEN vers /produits.
	 */
	test("the bottom-nav search tab opens the dialog and gets focus back", async ({
		page,
		browserName,
	}) => {
		test.skip(browserName === "webkit", "Mobile emulation flakey under webkit in CI.");
		await page.setViewportSize(VIEWPORTS.MOBILE);
		await page.reload();

		const shopNav = page.getByRole("navigation", {
			name: /navigation principale de la boutique/i,
		});
		const searchTab = shopNav.getByRole("button", { name: "Rechercher" });
		await expect(searchTab).toBeVisible();

		await searchTab.click();
		await expect(page.getByRole("dialog")).toBeVisible();

		// Contrat `lastTrigger` : le focus doit revenir sur l'onglet, pas sur <body>.
		await page.keyboard.press("Escape");
		await expect(page.getByRole("dialog")).not.toBeVisible();
		await expect(searchTab).toBeFocused();
	});

	test("the idle panel always offers a route to the full catalogue", async ({ page }) => {
		// Contrepartie du passage de l'onglet 2 en bouton : le CTA doit être rendu en
		// permanence, pas seulement dans la branche `!hasContent` (quasi morte).
		await quickSearchTrigger(page).click();

		await expect(page.getByRole("link", { name: /voir tous les produits/i })).toBeVisible();
	});

	test("unlikely query shows zero-result empty state with category pills", async ({ page }) => {
		await quickSearchTrigger(page).click();

		const input = page.getByRole("combobox", { name: /rechercher un bijou/i });
		await input.fill("zxqvwpnmjk");

		// Wait for debounce + server action
		await expect(page.getByText(/aucun résultat/i)).toBeVisible({ timeout: 5000 });
	});

	/**
	 * Navigation clavier — n'avait AUCUNE couverture E2E jusqu'ici : les deux tests
	 * censés la couvrir (`a11y/keyboard-navigation.spec.ts`) cherchaient un champ de
	 * recherche sur `/`, où il n'y en a pas ; l'un passait sans exécuter la moindre
	 * assertion, l'autre se skippait systématiquement.
	 */
	test("ArrowDown moves aria-activedescendant through the results", async ({ page }) => {
		await quickSearchTrigger(page).click();

		const input = page.getByRole("combobox", { name: /rechercher un bijou/i });
		await input.fill("bague");
		await expect(input).toHaveAttribute("aria-expanded", "true", { timeout: 2000 });

		const options = page.locator('#qs-listbox [role="option"]');
		requireSeedData(test, (await options.count()) > 0, "résultats pour « bague »");

		// Aucun descendant actif tant qu'on n'a pas navigué.
		await expect(input).not.toHaveAttribute("aria-activedescendant", /.+/);

		await page.keyboard.press("ArrowDown");
		const first = await input.getAttribute("aria-activedescendant");
		expect(first).toBeTruthy();
		// L'id doit désigner un élément réel, marqué actif ET sélectionné : c'est
		// `aria-selected` qui était figé à `false` avant le lot E.
		const firstEl = page.locator(`#${first}`);
		await expect(firstEl).toHaveAttribute("data-active", "true");
		await expect(firstEl).toHaveAttribute("aria-selected", "true");

		await page.keyboard.press("ArrowDown");
		const second = await input.getAttribute("aria-activedescendant");
		expect(second).not.toBe(first);

		await page.keyboard.press("ArrowUp");
		await expect(input).toHaveAttribute("aria-activedescendant", first!);

		await page.keyboard.press("End");
		const last = await input.getAttribute("aria-activedescendant");
		await page.keyboard.press("Home");
		await expect(input).toHaveAttribute("aria-activedescendant", first!);
		expect(last).toBeTruthy();
	});

	test("Enter on the active option navigates to the product", async ({ page }) => {
		await quickSearchTrigger(page).click();

		const input = page.getByRole("combobox", { name: /rechercher un bijou/i });
		await input.fill("bague");
		await expect(input).toHaveAttribute("aria-expanded", "true", { timeout: 2000 });

		const products = page.locator(
			'#qs-listbox [role="group"][aria-label="Produits"] [role="option"]',
		);
		requireSeedData(test, (await products.count()) > 0, "produits pour « bague »");

		// Descendre jusqu'à la première option produit (collections/catégories
		// correspondantes peuvent la précéder dans le listbox).
		const firstProductId = await products.first().getAttribute("id");
		for (let i = 0; i < 10; i++) {
			await page.keyboard.press("ArrowDown");
			if ((await input.getAttribute("aria-activedescendant")) === firstProductId) break;
		}
		await expect(input).toHaveAttribute("aria-activedescendant", firstProductId!);

		await page.keyboard.press("Enter");
		await expect(page).toHaveURL(/\/creations\//, { timeout: 5000 });
	});

	test("ArrowDown in idle mode moves real focus, and typing returns to the field", async ({
		page,
	}) => {
		await quickSearchTrigger(page).click();

		const input = page.getByRole("combobox", { name: /rechercher un bijou/i });
		await expect(input).toBeFocused();

		// En idle le panneau n'est PAS un listbox : le roving déplace le focus DOM
		// réel (annoncé nativement), sans `aria-activedescendant`.
		await page.keyboard.press("ArrowDown");
		await expect(page.locator("#qs-results [data-qs-option]:focus")).toHaveCount(1);
		await expect(input).not.toBeFocused();
		await expect(input).not.toHaveAttribute("aria-activedescendant", /.+/);

		// Retaper rend la main au champ, sans perdre le caractère.
		await page.keyboard.type("ba");
		await expect(input).toBeFocused();
		await expect(input).toHaveValue(/ba/);
	});

	test("SearchAction JSON-LD uses the ?search= query parameter", async ({ page }) => {
		// Validates P1.1 fix (schema.org SearchAction pointing to actual param name)
		await page.goto("/");
		const jsonLdPayloads = await page
			.locator('script[type="application/ld+json"]')
			.allTextContents();
		const hasFixedSearchAction = jsonLdPayloads.some((raw) => {
			try {
				const parsed = JSON.parse(raw);
				// Les nœuds vivent désormais dans un `@graph` unique par page.
				const roots = Array.isArray(parsed) ? parsed : [parsed];
				const data = roots.flatMap((entry) =>
					Array.isArray(entry?.["@graph"]) ? entry["@graph"] : [entry],
				);
				return data.some(
					(entry) =>
						entry?.potentialAction?.["@type"] === "SearchAction" &&
						typeof entry?.potentialAction?.target?.urlTemplate === "string" &&
						entry.potentialAction.target.urlTemplate.includes("?search="),
				);
			} catch {
				return false;
			}
		});
		expect(hasFixedSearchAction).toBe(true);
	});
});

/**
 * RGPD consent compliance for recent searches — separate top-level describe
 * so we can seed localStorage via addInitScript BEFORE the first page navigation.
 */
test.describe("Quick Search RGPD consent", { tag: ["@critical"] }, () => {
	async function seedConsent(page: Page, accepted: boolean) {
		await page.addInitScript((acceptedValue) => {
			window.localStorage.setItem(
				"cookie-consent",
				JSON.stringify({
					state: {
						accepted: acceptedValue,
						consentDate: new Date().toISOString(),
						policyVersion: 1,
					},
					version: 0,
				}),
			);
		}, accepted);
	}

	async function submitSearch(page: Page, term: string) {
		await quickSearchTrigger(page).click();
		const input = page.getByRole("combobox", { name: /rechercher un bijou/i });
		await input.fill(term);
		await page.keyboard.press("Enter");
		await expect(page).toHaveURL(new RegExp(`/produits\\?search=${term}`, "i"), {
			timeout: 5000,
		});
	}

	test("does NOT set recent-searches cookie when consent is rejected", async ({
		page,
		context,
	}) => {
		await seedConsent(page, false);
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");

		await submitSearch(page, "consenttestrgpd1");

		// Give the (no-op) server action a window to run before asserting absence.
		await page.waitForTimeout(500);

		const cookies = await context.cookies();
		expect(cookies.find((c) => c.name === "recent-searches")).toBeUndefined();
	});

	test("DOES set recent-searches cookie when consent is accepted", async ({ page, context }) => {
		await seedConsent(page, true);
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");

		await submitSearch(page, "consenttestrgpd2");

		// Server Action is fired via startTransition; poll until the cookie lands.
		await expect
			.poll(
				async () => {
					const cookies = await context.cookies();
					return cookies.find((c) => c.name === "recent-searches")?.value;
				},
				{ timeout: 5000 },
			)
			.toContain("consenttestrgpd2");
	});
});
