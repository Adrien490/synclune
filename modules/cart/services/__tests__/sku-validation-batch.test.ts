import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockFetchSkusForBatchValidation } = vi.hoisted(() => ({
	mockFetchSkusForBatchValidation: vi.fn(),
}));

vi.mock("@/modules/cart/data/get-sku-for-validation", () => ({
	fetchSkuForValidation: vi.fn(),
	fetchSkuForDetails: vi.fn(),
	fetchSkusForBatchValidation: mockFetchSkusForBatchValidation,
}));

vi.mock("@/modules/cart/schemas/cart.schemas", () => ({
	validateSkuSchema: {
		parse: vi.fn((input: unknown) => input),
	},
	getSkuDetailsSchema: {
		parse: vi.fn((input: unknown) => input),
	},
}));

vi.mock("@/modules/cart/constants/error-messages", () => ({
	CART_ERROR_MESSAGES: {
		SKU_NOT_FOUND: "Produit introuvable",
		SKU_INACTIVE: "Ce produit n'est plus disponible",
		PRODUCT_NOT_PUBLIC: "Ce produit n'est pas disponible à la vente",
		OUT_OF_STOCK: "Cet article n'est plus en stock",
		INSUFFICIENT_STOCK: (_available: number) => "Ce produit n'est plus disponible pour le moment",
		VALIDATION_FAILED: "Certains articles de votre panier ne sont plus disponibles",
		GENERAL_ERROR: "Une erreur est survenue lors de l'opération",
		INVALID_DATA: "Données invalides",
	},
}));

vi.mock("@/modules/cart/constants/cart", () => ({
	MAX_QUANTITY_PER_ORDER: 10,
}));

import { batchValidateSkusForMerge, validateCartItemsWithDb } from "../sku-validation.service";

// ============================================================================
// Helpers
// ============================================================================

function makeSku(overrides: Record<string, unknown> = {}) {
	return {
		id: "sku-1",
		inventory: 10,
		isActive: true,
		deletedAt: null,
		product: { status: "PUBLIC", deletedAt: null },
		...overrides,
	};
}

// ============================================================================
// batchValidateSkusForMerge — Cart merge scenarios
// ============================================================================

describe("batchValidateSkusForMerge", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should validate all SKUs in a single batch query", async () => {
		mockFetchSkusForBatchValidation.mockResolvedValue([
			makeSku({ id: "sku-1", inventory: 10 }),
			makeSku({ id: "sku-2", inventory: 5 }),
		]);

		const result = await batchValidateSkusForMerge([
			{ skuId: "sku-1", quantity: 2 },
			{ skuId: "sku-2", quantity: 1 },
		]);

		expect(result.size).toBe(2);
		expect(result.get("sku-1")?.isValid).toBe(true);
		expect(result.get("sku-2")?.isValid).toBe(true);
		expect(mockFetchSkusForBatchValidation).toHaveBeenCalledWith(["sku-1", "sku-2"]);
	});

	it("should mark SKU as invalid when quantity exceeds inventory", async () => {
		mockFetchSkusForBatchValidation.mockResolvedValue([makeSku({ id: "sku-1", inventory: 3 })]);

		const result = await batchValidateSkusForMerge([{ skuId: "sku-1", quantity: 5 }]);

		expect(result.get("sku-1")?.isValid).toBe(false);
		expect(result.get("sku-1")?.inventory).toBe(3);
	});

	it("should mark SKU as invalid when SKU is soft-deleted", async () => {
		mockFetchSkusForBatchValidation.mockResolvedValue([
			makeSku({ id: "sku-1", deletedAt: new Date() }),
		]);

		const result = await batchValidateSkusForMerge([{ skuId: "sku-1", quantity: 1 }]);

		expect(result.get("sku-1")?.isValid).toBe(false);
	});

	it("should mark SKU as invalid when product is soft-deleted", async () => {
		mockFetchSkusForBatchValidation.mockResolvedValue([
			makeSku({ id: "sku-1", product: { status: "PUBLIC", deletedAt: new Date() } }),
		]);

		const result = await batchValidateSkusForMerge([{ skuId: "sku-1", quantity: 1 }]);

		expect(result.get("sku-1")?.isValid).toBe(false);
	});

	it("should mark SKU as invalid when inactive", async () => {
		mockFetchSkusForBatchValidation.mockResolvedValue([makeSku({ id: "sku-1", isActive: false })]);

		const result = await batchValidateSkusForMerge([{ skuId: "sku-1", quantity: 1 }]);

		expect(result.get("sku-1")?.isValid).toBe(false);
	});

	it("should mark SKU as invalid when product is not PUBLIC", async () => {
		mockFetchSkusForBatchValidation.mockResolvedValue([
			makeSku({ id: "sku-1", product: { status: "DRAFT", deletedAt: null } }),
		]);

		const result = await batchValidateSkusForMerge([{ skuId: "sku-1", quantity: 1 }]);

		expect(result.get("sku-1")?.isValid).toBe(false);
	});

	it("should return empty map when no SKUs found in DB", async () => {
		mockFetchSkusForBatchValidation.mockResolvedValue([]);

		const result = await batchValidateSkusForMerge([{ skuId: "sku-missing", quantity: 1 }]);

		// SKU not in results = not in map
		expect(result.size).toBe(0);
		expect(result.get("sku-missing")).toBeUndefined();
	});

	it("should validate exact stock boundary (quantity === inventory)", async () => {
		mockFetchSkusForBatchValidation.mockResolvedValue([makeSku({ id: "sku-1", inventory: 3 })]);

		const result = await batchValidateSkusForMerge([{ skuId: "sku-1", quantity: 3 }]);

		expect(result.get("sku-1")?.isValid).toBe(true);
	});
});

