import { beforeEach, describe, expect, it, vi } from "vitest";

import { getOrders } from "@/modules/orders/data/get-orders";

import { searchRefundableOrders } from "../search-refundable-orders";

vi.mock("@/modules/orders/data/get-orders", () => ({
	getOrders: vi.fn(),
}));

vi.mock("@/modules/auth/lib/require-auth", () => ({
	requireAdmin: vi.fn().mockResolvedValue({ user: { id: "admin-1" } }),
}));

const mockedGetOrders = vi.mocked(getOrders);

function makeOrderRow(overrides: Record<string, unknown> = {}) {
	return {
		id: "order-1",
		orderNumber: "SYN-ABC123",
		customerName: "Alice Martin",
		customerEmail: "alice@example.com",
		total: 4990,
		currency: "EUR",
		status: "DELIVERED",
		paymentStatus: "PAID",
		...overrides,
	};
}

describe("searchRefundableOrders", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockedGetOrders.mockResolvedValue({
			orders: [makeOrderRow()] as never,
			pagination: {
				nextCursor: null,
				prevCursor: null,
				hasNextPage: false,
				hasPreviousPage: false,
			},
			totalCount: 1,
		});
	});

	it("ne retient que les commandes payées et non annulées (miroir de canRefund)", async () => {
		await searchRefundableOrders("");

		expect(mockedGetOrders).toHaveBeenCalledTimes(1);
		const params = mockedGetOrders.mock.calls[0]![0];
		expect(params.filters?.status).toEqual(["PROCESSING", "SHIPPED", "DELIVERED"]);
		expect(params.filters?.paymentStatus).toEqual(["PAID", "PARTIALLY_REFUNDED"]);
		expect(params.filters?.showDeleted).toBe("active");
	});

	it("passe la requête de recherche quand non vide, undefined sinon", async () => {
		await searchRefundableOrders("  SYN-ABC  ");
		expect(mockedGetOrders.mock.calls[0]![0].search).toBe("SYN-ABC");

		vi.clearAllMocks();
		mockedGetOrders.mockResolvedValue({
			orders: [],
			pagination: {
				nextCursor: null,
				prevCursor: null,
				hasNextPage: false,
				hasPreviousPage: false,
			},
			totalCount: 0,
		});
		await searchRefundableOrders("   ");
		expect(mockedGetOrders.mock.calls[0]![0].search).toBeUndefined();
	});

	it("rejette une requête > 200 caractères sans toucher getOrders (C4 audit Zod 2026-07-09)", async () => {
		const result = await searchRefundableOrders("a".repeat(201));
		expect(result).toEqual([]);
		expect(mockedGetOrders).not.toHaveBeenCalled();
	});

	it("projette les champs minimaux attendus par le sélecteur", async () => {
		const result = await searchRefundableOrders("");
		expect(result).toEqual([
			{
				id: "order-1",
				orderNumber: "SYN-ABC123",
				customerName: "Alice Martin",
				customerEmail: "alice@example.com",
				total: 4990,
				currency: "EUR",
				status: "DELIVERED",
				paymentStatus: "PAID",
			},
		]);
	});

	it("renvoie une liste vide si getOrders échoue (non autorisé / params invalides)", async () => {
		mockedGetOrders.mockRejectedValue(new Error("Unauthorized"));
		await expect(searchRefundableOrders("")).resolves.toEqual([]);
	});
});
