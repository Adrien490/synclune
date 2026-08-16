/**
 * `removeUnavailableItems` — décide sur l'état COURANT du catalogue (lecture
 * directe, pas le cache de rendu), et c'est le SEUL endroit qui peut retirer du
 * cookie une ligne dont le VARIANT a totalement disparu de la base (elle
 * n'apparaît nulle part dans l'UI, `getCart` l'écartant du rendu).
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

import { removeUnavailableItems } from "../remove-unavailable-items";

const VARIANT_OK = "cm1234567890abcdefghijk12";
const VARIANT_INACTIVE = "cm1234567890abcdefghijk34";
const VARIANT_GONE = "cm1234567890abcdefghijk56";

function makeDbVariant(id: string, overrides?: { active?: boolean; stock?: number }) {
	return {
		id,
		active: overrides?.active ?? true,
		stock: overrides?.stock ?? 10,
		priceCents: 2500,
		product: { id: "prod-1", name: "Bracelet Lune", active: true, priceCents: 2500 },
	};
}

beforeEach(() => {
	vi.clearAllMocks();
});

describe("removeUnavailableItems", () => {
	it("panier vide : succès direct, sans lecture DB", async () => {
		mocks.readCartCookie.mockResolvedValue({ items: [] });
		const result = await removeUnavailableItems();
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.data).toEqual({ deletedCount: 0 });
		expect(mocks.prisma.productVariant.findMany).not.toHaveBeenCalled();
	});

	it("tout est servable : aucun retrait, cookie intact", async () => {
		mocks.readCartCookie.mockResolvedValue({
			items: [{ variantId: VARIANT_OK, quantity: 1, priceAtAdd: 2500 }],
		});
		mocks.prisma.productVariant.findMany.mockResolvedValue([makeDbVariant(VARIANT_OK)]);
		const result = await removeUnavailableItems();
		expect(result.message).toBe("Aucun article indisponible");
		expect(mocks.writeCartCookie).not.toHaveBeenCalled();
	});

	it("retire les lignes inactives ET celles dont le VARIANT a disparu de la base", async () => {
		mocks.readCartCookie.mockResolvedValue({
			items: [
				{ variantId: VARIANT_OK, quantity: 1, priceAtAdd: 2500 },
				{ variantId: VARIANT_INACTIVE, quantity: 1, priceAtAdd: 1500 },
				{ variantId: VARIANT_GONE, quantity: 2, priceAtAdd: 900 },
			],
		});
		// VARIANT_GONE absent du retour DB — ligne fantôme du cookie.
		mocks.prisma.productVariant.findMany.mockResolvedValue([
			makeDbVariant(VARIANT_OK),
			makeDbVariant(VARIANT_INACTIVE, { active: false }),
		]);

		const result = await removeUnavailableItems();

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.data).toEqual({ deletedCount: 2 });
		expect(result.message).toBe("2 articles indisponibles retirés");
		expect(mocks.writeCartCookie).toHaveBeenCalledWith(
			expect.objectContaining({
				items: [{ variantId: VARIANT_OK, quantity: 1, priceAtAdd: 2500 }],
			}),
		);
	});

	it("retire une ligne dont le stock ne couvre plus la quantité", async () => {
		mocks.readCartCookie.mockResolvedValue({
			items: [{ variantId: VARIANT_OK, quantity: 5, priceAtAdd: 2500 }],
		});
		mocks.prisma.productVariant.findMany.mockResolvedValue([
			makeDbVariant(VARIANT_OK, { stock: 2 }),
		]);
		const result = await removeUnavailableItems();
		expect(result.data).toEqual({ deletedCount: 1 });
		expect(result.message).toBe("1 article indisponible retiré");
	});
});
