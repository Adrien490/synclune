import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockFetchSkuForValidation, mockFetchSkuForDetails, mockFetchSkusForBatchValidation } =
	vi.hoisted(() => ({
		mockFetchSkuForValidation: vi.fn(),
		mockFetchSkuForDetails: vi.fn(),
		mockFetchSkusForBatchValidation: vi.fn(),
	}));

vi.mock("@/modules/cart/data/get-sku-for-validation", () => ({
	fetchSkuForValidation: mockFetchSkuForValidation,
	fetchSkuForDetails: mockFetchSkuForDetails,
	fetchSkusForBatchValidation: mockFetchSkusForBatchValidation,
}));

vi.mock("@/modules/cart/constants/cart", () => ({
	MAX_QUANTITY_PER_ORDER: 10,
}));

import { CART_ERROR_MESSAGES } from "@/modules/cart/constants/error-messages";
import {
	validateSkuAndStock,
	getSkuDetails,
	validateCartItemsWithDb,
	batchValidateSkusForMerge,
} from "../sku-validation.service";

// ============================================================================
// CONSTANTS - Valid cuid2 format IDs (lowercase alphanumeric only)
// ============================================================================

const SKU_ID = "cm1234567890abcdefghijklm";
const SKU_ID_2 = "cm9876543210zyxwvutsrqpon";
const PROD_ID = "cmabcdef1234567890ghijkl";

// ============================================================================
// FACTORIES
// ============================================================================

function createSkuRow(overrides: Record<string, unknown> = {}) {
	return {
		id: SKU_ID,
		sku: "BRC-LUNE-OR-M",
		priceInclTax: 4999,
		compareAtPrice: null,
		inventory: 10,
		isActive: true,
		size: "M",
		colorId: "color123",
		deletedAt: null,
		product: {
			id: PROD_ID,
			title: "Bracelet Lune",
			slug: "bracelet-lune",
			description: "Un bracelet artisanal",
			status: "PUBLIC",
			deletedAt: null,
		},
		color: { id: "color123", name: "Or", hex: "#FFD700" },
		material: { id: "mat123", name: "Argent 925" },
		images: [{ url: "https://img.test/1.jpg", altText: "Bracelet", isPrimary: true }],
		...overrides,
	};
}

function createBatchSkuRow(overrides: Record<string, unknown> = {}) {
	return {
		id: SKU_ID,
		inventory: 10,
		isActive: true,
		deletedAt: null,
		product: {
			status: "PUBLIC",
			deletedAt: null,
		},
		...overrides,
	};
}

// ============================================================================
// validateSkuAndStock
// ============================================================================

