/**
 * `updateCartPrices` — aligne les prix témoins du cookie sur les prix courants
 * en base. C'est le geste qui LÈVE le blocage du CTA sur hausse
 * (@regression cart-price-increase-blocks-checkout-2026-08-15) : après lui,
 * `priceAtAdd` == prix effectif, le panier redevient honnête.
 *
 * Les lignes indisponibles (VARIANT ou produit inactif) sont EXCLUES de
 * l'actualisation — elles sont traitées par le retrait, pas par le prix.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";

const mocks = vi.hoisted(() => ({
	readCartCookie: vi.fn(),
	writeCartCookie: vi.fn(),
	prisma: { productVariant: { findMany: vi.fn() } },
}));

vi.mock("@/modules/cart/lib/cart-cookie", () => ({
	readCartCookie: mocks.readCartCookie,
	writeCartCookie: mocks.writeCartCookie,
}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: mocks.prisma }));

import { updateCartPrices } from "../update-cart-prices";

const VARIANT_A = "cm1234567890abcdefghijk12";
const VARIANT_B = "cm1234567890abcdefghijk34";

function makeDbVariant(
	id: string,
	overrides?: { priceCents?: number | null; active?: boolean; productActive?: boolean },
) {
	return {
		id,
		active: overrides?.active ?? true,
		stock: 10,
		priceCents: overrides?.priceCents === undefined ? 2500 : overrides.priceCents,
		product: {
			id: "prod-1",
			name: "Bracelet Lune",
			active: overrides?.productActive ?? true,
			priceCents: 3000,
		},
	};
}

beforeEach(() => {
	vi.clearAllMocks();
});

describe("updateCartPrices", () => {
	it("panier vide : erreur explicite", async () => {
		mocks.readCartCookie.mockResolvedValue({ items: [] });
		const result = await updateCartPrices();
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toBe("Panier vide");
	});

	it("aucun prix à bouger : succès sans réécriture", async () => {
		mocks.readCartCookie.mockResolvedValue({
			items: [{ variantId: VARIANT_A, quantity: 1, priceAtAdd: 2500 }],
		});
		mocks.prisma.productVariant.findMany.mockResolvedValue([makeDbVariant(VARIANT_A)]);
		const result = await updateCartPrices();
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.data).toMatchObject({ updatedCount: 0 });
		expect(mocks.writeCartCookie).not.toHaveBeenCalled();
	});

	it("actualise une hausse au prix DB et détaille le delta", async () => {
		mocks.readCartCookie.mockResolvedValue({
			items: [{ variantId: VARIANT_A, quantity: 2, priceAtAdd: 2000 }],
		});
		mocks.prisma.productVariant.findMany.mockResolvedValue([
			makeDbVariant(VARIANT_A, { priceCents: 2500 }),
		]);

		const result = await updateCartPrices();

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toContain("hausse");
		expect(result.data).toMatchObject({
			updatedCount: 1,
			totalIncrease: 1000,
			increased: [
				expect.objectContaining({ variantId: VARIANT_A, oldPrice: 2000, newPrice: 2500 }),
			],
		});
		expect(mocks.writeCartCookie).toHaveBeenCalledWith(
			expect.objectContaining({
				items: [{ variantId: VARIANT_A, quantity: 2, priceAtAdd: 2500 }],
			}),
		);
	});

	it("annonce la bonne nouvelle sur une baisse", async () => {
		mocks.readCartCookie.mockResolvedValue({
			items: [{ variantId: VARIANT_A, quantity: 1, priceAtAdd: 3000 }],
		});
		mocks.prisma.productVariant.findMany.mockResolvedValue([
			makeDbVariant(VARIANT_A, { priceCents: 2500 }),
		]);
		const result = await updateCartPrices();
		expect(result.message).toContain("Bonne nouvelle");
		expect(result.data).toMatchObject({ totalSavings: 500 });
	});

	it("laisse intacte une ligne INACTIVE même si son prix a bougé", async () => {
		mocks.readCartCookie.mockResolvedValue({
			items: [
				{ variantId: VARIANT_A, quantity: 1, priceAtAdd: 2000 },
				{ variantId: VARIANT_B, quantity: 1, priceAtAdd: 1000 },
			],
		});
		mocks.prisma.productVariant.findMany.mockResolvedValue([
			makeDbVariant(VARIANT_A, { priceCents: 2500 }),
			makeDbVariant(VARIANT_B, { priceCents: 1500, active: false }),
		]);

		const result = await updateCartPrices();

		expect(result.data).toMatchObject({ updatedCount: 1 });
		expect(mocks.writeCartCookie).toHaveBeenCalledWith(
			expect.objectContaining({
				items: [
					{ variantId: VARIANT_A, quantity: 1, priceAtAdd: 2500 },
					{ variantId: VARIANT_B, quantity: 1, priceAtAdd: 1000 },
				],
			}),
		);
	});

	it("retombe sur le prix produit quand l'override variante est null", async () => {
		mocks.readCartCookie.mockResolvedValue({
			items: [{ variantId: VARIANT_A, quantity: 1, priceAtAdd: 2500 }],
		});
		mocks.prisma.productVariant.findMany.mockResolvedValue([
			makeDbVariant(VARIANT_A, { priceCents: null }),
		]);
		const result = await updateCartPrices();
		expect(mocks.writeCartCookie).toHaveBeenCalledWith(
			expect.objectContaining({
				items: [{ variantId: VARIANT_A, quantity: 1, priceAtAdd: 3000 }],
			}),
		);
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});
});
