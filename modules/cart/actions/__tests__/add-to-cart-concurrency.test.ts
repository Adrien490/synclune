import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const {
	mockCheckCartRateLimit,
	mockValidateInput,
	mockHandleActionError,
	mockSuccess,
	mockError,
	mockBusinessError,
	mockPrisma,
	mockUpdateTag,
	mockGetCartInvalidationTags,
	mockGetCartExpirationDate,
	mockGetOrCreateCartSessionId,
} = vi.hoisted(() => {
	class MockBusinessError extends Error {
		constructor(message: string) {
			super(message);
			this.name = "BusinessError";
		}
	}
	return {
		mockCheckCartRateLimit: vi.fn(),
		mockValidateInput: vi.fn(),
		mockHandleActionError: vi.fn(),
		mockSuccess: vi.fn(),
		mockError: vi.fn(),
		mockBusinessError: MockBusinessError,
		mockPrisma: {
			user: { findUnique: vi.fn() },
			cart: { findFirst: vi.fn() },
			$transaction: vi.fn(),
		},
		mockUpdateTag: vi.fn(),
		mockGetCartInvalidationTags: vi.fn(),
		mockGetCartExpirationDate: vi.fn(),
		mockGetOrCreateCartSessionId: vi.fn(),
	};
});

vi.mock("@/modules/cart/lib/cart-rate-limit", () => ({
	checkCartRateLimit: mockCheckCartRateLimit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	CART_LIMITS: { ADD: "add" },
}));
vi.mock("@/shared/lib/actions", () => ({
	safeFormGet: (formData: FormData, key: string) => {
		const v = formData.get(key);
		return typeof v === "string" ? v : null;
	},
	validateInput: mockValidateInput,
	handleActionError: mockHandleActionError,
	success: mockSuccess,
	error: mockError,
	BusinessError: mockBusinessError,
}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag }));
vi.mock("@/modules/cart/constants/cache", () => ({
	getCartInvalidationTags: mockGetCartInvalidationTags,
	CART_CACHE_TAGS: { PRODUCT_CARTS: (id: string) => `product-carts-${id}` },
}));
vi.mock("@/modules/cart/lib/cart-session", () => ({
	getCartExpirationDate: mockGetCartExpirationDate,
	getOrCreateCartSessionId: mockGetOrCreateCartSessionId,
}));
vi.mock("../../schemas/cart.schemas", () => ({ addToCartSchema: {} }));
vi.mock("../../constants/error-messages", () => ({
	CART_ERROR_MESSAGES: {
		SKU_NOT_FOUND: "Produit introuvable",
		PRODUCT_DELETED: "Ce produit n'existe plus",
		SKU_INACTIVE: "Ce produit n'est plus disponible",
		PRODUCT_NOT_PUBLIC: "Ce produit n'est pas disponible à la vente",
		QUANTITY_MAX: "Quantité maximale dépassée",
		INSUFFICIENT_STOCK: "Stock insuffisant",
		OUT_OF_STOCK: "Cet article n'est plus en stock",
		CART_ITEMS_LIMIT: (n: number) => `Max ${n} articles`,
	},
}));
vi.mock("../../constants/cart", () => ({
	MAX_CART_ITEMS: 50,
	MAX_QUANTITY_PER_ORDER: 10,
}));

import { addToCart } from "../add-to-cart";

// ============================================================================
// Helpers
// ============================================================================

function makeFormData(skuId = "sku-1", quantity = 1) {
	const fd = new FormData();
	fd.set("skuId", skuId);
	fd.set("quantity", String(quantity));
	return fd;
}

function makeSkuRow(overrides: Record<string, unknown> = {}) {
	return {
		inventory: 10,
		isActive: true,
		priceInclTax: 2999,
		deletedAt: null,
		productId: "product-1",
		productStatus: "PUBLIC",
		productDeletedAt: null,
		...overrides,
	};
}

// ============================================================================
// Concurrent stock access tests
// ============================================================================

