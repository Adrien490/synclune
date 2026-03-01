import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";

// ============================================================================
// Hoisted mocks
// ============================================================================

const {
	mockGetSession,
	mockCheckMergeCartsRateLimit,
	mockPrisma,
	mockUpdateTag,
	mockGetCartInvalidationTags,
	mockGetGuestCartForMerge,
	mockGetUserCartForMerge,
	mockBatchValidateSkusForMerge,
} = vi.hoisted(() => ({
	mockGetSession: vi.fn(),
	mockCheckMergeCartsRateLimit: vi.fn(),
	mockPrisma: {
		user: { findUnique: vi.fn() },
		cart: { create: vi.fn(), delete: vi.fn() },
		$transaction: vi.fn(),
	},
	mockUpdateTag: vi.fn(),
	mockGetCartInvalidationTags: vi.fn(),
	mockGetGuestCartForMerge: vi.fn(),
	mockGetUserCartForMerge: vi.fn(),
	mockBatchValidateSkusForMerge: vi.fn(),
}));

vi.mock("@/modules/auth/lib/get-current-session", () => ({
	getSession: mockGetSession,
}));

vi.mock("@/modules/cart/lib/cart-rate-limit", () => ({
	checkMergeCartsRateLimit: mockCheckMergeCartsRateLimit,
}));

vi.mock("@/shared/lib/rate-limit-config", () => ({
	CART_LIMITS: { MERGE: "merge" },
}));

vi.mock("@/shared/lib/actions", () => ({
	handleActionError: vi.fn(),
	success: vi.fn(),
	error: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
}));

vi.mock("next/cache", () => ({
	updateTag: mockUpdateTag,
}));

vi.mock("@/modules/cart/constants/cache", () => ({
	getCartInvalidationTags: mockGetCartInvalidationTags,
	CART_CACHE_TAGS: {
		PRODUCT_CARTS: (id: string) => `product-carts-${id}`,
	},
}));

vi.mock("@/modules/cart/data/get-cart-for-merge", () => ({
	getGuestCartForMerge: mockGetGuestCartForMerge,
	getUserCartForMerge: mockGetUserCartForMerge,
}));

vi.mock("@/modules/cart/services/sku-validation.service", () => ({
	batchValidateSkusForMerge: mockBatchValidateSkusForMerge,
}));

vi.mock("../../constants/cart", () => ({
	MAX_CART_ITEMS: 50,
}));

import { mergeCarts } from "../merge-carts";

// ============================================================================
// Factories
// ============================================================================

function makeGuestItem(skuId: string, quantity: number, overrides: Record<string, unknown> = {}) {
	return {
		id: `gi-${skuId}`,
		skuId,
		quantity,
		priceAtAdd: 2999,
		sku: {
			isActive: true,
			product: { id: `prod-${skuId}`, status: "PUBLIC" },
			...((overrides.sku as Record<string, unknown>) ?? {}),
		},
	};
}

function makeUserItem(skuId: string, quantity: number) {
	return {
		id: `ui-${skuId}`,
		skuId,
		quantity,
		priceAtAdd: 2999,
	};
}

function makeGuestCart(items: unknown[] = []) {
	return { id: "guest-cart-1", items };
}

function makeUserCart(items: unknown[] = []) {
	return { id: "user-cart-1", items };
}

function setupDefaults() {
	mockGetSession.mockResolvedValue({ user: { id: "user-1" } });
	mockCheckMergeCartsRateLimit.mockResolvedValue({ success: true });
	mockPrisma.user.findUnique.mockResolvedValue({ id: "user-1", deletedAt: null });
	mockGetGuestCartForMerge.mockResolvedValue(makeGuestCart([makeGuestItem("sku-1", 2)]));
	mockGetUserCartForMerge.mockResolvedValue(makeUserCart());
	mockBatchValidateSkusForMerge.mockResolvedValue(new Map([["sku-1", { isValid: true }]]));
	mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
		fn({
			cartItem: { create: vi.fn(), update: vi.fn() },
			cart: { delete: vi.fn() },
		}),
	);
	mockGetCartInvalidationTags.mockReturnValue(["tag-1"]);
}

