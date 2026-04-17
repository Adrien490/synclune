import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import type * as ActionsModule from "@/shared/lib/actions";

// Valid cuid2 fixtures
const VALID_PRODUCT_ID = "cm1234567890abcdefghijk12";
const VALID_SKU_ID = "cm9876543210zyxwvutsrqp34";
const VALID_USER_ID = "cm_user_00000000000000001";
const VALID_SESSION_ID = "550e8400-e29b-41d4-a716-446655440000";

// ============================================================================
// MOCKS
// ============================================================================

const {
	mockPrisma,
	mockGetSession,
	mockGetWishlistSessionId,
	mockGetOrCreateCartSessionId,
	mockHeaders,
	mockGetClientIp,
	mockEnforceRateLimit,
	mockUpdateTag,
	mockGetWishlistInvalidationTags,
	mockGetCartInvalidationTags,
} = vi.hoisted(() => ({
	mockPrisma: {
		cart: { upsert: vi.fn() },
		cartItem: {
			findUnique: vi.fn(),
			update: vi.fn(),
			create: vi.fn(),
			count: vi.fn(),
		},
		wishlist: {
			findFirst: vi.fn(),
			update: vi.fn(),
		},
		wishlistItem: { deleteMany: vi.fn() },
		$transaction: vi.fn(),
		$queryRaw: vi.fn(),
	},
	mockGetSession: vi.fn(),
	mockGetWishlistSessionId: vi.fn(),
	mockGetOrCreateCartSessionId: vi.fn(),
	mockHeaders: vi.fn(),
	mockGetClientIp: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockGetWishlistInvalidationTags: vi.fn(),
	mockGetCartInvalidationTags: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/modules/auth/lib/get-current-session", () => ({
	getSession: mockGetSession,
}));
vi.mock("@/modules/wishlist/lib/wishlist-session", () => ({
	getWishlistSessionId: mockGetWishlistSessionId,
}));
vi.mock("@/modules/cart/lib/cart-session", () => ({
	getOrCreateCartSessionId: mockGetOrCreateCartSessionId,
	getCartExpirationDate: () => new Date("2026-04-24"),
}));
vi.mock("next/headers", () => ({ headers: mockHeaders }));
vi.mock("@/shared/lib/rate-limit", () => ({
	getRateLimitIdentifier: vi.fn().mockReturnValue("test-rate-limit-id"),
	getClientIp: mockGetClientIp,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	WISHLIST_LIMITS: {
		MOVE_TO_CART: { limit: 15, windowMs: 60_000 },
	},
}));
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag }));
vi.mock("@/modules/wishlist/constants/cache", () => ({
	getWishlistInvalidationTags: mockGetWishlistInvalidationTags,
}));
vi.mock("@/modules/cart/constants/cache", () => ({
	getCartInvalidationTags: mockGetCartInvalidationTags,
	CART_CACHE_TAGS: {
		PRODUCT_CARTS: (id: string) => `product-carts-${id}`,
	},
}));

vi.mock("@/shared/lib/actions", async (importOriginal) => {
	const actual = await importOriginal<typeof ActionsModule>();
	return {
		...actual,
		enforceRateLimit: mockEnforceRateLimit,
	};
});

import { moveToCart } from "../move-to-cart";

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
	mockGetOrCreateCartSessionId.mockResolvedValue(VALID_SESSION_ID);
}

function setupValidSku(overrides: Record<string, unknown> = {}) {
	mockPrisma.$queryRaw.mockResolvedValue([
		{
			inventory: 10,
			isActive: true,
			priceInclTax: 4999,
			deletedAt: null,
			productId: VALID_PRODUCT_ID,
			productStatus: "PUBLIC",
			productDeletedAt: null,
			...overrides,
		},
	]);
}

function setupDefaults() {
	mockHeaders.mockResolvedValue(new Headers());
	mockGetClientIp.mockResolvedValue("127.0.0.1");
	mockEnforceRateLimit.mockResolvedValue({ success: true });
	mockGetWishlistInvalidationTags.mockReturnValue(["wl-1", "wl-2", "wl-3"]);
	mockGetCartInvalidationTags.mockReturnValue(["cart-1", "cart-2", "cart-3"]);
	mockPrisma.$transaction.mockImplementation(
		async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma),
	);
}

