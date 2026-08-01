import { describe, it, expect, vi, beforeEach } from "vitest";
import { Prisma } from "@/app/generated/prisma/client";
import { ActionStatus } from "@/shared/types/server-action";
import type * as ActionsModule from "@/shared/lib/actions";

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
	mockGetWishlistInvalidationTags: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/modules/auth/lib/get-current-session", () => ({
	getSession: mockGetSession,
}));
vi.mock("@/modules/wishlist/lib/wishlist-session", () => ({
	getWishlistSessionId: mockGetWishlistSessionId,
	getOrCreateWishlistSessionId: mockGetOrCreateWishlistSessionId,
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
// Mock enforceRateLimit while keeping real validateInput, success, error, handleActionError
vi.mock("@/shared/lib/actions", async (importOriginal) => {
	const actual = await importOriginal<typeof ActionsModule>();
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

		const result = await addToWishlist(undefined, createFormData({ productId: VALID_PRODUCT_ID }));

		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should return validation error with invalid productId", async () => {
		setupAuthenticatedUser();

		const result = await addToWishlist(undefined, createFormData({ productId: "invalid" }));

		expect([ActionStatus.ERROR, ActionStatus.VALIDATION_ERROR]).toContain(result.status);
	});

	it("should return error when product not found", async () => {
		setupAuthenticatedUser();
		mockPrisma.product.findUnique.mockResolvedValue(null);
		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma),
		);

		const result = await addToWishlist(undefined, createFormData({ productId: VALID_PRODUCT_ID }));

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("disponible");
	});

	it("should return error when product is not PUBLIC", async () => {
		setupAuthenticatedUser();
		mockPrisma.product.findUnique.mockResolvedValue({
			id: VALID_PRODUCT_ID,
			status: "DRAFT",
		});

		const result = await addToWishlist(undefined, createFormData({ productId: VALID_PRODUCT_ID }));

		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should return error when wishlist is full", async () => {
		setupAuthenticatedUser();
		mockPrisma.product.findUnique.mockResolvedValue({
			id: VALID_PRODUCT_ID,
			status: "PUBLIC",
		});
		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma),
		);
		mockPrisma.wishlist.upsert.mockResolvedValue({ id: "wishlist-1" });
		mockPrisma.wishlistItem.count.mockResolvedValue(500);

		const result = await addToWishlist(undefined, createFormData({ productId: VALID_PRODUCT_ID }));

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("pleine");
	});

	it("should successfully add a product", async () => {
		setupAuthenticatedUser();
		mockPrisma.product.findUnique.mockResolvedValue({
			id: VALID_PRODUCT_ID,
			status: "PUBLIC",
		});
		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma),
		);
		mockPrisma.wishlist.upsert.mockResolvedValue({ id: "wishlist-1" });
		mockPrisma.wishlistItem.count.mockResolvedValue(10);
		mockPrisma.wishlistItem.findFirst.mockResolvedValue(null);
		mockPrisma.wishlistItem.create.mockResolvedValue({ id: "item-1" });

		const result = await addToWishlist(undefined, createFormData({ productId: VALID_PRODUCT_ID }));

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toContain("Ajoute");
	});

	it("should return already exists when item is duplicate (P2002 race)", async () => {
		// Post-refactor: duplicate detection passe désormais par le P2002 race handler
		// (le service ne fait plus de findFirst pré-check — le @@unique(wishlistId, productId)
		// est la source de vérité). UX message inchangé "Deja dans votre wishlist".
		setupAuthenticatedUser();
		mockPrisma.product.findUnique.mockResolvedValue({
			id: VALID_PRODUCT_ID,
			status: "PUBLIC",
		});
		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma),
		);
		mockPrisma.wishlist.upsert.mockResolvedValue({ id: "wishlist-1" });
		mockPrisma.wishlistItem.count.mockResolvedValue(10);
		mockPrisma.wishlistItem.create.mockRejectedValue(
			new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
				code: "P2002",
				clientVersion: "6.0.0",
			}),
		);

		const result = await addToWishlist(undefined, createFormData({ productId: VALID_PRODUCT_ID }));

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toContain("Deja");
	});

	it("should invalidate cache tags after success", async () => {
		setupAuthenticatedUser();
		mockPrisma.product.findUnique.mockResolvedValue({
			id: VALID_PRODUCT_ID,
			status: "PUBLIC",
		});
		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma),
		);
		mockPrisma.wishlist.upsert.mockResolvedValue({ id: "wishlist-1" });
		mockPrisma.wishlistItem.count.mockResolvedValue(0);
		mockPrisma.wishlistItem.findFirst.mockResolvedValue(null);
		mockPrisma.wishlistItem.create.mockResolvedValue({ id: "item-1" });

		await addToWishlist(undefined, createFormData({ productId: VALID_PRODUCT_ID }));

		expect(mockUpdateTag).toHaveBeenCalledTimes(3);
	});

	it("should successfully add a product as guest", async () => {
		setupGuestUser();
		mockPrisma.product.findUnique.mockResolvedValue({
			id: VALID_PRODUCT_ID,
			status: "PUBLIC",
		});
		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma),
		);
		mockPrisma.wishlist.upsert.mockResolvedValue({ id: "guest-wishlist-1" });
		mockPrisma.wishlistItem.count.mockResolvedValue(0);
		mockPrisma.wishlistItem.findFirst.mockResolvedValue(null);
		mockPrisma.wishlistItem.create.mockResolvedValue({ id: "item-1" });

		const result = await addToWishlist(undefined, createFormData({ productId: VALID_PRODUCT_ID }));

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toContain("Ajoute");
	});

	it("should return error when rate limited", async () => {
		setupAuthenticatedUser();
		mockEnforceRateLimit.mockResolvedValue({
			error: {
				status: ActionStatus.ERROR,
				message: "Trop de requetes",
			},
		});

		const result = await addToWishlist(undefined, createFormData({ productId: VALID_PRODUCT_ID }));

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("Trop de requetes");
	});

	it("should return success on P2002 unique constraint violation (race condition)", async () => {
		setupAuthenticatedUser();
		mockPrisma.product.findUnique.mockResolvedValue({
			id: VALID_PRODUCT_ID,
			status: "PUBLIC",
		});
		mockPrisma.$transaction.mockRejectedValue(
			new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
				code: "P2002",
				clientVersion: "6.0.0",
			}),
		);

		const result = await addToWishlist(undefined, createFormData({ productId: VALID_PRODUCT_ID }));

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toContain("Deja");
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
			createFormData({ productId: VALID_PRODUCT_ID }),
		);

		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should return validation error with invalid productId", async () => {
		setupAuthenticatedUser();

		const result = await removeFromWishlist(undefined, createFormData({ productId: "invalid" }));

		expect([ActionStatus.ERROR, ActionStatus.VALIDATION_ERROR]).toContain(result.status);
	});

	it("should return error when wishlist not found", async () => {
		setupAuthenticatedUser();
		mockPrisma.wishlist.findFirst.mockResolvedValue(null);

		const result = await removeFromWishlist(
			undefined,
			createFormData({ productId: VALID_PRODUCT_ID }),
		);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("n'existe pas");
	});

	it("should successfully remove an item", async () => {
		setupAuthenticatedUser();
		mockPrisma.wishlist.findFirst.mockResolvedValue({ id: "wishlist-1" });
		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma),
		);
		mockPrisma.wishlistItem.deleteMany.mockResolvedValue({ count: 1 });
		mockPrisma.wishlist.update.mockResolvedValue({});

		const result = await removeFromWishlist(
			undefined,
			createFormData({ productId: VALID_PRODUCT_ID }),
		);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toBe("Retire de vos favoris");
	});

	it("should return item not found message when deleteMany count is 0", async () => {
		setupAuthenticatedUser();
		mockPrisma.wishlist.findFirst.mockResolvedValue({ id: "wishlist-1" });
		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma),
		);
		mockPrisma.wishlistItem.deleteMany.mockResolvedValue({ count: 0 });
		mockPrisma.wishlist.update.mockResolvedValue({});

		const result = await removeFromWishlist(
			undefined,
			createFormData({ productId: VALID_PRODUCT_ID }),
		);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("n'est pas dans");
	});

	it("should not require product to be PUBLIC (allows removing archived products)", async () => {
		setupAuthenticatedUser();
		mockPrisma.wishlist.findFirst.mockResolvedValue({ id: "wishlist-1" });
		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma),
		);
		mockPrisma.wishlistItem.deleteMany.mockResolvedValue({ count: 1 });
		mockPrisma.wishlist.update.mockResolvedValue({});

		const result = await removeFromWishlist(
			undefined,
			createFormData({ productId: VALID_PRODUCT_ID }),
		);

		// Should NOT call product.findUnique (pre-check was removed)
		expect(mockPrisma.product.findUnique).not.toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	it("should invalidate cache tags after success", async () => {
		setupAuthenticatedUser();
		mockPrisma.wishlist.findFirst.mockResolvedValue({ id: "wishlist-1" });
		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma),
		);
		mockPrisma.wishlistItem.deleteMany.mockResolvedValue({ count: 1 });
		mockPrisma.wishlist.update.mockResolvedValue({});

		await removeFromWishlist(undefined, createFormData({ productId: VALID_PRODUCT_ID }));

		expect(mockUpdateTag).toHaveBeenCalledTimes(3);
	});

	it("should successfully remove an item as guest", async () => {
		setupGuestUser();
		mockPrisma.wishlist.findFirst.mockResolvedValue({ id: "guest-wishlist-1" });
		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma),
		);
		mockPrisma.wishlistItem.deleteMany.mockResolvedValue({ count: 1 });
		mockPrisma.wishlist.update.mockResolvedValue({});

		const result = await removeFromWishlist(
			undefined,
			createFormData({ productId: VALID_PRODUCT_ID }),
		);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toBe("Retire de vos favoris");
	});

	it("should return error when rate limited", async () => {
		setupAuthenticatedUser();
		mockEnforceRateLimit.mockResolvedValue({
			error: {
				status: ActionStatus.ERROR,
				message: "Trop de requetes",
			},
		});

		const result = await removeFromWishlist(
			undefined,
			createFormData({ productId: VALID_PRODUCT_ID }),
		);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("Trop de requetes");
	});
});

