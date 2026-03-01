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
	validateInput: mockValidateInput,
	handleActionError: mockHandleActionError,
	success: mockSuccess,
	error: mockError,
	BusinessError: mockBusinessError,
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

vi.mock("@/modules/cart/lib/cart-session", () => ({
	getCartExpirationDate: mockGetCartExpirationDate,
	getOrCreateCartSessionId: mockGetOrCreateCartSessionId,
}));

vi.mock("../../schemas/cart.schemas", () => ({
	addToCartSchema: {},
}));

vi.mock("../../constants/error-messages", () => ({
	CART_ERROR_MESSAGES: {
		SKU_NOT_FOUND: "Produit introuvable",
		PRODUCT_DELETED: "Ce produit n'existe plus",
		SKU_INACTIVE: "Ce produit n'est plus disponible",
		PRODUCT_NOT_PUBLIC: "Ce produit n'est pas disponible à la vente",
		QUANTITY_MAX: "Quantité maximale dépassée",
		INSUFFICIENT_STOCK: (n: number) => `Stock insuffisant (${n})`,
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
// Factories
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

function makeTx(skuRows: unknown[] = [makeSkuRow()], existingItem: unknown = null) {
	const mockQueryRaw = vi.fn().mockResolvedValue(skuRows);
	const mockCartUpsert = vi.fn().mockResolvedValue({ id: "cart-1" });
	const mockCartItemFindUnique = vi.fn().mockResolvedValue(existingItem);
	const mockCartItemCreate = vi.fn().mockResolvedValue({ id: "ci-new", quantity: 1 });
	const mockCartItemUpdate = vi.fn().mockResolvedValue({ id: "ci-1", quantity: 2 });

	return {
		tx: {
			$queryRaw: mockQueryRaw,
			cart: { upsert: mockCartUpsert },
			cartItem: {
				findUnique: mockCartItemFindUnique,
				create: mockCartItemCreate,
				update: mockCartItemUpdate,
			},
		},
		mockQueryRaw,
		mockCartUpsert,
		mockCartItemFindUnique,
		mockCartItemCreate,
		mockCartItemUpdate,
	};
}

function setupDefaults() {
	mockValidateInput.mockReturnValue({ data: { skuId: "sku-1", quantity: 1 } });
	mockCheckCartRateLimit.mockResolvedValue({
		success: true,
		context: { userId: "user-1", sessionId: null },
	});
	mockPrisma.user.findUnique.mockResolvedValue({ id: "user-1" });
	mockPrisma.cart.findFirst.mockResolvedValue(null);

	const { tx } = makeTx();
	mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => {
		const result = fn(tx);
		return result;
	});

	mockGetCartInvalidationTags.mockReturnValue(["cart-tag"]);
	mockGetCartExpirationDate.mockReturnValue(new Date("2030-01-01"));
	mockGetOrCreateCartSessionId.mockResolvedValue("sess-new");
	mockSuccess.mockImplementation((msg: string, data?: unknown) => ({
		status: "success",
		message: msg,
		data,
	}));
	mockError.mockImplementation((msg: string) => ({ status: "error", message: msg }));
	mockHandleActionError.mockReturnValue({ status: "error", message: "fallback" });
}

// ============================================================================
// Tests
// ============================================================================

describe("addToCart", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupDefaults();
	});

	it("returns error on validation failure", async () => {
		mockValidateInput.mockReturnValue({
			error: { status: "validation_error", message: "SKU invalide" },
		});

		const result = await addToCart(undefined, makeFormData());
		expect(result).toEqual({ status: "validation_error", message: "SKU invalide" });
	});

	it("returns error when rate limited", async () => {
		mockCheckCartRateLimit.mockResolvedValue({
			success: false,
			errorState: { status: "error", message: "Rate limited" },
		});

		const result = await addToCart(undefined, makeFormData());
		expect(result).toEqual({ status: "error", message: "Rate limited" });
	});

	it("passes createSessionIfMissing to rate limit check", async () => {
		await addToCart(undefined, makeFormData());
		expect(mockCheckCartRateLimit).toHaveBeenCalledWith("add", {
			createSessionIfMissing: true,
		});
	});

	it("falls back to session when user not in DB", async () => {
		mockPrisma.user.findUnique.mockResolvedValue(null);

		await addToCart(undefined, makeFormData());
		expect(mockGetOrCreateCartSessionId).toHaveBeenCalled();
	});

	it("returns error when no userId and no sessionId", async () => {
		mockCheckCartRateLimit.mockResolvedValue({
			success: true,
			context: { userId: undefined, sessionId: undefined },
		});

		await addToCart(undefined, makeFormData());
		expect(mockError).toHaveBeenCalledWith(
			"Impossible de creer une session panier. Veuillez reessayer.",
		);
	});

	it("returns error when cart exceeds MAX_CART_ITEMS", async () => {
		mockPrisma.cart.findFirst.mockResolvedValue({ _count: { items: 50 } });

		await addToCart(undefined, makeFormData());
		expect(mockError).toHaveBeenCalledWith("Max 50 articles");
	});

	it("throws BusinessError when SKU not found in transaction", async () => {
		const { tx } = makeTx([]);
		mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(tx));

		await addToCart(undefined, makeFormData());
		expect(mockHandleActionError).toHaveBeenCalled();
	});

	it("throws BusinessError for deleted SKU", async () => {
		const { tx } = makeTx([makeSkuRow({ deletedAt: new Date() })]);
		mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(tx));

		await addToCart(undefined, makeFormData());
		expect(mockHandleActionError).toHaveBeenCalled();
	});

	it("throws BusinessError for inactive SKU", async () => {
		const { tx } = makeTx([makeSkuRow({ isActive: false })]);
		mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(tx));

		await addToCart(undefined, makeFormData());
		expect(mockHandleActionError).toHaveBeenCalled();
	});

	it("throws BusinessError for non-PUBLIC product", async () => {
		const { tx } = makeTx([makeSkuRow({ productStatus: "DRAFT" })]);
		mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(tx));

		await addToCart(undefined, makeFormData());
		expect(mockHandleActionError).toHaveBeenCalled();
	});

	it("creates new cart item when none exists", async () => {
		const { tx, mockCartItemCreate } = makeTx();
		mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(tx));

		await addToCart(undefined, makeFormData());
		expect(mockCartItemCreate).toHaveBeenCalledWith({
			data: expect.objectContaining({
				skuId: "sku-1",
				quantity: 1,
				priceAtAdd: 2999,
			}),
		});
	});

	it("throws BusinessError when out of stock for new item", async () => {
		const { tx } = makeTx([makeSkuRow({ inventory: 0 })]);
		mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(tx));

		await addToCart(undefined, makeFormData());
		expect(mockHandleActionError).toHaveBeenCalled();
	});

	it("throws BusinessError when insufficient stock for new item", async () => {
		mockValidateInput.mockReturnValue({ data: { skuId: "sku-1", quantity: 5 } });
		const { tx } = makeTx([makeSkuRow({ inventory: 3 })]);
		mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(tx));

		await addToCart(undefined, makeFormData("sku-1", 5));
		expect(mockHandleActionError).toHaveBeenCalled();
	});

	it("updates existing item quantity cumulatively", async () => {
		const existingItem = { id: "ci-1", quantity: 3, cartId: "cart-1", skuId: "sku-1" };
		const { tx, mockCartItemUpdate } = makeTx([makeSkuRow()], existingItem);
		mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(tx));

		await addToCart(undefined, makeFormData());
		expect(mockCartItemUpdate).toHaveBeenCalledWith({
			where: { id: "ci-1" },
			data: { quantity: 4 },
		});
	});

	it("throws BusinessError when cumulative quantity exceeds MAX_QUANTITY_PER_ORDER", async () => {
		const existingItem = { id: "ci-1", quantity: 10, cartId: "cart-1", skuId: "sku-1" };
		const { tx } = makeTx([makeSkuRow()], existingItem);
		mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(tx));

		await addToCart(undefined, makeFormData());
		expect(mockHandleActionError).toHaveBeenCalled();
	});

	it("throws BusinessError when cumulative quantity exceeds stock", async () => {
		const existingItem = { id: "ci-1", quantity: 8, cartId: "cart-1", skuId: "sku-1" };
		const { tx } = makeTx([makeSkuRow({ inventory: 8 })], existingItem);
		mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(tx));

		mockValidateInput.mockReturnValue({ data: { skuId: "sku-1", quantity: 2 } });

		await addToCart(undefined, makeFormData("sku-1", 2));
		expect(mockHandleActionError).toHaveBeenCalled();
	});

	it("invalidates cart cache tags", async () => {
		await addToCart(undefined, makeFormData());
		expect(mockGetCartInvalidationTags).toHaveBeenCalled();
		expect(mockUpdateTag).toHaveBeenCalledWith("cart-tag");
	});

	it("invalidates product FOMO cache tag", async () => {
		await addToCart(undefined, makeFormData());
		expect(mockUpdateTag).toHaveBeenCalledWith("product-carts-product-1");
	});

	it("returns success with 'Article ajouté' for new item", async () => {
		const { tx, mockCartItemCreate } = makeTx();
		mockCartItemCreate.mockResolvedValue({ id: "ci-new" });
		mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(tx));

		await addToCart(undefined, makeFormData());
		expect(mockSuccess).toHaveBeenCalledWith("Article ajouté au panier", expect.any(Object));
	});

	it("returns success with 'Quantité mise à jour' for existing item", async () => {
		const existingItem = { id: "ci-1", quantity: 2, cartId: "cart-1", skuId: "sku-1" };
		const { tx } = makeTx([makeSkuRow()], existingItem);
		mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(tx));

		await addToCart(undefined, makeFormData());
		expect(mockSuccess).toHaveBeenCalledWith("Quantité mise à jour (3)", expect.any(Object));
	});

	it("calls handleActionError on exception", async () => {
		const err = new Error("DB down");
		mockPrisma.$transaction.mockRejectedValue(err);

		await addToCart(undefined, makeFormData());
		expect(mockHandleActionError).toHaveBeenCalledWith(
			err,
			"Une erreur est survenue lors de l'ajout au panier",
		);
	});
});
