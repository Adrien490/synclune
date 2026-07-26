import { describe, it, expect, vi, beforeEach } from "vitest";
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
	mockGetWishlistSessionId,
	mockHeaders,
	mockGetClientIp,
	mockEnforceRateLimit,
	mockUpdateTag,
	mockGetWishlistInvalidationTags,
} = vi.hoisted(() => ({
	mockPrisma: {
		wishlist: {
			findFirst: vi.fn(),
			update: vi.fn(),
		},
		wishlistItem: {
			deleteMany: vi.fn(),
		},
		$transaction: vi.fn(),
	},
	mockGetSession: vi.fn(),
	mockGetWishlistSessionId: vi.fn(),
	mockHeaders: vi.fn(),
	mockGetClientIp: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockGetWishlistInvalidationTags: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/modules/auth/lib/get-current-session", () => ({
	getSession: mockGetSession,
}));
vi.mock("@/modules/wishlist/lib/wishlist-session", () => ({
	getWishlistSessionId: mockGetWishlistSessionId,
	getWishlistExpirationDate: () => new Date("2026-05-17"),
}));
vi.mock("next/headers", () => ({ headers: mockHeaders }));
vi.mock("@/shared/lib/rate-limit", () => ({
	getRateLimitIdentifier: vi.fn().mockReturnValue("test-rate-limit-id"),
	getClientIp: mockGetClientIp,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	WISHLIST_LIMITS: {
		CLEAR: { limit: 5, windowMs: 300_000 },
	},
}));
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag }));
vi.mock("@/modules/wishlist/constants/cache", () => ({
	getWishlistInvalidationTags: mockGetWishlistInvalidationTags,
}));

vi.mock("@/shared/lib/actions", async (importOriginal) => {
	const actual = await importOriginal<typeof ActionsModule>();
	return {
		...actual,
		enforceRateLimit: mockEnforceRateLimit,
	};
});

import { clearWishlist } from "../clear-wishlist";

function setupAuthenticatedUser() {
	mockGetSession.mockResolvedValue({ user: { id: VALID_USER_ID } });
}

function setupGuestUser() {
	mockGetSession.mockResolvedValue(null);
	mockGetWishlistSessionId.mockResolvedValue(VALID_SESSION_ID);
}

function setupDefaults() {
	mockHeaders.mockResolvedValue(new Headers());
	mockGetClientIp.mockResolvedValue("127.0.0.1");
	mockEnforceRateLimit.mockResolvedValue({ success: true });
	mockGetWishlistInvalidationTags.mockReturnValue(["tag-1", "tag-2", "tag-3"]);
}

