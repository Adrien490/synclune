import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";

// Valid cuid2 for tests
const VALID_PRODUCT_ID = "cm1234567890abcdefghijk12";
const VALID_USER_ID = "cm_user_00000000000000001";
const VALID_SESSION_ID = "550e8400-e29b-41d4-a716-446655440000";

// ============================================================================
// MOCKS
// ============================================================================

const {
	mockPrisma,
	mockGetSession,
	mockGetWishlistSessionId,
	mockGetOrCreateWishlistSessionId,
	mockHeaders,
	mockGetClientIp,
	mockEnforceRateLimit,
	mockUpdateTag,
	mockGetGuestWishlistForMerge,
	mockGetUserWishlistForMerge,
	mockGetWishlistInvalidationTags,
} = vi.hoisted(() => ({
	mockPrisma: {
		product: { findUnique: vi.fn() },
		wishlist: {
			findFirst: vi.fn(),
			findUnique: vi.fn(),
			upsert: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			delete: vi.fn(),
		},
		wishlistItem: {
			findFirst: vi.fn(),
			create: vi.fn(),
			createMany: vi.fn(),
			delete: vi.fn(),
			deleteMany: vi.fn(),
			count: vi.fn(),
		},
		user: { findUnique: vi.fn() },
		$transaction: vi.fn(),
	},
	mockGetSession: vi.fn(),
	mockGetWishlistSessionId: vi.fn(),
	mockGetOrCreateWishlistSessionId: vi.fn(),
	mockHeaders: vi.fn(),
	mockGetClientIp: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockGetGuestWishlistForMerge: vi.fn(),
	mockGetUserWishlistForMerge: vi.fn(),
	mockGetWishlistInvalidationTags: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/modules/auth/lib/get-current-session", () => ({
	getSession: mockGetSession,
}));
vi.mock("@/modules/wishlist/lib/wishlist-session", () => ({
	getWishlistSessionId: mockGetWishlistSessionId,
	getOrCreateWishlistSessionId: mockGetOrCreateWishlistSessionId,
	getWishlistExpirationDate: () => new Date("2026-03-19"),
}));
vi.mock("next/headers", () => ({ headers: mockHeaders }));
vi.mock("@/shared/lib/rate-limit", () => ({
	getRateLimitIdentifier: vi.fn().mockReturnValue("test-rate-limit-id"),
	getClientIp: mockGetClientIp,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	WISHLIST_LIMITS: {
		ADD: { limit: 20, window: 60 },
		REMOVE: { limit: 20, window: 60 },
		TOGGLE: { limit: 20, window: 60 },
		MERGE: { limit: 10, window: 60 },
	},
}));
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag }));
vi.mock("@/modules/wishlist/constants/cache", () => ({
	getWishlistInvalidationTags: mockGetWishlistInvalidationTags,
}));
vi.mock("../../data/get-wishlist-for-merge", () => ({
	getGuestWishlistForMerge: mockGetGuestWishlistForMerge,
	getUserWishlistForMerge: mockGetUserWishlistForMerge,
}));

// Mock enforceRateLimit while keeping real validateInput, success, error, handleActionError
vi.mock("@/shared/lib/actions", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@/shared/lib/actions")>();
	return {
		...actual,
		enforceRateLimit: mockEnforceRateLimit,
	};
});

// ============================================================================
// IMPORTS (after mocks)
// ============================================================================

import { addToWishlist } from "../add-to-wishlist";
import { removeFromWishlist } from "../remove-from-wishlist";
import { toggleWishlistItem } from "../toggle-wishlist-item";
import { mergeWishlists } from "../merge-wishlists";

// ============================================================================
// HELPERS
// ============================================================================

function createFormData(data: Record<string, string>): FormData {
	const fd = new FormData();
	for (const [key, value] of Object.entries(data)) {
		fd.set(key, value);
	}
	return fd;
}

function setupAuthenticatedUser() {
	mockGetSession.mockResolvedValue({ user: { id: VALID_USER_ID } });
}

function setupGuestUser() {
	mockGetSession.mockResolvedValue(null);
	mockGetWishlistSessionId.mockResolvedValue(VALID_SESSION_ID);
	mockGetOrCreateWishlistSessionId.mockResolvedValue(VALID_SESSION_ID);
}