// ============================================================================
// toggleWishlistItem
// ============================================================================

describe("toggleWishlistItem", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupDefaults();
		// Reset wishlist.findFirst implementation explicitly to avoid leakage from
		// removeFromWishlist describe block (which configured it to return {id:"wishlist-1"})
		// — vi.clearAllMocks() resets call history but NOT mock implementations.
		mockPrisma.wishlist.findFirst.mockReset();
	});

	it("should return error when no userId and no sessionId", async () => {
		mockGetSession.mockResolvedValue(null);
		mockGetOrCreateWishlistSessionId.mockResolvedValue(null);

		const result = await toggleWishlistItem(
			undefined,
			createFormData({ productId: VALID_PRODUCT_ID }),
		);

		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should return validation error with invalid productId", async () => {
		setupAuthenticatedUser();

		const result = await toggleWishlistItem(
			undefined,
			createFormData({ productId: "not-a-cuid2" }),
		);

		expect([ActionStatus.ERROR, ActionStatus.VALIDATION_ERROR]).toContain(result.status);
	});

	it("should return error when product not PUBLIC", async () => {
		setupAuthenticatedUser();
		mockPrisma.product.findUnique.mockResolvedValue({
			id: VALID_PRODUCT_ID,
			status: "ARCHIVED",
		});

		const result = await toggleWishlistItem(
			undefined,
			createFormData({ productId: VALID_PRODUCT_ID }),
		);

		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should add item when not in wishlist", async () => {
		setupAuthenticatedUser();
		mockPrisma.product.findUnique.mockResolvedValue({
			id: VALID_PRODUCT_ID,
			status: "PUBLIC",
		});
		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma),
		);
		mockPrisma.wishlist.upsert.mockResolvedValue({ id: "wishlist-1" });
		mockPrisma.wishlistItem.count.mockResolvedValue(5);
		mockPrisma.wishlistItem.findFirst.mockResolvedValue(null);
		mockPrisma.wishlistItem.create.mockResolvedValue({ id: "new-item" });
		mockPrisma.wishlist.update.mockResolvedValue({});

		const result = await toggleWishlistItem(
			undefined,
			createFormData({ productId: VALID_PRODUCT_ID }),
		);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toContain("Ajoute");
		expect(result.data).toEqual(expect.objectContaining({ action: "added" }));
	});

	it("should remove item when already in wishlist", async () => {
		setupAuthenticatedUser();
		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma),
		);
		// Post-refactor: toggle utilise wishlist.findFirst avec items nested au lieu
		// de wishlistItem.findFirst (1 query au lieu de 2).
		mockPrisma.wishlist.findFirst.mockResolvedValue({
			id: "wishlist-1",
			items: [{ id: "existing-item" }],
		});
		mockPrisma.wishlistItem.delete.mockResolvedValue({});
		mockPrisma.wishlist.update.mockResolvedValue({});

		const result = await toggleWishlistItem(
			undefined,
			createFormData({ productId: VALID_PRODUCT_ID }),
		);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toContain("Retire");
		expect(result.data).toEqual(expect.objectContaining({ action: "removed" }));
		// Path remove: produit n'est PAS validé (service add non appelé)
		expect(mockPrisma.product.findUnique).not.toHaveBeenCalled();
	});

	it("should return error when wishlist is full and trying to add", async () => {
		setupAuthenticatedUser();
		mockPrisma.product.findUnique.mockResolvedValue({
			id: VALID_PRODUCT_ID,
			status: "PUBLIC",
		});
		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma),
		);
		mockPrisma.wishlist.upsert.mockResolvedValue({ id: "wishlist-1" });
		mockPrisma.wishlistItem.count.mockResolvedValue(500);
		mockPrisma.wishlistItem.findFirst.mockResolvedValue(null);

		const result = await toggleWishlistItem(
			undefined,
			createFormData({ productId: VALID_PRODUCT_ID }),
		);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("pleine");
	});

	it("should successfully toggle (add) as guest", async () => {
		setupGuestUser();
		mockPrisma.product.findUnique.mockResolvedValue({
			id: VALID_PRODUCT_ID,
			status: "PUBLIC",
		});
		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma),
		);
		mockPrisma.wishlist.upsert.mockResolvedValue({ id: "guest-wishlist-1" });
		mockPrisma.wishlistItem.count.mockResolvedValue(0);
		mockPrisma.wishlistItem.findFirst.mockResolvedValue(null);
		mockPrisma.wishlistItem.create.mockResolvedValue({ id: "new-item" });
		mockPrisma.wishlist.update.mockResolvedValue({});

		const result = await toggleWishlistItem(
			undefined,
			createFormData({ productId: VALID_PRODUCT_ID }),
		);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toContain("Ajoute");
		expect(result.data).toEqual(expect.objectContaining({ action: "added" }));
	});

	it("should successfully toggle (remove) as guest", async () => {
		setupGuestUser();
		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma),
		);
		// Post-refactor: toggle utilise wishlist.findFirst avec items nested.
		mockPrisma.wishlist.findFirst.mockResolvedValue({
			id: "guest-wishlist-1",
			items: [{ id: "existing-item" }],
		});
		mockPrisma.wishlistItem.delete.mockResolvedValue({});
		mockPrisma.wishlist.update.mockResolvedValue({});

		const result = await toggleWishlistItem(
			undefined,
			createFormData({ productId: VALID_PRODUCT_ID }),
		);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toContain("Retire");
		expect(result.data).toEqual(expect.objectContaining({ action: "removed" }));
	});

	it("should return error when rate limited", async () => {
		setupAuthenticatedUser();
		mockEnforceRateLimit.mockResolvedValue({
			error: {
				status: ActionStatus.ERROR,
				message: "Trop de requetes",
			},
		});

		const result = await toggleWishlistItem(
			undefined,
			createFormData({ productId: VALID_PRODUCT_ID }),
		);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("Trop de requetes");
	});

	it("should return success on P2002 unique constraint violation (race condition)", async () => {
		setupAuthenticatedUser();
		mockPrisma.product.findUnique.mockResolvedValue({
			id: VALID_PRODUCT_ID,
			status: "PUBLIC",
		});
		mockPrisma.$transaction.mockRejectedValue(
			new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
				code: "P2002",
				clientVersion: "6.0.0",
			}),
		);

		const result = await toggleWishlistItem(
			undefined,
			createFormData({ productId: VALID_PRODUCT_ID }),
		);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toContain("Deja");
	});
});