// ============================================================================
// Tests
// ============================================================================

describe("mergeCarts", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupDefaults();
	});

	it("returns error when no session", async () => {
		mockGetSession.mockResolvedValue(null);
		const result = await mergeCarts("user-1", "sess-1");
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toBe("Non autorisé");
	});

	it("returns error when session userId mismatch", async () => {
		mockGetSession.mockResolvedValue({ user: { id: "other-user" } });
		const result = await mergeCarts("user-1", "sess-1");
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("returns error when rate limited", async () => {
		mockCheckMergeCartsRateLimit.mockResolvedValue({
			success: false,
			errorState: { message: "Rate limited" },
		});
		const result = await mergeCarts("user-1", "sess-1");
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toBe("Rate limited");
	});

	it("returns error when user not found", async () => {
		mockPrisma.user.findUnique.mockResolvedValue(null);
		const result = await mergeCarts("user-1", "sess-1");
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toBe("Utilisateur non trouvé");
	});

	it("returns error when user is soft-deleted", async () => {
		mockPrisma.user.findUnique.mockResolvedValue({
			id: "user-1",
			deletedAt: new Date(),
		});
		const result = await mergeCarts("user-1", "sess-1");
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toBe("Utilisateur non trouvé");
	});

	it("deletes empty guest cart and returns success", async () => {
		mockGetGuestCartForMerge.mockResolvedValue(makeGuestCart([]));
		const result = await mergeCarts("user-1", "sess-1");
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockPrisma.cart.delete).toHaveBeenCalledWith({
			where: { id: "guest-cart-1" },
		});
	});

	it("returns success when no guest cart exists", async () => {
		mockGetGuestCartForMerge.mockResolvedValue(null);
		const result = await mergeCarts("user-1", "sess-1");
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toBe("Aucun article à fusionner");
	});

	it("creates user cart when none exists", async () => {
		mockGetUserCartForMerge.mockResolvedValue(null);
		mockPrisma.cart.create.mockResolvedValue({
			id: "new-user-cart",
			items: [],
		});

		await mergeCarts("user-1", "sess-1");
		expect(mockPrisma.cart.create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ userId: "user-1", expiresAt: null }),
			}),
		);
	});

	it("uses MAX quantity strategy for conflicting items", async () => {
		mockGetGuestCartForMerge.mockResolvedValue(makeGuestCart([makeGuestItem("sku-1", 5)]));
		mockGetUserCartForMerge.mockResolvedValue(makeUserCart([makeUserItem("sku-1", 3)]));
		mockBatchValidateSkusForMerge.mockResolvedValue(new Map([["sku-1", { isValid: true }]]));

		const mockCartItemUpdate = vi.fn();
		mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
			fn({
				cartItem: { create: vi.fn(), update: mockCartItemUpdate },
				cart: { delete: vi.fn() },
			}),
		);

		await mergeCarts("user-1", "sess-1");
		expect(mockCartItemUpdate).toHaveBeenCalledWith(
			expect.objectContaining({
				data: { quantity: 5 },
			}),
		);
	});

	it("adds new items from guest cart", async () => {
		mockGetGuestCartForMerge.mockResolvedValue(makeGuestCart([makeGuestItem("sku-new", 2)]));
		mockGetUserCartForMerge.mockResolvedValue(makeUserCart());
		mockBatchValidateSkusForMerge.mockResolvedValue(new Map([["sku-new", { isValid: true }]]));

		const mockCartItemCreate = vi.fn();
		mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
			fn({
				cartItem: { create: mockCartItemCreate, update: vi.fn() },
				cart: { delete: vi.fn() },
			}),
		);

		await mergeCarts("user-1", "sess-1");
		expect(mockCartItemCreate).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ skuId: "sku-new", quantity: 2 }),
			}),
		);
	});

	it("skips inactive SKUs", async () => {
		mockGetGuestCartForMerge.mockResolvedValue(
			makeGuestCart([
				makeGuestItem("sku-inactive", 1, {
					sku: { isActive: false, product: { id: "p1", status: "PUBLIC" } },
				}),
			]),
		);

		const mockCartItemCreate = vi.fn();
		mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
			fn({
				cartItem: { create: mockCartItemCreate, update: vi.fn() },
				cart: { delete: vi.fn() },
			}),
		);

		await mergeCarts("user-1", "sess-1");
		expect(mockCartItemCreate).not.toHaveBeenCalled();
	});

	it("skips non-PUBLIC product SKUs", async () => {
		mockGetGuestCartForMerge.mockResolvedValue(
			makeGuestCart([
				makeGuestItem("sku-draft", 1, {
					sku: { isActive: true, product: { id: "p1", status: "DRAFT" } },
				}),
			]),
		);

		const mockCartItemCreate = vi.fn();
		mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
			fn({
				cartItem: { create: mockCartItemCreate, update: vi.fn() },
				cart: { delete: vi.fn() },
			}),
		);

		await mergeCarts("user-1", "sess-1");
		expect(mockCartItemCreate).not.toHaveBeenCalled();
	});

	it("skips items that fail validation", async () => {
		mockGetGuestCartForMerge.mockResolvedValue(makeGuestCart([makeGuestItem("sku-bad", 2)]));
		mockBatchValidateSkusForMerge.mockResolvedValue(new Map([["sku-bad", { isValid: false }]]));

		const mockCartItemCreate = vi.fn();
		mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
			fn({
				cartItem: { create: mockCartItemCreate, update: vi.fn() },
				cart: { delete: vi.fn() },
			}),
		);

		await mergeCarts("user-1", "sess-1");
		expect(mockCartItemCreate).not.toHaveBeenCalled();
	});

	it("deletes guest cart in transaction", async () => {
		const mockTxCartDelete = vi.fn();
		mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
			fn({
				cartItem: { create: vi.fn(), update: vi.fn() },
				cart: { delete: mockTxCartDelete },
			}),
		);

		await mergeCarts("user-1", "sess-1");
		expect(mockTxCartDelete).toHaveBeenCalledWith({
			where: { id: "guest-cart-1" },
		});
	});

	it("invalidates cache tags for both user and guest carts", async () => {
		mockGetCartInvalidationTags
			.mockReturnValueOnce(["guest-tag"])
			.mockReturnValueOnce(["user-tag"]);

		await mergeCarts("user-1", "sess-1");
		expect(mockGetCartInvalidationTags).toHaveBeenCalledWith(undefined, "sess-1");
		expect(mockGetCartInvalidationTags).toHaveBeenCalledWith("user-1", undefined);
		expect(mockUpdateTag).toHaveBeenCalledWith("guest-tag");
		expect(mockUpdateTag).toHaveBeenCalledWith("user-tag");
	});

	it("invalidates FOMO cache for products in guest cart", async () => {
		await mergeCarts("user-1", "sess-1");
		expect(mockUpdateTag).toHaveBeenCalledWith("product-carts-prod-sku-1");
	});

	it("returns error on unexpected exception", async () => {
		const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
		mockPrisma.user.findUnique.mockRejectedValue(new Error("DB down"));

		const result = await mergeCarts("user-1", "sess-1");
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toBe("Une erreur est survenue lors de la fusion des paniers");
		consoleSpy.mockRestore();
	});

	it("returns merged items and conflicts count on success", async () => {
		mockGetGuestCartForMerge.mockResolvedValue(
			makeGuestCart([makeGuestItem("sku-1", 2), makeGuestItem("sku-2", 1)]),
		);
		mockGetUserCartForMerge.mockResolvedValue(makeUserCart([makeUserItem("sku-1", 3)]));
		mockBatchValidateSkusForMerge.mockResolvedValue(
			new Map([
				["sku-1", { isValid: true }],
				["sku-2", { isValid: true }],
			]),
		);

		mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
			fn({
				cartItem: { create: vi.fn(), update: vi.fn() },
				cart: { delete: vi.fn() },
			}),
		);

		const result = await mergeCarts("user-1", "sess-1");
		expect(result.status).toBe(ActionStatus.SUCCESS);
		if ("data" in result) {
			expect(result.data.mergedItems).toBe(1);
			expect(result.data.conflicts).toBe(1);
		}
	});
});