function setupDefaults() {
	mockHeaders.mockResolvedValue(new Headers());
	mockGetClientIp.mockResolvedValue("127.0.0.1");
	mockEnforceRateLimit.mockResolvedValue({ success: true });
	mockGetWishlistInvalidationTags.mockReturnValue(["tag-1", "tag-2", "tag-3"]);
}

// ============================================================================
// addToWishlist
// ============================================================================

describe("addToWishlist", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupDefaults();
	});

	it("should return error when no userId and no sessionId", async () => {
		mockGetSession.mockResolvedValue(null);
		mockGetOrCreateWishlistSessionId.mockResolvedValue(null);

		const result = await addToWishlist(
			undefined,
			createFormData({ productId: VALID_PRODUCT_ID })
		);

		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should return validation error with invalid productId", async () => {
		setupAuthenticatedUser();

		const result = await addToWishlist(
			undefined,
			createFormData({ productId: "invalid" })
		);

		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
	});

	it("should return error when product not found", async () => {
		setupAuthenticatedUser();
		mockPrisma.product.findUnique.mockResolvedValue(null);

		const result = await addToWishlist(
			undefined,
			createFormData({ productId: VALID_PRODUCT_ID })
		);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("disponible");
	});

	it("should return error when product is not PUBLIC", async () => {
		setupAuthenticatedUser();
		mockPrisma.product.findUnique.mockResolvedValue({
			id: VALID_PRODUCT_ID,
			status: "DRAFT",
		});

		const result = await addToWishlist(
			undefined,
			createFormData({ productId: VALID_PRODUCT_ID })
		);

		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should return error when wishlist is full", async () => {
		setupAuthenticatedUser();
		mockPrisma.product.findUnique.mockResolvedValue({
			id: VALID_PRODUCT_ID,
			status: "PUBLIC",
		});
		mockPrisma.$transaction.mockImplementation(async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma));
		mockPrisma.wishlist.upsert.mockResolvedValue({ id: "wishlist-1" });
		mockPrisma.wishlistItem.count.mockResolvedValue(500);

		const result = await addToWishlist(
			undefined,
			createFormData({ productId: VALID_PRODUCT_ID })
		);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("pleine");
	});

	it("should successfully add a product", async () => {
		setupAuthenticatedUser();
		mockPrisma.product.findUnique.mockResolvedValue({
			id: VALID_PRODUCT_ID,
			status: "PUBLIC",
		});
		mockPrisma.$transaction.mockImplementation(async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma));
		mockPrisma.wishlist.upsert.mockResolvedValue({ id: "wishlist-1" });
		mockPrisma.wishlistItem.count.mockResolvedValue(10);
		mockPrisma.wishlistItem.findFirst.mockResolvedValue(null);
		mockPrisma.wishlistItem.create.mockResolvedValue({ id: "item-1" });

		const result = await addToWishlist(
			undefined,
			createFormData({ productId: VALID_PRODUCT_ID })
		);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toContain("Ajoute");
	});

	it("should return already exists when item is duplicate", async () => {
		setupAuthenticatedUser();
		mockPrisma.product.findUnique.mockResolvedValue({
			id: VALID_PRODUCT_ID,
			status: "PUBLIC",
		});
		mockPrisma.$transaction.mockImplementation(async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma));
		mockPrisma.wishlist.upsert.mockResolvedValue({ id: "wishlist-1" });
		mockPrisma.wishlistItem.count.mockResolvedValue(10);
		mockPrisma.wishlistItem.findFirst.mockResolvedValue({
			id: "existing-item",
		});

		const result = await addToWishlist(
			undefined,
			createFormData({ productId: VALID_PRODUCT_ID })
		);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toContain("Deja");
	});

	it("should invalidate cache tags after success", async () => {
		setupAuthenticatedUser();
		mockPrisma.product.findUnique.mockResolvedValue({
			id: VALID_PRODUCT_ID,
			status: "PUBLIC",
		});
		mockPrisma.$transaction.mockImplementation(async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma));
		mockPrisma.wishlist.upsert.mockResolvedValue({ id: "wishlist-1" });
		mockPrisma.wishlistItem.count.mockResolvedValue(0);
		mockPrisma.wishlistItem.findFirst.mockResolvedValue(null);
		mockPrisma.wishlistItem.create.mockResolvedValue({ id: "item-1" });

		await addToWishlist(
			undefined,
			createFormData({ productId: VALID_PRODUCT_ID })
		);

		expect(mockUpdateTag).toHaveBeenCalledTimes(3);
	});
});

