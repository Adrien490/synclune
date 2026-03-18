import { describe, it, expect, vi, beforeEach } from "vitest";
import { VALID_USER_ID, VALID_SKU_ID } from "@/test/factories";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockFindFirst, mockFindUnique, mockCacheLife, mockCacheTag, mockCacheCart } = vi.hoisted(
	() => ({
		mockFindFirst: vi.fn(),
		mockFindUnique: vi.fn(),
		mockCacheLife: vi.fn(),
		mockCacheTag: vi.fn(),
		mockCacheCart: vi.fn(),
	}),
);

vi.mock("@/shared/lib/prisma", () => ({
	prisma: {
		cart: {
			findFirst: mockFindFirst,
			findUnique: mockFindUnique,
		},
	},
}));

vi.mock("@/modules/cart/utils/cache", () => ({
	cacheCart: mockCacheCart,
}));

vi.mock("next/cache", () => ({
	cacheLife: mockCacheLife,
	cacheTag: mockCacheTag,
	updateTag: vi.fn(),
}));

import { getGuestCartForMerge, getUserCartForMerge } from "../get-cart-for-merge";

// ============================================================================
// FACTORIES
// ============================================================================

const GUEST_SESSION_ID = "session-abc-123";

function createMockGuestCart(overrides: Record<string, unknown> = {}) {
	return {
		id: "cart_guest_123",
		sessionId: GUEST_SESSION_ID,
		items: [
			{
				id: "ci_guest_001",
				skuId: VALID_SKU_ID,
				quantity: 2,
				priceAtAdd: 4999,
				sku: {
					id: VALID_SKU_ID,
					inventory: 10,
					isActive: true,
					deletedAt: null,
					product: {
						id: "prod_123",
						status: "PUBLIC",
						deletedAt: null,
					},
				},
			},
		],
		...overrides,
	};
}

function createMockUserCart(overrides: Record<string, unknown> = {}) {
	return {
		id: "cart_user_123",
		userId: VALID_USER_ID,
		items: [
			{
				id: "ci_user_001",
				skuId: VALID_SKU_ID,
				quantity: 1,
			},
		],
		...overrides,
	};
}

// ============================================================================
// TESTS: getGuestCartForMerge
// ============================================================================

describe("getGuestCartForMerge", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mockFindFirst.mockResolvedValue(createMockGuestCart());
	});

	it("calls prisma.cart.findFirst with the given sessionId", async () => {
		await getGuestCartForMerge(GUEST_SESSION_ID);

		expect(mockFindFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ sessionId: GUEST_SESSION_ID }),
			}),
		);
	});

	it("excludes expired carts via OR clause", async () => {
		await getGuestCartForMerge(GUEST_SESSION_ID);

		const callArg = mockFindFirst.mock.calls[0]![0];
		expect(callArg.where.OR).toBeDefined();
		expect(callArg.where.OR).toContainEqual({ expiresAt: null });
		expect(callArg.where.OR).toContainEqual({ expiresAt: { gt: expect.any(Date) } });
	});

	it("returns the cart when found", async () => {
		const result = await getGuestCartForMerge(GUEST_SESSION_ID);

		expect(result).not.toBeNull();
		expect(result?.sessionId).toBe(GUEST_SESSION_ID);
	});

	it("returns null when no guest cart matches the sessionId", async () => {
		mockFindFirst.mockResolvedValue(null);

		const result = await getGuestCartForMerge("nonexistent-session");

		expect(result).toBeNull();
	});

	it("returns cart items with full SKU and product relations", async () => {
		const result = await getGuestCartForMerge(GUEST_SESSION_ID);

		expect(result?.items[0]).toMatchObject({
			skuId: VALID_SKU_ID,
			quantity: 2,
			sku: expect.objectContaining({
				inventory: expect.any(Number),
				isActive: expect.any(Boolean),
				product: expect.objectContaining({ status: "PUBLIC" }),
			}),
		});
	});

	it("selects id and sessionId fields at the cart level", async () => {
		await getGuestCartForMerge(GUEST_SESSION_ID);

		const callArg = mockFindFirst.mock.calls[0]![0];
		expect(callArg.select).toMatchObject({ id: true, sessionId: true });
	});

	it("calls cacheCart utility with sessionId (no userId)", async () => {
		await getGuestCartForMerge(GUEST_SESSION_ID);

		expect(mockCacheCart).toHaveBeenCalledWith(undefined, GUEST_SESSION_ID);
	});
});

// ============================================================================
// TESTS: getUserCartForMerge
// ============================================================================

describe("getUserCartForMerge", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mockFindUnique.mockResolvedValue(createMockUserCart());
	});

	it("calls prisma.cart.findUnique with the given userId", async () => {
		await getUserCartForMerge(VALID_USER_ID);

		expect(mockFindUnique).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { userId: VALID_USER_ID },
			}),
		);
	});

	it("returns the cart when found", async () => {
		const result = await getUserCartForMerge(VALID_USER_ID);

		expect(result).not.toBeNull();
		expect(result?.userId).toBe(VALID_USER_ID);
	});

	it("returns null when no user cart exists", async () => {
		mockFindUnique.mockResolvedValue(null);

		const result = await getUserCartForMerge("unknown-user");

		expect(result).toBeNull();
	});

	it("returns cart items with skuId and quantity only (lightweight)", async () => {
		const result = await getUserCartForMerge(VALID_USER_ID);

		expect(result?.items[0]).toMatchObject({ skuId: VALID_SKU_ID, quantity: 1 });
	});

	it("selects id, userId and items fields at the cart level", async () => {
		await getUserCartForMerge(VALID_USER_ID);

		const callArg = mockFindUnique.mock.calls[0]![0];
		expect(callArg.select).toMatchObject({ id: true, userId: true });
	});

	it("does NOT select sku relations for user cart (merge only needs skuId + quantity)", async () => {
		await getUserCartForMerge(VALID_USER_ID);

		const callArg = mockFindUnique.mock.calls[0]![0];
		// User cart items should not have the full sku relation
		expect(callArg.select.items.select?.sku).toBeUndefined();
	});

	it("calls cacheCart utility with userId (no sessionId)", async () => {
		await getUserCartForMerge(VALID_USER_ID);

		expect(mockCacheCart).toHaveBeenCalledWith(VALID_USER_ID, undefined);
	});
});