describe("validateSkuAndStock", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should return success with mapped sku data on valid input", async () => {
		mockFetchSkuForValidation.mockResolvedValue(createSkuRow());

		const result = await validateSkuAndStock({ skuId: SKU_ID, quantity: 1 });

		expect(result.success).toBe(true);
		expect(result.data?.sku.id).toBe(SKU_ID);
		expect(result.data?.sku.product.title).toBe("Bracelet Lune");
		expect(result.data?.sku.color).toEqual({ id: "color123", name: "Or", hex: "#FFD700" });
		expect(result.data?.sku.material).toBe("Argent 925");
		expect(result.data?.sku.images).toHaveLength(1);
	});

	it("should return error when SKU not found", async () => {
		mockFetchSkuForValidation.mockResolvedValue(null);

		const result = await validateSkuAndStock({ skuId: SKU_ID, quantity: 1 });

		expect(result.success).toBe(false);
		expect(result.error).toBe(CART_ERROR_MESSAGES.SKU_NOT_FOUND);
	});

	it("should return error when SKU is soft-deleted", async () => {
		mockFetchSkuForValidation.mockResolvedValue(createSkuRow({ deletedAt: new Date() }));

		const result = await validateSkuAndStock({ skuId: SKU_ID, quantity: 1 });

		expect(result.success).toBe(false);
		expect(result.error).toBe(CART_ERROR_MESSAGES.PRODUCT_DELETED);
	});

	it("should return error when product is soft-deleted", async () => {
		mockFetchSkuForValidation.mockResolvedValue(
			createSkuRow({ product: { ...createSkuRow().product, deletedAt: new Date() } }),
		);

		const result = await validateSkuAndStock({ skuId: SKU_ID, quantity: 1 });

		expect(result.success).toBe(false);
		expect(result.error).toBe(CART_ERROR_MESSAGES.PRODUCT_DELETED);
	});

	it("should return error when SKU is inactive", async () => {
		mockFetchSkuForValidation.mockResolvedValue(createSkuRow({ isActive: false }));

		const result = await validateSkuAndStock({ skuId: SKU_ID, quantity: 1 });

		expect(result.success).toBe(false);
		expect(result.error).toBe(CART_ERROR_MESSAGES.SKU_INACTIVE);
	});

	it("should return error when product is not PUBLIC", async () => {
		mockFetchSkuForValidation.mockResolvedValue(
			createSkuRow({ product: { ...createSkuRow().product, status: "DRAFT" } }),
		);

		const result = await validateSkuAndStock({ skuId: SKU_ID, quantity: 1 });

		expect(result.success).toBe(false);
		expect(result.error).toBe(CART_ERROR_MESSAGES.PRODUCT_NOT_PUBLIC);
	});

	it("should return error when out of stock (inventory 0)", async () => {
		mockFetchSkuForValidation.mockResolvedValue(createSkuRow({ inventory: 0 }));

		const result = await validateSkuAndStock({ skuId: SKU_ID, quantity: 1 });

		expect(result.success).toBe(false);
		expect(result.error).toBe(CART_ERROR_MESSAGES.OUT_OF_STOCK);
	});

	it("should return error when insufficient stock", async () => {
		mockFetchSkuForValidation.mockResolvedValue(createSkuRow({ inventory: 2 }));

		const result = await validateSkuAndStock({ skuId: SKU_ID, quantity: 5 });

		expect(result.success).toBe(false);
		expect(result.error).toBe(CART_ERROR_MESSAGES.INSUFFICIENT_STOCK);
	});

	it("should return Zod error on invalid skuId format", async () => {
		const result = await validateSkuAndStock({ skuId: "BAD-ID!", quantity: 1 });

		expect(result.success).toBe(false);
		expect(result.error).toBeDefined();
		expect(mockFetchSkuForValidation).not.toHaveBeenCalled();
	});

	it("should return Zod error on invalid quantity", async () => {
		const result = await validateSkuAndStock({ skuId: SKU_ID, quantity: 0 });

		expect(result.success).toBe(false);
		expect(result.error).toBeDefined();
		expect(mockFetchSkuForValidation).not.toHaveBeenCalled();
	});

	it("should return general error on unexpected exception", async () => {
		mockFetchSkuForValidation.mockRejectedValue(new Error("DB down"));

		const result = await validateSkuAndStock({ skuId: SKU_ID, quantity: 1 });

		expect(result.success).toBe(false);
		expect(result.error).toBe(CART_ERROR_MESSAGES.GENERAL_ERROR);
	});

	it("should handle SKU without optional fields (no color, material, size)", async () => {
		mockFetchSkuForValidation.mockResolvedValue(
			createSkuRow({ color: null, material: null, colorId: null, size: null }),
		);

		const result = await validateSkuAndStock({ skuId: SKU_ID, quantity: 1 });

		expect(result.success).toBe(true);
		expect(result.data?.sku.color).toBeUndefined();
		expect(result.data?.sku.material).toBeUndefined();
		expect(result.data?.sku.size).toBeUndefined();
		expect(result.data?.sku.colorId).toBeUndefined();
	});
});

// ============================================================================
// getSkuDetails
// ============================================================================

describe("getSkuDetails", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should return success with sku data", async () => {
		mockFetchSkuForDetails.mockResolvedValue(createSkuRow());

		const result = await getSkuDetails({ skuId: SKU_ID });

		expect(result.success).toBe(true);
		expect(result.data?.sku.id).toBe(SKU_ID);
		expect(result.data?.sku.product.slug).toBe("bracelet-lune");
	});

	it("should return error when SKU not found", async () => {
		mockFetchSkuForDetails.mockResolvedValue(null);

		const result = await getSkuDetails({ skuId: SKU_ID });

		expect(result.success).toBe(false);
		expect(result.error).toBe(CART_ERROR_MESSAGES.SKU_NOT_FOUND);
	});

	it("should return Zod error on invalid input", async () => {
		const result = await getSkuDetails({ skuId: "INVALID!" });

		expect(result.success).toBe(false);
		expect(result.error).toBeDefined();
		expect(mockFetchSkuForDetails).not.toHaveBeenCalled();
	});

	it("should return general error on unexpected exception", async () => {
		mockFetchSkuForDetails.mockRejectedValue(new Error("timeout"));

		const result = await getSkuDetails({ skuId: SKU_ID });

		expect(result.success).toBe(false);
		expect(result.error).toBe(CART_ERROR_MESSAGES.GENERAL_ERROR);
	});
});