// ============================================================================
// removeFromWishlist
// ============================================================================

describe("removeFromWishlist", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupDefaults();
	});

	it("should return error when no userId and no sessionId", async () => {
		mockGetSession.mockResolvedValue(null);
		mockGetWishlistSessionId.mockResolvedValue(null);

		const result = await removeFromWishlist(
			undefined,
			createFormData({ productId: VALID_PRODUCT_ID })
		);

		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should return validation error with invalid productId", async () => {
		setupAuthenticatedUser();

		const result = await removeFromWishlist(
			undefined,
			createFormData({ productId: "invalid" })
		);

		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
	});

	it("should return error when wishlist not found", async () => {
		setupAuthenticatedUser();
		mockPrisma.wishlist.findFirst.mockResolvedValue(null);

		const result = await removeFromWishlist(
			undefined,
			createFormData({ productId: VALID_PRODUCT_ID })
		);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("n'existe pas");
	});

	it("should successfully remove an item", async () => {
		setupAuthenticatedUser();
		mockPrisma.wishlist.findFirst.mockResolvedValue({ id: "wishlist-1" });
		mockPrisma.$transaction.mockImplementation(async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma));
		mockPrisma.wishlistItem.deleteMany.mockResolvedValue({ count: 1 });
		mockPrisma.wishlist.update.mockResolvedValue({});

		const result = await removeFromWishlist(
			undefined,
			createFormData({ productId: VALID_PRODUCT_ID })
		);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toBe("Retire de votre wishlist");
	});

	it("should return item not found message when deleteMany count is 0", async () => {
		setupAuthenticatedUser();
		mockPrisma.wishlist.findFirst.mockResolvedValue({ id: "wishlist-1" });
		mockPrisma.$transaction.mockImplementation(async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma));
		mockPrisma.wishlistItem.deleteMany.mockResolvedValue({ count: 0 });
		mockPrisma.wishlist.update.mockResolvedValue({});

		const result = await removeFromWishlist(
			undefined,
			createFormData({ productId: VALID_PRODUCT_ID })
		);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toContain("n'est pas dans");
	});

	it("should not require product to be PUBLIC (allows removing archived products)", async () => {
		setupAuthenticatedUser();
		mockPrisma.wishlist.findFirst.mockResolvedValue({ id: "wishlist-1" });
		mockPrisma.$transaction.mockImplementation(async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma));
		mockPrisma.wishlistItem.deleteMany.mockResolvedValue({ count: 1 });
		mockPrisma.wishlist.update.mockResolvedValue({});

		const result = await removeFromWishlist(
			undefined,
			createFormData({ productId: VALID_PRODUCT_ID })
		);

		// Should NOT call product.findUnique (pre-check was removed)
		expect(mockPrisma.product.findUnique).not.toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	it("should invalidate cache tags after success", async () => {
		setupAuthenticatedUser();
		mockPrisma.wishlist.findFirst.mockResolvedValue({ id: "wishlist-1" });
		mockPrisma.$transaction.mockImplementation(async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma));
		mockPrisma.wishlistItem.deleteMany.mockResolvedValue({ count: 1 });
		mockPrisma.wishlist.update.mockResolvedValue({});

		await removeFromWishlist(
			undefined,
			createFormData({ productId: VALID_PRODUCT_ID })
		);

		expect(mockUpdateTag).toHaveBeenCalledTimes(3);
	});
});

// ============================================================================
// toggleWishlistItem
// ============================================================================

