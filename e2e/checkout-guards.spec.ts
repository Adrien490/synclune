import type { BrowserContext } from "@playwright/test";
import { expect, test } from "./fixtures";
import { getE2ePrisma } from "./helpers/db";
import { TEST_RUN_ID } from "./helpers/test-run";

/**
 * Gardes métier du checkout — divergence prix/stock entre le panier cookie et
 * la base (doctrine checkout-hosted.spec.ts).
 *
 * Chaque test crée SON produit + SA variante via `getE2ePrisma`, puis sème le
 * panier en forgeant le cookie `cart` (même forme compacte que
 * `modules/cart/lib/cart-cookie.ts` : `{"i":[[variantId,qty,priceAtAdd]]}`).
 * L'état divergent (prix plus haut en base que le témoin, stock à zéro) existe
 * AVANT le premier rendu : aucune mutation post-rendu, donc aucun aléa de
 * péremption du cache `checkout` (1 min/30 s) de `fetchCartVariants` — et le
 * catalogue de seed n'est jamais touché (pas de course avec les autres specs).
 *
 * Chromium uniquement : écritures en base + tentative de création de session.
 */

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const EURO = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const formatEuro = (cents: number) => EURO.format(cents / 100);

/** Forge le cookie panier — Next encode la valeur, le serveur la décode. */
async function seedCartCookie(
	context: BrowserContext,
	items: Array<[variantId: string, quantity: number, priceAtAdd: number]>,
) {
	await context.addCookies([
		{
			name: "cart",
			value: encodeURIComponent(JSON.stringify({ i: items })),
			url: BASE_URL,
			httpOnly: true,
			sameSite: "Lax",
		},
	]);
}

/** Produit actif à variante unique, dédié au test (slug/nom marqués TEST_RUN_ID). */
async function createTestProduct(params: { suffix: string; priceCents: number; stock: number }) {
	const prisma = getE2ePrisma();
	const unique = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
	const product = await prisma.product.create({
		data: {
			slug: `${TEST_RUN_ID}-${params.suffix}-${unique}`,
			name: `Création e2e ${params.suffix} ${unique}`,
			description: "Produit de test e2e — supprimé par le spec en finally.",
			priceCents: params.priceCents,
			active: true,
			variants: { create: [{ stock: params.stock, active: true }] },
		},
		select: { id: true, name: true, variants: { select: { id: true } } },
	});
	return { productId: product.id, name: product.name, variantId: product.variants[0]!.id };
}

async function deleteTestProduct(productId: string) {
	await getE2ePrisma().product.deleteMany({ where: { id: productId } });
}