describe("addToCart - concurrency scenarios", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockValidateInput.mockReturnValue({ data: { skuId: "sku-1", quantity: 1 } });
		mockCheckCartRateLimit.mockResolvedValue({
			success: true,
			context: { userId: "user-1", sessionId: null },
		});
		mockPrisma.user.findUnique.mockResolvedValue({ id: "user-1" });
		mockPrisma.cart.findFirst.mockResolvedValue(null);
		mockGetCartInvalidationTags.mockReturnValue(["cart-tag"]);
		mockSuccess.mockImplementation((msg: string, data?: unknown) => ({
			status: "SUCCESS",
			message: msg,
			data,
		}));
		mockError.mockImplementation((msg: string) => ({
			status: "ERROR",
			message: msg,
		}));
		mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({
			status: "ERROR",
			message: fallback,
		}));
	});

	it("should handle two concurrent add-to-cart for the same SKU with sufficient stock", async () => {
		// Simulate two concurrent transactions with stock=10
		// Both should succeed because FOR UPDATE serializes access
		let callCount = 0;
		mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => {
			callCount++;
			const tx = {
				$queryRaw: vi.fn().mockResolvedValue([makeSkuRow({ inventory: 10 })]),
				cart: { upsert: vi.fn().mockResolvedValue({ id: "cart-1" }) },
				cartItem: {
					findUnique: vi.fn().mockResolvedValue(null),
					create: vi.fn().mockResolvedValue({ id: `ci-${callCount}`, quantity: 1 }),
					update: vi.fn(),
					count: vi.fn().mockResolvedValue(0),
				},
			};
			return fn(tx);
		});

		// Simulate concurrent calls
		const [result1, result2] = await Promise.all([
			addToCart(undefined, makeFormData("sku-1", 1)),
			addToCart(undefined, makeFormData("sku-1", 1)),
		]);

		// Both should succeed because stock is sufficient
		expect(result1.status).toBe("SUCCESS");
		expect(result2.status).toBe("SUCCESS");
		// Transaction was called twice
		expect(mockPrisma.$transaction).toHaveBeenCalledTimes(2);
	});

	it("should reject the second call when stock is insufficient for concurrent adds", async () => {
		// First call succeeds with inventory=1, second call sees inventory=0
		let callCount = 0;
		mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => {
			callCount++;
			const currentInventory = callCount === 1 ? 1 : 0;
			const tx = {
				$queryRaw: vi.fn().mockResolvedValue([makeSkuRow({ inventory: currentInventory })]),
				cart: { upsert: vi.fn().mockResolvedValue({ id: "cart-1" }) },
				cartItem: {
					findUnique: vi.fn().mockResolvedValue(null),
					create: vi.fn().mockResolvedValue({ id: `ci-${callCount}`, quantity: 1 }),
					update: vi.fn(),
					count: vi.fn().mockResolvedValue(0),
				},
			};
			return fn(tx);
		});

		const [result1, result2] = await Promise.all([
			addToCart(undefined, makeFormData("sku-1", 1)),
			addToCart(undefined, makeFormData("sku-1", 1)),
		]);

		// First call succeeds, second fails with out of stock
		expect(result1.status).toBe("SUCCESS");
		// Second call: BusinessError("Cet article n'est plus en stock") is thrown
		// which goes through handleActionError
		expect(result2.status).toBe("ERROR");
	});

	it("should handle transaction failure gracefully when DB lock times out", async () => {
		mockPrisma.$transaction.mockRejectedValue(new Error("Lock wait timeout exceeded"));

		const result = await addToCart(undefined, makeFormData());

		expect(mockHandleActionError).toHaveBeenCalledWith(expect.any(Error), expect.any(String));
		expect(result.status).toBe("ERROR");
	});

	it("should handle double-submit by returning success for both when stock allows", async () => {
		// Simulate rapid double-submit: same user, same SKU
		// First creates a new item, second increments it
		let callCount = 0;
		mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => {
			callCount++;
			const tx = {
				$queryRaw: vi.fn().mockResolvedValue([makeSkuRow({ inventory: 10 })]),
				cart: { upsert: vi.fn().mockResolvedValue({ id: "cart-1" }) },
				cartItem: {
					findUnique:
						callCount === 1
							? vi.fn().mockResolvedValue(null) // First call: no existing item
							: vi.fn().mockResolvedValue({ id: "ci-1", quantity: 1 }), // Second call: item exists
					create: vi.fn().mockResolvedValue({ id: "ci-1", quantity: 1 }),
					update: vi.fn().mockResolvedValue({ id: "ci-1", quantity: 2 }),
					count: vi.fn().mockResolvedValue(0),
				},
			};
			return fn(tx);
		});

		const [result1, result2] = await Promise.all([
			addToCart(undefined, makeFormData("sku-1", 1)),
			addToCart(undefined, makeFormData("sku-1", 1)),
		]);

		expect(result1.status).toBe("SUCCESS");
		expect(result2.status).toBe("SUCCESS");
	});

	it("should enforce max quantity when concurrent adds exceed the limit", async () => {
		// Simulate: existing quantity is 9, both try to add 2 (max is 10)
		mockValidateInput.mockReturnValue({ data: { skuId: "sku-1", quantity: 2 } });

		mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => {
			const tx = {
				$queryRaw: vi.fn().mockResolvedValue([makeSkuRow({ inventory: 100 })]),
				cart: { upsert: vi.fn().mockResolvedValue({ id: "cart-1" }) },
				cartItem: {
					findUnique: vi.fn().mockResolvedValue({ id: "ci-1", quantity: 9 }),
					create: vi.fn(),
					update: vi.fn(),
					count: vi.fn().mockResolvedValue(1),
				},
			};
			return fn(tx);
		});

		// Both calls should fail because 9 + 2 > 10 (MAX_QUANTITY_PER_ORDER)
		const [result1, result2] = await Promise.all([
			addToCart(undefined, makeFormData("sku-1", 2)),
			addToCart(undefined, makeFormData("sku-1", 2)),
		]);

		// Both should get the error via handleActionError (BusinessError: quantity max)
		expect(result1.status).toBe("ERROR");
		expect(result2.status).toBe("ERROR");
	});

	it("should handle concurrent requests from different users for limited stock", async () => {
		// Two different users both trying to buy the last item
		let callCount = 0;

		// First user context
		mockCheckCartRateLimit
			.mockResolvedValueOnce({
				success: true,
				context: { userId: "user-1", sessionId: null },
			})
			.mockResolvedValueOnce({
				success: true,
				context: { userId: "user-2", sessionId: null },
			});

		mockPrisma.user.findUnique
			.mockResolvedValueOnce({ id: "user-1" })
			.mockResolvedValueOnce({ id: "user-2" });

		mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => {
			callCount++;
			// First transaction sees inventory=1, second sees inventory=0 (after FOR UPDATE)
			const currentInventory = callCount === 1 ? 1 : 0;
			const tx = {
				$queryRaw: vi.fn().mockResolvedValue([makeSkuRow({ inventory: currentInventory })]),
				cart: { upsert: vi.fn().mockResolvedValue({ id: `cart-${callCount}` }) },
				cartItem: {
					findUnique: vi.fn().mockResolvedValue(null),
					create: vi.fn().mockResolvedValue({ id: `ci-${callCount}`, quantity: 1 }),
					update: vi.fn(),
					count: vi.fn().mockResolvedValue(0),
				},
			};
			return fn(tx);
		});

		const [result1, result2] = await Promise.all([
			addToCart(undefined, makeFormData("sku-1", 1)),
			addToCart(undefined, makeFormData("sku-1", 1)),
		]);

		// One should succeed, one should fail
		const results = [result1.status, result2.status].sort();
		expect(results).toEqual(["ERROR", "SUCCESS"]);
	});
});