describe("toggleWishlistItem", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupDefaults();
	});

	it("should return error when no userId and no sessionId", async () => {
		mockGetSession.mockResolvedValue(null);
		mockGetOrCreateWishlistSessionId.mockResolvedValue(null);

		const result = await toggleWishlistItem(
			undefined,
			createFormData({ productId: VALID_PRODUCT_ID })
		);

		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should return validation error with invalid productId", async () => {
		setupAuthenticatedUser();

		const result = await toggleWishlistItem(
			undefined,
			createFormData({ productId: "not-a-cuid2" })
		);

		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
	});

	it("should return error when product not PUBLIC", async () => {
		setupAuthenticatedUser();
		mockPrisma.product.findUnique.mockResolvedValue({
			id: VALID_PRODUCT_ID,
			status: "ARCHIVED",
		});

		const result = await toggleWishlistItem(
			undefined,
			createFormData({ productId: VALID_PRODUCT_ID })
		);

		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should add item when not in wishlist", async () => {
		setupAuthenticatedUser();
		mockPrisma.product.findUnique.mockResolvedValue({
			id: VALID_PRODUCT_ID,
			status: "PUBLIC",
		});
		mockPrisma.$transaction.mockImplementation(async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma));
		mockPrisma.wishlist.upsert.mockResolvedValue({ id: "wishlist-1" });
		mockPrisma.wishlistItem.count.mockResolvedValue(5);
		mockPrisma.wishlistItem.findFirst.mockResolvedValue(null);
		mockPrisma.wishlistItem.create.mockResolvedValue({ id: "new-item" });
		mockPrisma.wishlist.update.mockResolvedValue({});

		const result = await toggleWishlistItem(
			undefined,
			createFormData({ productId: VALID_PRODUCT_ID })
		);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toContain("Ajoute");
		expect(result.data).toEqual(
			expect.objectContaining({ action: "added" })
		);
	});

	it("should remove item when already in wishlist", async () => {
		setupAuthenticatedUser();
		mockPrisma.product.findUnique.mockResolvedValue({
			id: VALID_PRODUCT_ID,
			status: "PUBLIC",
		});
		mockPrisma.$transaction.mockImplementation(async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma));
		mockPrisma.wishlist.upsert.mockResolvedValue({ id: "wishlist-1" });
		mockPrisma.wishlistItem.count.mockResolvedValue(5);
		mockPrisma.wishlistItem.findFirst.mockResolvedValue({
			id: "existing-item",
			productId: VALID_PRODUCT_ID,
		});
		mockPrisma.wishlistItem.delete.mockResolvedValue({});
		mockPrisma.wishlist.update.mockResolvedValue({});

		const result = await toggleWishlistItem(
			undefined,
			createFormData({ productId: VALID_PRODUCT_ID })
		);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toContain("Retire");
		expect(result.data).toEqual(
			expect.objectContaining({ action: "removed" })
		);
	});

	it("should return error when wishlist is full and trying to add", async () => {
		setupAuthenticatedUser();
		mockPrisma.product.findUnique.mockResolvedValue({
			id: VALID_PRODUCT_ID,
			status: "PUBLIC",
		});
		mockPrisma.$transaction.mockImplementation(async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma));
		mockPrisma.wishlist.upsert.mockResolvedValue({ id: "wishlist-1" });
		mockPrisma.wishlistItem.count.mockResolvedValue(500);
		mockPrisma.wishlistItem.findFirst.mockResolvedValue(null);

		const result = await toggleWishlistItem(
			undefined,
			createFormData({ productId: VALID_PRODUCT_ID })
		);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("pleine");
	});
});

// ============================================================================
// mergeWishlists
// ============================================================================

