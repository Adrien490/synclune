import type { Page } from "@playwright/test";

import { test, expect } from "./fixtures";

/**
 * Garde-fou de bout en bout du pont clavier virtuel (`VisualViewportBridge`).
 *
 * Contexte du bug : le pont n'était monté que dans `app/(shop)/layout.tsx` et
 * `app/admin/layout.tsx`. Or `/paiement` est un segment **frère** du route-group
 * `(shop)`, pas un enfant — tout comme `(auth)`, `(account)` et
 * `/suivi-commande`. Sur ces routes, `<html>` ne recevait donc jamais `--vvh` ni
 * `data-keyboard`, ce qui rendait inerte le `data-hide-on-keyboard` de la barre
 * « Commander et payer » : clavier ouvert, elle recouvrait le champ en cours de
 * saisie (iOS) ou passait derrière le clavier, CTA inatteignable (Android).
 *
 * Le pont est désormais monté une seule fois dans `app/layout.tsx`. Un test
 * unitaire statique vérifie ce montage
 * (`visual-viewport-bridge-root-mount.regression.test.ts`) ; celui-ci vérifie le
 * résultat observable dans un vrai navigateur, route par route.
 *
 * ⚠️ Ce qui n'est PAS testable ici : l'ouverture réelle du clavier virtuel.
 * Chromium headless n'en a pas, `visualViewport` ne rétrécit donc jamais et
 * `data-keyboard="open"` ne peut pas être déclenché. On vérifie que le pont est
 * **installé et actif** (il publie `--vvh` dès l'installation), ce qui est
 * exactement la condition qui manquait. Le comportement clavier lui-même reste
 * à valider sur appareil réel — cf. la section Vérification du plan d'audit.
 */

const MOBILE_VIEWPORT = { width: 390, height: 844 };

/** Routes hors `(shop)` / `admin` : celles que le bug laissait sans pont. */
const ROUTES_WITHOUT_SHOP_LAYOUT = [
	{ path: "/connexion", label: "(auth)" },
	{ path: "/inscription", label: "(auth)" },
	{ path: "/suivi-commande", label: "/suivi-commande" },
];

async function readVvh(page: Page): Promise<string> {
	return page.evaluate(() => document.documentElement.style.getPropertyValue("--vvh"));
}

test.describe("Pont clavier virtuel — couverture par route", { tag: ["@regression"] }, () => {
	test.use({ viewport: MOBILE_VIEWPORT });

	for (const { path, label } of ROUTES_WITHOUT_SHOP_LAYOUT) {
		test(`${path} — le pont publie --vvh sur <html> (${label})`, async ({ page }) => {
			await page.goto(path);
			await page.waitForLoadState("domcontentloaded");

			// `--vvh` est posé par `applySideEffects()` dès l'installation du listener,
			// donc dès l'hydratation du composant monté à la racine.
			await expect
				.poll(() => readVvh(page), {
					message: `--vvh absent sur ${path} : VisualViewportBridge n'est pas monté sur cette route`,
				})
				.not.toBe("");

			const vvh = Number.parseFloat(await readVvh(page));
			expect(vvh).toBeGreaterThan(0);
		});
	}

	test("la boutique reste couverte après le retrait du montage par route-group", async ({
		page,
	}) => {
		// `(shop)` montait le pont localement ; ce montage a été supprimé au profit
		// de la racine. Cette route ne doit pas avoir régressé au passage.
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");

		await expect.poll(() => readVvh(page)).not.toBe("");
	});

	test("la barre CTA du checkout déclare data-hide-on-keyboard", async ({
		page,
		cartPage,
		productCatalogPage,
	}) => {
		// Atteindre /paiement demande un panier non vide : on passe par le catalogue.
		await productCatalogPage.goto();
		const count = await productCatalogPage.productLinks.count();
		test.skip(count === 0, "Pas de produit en base — parcours panier impossible");

		await productCatalogPage.gotoFirstProduct();
		if ((await productCatalogPage.addToCartButton.count()) === 0) {
			test.skip(true, "Produit à variantes — sélection SKU requise, hors périmètre de ce test");
			return;
		}
		await productCatalogPage.addToCartButton.first().click();

		await cartPage.open();
		if ((await cartPage.checkoutLink.count()) === 0) {
			test.skip(true, "Lien de paiement indisponible (boutique fermée ?)");
			return;
		}
		await cartPage.checkoutLink.first().click();
		await page.waitForURL(/\/paiement/);
		await page.waitForLoadState("domcontentloaded");

		// 1. Le pont est actif sur la route la plus critique.
		await expect
			.poll(() => readVvh(page), {
				message: "--vvh absent sur /paiement : le masquage de la barre CTA serait inerte",
			})
			.not.toBe("");

		// 2. La barre CTA porte bien l'attribut que la règle CSS cible. Les deux
		//    conditions doivent être vraies ensemble : c'est leur disjonction qui
		//    constituait le bug (attribut présent, émetteur absent).
		await expect(page.locator("[data-hide-on-keyboard]").first()).toBeAttached();

		// 3. La réserve du formulaire suit la hauteur réelle de la barre.
		const payBarHeight = await page.evaluate(() =>
			document.documentElement.style.getPropertyValue("--pay-bar-height"),
		);
		expect(payBarHeight).not.toBe("");
	});
});
