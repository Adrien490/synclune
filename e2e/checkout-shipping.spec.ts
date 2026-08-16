import type { BrowserContext } from "@playwright/test";
import { SHIPPING_RATES } from "../modules/orders/constants/shipping-rates";
import { expect, test } from "./fixtures";
import { getE2ePrisma } from "./helpers/db";
import { TEST_RUN_ID } from "./helpers/test-run";

/**
 * Frais de port sur `/paiement` — le select pays pilote la ligne « Livraison »
 * ET le total (SSOT `SHIPPING_RATES` : FR 4,99 € / UE 9,50 €, importée ici pour
 * que le test suive un changement de barème au lieu de figer des littéraux).
 *
 * Lecture seule côté Stripe (aucune session créée) ; le produit du panier est
 * créé par le test (prix CONNU → totaux exacts assertables) et supprimé en
 * finally — doctrine checkout-guards.spec.ts.
 */

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const EURO = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const formatEuro = (cents: number) => EURO.format(cents / 100);

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

test.describe("Frais de port au checkout @critical", () => {
	test.describe.configure({ timeout: 60_000 });
	test.skip(
		({ browserName }) => browserName !== "chromium",
		"Flux à écritures en base (produit de test) — chromium seul",
	);
	test.skip(!process.env.DATABASE_URL, "DATABASE_URL requis (produit de test créé en base)");

	test("le pays de livraison bascule les frais (FR 4,99 € → Belgique 9,50 €) et le total suit", async ({
		page,
		context,
		checkoutPage,
	}) => {
		const price = 3000; // 30,00 € — aucun montant ambigu avec 4,99 / 9,50 / 34,99 / 39,50
		const prisma = getE2ePrisma();
		const unique = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
		const product = await prisma.product.create({
			data: {
				slug: `${TEST_RUN_ID}-port-${unique}`,
				name: `Création e2e port ${unique}`,
				description: "Produit de test e2e — supprimé par le spec en finally.",
				priceCents: price,
				active: true,
				variants: { create: [{ stock: 3, active: true }] },
			},
			select: { id: true, variants: { select: { id: true } } },
		});

		try {
			await seedCartCookie(context, [[product.variants[0]!.id, 1, price]]);
			await page.goto("/paiement");
			await expect(checkoutPage.countrySelect).toBeVisible({ timeout: 15_000 });
			await expect(checkoutPage.emptyCartMessage).toHaveCount(0);

			// État initial : France — libellé du délai + montant + total articles+port.
			await expect(
				page.getByText(`Livraison (${SHIPPING_RATES.FR.estimatedDays})`, { exact: true }),
			).toBeVisible();
			await expect(
				page.getByText(formatEuro(SHIPPING_RATES.FR.amount), { exact: true }),
			).toBeVisible();
			await expect(
				page.getByText(formatEuro(price + SHIPPING_RATES.FR.amount), { exact: true }),
			).toBeVisible();

			// Bascule Belgique. Boucle toPass : le select est un client component —
			// avant hydratation le changement DOM ne met pas à jour l'état React, on
			// re-sélectionne jusqu'à voir le tarif UE (re-sélectionner est idempotent).
			await expect(async () => {
				await checkoutPage.countrySelect.selectOption("BE");
				await expect(
					page.getByText(formatEuro(SHIPPING_RATES.EU.amount), { exact: true }),
				).toBeVisible({ timeout: 2000 });
			}).toPass({ timeout: 20_000 });

			await expect(
				page.getByText(`Livraison (${SHIPPING_RATES.EU.estimatedDays})`, { exact: true }),
			).toBeVisible();
			// Total recalculé articles + port UE ; le tarif FR a disparu du récap.
			await expect(
				page.getByText(formatEuro(price + SHIPPING_RATES.EU.amount), { exact: true }),
			).toBeVisible();
			await expect(
				page.getByText(formatEuro(SHIPPING_RATES.FR.amount), { exact: true }),
			).toHaveCount(0);
			await expect(
				page.getByText(formatEuro(price + SHIPPING_RATES.FR.amount), { exact: true }),
			).toHaveCount(0);
			// Le sous-total articles, lui, ne bouge pas (ligne article + ligne Sous-total).
			await expect(page.getByText(formatEuro(price), { exact: true }).first()).toBeVisible();
		} finally {
			await prisma.product.deleteMany({ where: { id: product.id } });
		}
	});
});
