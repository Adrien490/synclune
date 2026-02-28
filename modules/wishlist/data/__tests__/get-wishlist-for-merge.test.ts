import { describe, it, expect, vi, beforeEach } from "vitest";
import { VALID_USER_ID, VALID_PRODUCT_ID } from "@/test/factories";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockPrisma } = vi.hoisted(() => ({
	mockPrisma: {
		wishlist: {
			findUnique: vi.fn(),
		},
	},
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
}));

import { getGuestWishlistForMerge, getUserWishlistForMerge } from "../get-wishlist-for-merge";

// ============================================================================
// CONSTANTS
// ============================================================================

const VALID_SESSION_ID = "session_merge123";

// ============================================================================
// HELPERS
// ============================================================================

function createGuestWishlist(overrides: Record<string, unknown> = {}) {
	return {
		id: "wishlist_guest_001",
		items: [
			{
				productId: VALID_PRODUCT_ID,
				product: {
					id: VALID_PRODUCT_ID,
					status: "PUBLIC",
				},
			},
		],
		...overrides,
	};
}

function createUserWishlist(overrides: Record<string, unknown> = {}) {
	return {
		id: "wishlist_user_001",
		items: [{ productId: VALID_PRODUCT_ID }],
		...overrides,
	};
}

// ============================================================================
// TESTS: getGuestWishlistForMerge
// ============================================================================

describe("getGuestWishlistForMerge", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockPrisma.wishlist.findUnique.mockResolvedValue(createGuestWishlist());
	});

	// Returns wishlist with items and product status for valid sessionId
	it("should return wishlist with items and product status for valid sessionId", async () => {
		const result = await getGuestWishlistForMerge(VALID_SESSION_ID);

		expect(result).not.toBeNull();
		expect(result?.id).toBe("wishlist_guest_001");
		expect(result?.items).toHaveLength(1);
		expect(result?.items[0]!.productId).toBe(VALID_PRODUCT_ID);
		expect(result?.items[0]!.product?.id).toBe(VALID_PRODUCT_ID);
		expect(result?.items[0]!.product?.status).toBe("PUBLIC");
	});

	// Queries by sessionId
	it("should query wishlist by sessionId", async () => {
		await getGuestWishlistForMerge(VALID_SESSION_ID);

		expect(mockPrisma.wishlist.findUnique).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { sessionId: VALID_SESSION_ID },
			}),
		);
	});

	// Selects the correct fields: id, items (productId + product.id + product.status)
	it("should select id, items.productId, items.product.id and items.product.status", async () => {
		await getGuestWishlistForMerge(VALID_SESSION_ID);

		expect(mockPrisma.wishlist.findUnique).toHaveBeenCalledWith(
			expect.objectContaining({
				select: {
					id: true,
					items: {
						select: {
							productId: true,
							product: {
								select: {
									id: true,
									status: true,
								},
							},
						},
					},
				},
			}),
		);
	});

	// Returns null for non-existent sessionId
	it("should return null for non-existent sessionId", async () => {
		mockPrisma.wishlist.findUnique.mockResolvedValue(null);

		const result = await getGuestWishlistForMerge("session_does_not_exist");

		expect(result).toBeNull();
	});

	// Returns wishlist with empty items array when wishlist has no items
	it("should return wishlist with empty items when wishlist has no items", async () => {
		mockPrisma.wishlist.findUnique.mockResolvedValue(createGuestWishlist({ items: [] }));

		const result = await getGuestWishlistForMerge(VALID_SESSION_ID);

		expect(result?.items).toHaveLength(0);
	});

	// Returns wishlist with multiple items
	it("should return wishlist with multiple items", async () => {
		mockPrisma.wishlist.findUnique.mockResolvedValue(
			createGuestWishlist({
				items: [
					{ productId: VALID_PRODUCT_ID, product: { id: VALID_PRODUCT_ID, status: "PUBLIC" } },
					{ productId: "prod_other", product: { id: "prod_other", status: "PUBLIC" } },
				],
			}),
		);

		const result = await getGuestWishlistForMerge(VALID_SESSION_ID);

		expect(result?.items).toHaveLength(2);
	});
});