describe("mergeWishlists", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupDefaults();
	});

	it("should return error when session user doesn't match userId", async () => {
		mockGetSession.mockResolvedValue({ user: { id: "different-user" } });

		const result = await mergeWishlists(VALID_USER_ID, VALID_SESSION_ID);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toBe("Non autorise");
	});

	it("should return error when user not found", async () => {
		setupAuthenticatedUser();
		mockPrisma.user.findUnique.mockResolvedValue(null);

		const result = await mergeWishlists(VALID_USER_ID, VALID_SESSION_ID);

		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should return error when user is soft-deleted", async () => {
		setupAuthenticatedUser();
		mockPrisma.user.findUnique.mockResolvedValue({
			id: VALID_USER_ID,
			deletedAt: new Date(),
		});

		const result = await mergeWishlists(VALID_USER_ID, VALID_SESSION_ID);

		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should return success with 0 items when no guest wishlist", async () => {
		setupAuthenticatedUser();
		mockPrisma.user.findUnique.mockResolvedValue({
			id: VALID_USER_ID,
			deletedAt: null,
		});
		mockGetGuestWishlistForMerge.mockResolvedValue(null);
		mockGetUserWishlistForMerge.mockResolvedValue(null);

		const result = await mergeWishlists(VALID_USER_ID, VALID_SESSION_ID);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.data).toEqual(
			expect.objectContaining({ addedItems: 0, skippedItems: 0 })
		);
	});

	it("should return success with 0 items when guest wishlist is empty", async () => {
		setupAuthenticatedUser();
		mockPrisma.user.findUnique.mockResolvedValue({
			id: VALID_USER_ID,
			deletedAt: null,
		});
		mockGetGuestWishlistForMerge.mockResolvedValue({
			id: "guest-wl",
			items: [],
		});
		mockGetUserWishlistForMerge.mockResolvedValue(null);

		const result = await mergeWishlists(VALID_USER_ID, VALID_SESSION_ID);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		// Empty guest wishlist should still be deleted
		expect(mockPrisma.wishlist.delete).toHaveBeenCalledWith({
			where: { id: "guest-wl" },
		});
	});

	it("should merge items correctly, skipping duplicates and non-PUBLIC", async () => {
		setupAuthenticatedUser();
		mockPrisma.user.findUnique.mockResolvedValue({
			id: VALID_USER_ID,
			deletedAt: null,
		});
		mockGetGuestWishlistForMerge.mockResolvedValue({
			id: "guest-wl",
			items: [
				{
					productId: "prod-1",
					product: { id: "prod-1", status: "PUBLIC" },
				},
				{
					productId: "prod-2",
					product: { id: "prod-2", status: "PUBLIC" },
				},
				{
					productId: "prod-3",
					product: { id: "prod-3", status: "ARCHIVED" },
				},
				{
					productId: "prod-existing",
					product: { id: "prod-existing", status: "PUBLIC" },
				},
				{ productId: null, product: null },
			],
		});
		mockGetUserWishlistForMerge.mockResolvedValue({
			id: "user-wl",
			items: [{ productId: "prod-existing" }],
		});

		mockPrisma.$transaction.mockImplementation(async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma));
		mockPrisma.wishlistItem.createMany.mockResolvedValue({ count: 2 });
		mockPrisma.wishlist.delete.mockResolvedValue({});

		const result = await mergeWishlists(VALID_USER_ID, VALID_SESSION_ID);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.data).toEqual(
			expect.objectContaining({ addedItems: 2 })
		);
		// Should only add prod-1 and prod-2 (prod-3 is ARCHIVED, prod-existing is duplicate, null is invalid)
		expect(mockPrisma.wishlistItem.createMany).toHaveBeenCalledWith({
			data: [
				{ wishlistId: "user-wl", productId: "prod-1" },
				{ wishlistId: "user-wl", productId: "prod-2" },
			],
		});
	});

	it("should create user wishlist if it doesn't exist", async () => {
		setupAuthenticatedUser();
		mockPrisma.user.findUnique.mockResolvedValue({
			id: VALID_USER_ID,
			deletedAt: null,
		});
		mockGetGuestWishlistForMerge.mockResolvedValue({
			id: "guest-wl",
			items: [
				{
					productId: "prod-1",
					product: { id: "prod-1", status: "PUBLIC" },
				},
			],
		});
		mockGetUserWishlistForMerge.mockResolvedValue(null);
		mockPrisma.wishlist.create.mockResolvedValue({
			id: "new-user-wl",
			items: [],
		});
		mockPrisma.$transaction.mockImplementation(async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma));
		mockPrisma.wishlistItem.createMany.mockResolvedValue({ count: 1 });
		mockPrisma.wishlist.delete.mockResolvedValue({});

		const result = await mergeWishlists(VALID_USER_ID, VALID_SESSION_ID);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockPrisma.wishlist.create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ userId: VALID_USER_ID }),
			})
		);
	});

	it("should cap merged items to WISHLIST_MAX_ITEMS", async () => {
		setupAuthenticatedUser();
		mockPrisma.user.findUnique.mockResolvedValue({
			id: VALID_USER_ID,
			deletedAt: null,
		});

		// User already has 450 items, guest has 100 valid items
		// Should only add 50 (500 - 450 = 50 available slots)
		const guestItems = Array.from({ length: 100 }, (_, i) => ({
			productId: `guest-prod-${i}`,
			product: { id: `guest-prod-${i}`, status: "PUBLIC" },
		}));

		const userItems = Array.from({ length: 450 }, (_, i) => ({
			productId: `user-prod-${i}`,
		}));

		mockGetGuestWishlistForMerge.mockResolvedValue({
			id: "guest-wl",
			items: guestItems,
		});
		mockGetUserWishlistForMerge.mockResolvedValue({
			id: "user-wl",
			items: userItems,
		});

		mockPrisma.$transaction.mockImplementation(async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma));
		mockPrisma.wishlistItem.createMany.mockResolvedValue({ count: 50 });
		mockPrisma.wishlist.delete.mockResolvedValue({});

		const result = await mergeWishlists(VALID_USER_ID, VALID_SESSION_ID);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.data).toEqual(
			expect.objectContaining({ addedItems: 50 })
		);

		// Verify createMany was called with exactly 50 items
		const createManyCall = mockPrisma.wishlistItem.createMany.mock.calls[0][0];
		expect(createManyCall.data).toHaveLength(50);
	});

	it("should add 0 items when user wishlist is already at max", async () => {
		setupAuthenticatedUser();
		mockPrisma.user.findUnique.mockResolvedValue({
			id: VALID_USER_ID,
			deletedAt: null,
		});

		const guestItems = [
			{
				productId: "prod-1",
				product: { id: "prod-1", status: "PUBLIC" },
			},
		];
		const userItems = Array.from({ length: 500 }, (_, i) => ({
			productId: `user-prod-${i}`,
		}));

		mockGetGuestWishlistForMerge.mockResolvedValue({
			id: "guest-wl",
			items: guestItems,
		});
		mockGetUserWishlistForMerge.mockResolvedValue({
			id: "user-wl",
			items: userItems,
		});

		mockPrisma.$transaction.mockImplementation(async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma));
		mockPrisma.wishlist.delete.mockResolvedValue({});

		const result = await mergeWishlists(VALID_USER_ID, VALID_SESSION_ID);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.data).toEqual(
			expect.objectContaining({ addedItems: 0 })
		);
		// createMany should NOT be called since 0 items to add
		expect(mockPrisma.wishlistItem.createMany).not.toHaveBeenCalled();
	});

	it("should delete guest wishlist after merge", async () => {
		setupAuthenticatedUser();
		mockPrisma.user.findUnique.mockResolvedValue({
			id: VALID_USER_ID,
			deletedAt: null,
		});
		mockGetGuestWishlistForMerge.mockResolvedValue({
			id: "guest-wl",
			items: [
				{
					productId: "prod-1",
					product: { id: "prod-1", status: "PUBLIC" },
				},
			],
		});
		mockGetUserWishlistForMerge.mockResolvedValue({
			id: "user-wl",
			items: [],
		});
		mockPrisma.$transaction.mockImplementation(async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma));
		mockPrisma.wishlistItem.createMany.mockResolvedValue({ count: 1 });
		mockPrisma.wishlist.delete.mockResolvedValue({});

		await mergeWishlists(VALID_USER_ID, VALID_SESSION_ID);

		expect(mockPrisma.wishlist.delete).toHaveBeenCalledWith({
			where: { id: "guest-wl" },
		});
	});

	it("should invalidate both guest and user cache tags", async () => {
		setupAuthenticatedUser();
		mockPrisma.user.findUnique.mockResolvedValue({
			id: VALID_USER_ID,
			deletedAt: null,
		});
		mockGetGuestWishlistForMerge.mockResolvedValue({
			id: "guest-wl",
			items: [
				{
					productId: "prod-1",
					product: { id: "prod-1", status: "PUBLIC" },
				},
			],
		});
		mockGetUserWishlistForMerge.mockResolvedValue({
			id: "user-wl",
			items: [],
		});
		mockPrisma.$transaction.mockImplementation(async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma));
		mockPrisma.wishlistItem.createMany.mockResolvedValue({ count: 1 });
		mockPrisma.wishlist.delete.mockResolvedValue({});

		await mergeWishlists(VALID_USER_ID, VALID_SESSION_ID);

		// Should call getWishlistInvalidationTags for both guest and user
		expect(mockGetWishlistInvalidationTags).toHaveBeenCalledWith(
			undefined,
			VALID_SESSION_ID
		);
		expect(mockGetWishlistInvalidationTags).toHaveBeenCalledWith(
			VALID_USER_ID,
			undefined
		);
	});
});
