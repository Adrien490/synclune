/**
 * @regression checkout-stock-reservation
 *
 * La réservation de stock du checkout est un décrément ATOMIQUE
 * (`updateMany` conditionnel `stock: { gte: qty }`) dont le count est vérifié
 * ligne par ligne — jamais de read-then-write : les bijoux sont souvent
 * `stock = 1`, deux checkouts concurrents sur la même pièce doivent se
 * départager par le count, pas par une lecture préalable.
 *
 * Un count ≠ 1 fait échouer TOUTE la transaction (aucun Order créé, les
 * décréments précédents annulés par le rollback Prisma).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BusinessError } from "@/shared/lib/actions";
import { PENDING_SESSION_PLACEHOLDER_PREFIX } from "../../constants/checkout.constants";
import type { CheckoutOrderLine } from "../checkout-order.service";
import { releaseReservation, reserveStockAndCreateOrder } from "../checkout-reservation.service";

const mocks = vi.hoisted(() => {
	const tx = {
		productVariant: { updateMany: vi.fn() },
		order: { create: vi.fn(), delete: vi.fn() },
	};
	return {
		tx,
		$transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(tx)),
	};
});

vi.mock("@/shared/lib/prisma", () => ({
	prisma: { $transaction: mocks.$transaction },
}));

const LINES: CheckoutOrderLine[] = [
	{
		variantId: "variant-a",
		productId: "product-a",
		nameSnapshot: "Bague Nuit étoilée",
		variantSnapshot: "Bleu nuit · 52 · Résine",
		unitPriceCents: 3200,
		quantity: 1,
		imageUrl: null,
	},
	{
		variantId: "variant-b",
		productId: "product-b",
		nameSnapshot: "Porte-clés nénuphar",
		variantSnapshot: null,
		unitPriceCents: 1400,
		quantity: 2,
		imageUrl: null,
	},
];

const AMOUNTS = { amountItemsCents: 6000, amountShippingCents: 499, amountTotalCents: 6499 };

beforeEach(() => {
	vi.clearAllMocks();
	mocks.tx.order.create.mockResolvedValue({ id: "order-1" });
});

describe("reserveStockAndCreateOrder", () => {
	it("décrémente chaque ligne conditionnellement puis crée l'Order PENDING", async () => {
		mocks.tx.productVariant.updateMany.mockResolvedValue({ count: 1 });

		const { orderId } = await reserveStockAndCreateOrder(LINES, AMOUNTS);

		expect(orderId).toBe("order-1");
		expect(mocks.tx.productVariant.updateMany).toHaveBeenCalledTimes(2);
		expect(mocks.tx.productVariant.updateMany).toHaveBeenNthCalledWith(1, {
			where: {
				id: "variant-a",
				active: true,
				stock: { gte: 1 },
				product: { active: true },
			},
			data: { stock: { decrement: 1 } },
		});

		const createArg = mocks.tx.order.create.mock.calls[0]?.[0];
		expect(createArg.data.status).toBe("PENDING");
		expect(createArg.data.stripeSessionId).toMatch(
			new RegExp(`^${PENDING_SESSION_PLACEHOLDER_PREFIX}`),
		);
		expect(createArg.data.amountTotalCents).toBe(6499);
		expect(createArg.data.items.create).toHaveLength(2);
		expect(createArg.data.items.create[0]).toEqual({
			variantId: "variant-a",
			productId: "product-a",
			nameSnapshot: "Bague Nuit étoilée",
			variantSnapshot: "Bleu nuit · 52 · Résine",
			unitPriceCents: 3200,
			quantity: 1,
		});
	});

	it("un count ≠ 1 (stock insuffisant, variante inactive) fait tout échouer AVANT la création", async () => {
		mocks.tx.productVariant.updateMany
			.mockResolvedValueOnce({ count: 1 })
			.mockResolvedValueOnce({ count: 0 });

		await expect(reserveStockAndCreateOrder(LINES, AMOUNTS)).rejects.toThrow(BusinessError);
		expect(mocks.tx.order.create).not.toHaveBeenCalled();
	});
});

describe("releaseReservation", () => {
	it("restitue le stock de chaque ligne puis supprime l'Order provisoire", async () => {
		mocks.tx.productVariant.updateMany.mockResolvedValue({ count: 1 });

		await releaseReservation("order-1", [
			{ variantId: "variant-a", quantity: 1 },
			{ variantId: "variant-b", quantity: 2 },
		]);

		expect(mocks.tx.productVariant.updateMany).toHaveBeenCalledWith({
			where: { id: "variant-b" },
			data: { stock: { increment: 2 } },
		});
		expect(mocks.tx.order.delete).toHaveBeenCalledWith({ where: { id: "order-1" } });
	});
});