const VALID_INPUT = {
	productId: VALID_PRODUCT_ID,
	skuId: VALID_SKU_ID,
	quantity: "1",
};

describe("moveToCart", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupDefaults();
	});

	it("returns error when no auth and no cart session", async () => {
		mockGetSession.mockResolvedValue(null);
		mockGetWishlistSessionId.mockResolvedValue(null);
		mockGetOrCreateCartSessionId.mockResolvedValue(null);

		const result = await moveToCart(undefined, createFormData(VALID_INPUT));

		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("returns rate limit error when exceeded", async () => {
		setupAuthenticatedUser();
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Trop de requetes" },
		});

		const result = await moveToCart(undefined, createFormData(VALID_INPUT));

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("Trop de requetes");
		expect(mockPrisma.$queryRaw).not.toHaveBeenCalled();
	});

	it("returns validation error with invalid productId", async () => {
		setupAuthenticatedUser();

		const result = await moveToCart(
			undefined,
			createFormData({ ...VALID_INPUT, productId: "invalid" }),
		);

		expect([ActionStatus.ERROR, ActionStatus.VALIDATION_ERROR]).toContain(result.status);
	});

	it("returns error when SKU is not found", async () => {
		setupAuthenticatedUser();
		mockPrisma.$queryRaw.mockResolvedValue([]);

		const result = await moveToCart(undefined, createFormData(VALID_INPUT));

		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("returns error when product is not PUBLIC", async () => {
		setupAuthenticatedUser();
		setupValidSku({ productStatus: "DRAFT" });

		const result = await moveToCart(undefined, createFormData(VALID_INPUT));

		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("returns error when SKU is inactive", async () => {
		setupAuthenticatedUser();
		setupValidSku({ isActive: false });

		const result = await moveToCart(undefined, createFormData(VALID_INPUT));

		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("returns error when SKU is out of stock and not in cart yet", async () => {
		setupAuthenticatedUser();
		setupValidSku({ inventory: 0 });
		mockPrisma.cart.upsert.mockResolvedValue({ id: "cart-1" });
		mockPrisma.cartItem.findUnique.mockResolvedValue(null);
		mockPrisma.cartItem.count.mockResolvedValue(0);

		const result = await moveToCart(undefined, createFormData(VALID_INPUT));

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("plus en stock");
	});

	it("returns error when skuId does not belong to declared productId", async () => {
		setupAuthenticatedUser();
		setupValidSku({ productId: "cm0000000000000000000xxxx" });

		const result = await moveToCart(undefined, createFormData(VALID_INPUT));

		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("creates cart item, removes from wishlist, invalidates both caches (auth user)", async () => {
		setupAuthenticatedUser();
		setupValidSku();
		mockPrisma.cart.upsert.mockResolvedValue({ id: "cart-1" });
		mockPrisma.cartItem.findUnique.mockResolvedValue(null);
		mockPrisma.cartItem.count.mockResolvedValue(0);
		mockPrisma.cartItem.create.mockResolvedValue({ id: "ci-1" });
		mockPrisma.wishlist.findFirst.mockResolvedValue({ id: "wl-1" });
		mockPrisma.wishlistItem.deleteMany.mockResolvedValue({ count: 1 });
		mockPrisma.wishlist.update.mockResolvedValue({});

		const result = await moveToCart(undefined, createFormData(VALID_INPUT));

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toContain("Deplace");
		expect(mockPrisma.cartItem.create).toHaveBeenCalled();
		expect(mockPrisma.wishlistItem.deleteMany).toHaveBeenCalledWith({
			where: { wishlistId: "wl-1", productId: VALID_PRODUCT_ID },
		});
		// 3 cart tags + 1 product FOMO tag + 3 wishlist tags
		expect(mockUpdateTag).toHaveBeenCalledTimes(7);
	});

	it("increments quantity when item already in cart", async () => {
		setupAuthenticatedUser();
		setupValidSku();
		mockPrisma.cart.upsert.mockResolvedValue({ id: "cart-1" });
		mockPrisma.cartItem.findUnique.mockResolvedValue({ id: "ci-existing", quantity: 2 });
		mockPrisma.cartItem.update.mockResolvedValue({ id: "ci-existing" });
		mockPrisma.wishlist.findFirst.mockResolvedValue({ id: "wl-1" });
		mockPrisma.wishlistItem.deleteMany.mockResolvedValue({ count: 1 });
		mockPrisma.wishlist.update.mockResolvedValue({});

		const result = await moveToCart(undefined, createFormData({ ...VALID_INPUT, quantity: "3" }));

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockPrisma.cartItem.update).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: "ci-existing" },
				data: { quantity: 5 },
			}),
		);
	});

	it("returns error when incremented quantity exceeds MAX_QUANTITY_PER_ORDER", async () => {
		setupAuthenticatedUser();
		setupValidSku({ inventory: 100 });
		mockPrisma.cart.upsert.mockResolvedValue({ id: "cart-1" });
		mockPrisma.cartItem.findUnique.mockResolvedValue({ id: "ci-existing", quantity: 8 });

		const result = await moveToCart(undefined, createFormData({ ...VALID_INPUT, quantity: "5" }));

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("maximale");
	});

	it("succeeds for guest user with both wishlist + cart sessions", async () => {
		setupGuestUser();
		setupValidSku();
		mockPrisma.cart.upsert.mockResolvedValue({ id: "guest-cart-1" });
		mockPrisma.cartItem.findUnique.mockResolvedValue(null);
		mockPrisma.cartItem.count.mockResolvedValue(0);
		mockPrisma.cartItem.create.mockResolvedValue({ id: "ci-1" });
		mockPrisma.wishlist.findFirst.mockResolvedValue({ id: "guest-wl-1" });
		mockPrisma.wishlistItem.deleteMany.mockResolvedValue({ count: 1 });
		mockPrisma.wishlist.update.mockResolvedValue({});

		const result = await moveToCart(undefined, createFormData(VALID_INPUT));

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockPrisma.cart.upsert).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { sessionId: VALID_SESSION_ID },
			}),
		);
	});

	it("succeeds even if wishlist item is missing (idempotent)", async () => {
		setupAuthenticatedUser();
		setupValidSku();
		mockPrisma.cart.upsert.mockResolvedValue({ id: "cart-1" });
		mockPrisma.cartItem.findUnique.mockResolvedValue(null);
		mockPrisma.cartItem.count.mockResolvedValue(0);
		mockPrisma.cartItem.create.mockResolvedValue({ id: "ci-1" });
		mockPrisma.wishlist.findFirst.mockResolvedValue({ id: "wl-1" });
		mockPrisma.wishlistItem.deleteMany.mockResolvedValue({ count: 0 });

		const result = await moveToCart(undefined, createFormData(VALID_INPUT));

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toContain("Ajoute au panier");
		// wishlist tags NOT invalidated when nothing was removed
		expect(mockGetWishlistInvalidationTags).not.toHaveBeenCalled();
	});

	it("succeeds when user has no wishlist at all (only cart action)", async () => {
		setupAuthenticatedUser();
		setupValidSku();
		mockPrisma.cart.upsert.mockResolvedValue({ id: "cart-1" });
		mockPrisma.cartItem.findUnique.mockResolvedValue(null);
		mockPrisma.cartItem.count.mockResolvedValue(0);
		mockPrisma.cartItem.create.mockResolvedValue({ id: "ci-1" });
		mockPrisma.wishlist.findFirst.mockResolvedValue(null);

		const result = await moveToCart(undefined, createFormData(VALID_INPUT));

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockPrisma.wishlistItem.deleteMany).not.toHaveBeenCalled();
	});

	it("returns error when cart item limit reached", async () => {
		setupAuthenticatedUser();
		setupValidSku();
		mockPrisma.cart.upsert.mockResolvedValue({ id: "cart-1" });
		mockPrisma.cartItem.findUnique.mockResolvedValue(null);
		mockPrisma.cartItem.count.mockResolvedValue(50);

		const result = await moveToCart(undefined, createFormData(VALID_INPUT));

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("50");
	});

	it("returns error when transaction throws", async () => {
		setupAuthenticatedUser();
		mockPrisma.$transaction.mockRejectedValue(new Error("DB exploded"));

		const result = await moveToCart(undefined, createFormData(VALID_INPUT));

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockUpdateTag).not.toHaveBeenCalled();
	});
});
