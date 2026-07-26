import { test, expect } from "./fixtures";

const USER_EMAIL = process.env.E2E_USER_EMAIL ?? "user2@synclune.fr";
const USER_PASSWORD = process.env.E2E_USER_PASSWORD ?? "password123";

/**
 * Fusion du panier invité au login (hook Better Auth `after` →
 * handlePostLoginMerges → mergeCarts).
 *
 * Parcours : invité ajoute un article (cookie `cart_session` posé) → connexion
 * (API sign-in, même cookie jar que le navigateur) → le panier fusionné contient
 * l'article ET le cookie invité a été supprimé (contrat : cleared uniquement si
 * merge réussi).
 *
 * Chromium uniquement : le test se connecte au user e2e partagé (user2) — le
 * jouer sur 5 navigateurs multiplierait les écritures concurrentes sur son
 * panier (races avec les projets authenticated-user).
 */
test.describe("Fusion panier invité → connecté", { tag: ["@critical"] }, () => {
	test.skip(
		({ browserName }) => browserName !== "chromium",
		"Shared e2e user cart — chromium only to limit concurrent writes",
	);

	test("l'article ajouté en invité survit au login et le cookie invité est nettoyé", async ({
		page,
		cartPage,
		productCatalogPage,
	}) => {
		// 1. Invité : ajouter un article au panier
		await productCatalogPage.goto();
		expect(await productCatalogPage.productLinks.count(), "Seed data required").toBeGreaterThan(0);

		await productCatalogPage.gotoFirstProduct();

		if ((await productCatalogPage.addToCartButton.count()) === 0) {
			test.skip(true, "Product requires SKU selection - skipping merge verification");
			return;
		}

		const productTitle = (
			await page.getByRole("heading", { level: 1 }).first().textContent()
		)?.trim();
		expect(productTitle, "Product page must expose an h1 title").toBeTruthy();

		await productCatalogPage.addToCartButton.first().click();
		await expect(cartPage.dialog.or(page.getByText(/ajouté|panier/i).first())).toBeVisible({
			timeout: 5000,
		});

		// Le cookie de session invité doit exister (posé par add-to-cart)
		const guestCookies = await page.context().cookies();
		const guestCartCookie = guestCookies.find((c) => c.name === "cart_session");
		expect(guestCartCookie, "cart_session cookie must be set for guests").toBeTruthy();

		// 2. Connexion via l'API Better Auth (partage le cookie jar du contexte,
		// donc le cookie cart_session accompagne la requête → merge déclenché)
		const response = await page.request.post("/api/auth/sign-in/email", {
			data: { email: USER_EMAIL, password: USER_PASSWORD, callbackURL: "/" },
			headers: { "Content-Type": "application/json" },
		});
		expect(response.ok(), "API sign-in must succeed (seed user required)").toBe(true);

		// 3. Le panier fusionné contient l'article ajouté en invité
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");
		await cartPage.open();
		await expect(cartPage.emptyMessage).not.toBeVisible();
		await expect(cartPage.dialog.getByText(productTitle!, { exact: false })).toBeVisible({
			timeout: 5000,
		});

		// 4. Merge réussi ⇒ le cookie invité a été supprimé par le hook auth
		const mergedCookies = await page.context().cookies();
		const staleCartCookie = mergedCookies.find(
			(c) => c.name === "cart_session" && c.value.length > 0,
		);
		expect(staleCartCookie, "cart_session must be cleared after a successful merge").toBeFalsy();
	});
});