test.describe("Gardes du checkout @critical", () => {
	test.describe.configure({ timeout: 60_000 });
	test.skip(
		({ browserName }) => browserName !== "chromium",
		"Flux à effets de bord (écritures en base) — chromium seul",
	);
	test.skip(!process.env.DATABASE_URL, "DATABASE_URL requis (produit de test créé en base)");

	test("prix augmenté depuis l'ajout : alerte de changement, nouveau prix affiché, CTA bloqué", async ({
		page,
		context,
		cartPage,
	}) => {
		// Prix courant en base 35,00 € — le témoin du cookie (28,00 €) simule un
		// ajout au panier ANTÉRIEUR à la hausse, sans toucher au catalogue de seed.
		const currentPrice = 3500;
		const priceAtAdd = 2800;
		const product = await createTestProduct({
			suffix: "hausse",
			priceCents: currentPrice,
			stock: 5,
		});

		try {
			await seedCartCookie(context, [[product.variantId, 1, priceAtAdd]]);
			await page.goto("/produits");
			await cartPage.open();

			const dialog = cartPage.dialog;
			// Branche « hausse » de CartPriceChangeAlert : role="alert" + copy honnête
			// (la facturation est toujours au prix courant, cf. createCheckoutSession).
			const priceAlert = dialog.getByRole("alert");
			await expect(priceAlert.getByText("Des prix ont changé")).toBeVisible();
			await expect(priceAlert).toContainText(product.name);
			await expect(priceAlert).toContainText(formatEuro(priceAtAdd)); // ancien prix, barré
			await expect(priceAlert).toContainText(formatEuro(currentPrice)); // NOUVEAU prix
			await expect(priceAlert).toContainText("Le prix facturé est toujours le prix du jour");
			await expect(priceAlert.getByRole("button", { name: "Actualiser les prix" })).toBeVisible();

			// Hausse non actualisée ⇒ « Passer commande » bloqué (aria-disabled, pas
			// disabled natif — cf. CartSheetFooter) : la copy « aucune surprise » est vraie.
			const blockedCta = dialog.getByRole("button", { name: "Passer commande" });
			await expect(blockedCta).toBeVisible();
			await expect(blockedCta).toHaveAttribute("aria-disabled", "true");

			// Le récap /paiement, lui, affiche déjà le prix COURANT (effectivePrice) :
			// ligne à 35,00 € et total articles + port FR = 39,99 €.
			//
			// ⚠️ Scoper à la LIGNE « Total » du formulaire (CheckoutForm) : le pied du
			// sheet panier est monté dans le layout et rend lui aussi un total, donc
			// un `getByText(exact)` global résout à 2 éléments (strict mode violation).
			await page.goto("/paiement");
			await expect(page.getByText(formatEuro(currentPrice), { exact: true }).first()).toBeVisible({
				timeout: 15_000,
			});
			const totalAmount = page
				.getByRole("main")
				.getByText("Total", { exact: true })
				.locator("xpath=following-sibling::span");
			await expect(totalAmount).toHaveText(formatEuro(currentPrice + 499));

			// Le prix témoin périmé n'apparaît NULLE PART dans le récap.
			await expect(page.getByText(formatEuro(priceAtAdd), { exact: true })).toHaveCount(0);
		} finally {
			await deleteTestProduct(product.productId);
		}
	});

	test("variante en rupture dans le panier : pastille « Rupture » + retrait one-click", async ({
		page,
		context,
		cartPage,
	}) => {
		const price = 3200;
		const product = await createTestProduct({ suffix: "rupture", priceCents: price, stock: 0 });

		try {
			// Témoin = prix courant : seule la rupture est en cause (pas d'alerte prix).
			await seedCartCookie(context, [[product.variantId, 1, price]]);
			await page.goto("/produits");
			await cartPage.open();

			const dialog = cartPage.dialog;
			// Alerte stock de l'en-tête + pastille de la ligne (CART_ITEM_ISSUE_LABELS).
			await expect(dialog.getByText("Ajuste ton panier pour continuer")).toBeVisible();
			await expect(dialog.getByText("Rupture", { exact: true })).toBeVisible();

			// One-click fix : CartRemoveUnavailableButton retire la ligne fautive.
			await dialog.getByRole("button", { name: "Retirer ces articles" }).click();
			await expect(dialog.getByText("Ton panier est encore vide")).toBeVisible({
				timeout: 10_000,
			});
			await expect(dialog.getByText(product.name)).toHaveCount(0);

			// Vérité « serveur » du panier cookie : plus aucune ligne ⇒ cookie supprimé
			// (writeCartCookie delete sur panier vide).
			await expect
				.poll(async () => (await context.cookies()).some((cookie) => cookie.name === "cart"), {
					timeout: 15_000,
				})
				.toBe(false);
		} finally {
			await deleteTestProduct(product.productId);
		}
	});

	test("stock épuisé au moment de payer : échec explicite, AUCUNE commande créée", async ({
		page,
		context,
		checkoutPage,
	}) => {
		const price = 4100;
		const product = await createTestProduct({ suffix: "paiement", priceCents: price, stock: 0 });

		try {
			await seedCartCookie(context, [[product.variantId, 1, price]]);
			await page.goto("/paiement");
			await expect(checkoutPage.payButton).toBeVisible({ timeout: 15_000 });
			// Le rendu serveur signale déjà l'article indisponible (validateCartItems).
			await expect(page.getByText("Certains articles ne sont plus disponibles")).toBeVisible();

			// createCheckoutSession relit le stock en base AVANT toute réservation :
			// l'action échoue avec son message dédié (distinct du plafond quantité).
			// Boucle toPass : un clic avant hydratation peut partir dans le vide, et
			// re-cliquer est sans effet de bord (l'action échoue toujours, rien n'est créé).
			await expect(async () => {
				await checkoutPage.payButton.click();
				await expect(
					page.getByText(`Stock insuffisant pour « ${product.name} ». Mets ton panier à jour.`),
				).toBeVisible({ timeout: 5000 });
			}).toPass({ timeout: 30_000 });

			// Vérité serveur : jamais d'Order (donc d'OrderItem) pour cette variante —
			// la garde précède la transaction de réservation.
			await expect
				.poll(() => getE2ePrisma().orderItem.count({ where: { variantId: product.variantId } }), {
					timeout: 10_000,
				})
				.toBe(0);
		} finally {
			await deleteTestProduct(product.productId);
		}
	});
});
