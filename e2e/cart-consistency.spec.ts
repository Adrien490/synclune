import type { BrowserContext } from "@playwright/test";
import { expect, test } from "./fixtures";
import { getE2ePrisma } from "./helpers/db";

/**
 * Cohérence métier du panier — exactitude des montants, persistance du cookie,
 * non-vidage après annulation, vidage explicite.
 *
 * Doctrine checkout-hosted.spec.ts : le panier est semé par le VRAI parcours
 * d'ajout (`addFirstProductToCart`), puis la vérité est croisée avec la base
 * via `getE2ePrisma` — le cookie `cart` (httpOnly mais lisible par
 * `context.cookies()`) donne la variante ajoutée, la base donne le prix
 * effectif (`variant.priceCents ?? product.priceCents`). Aucune donnée créée
 * en base : lecture seule + cookies du contexte du test.
 */

const EURO = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const formatEuro = (cents: number) => EURO.format(cents / 100);

interface CookieCartItem {
	variantId: string;
	quantity: number;
	priceAtAdd: number;
}

/** Lit les lignes du cookie `cart` (forme compacte de cart-cookie.ts). */
async function readCartCookieItems(context: BrowserContext): Promise<CookieCartItem[]> {
	const cookie = (await context.cookies()).find((entry) => entry.name === "cart");
	if (!cookie) return [];
	try {
		const parsed = JSON.parse(decodeURIComponent(cookie.value)) as { i?: unknown };
		if (!Array.isArray(parsed.i)) return [];
		return parsed.i.map((entry) => {
			const [variantId, quantity, priceAtAdd] = entry as [string, number, number];
			return { variantId, quantity, priceAtAdd };
		});
	} catch {
		return [];
	}
}

