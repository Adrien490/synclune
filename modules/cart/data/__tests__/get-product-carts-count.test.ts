import { describe, it, expect, vi, beforeEach } from "vitest";
import { VALID_PRODUCT_ID } from "@/test/factories";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockCount, mockCacheLife, mockCacheTag } = vi.hoisted(() => ({
	mockCount: vi.fn(),
	mockCacheLife: vi.fn(),
	mockCacheTag: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: {
		cart: { count: mockCount },
	},
}));

vi.mock("next/cache", () => ({
	cacheLife: mockCacheLife,
	cacheTag: mockCacheTag,
	updateTag: vi.fn(),
}));

vi.mock("@/modules/cart/constants/cache", () => ({
	CART_CACHE_TAGS: {
		PRODUCT_CARTS: (productId: string) => `product-carts-${productId}`,
	},
}));

import { getProductCartsCount } from "../get-product-carts-count";

// ============================================================================
// TESTS
// ============================================================================

describe("getProductCartsCount", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mockCount.mockResolvedValue(3);
	});

	it("calls prisma.cart.count with the given productId", async () => {
		await getProductCartsCount(VALID_PRODUCT_ID);

		expect(mockCount).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					items: expect.objectContaining({
						some: expect.objectContaining({
							sku: expect.objectContaining({ productId: VALID_PRODUCT_ID }),
						}),
					}),
				}),
			}),
		);
	});

	it("returns the count from prisma", async () => {
		mockCount.mockResolvedValue(7);

		const result = await getProductCartsCount(VALID_PRODUCT_ID);

		expect(result).toBe(7);
	});

	it("returns 0 when no active carts contain the product", async () => {
		mockCount.mockResolvedValue(0);

		const result = await getProductCartsCount(VALID_PRODUCT_ID);

		expect(result).toBe(0);
	});

	it("filters only active and non-deleted SKUs", async () => {
		await getProductCartsCount(VALID_PRODUCT_ID);

		const callArg = mockCount.mock.calls[0]![0];
		const skuFilter = callArg.where.items.some.sku;
		expect(skuFilter).toMatchObject({ isActive: true, deletedAt: null });
	});

	it("includes carts of authenticated users (userId not null)", async () => {
		await getProductCartsCount(VALID_PRODUCT_ID);

		const callArg = mockCount.mock.calls[0]![0];
		expect(callArg.where.OR).toContainEqual({ userId: { not: null } });
	});

	it("includes non-expired guest carts via expiresAt condition", async () => {
		await getProductCartsCount(VALID_PRODUCT_ID);

		const callArg = mockCount.mock.calls[0]![0];
		expect(callArg.where.OR).toContainEqual(
			expect.objectContaining({
				sessionId: { not: null },
				expiresAt: { gt: expect.any(Date) },
			}),
		);
	});

	it("uses realtime cache life profile for real-time accuracy", async () => {
		await getProductCartsCount(VALID_PRODUCT_ID);

		expect(mockCacheLife).toHaveBeenCalledWith("realtime");
	});

	it("uses PRODUCT_CARTS cache tag with the productId", async () => {
		await getProductCartsCount(VALID_PRODUCT_ID);

		expect(mockCacheTag).toHaveBeenCalledWith(`product-carts-${VALID_PRODUCT_ID}`);
	});
});