// ============================================================================
// validateCartItemsWithDb — Full cart validation
// ============================================================================

describe("validateCartItemsWithDb — merge edge cases", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should return success when all items are valid", async () => {
		mockFetchSkusForBatchValidation.mockResolvedValue([
			makeSku({ id: "sku-1", inventory: 10 }),
			makeSku({ id: "sku-2", inventory: 5 }),
		]);

		const result = await validateCartItemsWithDb({
			items: [
				{ skuId: "sku-1", quantity: 2 },
				{ skuId: "sku-2", quantity: 1 },
			],
		});

		expect(result.success).toBe(true);
		expect(result.data).toHaveLength(2);
		expect(result.data?.every((d) => d.isValid)).toBe(true);
	});

	it("should return failure when SKU not found in DB (guest cart has deleted item)", async () => {
		mockFetchSkusForBatchValidation.mockResolvedValue([
			makeSku({ id: "sku-1", inventory: 10 }),
			// sku-deleted not returned = not found
		]);

		const result = await validateCartItemsWithDb({
			items: [
				{ skuId: "sku-1", quantity: 1 },
				{ skuId: "sku-deleted", quantity: 1 },
			],
		});

		expect(result.success).toBe(false);
		expect(result.error).toBe("Certains articles de votre panier ne sont plus disponibles");
		expect(result.data?.[0]!.isValid).toBe(true);
		expect(result.data?.[1]!.isValid).toBe(false);
		expect(result.data?.[1]!.error).toBe("Produit introuvable");
	});

	it("should report insufficient stock for specific items", async () => {
		mockFetchSkusForBatchValidation.mockResolvedValue([
			makeSku({ id: "sku-1", inventory: 10 }),
			makeSku({ id: "sku-2", inventory: 1 }),
		]);

		const result = await validateCartItemsWithDb({
			items: [
				{ skuId: "sku-1", quantity: 2 },
				{ skuId: "sku-2", quantity: 5 },
			],
		});

		expect(result.success).toBe(false);
		expect(result.data?.[0]!.isValid).toBe(true);
		expect(result.data?.[1]!.isValid).toBe(false);
		expect(result.data?.[1]!.availableStock).toBe(1);
	});

	it("should report out of stock for items with zero inventory", async () => {
		mockFetchSkusForBatchValidation.mockResolvedValue([makeSku({ id: "sku-1", inventory: 0 })]);

		const result = await validateCartItemsWithDb({
			items: [{ skuId: "sku-1", quantity: 1 }],
		});

		expect(result.success).toBe(false);
		expect(result.data?.[0]!.isValid).toBe(false);
		expect(result.data?.[0]!.error).toBe("Cet article n'est plus en stock");
		expect(result.data?.[0]!.availableStock).toBe(0);
	});

	it("should report inactive SKUs from guest cart", async () => {
		mockFetchSkusForBatchValidation.mockResolvedValue([
			makeSku({ id: "sku-1", isActive: false, inventory: 5 }),
		]);

		const result = await validateCartItemsWithDb({
			items: [{ skuId: "sku-1", quantity: 1 }],
		});

		expect(result.success).toBe(false);
		expect(result.data?.[0]!.isValid).toBe(false);
		expect(result.data?.[0]!.error).toBe("Ce produit n'est plus disponible");
	});

	it("should return general error when batch validation throws", async () => {
		mockFetchSkusForBatchValidation.mockRejectedValue(new Error("DB connection failed"));

		const result = await validateCartItemsWithDb({
			items: [{ skuId: "sku-1", quantity: 1 }],
		});

		expect(result.success).toBe(false);
		expect(result.error).toBe("Une erreur est survenue lors de l'opération");
		expect(result.data).toBeUndefined();
	});
});
