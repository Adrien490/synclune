import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { requireSeedData } from "./constants";
import { expectNoA11yViolations } from "./helpers/axe";

test.describe("Accessibilité - Tunnel de paiement", { tag: ["@slow"] }, () => {
	// Retrait de l'espace client (2026-07-31) : `/commandes` et `/parametres`
	// n'existent plus. Le suivi de commande invité prend leur place — sans token
	// valide la page rend son état 404, ce qui reste une surface à auditer.
	const guestPages = [{ path: "/suivi-commande", name: "Suivi de commande" }];

	for (const { path, name } of guestPages) {
		test(`${name} (${path}) passe l'audit axe-core WCAG AA`, async ({ page }) => {
			await page.goto(path);
			await page.waitForLoadState("domcontentloaded");

			await expectNoA11yViolations(page, { context: name });
		});
	}

	test("Page checkout passe l'audit axe-core WCAG AA", async ({
		page,
		checkoutPage,
		productCatalogPage,
		cartPage,
	}) => {
		const seeded = await checkoutPage.gotoWithSeededCart(productCatalogPage, cartPage);
		requireSeedData(test, !seeded.skipped, seeded.skipped ? seeded.reason : "");
		if (seeded.skipped) return;

		await expectNoA11yViolations(page, {
			exclude: ["iframe[src*='stripe']"],
			context: "Checkout",
		});
	});

	test("Le formulaire checkout en ERREUR passe l'audit axe-core WCAG AA", async ({
		page,
		checkoutPage,
		productCatalogPage,
		cartPage,
	}) => {
		const seeded = await checkoutPage.gotoWithSeededCart(productCatalogPage, cartPage);
		requireSeedData(test, !seeded.skipped, seeded.skipped ? seeded.reason : "");
		if (seeded.skipped) return;

		// L'état d'erreur a sa propre sémantique (aria-invalid, aria-describedby,
		// résumé d'erreurs) qu'aucune passe n'auditait : soumettre à vide.
		await checkoutPage.payButton.click();
		await expect(page.locator('[aria-invalid="true"]').first()).toBeVisible();

		await expectNoA11yViolations(page, {
			exclude: ["iframe[src*='stripe']"],
			context: "Checkout (état erreur)",
		});
	});

	/**
	 * ⚠️ **La confirmation n'est PAS auditable par `goto`.**
	 *
	 * `app/paiement/confirmation/page.tsx` exige `order_id` + `order_number` en
	 * query et `redirect("/")` sinon. Le test qui prétendait l'auditer analysait
	 * donc la page d'ACCUEIL — quand il ne mourait pas sur « Execution context was
	 * destroyed » en course avec la redirection côté client.
	 *
	 * L'auditer pour de vrai demanderait de minter une commande payée, donc un
	 * paiement Stripe complet : hors de portée de cette suite. La sémantique de la
	 * page est couverte à la source par
	 * `app/paiement/__tests__/checkout-confirmation-a11y.regression.test.ts`.
	 *
	 * Ce qui reste vérifiable ici, et qui a une valeur propre : la garde tient.
	 */
	test("La confirmation refuse un accès sans commande (garde, pas audit)", async ({ page }) => {
		await page.goto("/paiement/confirmation");
		await page.waitForURL((url) => !url.pathname.startsWith("/paiement/confirmation"));

		expect(new URL(page.url()).pathname).toBe("/");
	});
});

// Dark mode tests for authenticated pages
async function enableDarkMode(page: Page) {
	await page.evaluate(() => document.documentElement.classList.add("dark"));
	await page.waitForTimeout(100);
}

test.describe("Accessibilité - Tunnel de paiement (dark mode)", { tag: ["@slow"] }, () => {
	const guestDarkPages = [{ path: "/suivi-commande", name: "Suivi de commande" }];

	for (const { path, name } of guestDarkPages) {
		test(`${name} (${path}) passe l'audit axe-core WCAG AA en dark mode`, async ({ page }) => {
			await page.goto(path);
			await page.waitForLoadState("domcontentloaded");
			await enableDarkMode(page);

			await expectNoA11yViolations(page, { context: `${name} (dark mode)` });
		});
	}

	test("Checkout passe l'audit axe-core WCAG AA en dark mode", async ({
		page,
		checkoutPage,
		productCatalogPage,
		cartPage,
	}) => {
		const seeded = await checkoutPage.gotoWithSeededCart(productCatalogPage, cartPage);
		requireSeedData(test, !seeded.skipped, seeded.skipped ? seeded.reason : "");
		if (seeded.skipped) return;

		await enableDarkMode(page);

		await expectNoA11yViolations(page, {
			exclude: ["iframe[src*='stripe']"],
			context: "Checkout (dark mode)",
		});
	});

	// Ni `/paiement/confirmation` ni `/paiement/retour` ne sont auditables par
	// `goto` : la première exige une commande en query et redirige sinon, la
	// seconde ne rend RIEN (elle se termine toujours par un `redirect()`). Les
	// auditer revenait à auditer la page d'arrivée. Cf. le bloc clair ci-dessus.

	test("Annulation paiement passe l'audit axe-core WCAG AA en dark mode", async ({ page }) => {
		await page.goto("/paiement/annulation");
		await page.waitForLoadState("domcontentloaded");
		await enableDarkMode(page);

		await expectNoA11yViolations(page, { context: "Annulation paiement (dark mode)" });
	});
});