describe("clearWishlist", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupDefaults();
	});

	it("returns success(0) when user has no session AND no sessionId", async () => {
		mockGetSession.mockResolvedValue(null);
		mockGetWishlistSessionId.mockResolvedValue(null);

		const result = await clearWishlist(undefined, undefined);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toContain("déjà vide");
		expect(mockPrisma.wishlist.findFirst).not.toHaveBeenCalled();
	});

	it("returns success(0) when wishlist does not exist", async () => {
		setupAuthenticatedUser();
		mockPrisma.wishlist.findFirst.mockResolvedValue(null);

		const result = await clearWishlist(undefined, undefined);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toContain("déjà vide");
		expect(mockPrisma.$transaction).not.toHaveBeenCalled();
	});

	it("returns success(0) when wishlist is already empty", async () => {
		setupAuthenticatedUser();
		mockPrisma.wishlist.findFirst.mockResolvedValue({
			id: "wishlist-1",
			_count: { items: 0 },
		});

		const result = await clearWishlist(undefined, undefined);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toContain("déjà vide");
		expect(mockPrisma.$transaction).not.toHaveBeenCalled();
	});

	it("clears all items for an authenticated user", async () => {
		setupAuthenticatedUser();
		mockPrisma.wishlist.findFirst.mockResolvedValue({
			id: "wishlist-1",
			_count: { items: 3 },
		});
		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma),
		);
		mockPrisma.wishlistItem.deleteMany.mockResolvedValue({ count: 3 });
		mockPrisma.wishlist.update.mockResolvedValue({});

		const result = await clearWishlist(undefined, undefined);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toContain("3");
		expect(mockPrisma.wishlistItem.deleteMany).toHaveBeenCalledWith({
			where: { wishlistId: "wishlist-1" },
		});
		expect(mockPrisma.wishlist.update).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: "wishlist-1" },
			}),
		);
	});

	it("uses singular message when only 1 item is removed", async () => {
		setupAuthenticatedUser();
		mockPrisma.wishlist.findFirst.mockResolvedValue({
			id: "wishlist-1",
			_count: { items: 1 },
		});
		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma),
		);
		mockPrisma.wishlistItem.deleteMany.mockResolvedValue({ count: 1 });
		mockPrisma.wishlist.update.mockResolvedValue({});

		const result = await clearWishlist(undefined, undefined);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toBe("Favori supprime");
	});

	it("clears all items for a guest user", async () => {
		setupGuestUser();
		mockPrisma.wishlist.findFirst.mockResolvedValue({
			id: "guest-wishlist-1",
			_count: { items: 5 },
		});
		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma),
		);
		mockPrisma.wishlistItem.deleteMany.mockResolvedValue({ count: 5 });
		mockPrisma.wishlist.update.mockResolvedValue({});

		const result = await clearWishlist(undefined, undefined);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockPrisma.wishlistItem.deleteMany).toHaveBeenCalledWith({
			where: { wishlistId: "guest-wishlist-1" },
		});
	});

	it("invalidates 3 cache tags after success", async () => {
		setupAuthenticatedUser();
		mockPrisma.wishlist.findFirst.mockResolvedValue({
			id: "wishlist-1",
			_count: { items: 2 },
		});
		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma),
		);
		mockPrisma.wishlistItem.deleteMany.mockResolvedValue({ count: 2 });
		mockPrisma.wishlist.update.mockResolvedValue({});

		await clearWishlist(undefined, undefined);

		expect(mockUpdateTag).toHaveBeenCalledTimes(3);
	});

	it("returns rate limit error when exceeded", async () => {
		setupAuthenticatedUser();
		mockEnforceRateLimit.mockResolvedValue({
			error: {
				status: ActionStatus.ERROR,
				message: "Trop de requetes",
			},
		});

		const result = await clearWishlist(undefined, undefined);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("Trop de requetes");
		expect(mockPrisma.wishlist.findFirst).not.toHaveBeenCalled();
	});

	it("returns generic error when transaction throws", async () => {
		setupAuthenticatedUser();
		mockPrisma.wishlist.findFirst.mockResolvedValue({
			id: "wishlist-1",
			_count: { items: 2 },
		});
		mockPrisma.$transaction.mockRejectedValue(new Error("DB exploded"));

		const result = await clearWishlist(undefined, undefined);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockUpdateTag).not.toHaveBeenCalled();
	});

	it("does not create a wishlist for guests with no session cookie", async () => {
		mockGetSession.mockResolvedValue(null);
		mockGetWishlistSessionId.mockResolvedValue(null);

		const result = await clearWishlist(undefined, undefined);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockPrisma.wishlist.findFirst).not.toHaveBeenCalled();
		expect(mockPrisma.$transaction).not.toHaveBeenCalled();
	});

	it("uses CLEAR rate limit (not TOGGLE) for the rate check", async () => {
		setupAuthenticatedUser();
		mockPrisma.wishlist.findFirst.mockResolvedValue({
			id: "wishlist-1",
			_count: { items: 1 },
		});
		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma),
		);
		mockPrisma.wishlistItem.deleteMany.mockResolvedValue({ count: 1 });
		mockPrisma.wishlist.update.mockResolvedValue({});

		await clearWishlist(undefined, undefined);

		expect(mockEnforceRateLimit).toHaveBeenCalledWith(
			"test-rate-limit-id",
			{ limit: 5, windowMs: 300_000 },
			"127.0.0.1",
		);
	});
});
