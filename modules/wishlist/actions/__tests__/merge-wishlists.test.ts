import { describe, it, expect, vi, beforeEach } from "vitest";
import { Prisma } from "@/app/generated/prisma/client";
import { ActionStatus } from "@/shared/types/server-action";
import type * as ActionsModule from "@/shared/lib/actions";

const VALID_USER_ID = "cm_user_00000000000000001";
const VALID_SESSION_ID = "550e8400-e29b-41d4-a716-446655440000";

// ============================================================================
// MOCKS
// ============================================================================

const {
	mockPrisma,
	mockGetSession,
	mockHeaders,
	mockGetClientIp,
	mockEnforceRateLimit,
	mockUpdateTag,
	mockGetGuestWishlistForMerge,
	mockGetUserWishlistForMerge,
	mockGetWishlistInvalidationTags,
	mockGetWishlistSessionId,
} = vi.hoisted(() => ({
	mockPrisma: {
		user: { findUnique: vi.fn() },
		wishlist: {
			findUnique: vi.fn(),
			create: vi.fn(),
			delete: vi.fn(),
		},
		wishlistItem: { createMany: vi.fn() },
		$transaction: vi.fn(),
	},
	mockGetSession: vi.fn(),
	mockHeaders: vi.fn(),
	mockGetClientIp: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockGetGuestWishlistForMerge: vi.fn(),
	mockGetUserWishlistForMerge: vi.fn(),
	mockGetWishlistInvalidationTags: vi.fn(),
	mockGetWishlistSessionId: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/modules/auth/lib/get-current-session", () => ({
	getSession: mockGetSession,
}));
vi.mock("@/modules/wishlist/lib/wishlist-session", () => ({
	isValidUuidV4: (value: string) =>
		/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value),
	getWishlistSessionId: mockGetWishlistSessionId,
}));
vi.mock("next/headers", () => ({ headers: mockHeaders }));
vi.mock("@/shared/lib/rate-limit", () => ({
	getRateLimitIdentifier: vi.fn().mockReturnValue("test-rate-limit-id"),
	getClientIp: mockGetClientIp,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	WISHLIST_LIMITS: {
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
vi.mock("@/shared/lib/actions", async (importOriginal) => {
	const actual = await importOriginal<typeof ActionsModule>();
	return {
		...actual,
		enforceRateLimit: mockEnforceRateLimit,
	};
});

import { mergeWishlists } from "../merge-wishlists";

// ============================================================================
// HELPERS
// ============================================================================

const PUBLIC_PRODUCT = { status: "PUBLIC" } as const;

function buildGuestWishlist(items: Array<{ productId: string; status?: string }>) {
	return {
		id: "guest-wl-1",
		items: items.map((it) => ({
			productId: it.productId,
			product: { id: it.productId, status: it.status ?? "PUBLIC" },
		})),
	};
}

function buildUserWishlist(productIds: string[] = []) {
	return {
		id: "user-wl-1",
		items: productIds.map((productId) => ({ productId })),
	};
}

// ============================================================================
// TESTS
// ============================================================================

describe("mergeWishlists", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockGetSession.mockResolvedValue({ user: { id: VALID_USER_ID } });
		mockHeaders.mockResolvedValue(new Headers());
		mockGetClientIp.mockResolvedValue("127.0.0.1");
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		// Default: cookie matches the supplied sessionId (legitimate auth-hook flow)
		mockGetWishlistSessionId.mockResolvedValue(VALID_SESSION_ID);
		mockGetWishlistInvalidationTags.mockImplementation((userId?: string, sessionId?: string) =>
			userId ? [`wishlist-${userId}`] : sessionId ? [`wishlist-guest-${sessionId}`] : [],
		);

		mockPrisma.user.findUnique.mockResolvedValue({ id: VALID_USER_ID, deletedAt: null });
		mockPrisma.wishlist.create.mockResolvedValue({ id: "user-wl-new", items: [] });
		mockPrisma.wishlist.delete.mockResolvedValue({});
		mockPrisma.wishlistItem.createMany.mockResolvedValue({ count: 0 });
		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma),
		);
	});

	// --------------------------------------------------------------------
	// Auth/security guards
	// --------------------------------------------------------------------

	it("rejects an invalid sessionId UUID v4 format", async () => {
		const result = await mergeWishlists(VALID_USER_ID, "not-a-uuid");

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockGetSession).not.toHaveBeenCalled();
	});

	it("rejects when current session does not match the supplied userId (impersonation guard)", async () => {
		mockGetSession.mockResolvedValue({ user: { id: "another-user" } });

		const result = await mergeWishlists(VALID_USER_ID, VALID_SESSION_ID);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toMatch(/Non autorisé/i);
		expect(mockGetGuestWishlistForMerge).not.toHaveBeenCalled();
	});

	it("rejects when there is no current session at all", async () => {
		mockGetSession.mockResolvedValue(null);

		const result = await mergeWishlists(VALID_USER_ID, VALID_SESSION_ID);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockGetGuestWishlistForMerge).not.toHaveBeenCalled();
	});

	it("rejects when the cookie sessionId does not match the param (IDOR guard)", async () => {
		// Attacker authenticated as themselves, attempting to merge a victim's
		// guest wishlist by supplying victim's sessionId as a parameter.
		const VICTIM_SESSION_ID = "11111111-1111-4111-8111-111111111111";
		mockGetWishlistSessionId.mockResolvedValue("22222222-2222-4222-8222-222222222222");

		const result = await mergeWishlists(VALID_USER_ID, VICTIM_SESSION_ID);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toMatch(/Non autorisé/i);
		expect(mockGetGuestWishlistForMerge).not.toHaveBeenCalled();
		expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
	});

	it("rejects when there is no wishlist cookie at all (param-only call)", async () => {
		mockGetWishlistSessionId.mockResolvedValue(null);

		const result = await mergeWishlists(VALID_USER_ID, VALID_SESSION_ID);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockGetGuestWishlistForMerge).not.toHaveBeenCalled();
	});

	it("returns the rate-limit error before touching the DB", async () => {
		const rlError = { status: ActionStatus.ERROR, message: "Trop de requêtes" };
		mockEnforceRateLimit.mockResolvedValue({ error: rlError });

		const result = await mergeWishlists(VALID_USER_ID, VALID_SESSION_ID);

		expect(result).toEqual(rlError);
		expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
	});

	it("rejects when the user record does not exist or is soft-deleted", async () => {
		mockPrisma.user.findUnique.mockResolvedValue(null);

		const result1 = await mergeWishlists(VALID_USER_ID, VALID_SESSION_ID);
		expect(result1.status).toBe(ActionStatus.ERROR);

		mockPrisma.user.findUnique.mockResolvedValue({
			id: VALID_USER_ID,
			deletedAt: new Date(),
		});

		const result2 = await mergeWishlists(VALID_USER_ID, VALID_SESSION_ID);
		expect(result2.status).toBe(ActionStatus.ERROR);
		expect(mockGetGuestWishlistForMerge).not.toHaveBeenCalled();
	});

	// --------------------------------------------------------------------
	// No-op flows
	// --------------------------------------------------------------------

	it("returns NO_ITEMS_TO_MERGE and skips transaction when no guest wishlist exists", async () => {
		mockGetGuestWishlistForMerge.mockResolvedValue(null);
		mockGetUserWishlistForMerge.mockResolvedValue(null);

		const result = await mergeWishlists(VALID_USER_ID, VALID_SESSION_ID);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.data).toEqual({ addedItems: 0, skippedItems: 0 });
		expect(mockPrisma.wishlist.delete).not.toHaveBeenCalled();
		expect(mockPrisma.$transaction).not.toHaveBeenCalled();
	});

	it("deletes the empty guest wishlist and returns NO_ITEMS_TO_MERGE", async () => {
		mockGetGuestWishlistForMerge.mockResolvedValue({ id: "guest-empty", items: [] });
		mockGetUserWishlistForMerge.mockResolvedValue(null);

		const result = await mergeWishlists(VALID_USER_ID, VALID_SESSION_ID);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockPrisma.wishlist.delete).toHaveBeenCalledWith({
			where: { id: "guest-empty" },
		});
		expect(mockPrisma.$transaction).not.toHaveBeenCalled();
	});

	// --------------------------------------------------------------------
	// User wishlist creation when missing
	// --------------------------------------------------------------------

	it("creates the user wishlist when it does not exist", async () => {
		mockGetGuestWishlistForMerge.mockResolvedValue(buildGuestWishlist([{ productId: "p-1" }]));
		mockGetUserWishlistForMerge.mockResolvedValue(null);
		mockPrisma.wishlist.create.mockResolvedValue({ id: "user-wl-new", items: [] });

		await mergeWishlists(VALID_USER_ID, VALID_SESSION_ID);

		expect(mockPrisma.wishlist.create).toHaveBeenCalledWith({
			data: { userId: VALID_USER_ID, expiresAt: null },
			select: { id: true, items: { select: { productId: true } } },
		});
	});

	it("falls back to findUnique on P2002 race condition when creating the user wishlist", async () => {
		mockGetGuestWishlistForMerge.mockResolvedValue(buildGuestWishlist([{ productId: "p-1" }]));
		mockGetUserWishlistForMerge.mockResolvedValue(null);

		const p2002 = new Prisma.PrismaClientKnownRequestError("Unique constraint", {
			code: "P2002",
			clientVersion: "test",
		});
		mockPrisma.wishlist.create.mockRejectedValueOnce(p2002);
		mockPrisma.wishlist.findUnique.mockResolvedValue({ id: "user-wl-existing", items: [] });

		const result = await mergeWishlists(VALID_USER_ID, VALID_SESSION_ID);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockPrisma.wishlist.findUnique).toHaveBeenCalledWith({
			where: { userId: VALID_USER_ID },
			select: { id: true, items: { select: { productId: true } } },
		});
	});

	it("returns an error when P2002 fallback findUnique also misses (rare)", async () => {
		mockGetGuestWishlistForMerge.mockResolvedValue(buildGuestWishlist([{ productId: "p-1" }]));
		mockGetUserWishlistForMerge.mockResolvedValue(null);

		const p2002 = new Prisma.PrismaClientKnownRequestError("Unique constraint", {
			code: "P2002",
			clientVersion: "test",
		});
		mockPrisma.wishlist.create.mockRejectedValueOnce(p2002);
		mockPrisma.wishlist.findUnique.mockResolvedValue(null);

		const result = await mergeWishlists(VALID_USER_ID, VALID_SESSION_ID);

		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("rethrows non-P2002 Prisma errors during create", async () => {
		mockGetGuestWishlistForMerge.mockResolvedValue(buildGuestWishlist([{ productId: "p-1" }]));
		mockGetUserWishlistForMerge.mockResolvedValue(null);

		mockPrisma.wishlist.create.mockRejectedValueOnce(new Error("DB outage"));

		const result = await mergeWishlists(VALID_USER_ID, VALID_SESSION_ID);

		// Caught by outer handleActionError → ERROR
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	// --------------------------------------------------------------------
	// UNION merge strategy
	// --------------------------------------------------------------------

	it("unions guest items into the user wishlist, deduping by productId", async () => {
		mockGetGuestWishlistForMerge.mockResolvedValue(
			buildGuestWishlist([
				{ productId: "p-already" }, // already in user wishlist → skip
				{ productId: "p-new" }, // new → add
			]),
		);
		mockGetUserWishlistForMerge.mockResolvedValue(buildUserWishlist(["p-already"]));

		const result = await mergeWishlists(VALID_USER_ID, VALID_SESSION_ID);

		expect(mockPrisma.wishlistItem.createMany).toHaveBeenCalledWith({
			data: [{ wishlistId: "user-wl-1", productId: "p-new" }],
		});
		expect(result.data).toEqual({ addedItems: 1, skippedItems: 1 });
	});

	it("filters out non-PUBLIC products from the merge", async () => {
		mockGetGuestWishlistForMerge.mockResolvedValue(
			buildGuestWishlist([
				{ productId: "p-archived", status: "ARCHIVED" },
				{ productId: "p-draft", status: "DRAFT" },
				{ productId: "p-ok", status: "PUBLIC" },
			]),
		);
		mockGetUserWishlistForMerge.mockResolvedValue(buildUserWishlist([]));

		const result = await mergeWishlists(VALID_USER_ID, VALID_SESSION_ID);

		expect(mockPrisma.wishlistItem.createMany).toHaveBeenCalledWith({
			data: [{ wishlistId: "user-wl-1", productId: "p-ok" }],
		});
		expect(result.data).toEqual({ addedItems: 1, skippedItems: 2 });
	});

	it("filters out items whose product is null (orphan items)", async () => {
		mockGetGuestWishlistForMerge.mockResolvedValue({
			id: "guest-wl-1",
			items: [
				{ productId: "p-orphan", product: null },
				{ productId: "p-ok", product: { id: "p-ok", ...PUBLIC_PRODUCT } },
			],
		});
		mockGetUserWishlistForMerge.mockResolvedValue(buildUserWishlist([]));

		const result = await mergeWishlists(VALID_USER_ID, VALID_SESSION_ID);

		expect(mockPrisma.wishlistItem.createMany).toHaveBeenCalledWith({
			data: [{ wishlistId: "user-wl-1", productId: "p-ok" }],
		});
		expect(result.data).toEqual({ addedItems: 1, skippedItems: 1 });
	});

	// --------------------------------------------------------------------
	// WISHLIST_MAX_ITEMS cap
	// --------------------------------------------------------------------

	it("caps merged items so the user wishlist never exceeds WISHLIST_MAX_ITEMS (500)", async () => {
		// User already has 498 items → only 2 slots remain
		const existingProductIds = Array.from({ length: 498 }, (_, i) => `existing-${i}`);
		mockGetUserWishlistForMerge.mockResolvedValue(buildUserWishlist(existingProductIds));

		// Guest has 5 brand-new items → 2 should be merged, 3 skipped
		mockGetGuestWishlistForMerge.mockResolvedValue(
			buildGuestWishlist([
				{ productId: "new-1" },
				{ productId: "new-2" },
				{ productId: "new-3" },
				{ productId: "new-4" },
				{ productId: "new-5" },
			]),
		);

		const result = await mergeWishlists(VALID_USER_ID, VALID_SESSION_ID);

		expect(mockPrisma.wishlistItem.createMany).toHaveBeenCalledWith({
			data: [
				{ wishlistId: "user-wl-1", productId: "new-1" },
				{ wishlistId: "user-wl-1", productId: "new-2" },
			],
		});
		expect(result.data).toEqual({ addedItems: 2, skippedItems: 3 });
	});

	it("merges nothing but still deletes the guest wishlist when user is already at the cap", async () => {
		const existingProductIds = Array.from({ length: 500 }, (_, i) => `existing-${i}`);
		mockGetUserWishlistForMerge.mockResolvedValue(buildUserWishlist(existingProductIds));
		mockGetGuestWishlistForMerge.mockResolvedValue(buildGuestWishlist([{ productId: "new-1" }]));

		const result = await mergeWishlists(VALID_USER_ID, VALID_SESSION_ID);

		expect(mockPrisma.wishlistItem.createMany).not.toHaveBeenCalled();
		expect(mockPrisma.wishlist.delete).toHaveBeenCalledWith({
			where: { id: "guest-wl-1" },
		});
		expect(result.data).toEqual({ addedItems: 0, skippedItems: 1 });
	});

	// --------------------------------------------------------------------
	// Cleanup + cache invalidation
	// --------------------------------------------------------------------

	it("deletes the guest wishlist atomically with the merge", async () => {
		mockGetGuestWishlistForMerge.mockResolvedValue(buildGuestWishlist([{ productId: "p-1" }]));
		mockGetUserWishlistForMerge.mockResolvedValue(buildUserWishlist([]));

		await mergeWishlists(VALID_USER_ID, VALID_SESSION_ID);

		expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
		expect(mockPrisma.wishlist.delete).toHaveBeenCalledWith({
			where: { id: "guest-wl-1" },
		});
	});

	it("invalidates both guest and user wishlist cache tags", async () => {
		mockGetGuestWishlistForMerge.mockResolvedValue(buildGuestWishlist([{ productId: "p-1" }]));
		mockGetUserWishlistForMerge.mockResolvedValue(buildUserWishlist([]));

		await mergeWishlists(VALID_USER_ID, VALID_SESSION_ID);

		expect(mockUpdateTag).toHaveBeenCalledWith(`wishlist-guest-${VALID_SESSION_ID}`);
		expect(mockUpdateTag).toHaveBeenCalledWith(`wishlist-${VALID_USER_ID}`);
	});

	// --------------------------------------------------------------------
	// Success messages
	// --------------------------------------------------------------------

	it("returns a singular success message when one item is added", async () => {
		mockGetGuestWishlistForMerge.mockResolvedValue(buildGuestWishlist([{ productId: "p-1" }]));
		mockGetUserWishlistForMerge.mockResolvedValue(buildUserWishlist([]));

		const result = await mergeWishlists(VALID_USER_ID, VALID_SESSION_ID);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toMatch(/^1 favori ajouté/);
	});

	it("returns a plural success message when multiple items are added", async () => {
		mockGetGuestWishlistForMerge.mockResolvedValue(
			buildGuestWishlist([{ productId: "p-1" }, { productId: "p-2" }]),
		);
		mockGetUserWishlistForMerge.mockResolvedValue(buildUserWishlist([]));

		const result = await mergeWishlists(VALID_USER_ID, VALID_SESSION_ID);

		expect(result.message).toMatch(/^2 favoris ajoutés/);
	});

	it("returns 'tous déjà dans votre liste' message when nothing was added", async () => {
		mockGetGuestWishlistForMerge.mockResolvedValue(buildGuestWishlist([{ productId: "p-1" }]));
		mockGetUserWishlistForMerge.mockResolvedValue(buildUserWishlist(["p-1"]));

		const result = await mergeWishlists(VALID_USER_ID, VALID_SESSION_ID);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toMatch(/déjà dans votre liste/i);
	});

	// --------------------------------------------------------------------
	// Error handling
	// --------------------------------------------------------------------

	it("returns ERROR if the merge transaction crashes", async () => {
		mockGetGuestWishlistForMerge.mockResolvedValue(buildGuestWishlist([{ productId: "p-1" }]));
		mockGetUserWishlistForMerge.mockResolvedValue(buildUserWishlist([]));
		mockPrisma.$transaction.mockRejectedValue(new Error("DB outage"));

		const result = await mergeWishlists(VALID_USER_ID, VALID_SESSION_ID);

		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