// ============================================================================
// batchValidateSkusForMerge
// ============================================================================

describe("batchValidateSkusForMerge", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should return valid results for active, in-stock SKUs", async () => {
		const sku1 = createBatchSkuRow({ id: SKU_ID });
		mockFetchSkusForBatchValidation.mockResolvedValue([sku1]);

		const result = await batchValidateSkusForMerge([{ skuId: SKU_ID, quantity: 2 }]);

		const entry = result.get(SKU_ID);
		expect(entry?.isValid).toBe(true);
		expect(entry?.inventory).toBe(10);
	});

	it("should mark soft-deleted SKU as invalid", async () => {
		const sku = createBatchSkuRow({ id: SKU_ID, deletedAt: new Date() });
		mockFetchSkusForBatchValidation.mockResolvedValue([sku]);

		const result = await batchValidateSkusForMerge([{ skuId: SKU_ID, quantity: 1 }]);

		expect(result.get(SKU_ID)?.isValid).toBe(false);
	});

	it("should mark soft-deleted product as invalid", async () => {
		const sku = createBatchSkuRow({
			id: SKU_ID,
			product: { status: "PUBLIC", deletedAt: new Date() },
		});
		mockFetchSkusForBatchValidation.mockResolvedValue([sku]);

		const result = await batchValidateSkusForMerge([{ skuId: SKU_ID, quantity: 1 }]);

		expect(result.get(SKU_ID)?.isValid).toBe(false);
	});

	it("should mark inactive SKU as invalid", async () => {
		const sku = createBatchSkuRow({ id: SKU_ID, isActive: false });
		mockFetchSkusForBatchValidation.mockResolvedValue([sku]);

		const result = await batchValidateSkusForMerge([{ skuId: SKU_ID, quantity: 1 }]);

		expect(result.get(SKU_ID)?.isValid).toBe(false);
	});

	it("should mark non-PUBLIC product as invalid", async () => {
		const sku = createBatchSkuRow({
			id: SKU_ID,
			product: { status: "DRAFT", deletedAt: null },
		});
		mockFetchSkusForBatchValidation.mockResolvedValue([sku]);

		const result = await batchValidateSkusForMerge([{ skuId: SKU_ID, quantity: 1 }]);

		expect(result.get(SKU_ID)?.isValid).toBe(false);
	});

	it("should mark SKU with insufficient stock as invalid", async () => {
		const sku = createBatchSkuRow({ id: SKU_ID, inventory: 2 });
		mockFetchSkusForBatchValidation.mockResolvedValue([sku]);

		const result = await batchValidateSkusForMerge([{ skuId: SKU_ID, quantity: 5 }]);

		expect(result.get(SKU_ID)?.isValid).toBe(false);
	});

	it("should not include SKUs not returned by DB", async () => {
		mockFetchSkusForBatchValidation.mockResolvedValue([]);

		const result = await batchValidateSkusForMerge([{ skuId: SKU_ID, quantity: 1 }]);

		expect(result.has(SKU_ID)).toBe(false);
	});

	it("should handle multiple SKUs", async () => {
		const sku1 = createBatchSkuRow({ id: SKU_ID });
		const sku2 = createBatchSkuRow({ id: SKU_ID_2, isActive: false });
		mockFetchSkusForBatchValidation.mockResolvedValue([sku1, sku2]);

		const result = await batchValidateSkusForMerge([
			{ skuId: SKU_ID, quantity: 1 },
			{ skuId: SKU_ID_2, quantity: 1 },
		]);

		expect(result.get(SKU_ID)?.isValid).toBe(true);
		expect(result.get(SKU_ID_2)?.isValid).toBe(false);
	});
});