test.describe("Cohérence du panier @critical", () => {
	test.describe.configure({ timeout: 60_000 });
	test.skip(!process.env.DATABASE_URL, "DATABASE_URL requis (vérité croisée avec la base)");

	test("la ligne du panier reflète EXACTEMENT la base : nom, quantité, prix, total", async ({
		context,
		productCatalogPage,
		cartPage,
	}) => {
		const seeded = await productCatalogPage.addFirstProductToCart(cartPage);
		test.skip(seeded.skipped, seeded.skipped ? seeded.reason : "");

		const cookieItems = await readCartCookieItems(context);
		expect(cookieItems).toHaveLength(1);
		const { variantId, quantity, priceAtAdd } = cookieItems[0]!;
		expect(quantity).toBe(1);

		const prisma = getE2ePrisma();
		const variant = await prisma.productVariant.findUnique({
			where: { id: variantId },
			select: { priceCents: true, product: { select: { name: true, priceCents: true } } },
		});
		expect(variant).not.toBeNull();
		const effectivePrice = variant!.priceCents ?? variant!.product.priceCents;
		// Le témoin du cookie EST le prix effectif de la base au moment de l'ajout.
		expect(priceAtAdd).toBe(effectivePrice);

		const dialog = cartPage.dialog;
		await expect(dialog).toBeVisible();
		const row = dialog.locator("article").filter({ hasText: variant!.product.name }).first();
		// Nom EXACT (lien titre de la ligne), prix unitaire EXACT formaté.
		await expect(row.getByRole("link", { name: variant!.product.name, exact: true })).toBeVisible();
		await expect(row.getByText(formatEuro(effectivePrice), { exact: true })).toBeVisible();
		// Quantité 1 : pas de décomposition « (n x prix) ».
		await expect(row.getByText(/\(\d+ x /)).toHaveCount(0);

		// Total = prix de l'unique article (récapitulatif du footer, scopé à sa rangée).
		const recapLabel = dialog.getByText("Sous-total · 1 article", { exact: true });
		await expect(recapLabel).toBeVisible();
		await expect(recapLabel.locator("..")).toContainText(formatEuro(effectivePrice));
	});

	test("total multi-articles : deux lignes distinctes, somme exacte", async ({
		page,
		context,
		productCatalogPage,
		cartPage,
	}) => {
		const seeded = await productCatalogPage.addFirstProductToCart(cartPage);
		test.skip(seeded.skipped, seeded.skipped ? seeded.reason : "");
		await cartPage.close();

		// Second produit DIFFÉRENT ajoutable sans sélection de variante : on essaie
		// les liens suivants du catalogue jusqu'à obtenir une DEUXIÈME ligne cookie.
		await productCatalogPage.goto();
		const hrefs = await productCatalogPage.productLinks.evaluateAll((links) =>
			links.map((link) => link.getAttribute("href")),
		);
		const uniqueHrefs = [...new Set(hrefs.filter((href): href is string => !!href))];

		let added = false;
		for (const href of uniqueHrefs.slice(1, 6)) {
			await page.goto(href);
			await page.waitForLoadState("domcontentloaded");
			const addButton = productCatalogPage.addToCartButton.first();
			const attached = await addButton
				.waitFor({ state: "attached", timeout: 10_000 })
				.then(() => true)
				.catch(() => false);
			if (!attached) continue;
			if (!(await addButton.isEnabled().catch(() => false))) continue;
			await addButton.click();
			await expect(cartPage.dialog).toBeVisible({ timeout: 5000 });
			if ((await readCartCookieItems(context)).length === 2) {
				added = true;
				break;
			}
			await cartPage.close();
		}
		test.skip(!added, "Pas de second produit ajoutable sans sélection de variante");

		const items = await readCartCookieItems(context);
		expect(items).toHaveLength(2);
		const sum = items.reduce((acc, item) => acc + item.priceAtAdd * item.quantity, 0);
		const totalQuantity = items.reduce((acc, item) => acc + item.quantity, 0);

		const prisma = getE2ePrisma();
		const variants = await prisma.productVariant.findMany({
			where: { id: { in: items.map((item) => item.variantId) } },
			select: { id: true, product: { select: { name: true } } },
		});
		expect(variants).toHaveLength(2);

		const dialog = cartPage.dialog;
		await expect(dialog).toBeVisible();
		for (const variant of variants) {
			await expect(
				dialog.locator("article").filter({ hasText: variant.product.name }).first(),
			).toBeVisible();
		}

		// Somme exacte au footer (les deux lignes valent chacune 1 exemplaire).
		const recapLabel = dialog.getByText(`Sous-total · ${totalQuantity} articles`, {
			exact: true,
		});
		await expect(recapLabel).toBeVisible();
		await expect(recapLabel.locator("..")).toContainText(formatEuro(sum));
	});

	test("le panier persiste au rechargement (cookie 7 jours glissants)", async ({
		page,
		context,
		productCatalogPage,
		cartPage,
	}) => {
		const seeded = await productCatalogPage.addFirstProductToCart(cartPage);
		test.skip(seeded.skipped, seeded.skipped ? seeded.reason : "");

		const cookieItems = await readCartCookieItems(context);
		expect(cookieItems).toHaveLength(1);
		const variant = await getE2ePrisma().productVariant.findUnique({
			where: { id: cookieItems[0]!.variantId },
			select: { product: { select: { name: true } } },
		});
		expect(variant).not.toBeNull();

		await cartPage.close();
		await page.reload();

		// Le cookie survit au rechargement, avec son expiration glissante de 7 jours.
		const cartCookie = (await context.cookies()).find((entry) => entry.name === "cart");
		expect(cartCookie).toBeDefined();
		expect(cartCookie!.expires).toBeGreaterThan(Date.now() / 1000 + 6 * 86_400);

		await cartPage.open();
		await expect(
			cartPage.dialog.locator("article").filter({ hasText: variant!.product.name }).first(),
		).toBeVisible();
	});

	test("l'annulation du paiement ne vide PAS le panier (la cliente peut réessayer)", async ({
		page,
		context,
		productCatalogPage,
		cartPage,
		checkoutPage,
	}) => {
		const seeded = await productCatalogPage.addFirstProductToCart(cartPage);
		test.skip(seeded.skipped, seeded.skipped ? seeded.reason : "");
		await cartPage.close();

		// Landing du cancel_url Stripe : copy honnête, panier intact.
		await page.goto("/paiement/annulation");
		await expect(page.getByRole("heading", { name: /Paiement annulé/i })).toBeVisible();
		await expect(page.getByText(/ton panier est toujours là/i)).toBeVisible();

		// Le récap /paiement rend TOUJOURS la commande — pas l'état « panier vide ».
		await page.goto("/paiement");
		await expect(checkoutPage.countrySelect).toBeVisible({ timeout: 15_000 });
		await expect(checkoutPage.emptyCartMessage).toHaveCount(0);

		// Vérité cookie : la ligne est toujours là.
		expect(await readCartCookieItems(context)).toHaveLength(1);
	});

	test("vider le panier : confirmation, état vide, et le vide persiste au rechargement", async ({
		page,
		context,
		productCatalogPage,
		cartPage,
	}) => {
		const seeded = await productCatalogPage.addFirstProductToCart(cartPage);
		test.skip(seeded.skipped, seeded.skipped ? seeded.reason : "");

		const dialog = cartPage.dialog;
		await dialog.getByRole("button", { name: "Vider le panier" }).click();

		// ClearCartAlertDialog (ConfirmDialog) : libellés exacts du composant.
		const confirm = page.getByRole("alertdialog");
		await expect(confirm.getByText("Vider ton panier ?")).toBeVisible();
		await confirm.getByRole("button", { name: "Vider", exact: true }).click();

		await expect(dialog.getByText("Ton panier est encore vide")).toBeVisible({ timeout: 10_000 });

		// Vérité cookie : le vidage supprime le cookie côté serveur (clearCartCookie).
		await expect
			.poll(async () => (await context.cookies()).some((entry) => entry.name === "cart"), {
				timeout: 15_000,
			})
			.toBe(false);

		// Le vide persiste après rechargement.
		await page.reload();
		await cartPage.open();
		await expect(cartPage.dialog.getByText("Ton panier est encore vide")).toBeVisible();
	});
});
