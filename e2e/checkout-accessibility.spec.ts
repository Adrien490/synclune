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

	/**
	 * `/paiement/retour` sans session rend l'état « Commande introuvable » — une
	 * vraie surface (plus de redirect depuis le checkout hébergé, lot 3) : elle
	 * s'audite directement.
	 */
	test("La landing de retour (état introuvable) passe l'audit axe-core WCAG AA", async ({
		page,
	}) => {
		await page.goto("/paiement/retour");
		await page.waitForLoadState("domcontentloaded");
		await expect(page.getByRole("heading", { name: /Commande introuvable/i })).toBeVisible();

		await expectNoA11yViolations(page, { context: "Retour checkout (introuvable)" });
	});
});

/*
 * ⚠️ Les trois audits « dark mode » ont été SUPPRIMÉS le 2026-08-16 : Synclune
 * est LIGHT-ONLY par choix (`color-scheme: light` dans `app/styles/pwa.css`,
 * zéro variante `dark:` dans tout le dépôt, aucun ThemeProvider). Le
 * `classList.add("dark")` qu'ils posaient n'était branché sur AUCUN style : ils
 * ré-auditaient exactement le même rendu clair, deux fois, sous un nom qui
 * créditait une couverture inexistante.
 *
 * Ce qui reste testable — et l'est ci-dessous : la préférence sombre du
 * navigateur ne doit PAS déformer le rendu (le choix light-only n'est sûr que
 * si `color-scheme: light` continue de neutraliser `prefers-color-scheme`, et
 * qu'aucune media query sombre partielle ne s'introduit).
 */
test.describe("Accessibilité - Tunnel de paiement (préférence sombre)", { tag: ["@slow"] }, () => {
	test("le checkout reste light-only et accessible sous prefers-color-scheme: dark", async ({
		page,
		checkoutPage,
		productCatalogPage,
		cartPage,
	}) => {
		// Le VRAI mécanisme : l'émulation de la préférence utilisateur — pas une
		// classe posée à la main sur <html>.
		await page.emulateMedia({ colorScheme: "dark" });

		const seeded = await checkoutPage.gotoWithSeededCart(productCatalogPage, cartPage);
		requireSeedData(test, !seeded.skipped, seeded.skipped ? seeded.reason : "");
		if (seeded.skipped) return;

		// Le contrat light-only tient : le document se déclare clair même quand
		// l'OS demande le sombre (sinon champs de formulaire et scrollbars UA
		// basculeraient seuls, sur un fond resté clair).
		const declaredScheme = await page.evaluate(
			() => getComputedStyle(document.documentElement).colorScheme,
		);
		expect(declaredScheme).toBe("light");

		await expectNoA11yViolations(page, {
			exclude: ["iframe[src*='stripe']"],
			context: "Checkout (préférence sombre émulée)",
		});
	});
});
