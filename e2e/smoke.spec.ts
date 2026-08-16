import { test, expect } from "./fixtures";
import { expireSessionViaWebhook } from "./helpers/stripe-webhook";
import { getE2ePrisma } from "./helpers/db";

test.describe("Smoke tests", { tag: ["@smoke", "@critical"] }, () => {
	test("homepage loads with correct title", async ({ page }) => {
		await page.goto("/");
		await expect(page).toHaveTitle(/Synclune/);
	});

	test("homepage renders main content", async ({ page }) => {
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");

		// Main landmark must be present
		const main = page.locator("main");
		await expect(main).toBeAttached();

		// At least one heading should be visible
		const heading = page.getByRole("heading").first();
		await expect(heading).toBeVisible();
	});

	const criticalRoutes = ["/", "/produits", "/collections", "/admin/connexion"];

	for (const route of criticalRoutes) {
		test(`${route} returns 200`, async ({ page }) => {
			const response = await page.goto(route);
			expect(response?.status(), `${route} should return 200`).toBe(200);
		});
	}

	test("404 page renders for unknown routes", async ({ page }) => {
		// Une route de premier niveau inconnue tombe dans le default-deny du proxy
		// (307 → `/`) : le contenu 404 ne se rend que sous un segment public
		// dynamique (`/creations/[slug]`).
		await page.goto("/creations/cette-page-nexiste-pas");
		await expect(
			page.getByRole("heading", { name: /n'existe plus|Erreur 404|perdu/i }),
		).toBeVisible();
	});

	test("static assets load correctly", async ({ page }) => {
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");

		// La feuille CSS du projet doit être RÉELLEMENT appliquée. L'ancienne
		// assertion (`fontFamily` truthy) était imperdable : tout navigateur rend
		// une famille par défaut même sans le moindre CSS chargé. `--primary` est
		// un token que SEUL `app/globals.css` pose — si la feuille manque, la
		// custom property vaut chaîne vide sur :root.
		const primary = await page.evaluate(() =>
			window.getComputedStyle(document.documentElement).getPropertyValue("--primary").trim(),
		);
		expect(primary, "--primary doit être posé par app/globals.css").not.toBe("");
	});

	/**
	 * Le parcours minimal du nouveau monde (lot 3) : accueil → fiche → panier
	 * → /paiement → redirect checkout.stripe.com. On ne pilote JAMAIS la page
	 * hébergée. Chromium seul : chaque passage crée une vraie session Stripe
	 * test et réserve du stock — la session est expirée (event signé) puis la
	 * commande nettoyée.
	 */
	test("parcours minimal : accueil → fiche → panier → redirect Stripe", async ({
		page,
		browserName,
		checkoutPage,
		productCatalogPage,
		cartPage,
	}) => {
		test.skip(browserName !== "chromium", "Effets de bord (session Stripe + stock)");
		test.skip(
			!process.env.STRIPE_WEBHOOK_SECRET || !process.env.DATABASE_URL,
			"STRIPE_WEBHOOK_SECRET / DATABASE_URL requis pour le nettoyage",
		);

		await page.goto("/");
		const seeded = await checkoutPage.gotoWithSeededCart(productCatalogPage, cartPage);
		test.skip(seeded.skipped, seeded.skipped ? seeded.reason : "");

		await checkoutPage.payButton.click();
		await page.waitForURL(/checkout\.stripe\.com/, { timeout: 30_000 });

		// Nettoyage : expiration signée (restock) + suppression de la commande.
		const sessionId = /cs_(test|live)_[A-Za-z0-9]+/.exec(page.url())?.[0];
		if (sessionId) {
			await expireSessionViaWebhook(sessionId);
			await getE2ePrisma().order.deleteMany({ where: { stripeSessionId: sessionId } });
		}
	});
});