// ============================================================================
// validateCartItemsWithDb
// ============================================================================

describe("validateCartItemsWithDb", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should return success when all items are valid", async () => {
		const sku = createBatchSkuRow({ id: SKU_ID });
		mockFetchSkusForBatchValidation.mockResolvedValue([sku]);

		const result = await validateCartItemsWithDb({
			items: [{ skuId: SKU_ID, quantity: 1 }],
		});

		expect(result.success).toBe(true);
		expect(result.data?.[0]?.isValid).toBe(true);
	});

	it("should return error for SKU not found in batch results", async () => {
		mockFetchSkusForBatchValidation.mockResolvedValue([]);

		const result = await validateCartItemsWithDb({
			items: [{ skuId: SKU_ID, quantity: 1 }],
		});

		expect(result.success).toBe(false);
		expect(result.error).toBe(CART_ERROR_MESSAGES.VALIDATION_FAILED);
		expect(result.data?.[0]?.isValid).toBe(false);
		expect(result.data?.[0]?.error).toBe(CART_ERROR_MESSAGES.SKU_NOT_FOUND);
	});

	it("should return error for inactive SKU", async () => {
		const sku = createBatchSkuRow({ id: SKU_ID, isActive: false });
		mockFetchSkusForBatchValidation.mockResolvedValue([sku]);

		const result = await validateCartItemsWithDb({
			items: [{ skuId: SKU_ID, quantity: 1 }],
		});

		expect(result.success).toBe(false);
		expect(result.data?.[0]?.error).toBe(CART_ERROR_MESSAGES.SKU_INACTIVE);
	});

	it("should return error for non-PUBLIC product", async () => {
		const sku = createBatchSkuRow({
			id: SKU_ID,
			product: { status: "ARCHIVED", deletedAt: null },
		});
		mockFetchSkusForBatchValidation.mockResolvedValue([sku]);

		const result = await validateCartItemsWithDb({
			items: [{ skuId: SKU_ID, quantity: 1 }],
		});

		expect(result.data?.[0]?.error).toBe(CART_ERROR_MESSAGES.PRODUCT_NOT_PUBLIC);
	});

	it("should return error for out of stock (inventory 0)", async () => {
		const sku = createBatchSkuRow({ id: SKU_ID, inventory: 0 });
		mockFetchSkusForBatchValidation.mockResolvedValue([sku]);

		const result = await validateCartItemsWithDb({
			items: [{ skuId: SKU_ID, quantity: 1 }],
		});

		expect(result.data?.[0]?.error).toBe(CART_ERROR_MESSAGES.OUT_OF_STOCK);
	});

	it("should return error for insufficient stock", async () => {
		const sku = createBatchSkuRow({ id: SKU_ID, inventory: 3 });
		mockFetchSkusForBatchValidation.mockResolvedValue([sku]);

		const result = await validateCartItemsWithDb({
			items: [{ skuId: SKU_ID, quantity: 5 }],
		});

		expect(result.data?.[0]?.error).toBe(CART_ERROR_MESSAGES.INSUFFICIENT_STOCK);
	});

	it("should return mixed results for multiple items", async () => {
		const sku1 = createBatchSkuRow({ id: SKU_ID });
		const sku2 = createBatchSkuRow({ id: SKU_ID_2, inventory: 0 });
		mockFetchSkusForBatchValidation.mockResolvedValue([sku1, sku2]);

		const result = await validateCartItemsWithDb({
			items: [
				{ skuId: SKU_ID, quantity: 1 },
				{ skuId: SKU_ID_2, quantity: 1 },
			],
		});

		expect(result.success).toBe(false);
		expect(result.error).toBe(CART_ERROR_MESSAGES.VALIDATION_FAILED);
		expect(result.data?.[0]?.isValid).toBe(true);
		expect(result.data?.[1]?.isValid).toBe(false);
	});

	it("should return general error on unexpected exception", async () => {
		mockFetchSkusForBatchValidation.mockRejectedValue(new Error("connection lost"));

		const result = await validateCartItemsWithDb({
			items: [{ skuId: SKU_ID, quantity: 1 }],
		});

		expect(result.success).toBe(false);
		expect(result.error).toBe(CART_ERROR_MESSAGES.GENERAL_ERROR);
		expect(result.data).toBeUndefined();
	});
});