// ============================================================================
// TESTS: getUserWishlistForMerge
// ============================================================================

describe("getUserWishlistForMerge", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockPrisma.wishlist.findUnique.mockResolvedValue(createUserWishlist());
	});

	// Returns wishlist with items for valid userId
	it("should return wishlist with items for valid userId", async () => {
		const result = await getUserWishlistForMerge(VALID_USER_ID);

		expect(result).not.toBeNull();
		expect(result?.id).toBe("wishlist_user_001");
		expect(result?.items).toHaveLength(1);
		expect(result?.items[0]!.productId).toBe(VALID_PRODUCT_ID);
	});

	// Queries by userId
	it("should query wishlist by userId", async () => {
		await getUserWishlistForMerge(VALID_USER_ID);

		expect(mockPrisma.wishlist.findUnique).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { userId: VALID_USER_ID },
			}),
		);
	});

	// Selects only id and items.productId (no product details)
	it("should select only id and items.productId without product details", async () => {
		await getUserWishlistForMerge(VALID_USER_ID);

		expect(mockPrisma.wishlist.findUnique).toHaveBeenCalledWith(
			expect.objectContaining({
				select: {
					id: true,
					items: {
						select: {
							productId: true,
						},
					},
				},
			}),
		);
	});

	// Does NOT include product nested select (unlike guest version)
	it("should not include product nested select in items", async () => {
		await getUserWishlistForMerge(VALID_USER_ID);

		const callArg = mockPrisma.wishlist.findUnique.mock.calls[0]![0];
		expect(callArg.select.items.select).not.toHaveProperty("product");
	});

	// Returns null for non-existent userId
	it("should return null for non-existent userId", async () => {
		mockPrisma.wishlist.findUnique.mockResolvedValue(null);

		const result = await getUserWishlistForMerge("user_does_not_exist");

		expect(result).toBeNull();
	});

	// Returns wishlist with empty items array
	it("should return wishlist with empty items when wishlist has no items", async () => {
		mockPrisma.wishlist.findUnique.mockResolvedValue(createUserWishlist({ items: [] }));

		const result = await getUserWishlistForMerge(VALID_USER_ID);

		expect(result?.items).toHaveLength(0);
	});

	// Returns wishlist with multiple items
	it("should return wishlist with multiple items", async () => {
		mockPrisma.wishlist.findUnique.mockResolvedValue(
			createUserWishlist({
				items: [
					{ productId: VALID_PRODUCT_ID },
					{ productId: "prod_other" },
					{ productId: "prod_third" },
				],
			}),
		);

		const result = await getUserWishlistForMerge(VALID_USER_ID);

		expect(result?.items).toHaveLength(3);
	});
});

// ============================================================================
// COMPARISON TESTS: both functions use findUnique
// ============================================================================

describe("getGuestWishlistForMerge vs getUserWishlistForMerge", () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	it("should both use prisma.wishlist.findUnique", async () => {
		mockPrisma.wishlist.findUnique.mockResolvedValue(null);

		await getGuestWishlistForMerge(VALID_SESSION_ID);
		await getUserWishlistForMerge(VALID_USER_ID);

		expect(mockPrisma.wishlist.findUnique).toHaveBeenCalledTimes(2);
	});

	it("getGuestWishlistForMerge selects product status while getUserWishlistForMerge does not", async () => {
		mockPrisma.wishlist.findUnique.mockResolvedValue(null);

		await getGuestWishlistForMerge(VALID_SESSION_ID);
		const guestCall = mockPrisma.wishlist.findUnique.mock.calls[0]![0];

		vi.resetAllMocks();
		mockPrisma.wishlist.findUnique.mockResolvedValue(null);

		await getUserWishlistForMerge(VALID_USER_ID);
		const userCall = mockPrisma.wishlist.findUnique.mock.calls[0]![0];

		// Guest version includes product details for status-based filtering
		expect(guestCall.select.items.select).toHaveProperty("product");
		// User version only needs productId for duplicate detection
		expect(userCall.select.items.select).not.toHaveProperty("product");
	});
});
