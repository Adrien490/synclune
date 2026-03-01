import { describe, it, expect, vi } from "vitest";

// Mock media validation to control allowed domains in tests
vi.mock("@/shared/lib/media-validation", () => ({
	isAllowedMediaDomain: (url: string) => {
		return url.includes("utfs.io") || url.includes("ufs.sh") || url.includes("synclune.fr");
	},
}));

import {
	getProductSkuSchema,
	createProductSkuSchema,
	deleteProductSkuSchema,
	updateProductSkuStatusSchema,
	updateProductSkuSchema,
	adjustSkuStockSchema,
	updateSkuPriceSchema,
	bulkActivateSkusSchema,
	bulkDeactivateSkusSchema,
	bulkDeleteSkusSchema,
	bulkAdjustStockSchema,
	bulkUpdatePriceSchema,
} from "../sku.schemas";

// ============================================================================
// Helpers
// ============================================================================

const VALID_CUID = "clh1z2x3y4w5v6u7t8s9r0q1p";
const VALID_PRODUCT_URL = "https://utfs.io/f/test-image.jpg";

/** A minimal valid primaryImage for SKU schemas */
const validPrimaryImage = {
	url: VALID_PRODUCT_URL,
	mediaType: "IMAGE" as const,
};

/** A valid JSON array of cuid2 IDs for bulk schemas */
const validIdsJson = JSON.stringify([VALID_CUID]);

// ============================================================================
// getProductSkuSchema
// ============================================================================

describe("getProductSkuSchema", () => {
	it("should accept a non-empty sku string", () => {
		const result = getProductSkuSchema.safeParse({ sku: "SKU-001" });
		expect(result.success).toBe(true);
	});

	it("should trim whitespace from sku", () => {
		const result = getProductSkuSchema.safeParse({ sku: "  SKU-001  " });
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.sku).toBe("SKU-001");
		}
	});

	it("should reject an empty sku string", () => {
		const result = getProductSkuSchema.safeParse({ sku: "" });
		expect(result.success).toBe(false);
	});

	it("should reject when sku is missing", () => {
		const result = getProductSkuSchema.safeParse({});
		expect(result.success).toBe(false);
	});
});

// ============================================================================
// createProductSkuSchema
// ============================================================================

describe("createProductSkuSchema", () => {
	const validInput = {
		productId: VALID_CUID,
		priceInclTaxEuros: 49.99,
		primaryImage: validPrimaryImage,
	};

	it("should accept valid create SKU data", () => {
		const result = createProductSkuSchema.safeParse(validInput);
		expect(result.success).toBe(true);
	});

	it("should reject when productId is missing", () => {
		const { productId: _p, ...withoutProductId } = validInput;
		const result = createProductSkuSchema.safeParse(withoutProductId);
		expect(result.success).toBe(false);
	});

	it("should reject a non-cuid2 productId", () => {
		const result = createProductSkuSchema.safeParse({ ...validInput, productId: "bad-id" });
		expect(result.success).toBe(false);
	});

	it("should reject when priceInclTaxEuros is missing", () => {
		const { priceInclTaxEuros: _p, ...withoutPrice } = validInput;
		const result = createProductSkuSchema.safeParse(withoutPrice);
		expect(result.success).toBe(false);
	});

	it("should coerce string price to number", () => {
		const result = createProductSkuSchema.safeParse({ ...validInput, priceInclTaxEuros: "49.99" });
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.priceInclTaxEuros).toBe(49.99);
		}
	});

	it("should reject a negative price", () => {
		const result = createProductSkuSchema.safeParse({ ...validInput, priceInclTaxEuros: -10 });
		expect(result.success).toBe(false);
	});

	it("should reject zero price", () => {
		const result = createProductSkuSchema.safeParse({ ...validInput, priceInclTaxEuros: 0 });
		expect(result.success).toBe(false);
	});

	it("should default inventory to 0 when not provided", () => {
		const result = createProductSkuSchema.safeParse(validInput);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.inventory).toBe(0);
		}
	});

	it("should coerce string inventory to integer", () => {
		const result = createProductSkuSchema.safeParse({ ...validInput, inventory: "5" });
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.inventory).toBe(5);
		}
	});

	it("should reject negative inventory", () => {
		const result = createProductSkuSchema.safeParse({ ...validInput, inventory: -1 });
		expect(result.success).toBe(false);
	});

	it("should default isActive to true when not provided", () => {
		const result = createProductSkuSchema.safeParse(validInput);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.isActive).toBe(true);
		}
	});

	it("should coerce boolean false for isActive", () => {
		const result = createProductSkuSchema.safeParse({ ...validInput, isActive: false });
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.isActive).toBe(false);
		}
	});

	it("should accept optional sku string", () => {
		const result = createProductSkuSchema.safeParse({ ...validInput, sku: "MY-SKU-001" });
		expect(result.success).toBe(true);
	});

	it("should accept empty sku string (treated as no sku)", () => {
		const result = createProductSkuSchema.safeParse({ ...validInput, sku: "" });
		expect(result.success).toBe(true);
	});

	it("should accept optional colorId", () => {
		const result = createProductSkuSchema.safeParse({ ...validInput, colorId: VALID_CUID });
		expect(result.success).toBe(true);
	});

	it("should accept optional size within 50 character limit", () => {
		const result = createProductSkuSchema.safeParse({ ...validInput, size: "Large" });
		expect(result.success).toBe(true);
	});

	it("should reject size exceeding 50 characters", () => {
		const result = createProductSkuSchema.safeParse({ ...validInput, size: "A".repeat(51) });
		expect(result.success).toBe(false);
	});

	it("should reject primaryImage with video URL when mediaType is VIDEO (cross-field refinement)", () => {
		const result = createProductSkuSchema.safeParse({
			...validInput,
			primaryImage: {
				url: "https://utfs.io/f/test-video.mp4",
				mediaType: "VIDEO",
			},
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			const paths = result.error.issues.map((i) => i.path.join("."));
			expect(paths.some((p) => p.includes("primaryImage"))).toBe(true);
		}
	});

	it("should reject primaryImage URL from unauthorized domain", () => {
		const result = createProductSkuSchema.safeParse({
			...validInput,
			primaryImage: {
				url: "https://evil.com/image.jpg",
				mediaType: "IMAGE",
			},
		});
		expect(result.success).toBe(false);
	});

	it("should accept no primaryImage (it is optional)", () => {
		const { primaryImage: _pi, ...withoutPrimaryImage } = validInput;
		const result = createProductSkuSchema.safeParse(withoutPrimaryImage);
		expect(result.success).toBe(true);
	});

	it("should reject compareAtPrice less than price (cross-field refinement)", () => {
		const result = createProductSkuSchema.safeParse({
			...validInput,
			priceInclTaxEuros: 100,
			compareAtPriceEuros: 50,
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			const paths = result.error.issues.map((i) => i.path.join("."));
			expect(paths.some((p) => p.includes("compareAtPriceEuros"))).toBe(true);
		}
	});

	it("should accept compareAtPrice equal to price", () => {
		const result = createProductSkuSchema.safeParse({
			...validInput,
			priceInclTaxEuros: 100,
			compareAtPriceEuros: 100,
		});
		expect(result.success).toBe(true);
	});

	it("should transform empty compareAtPriceEuros string to undefined", () => {
		const result = createProductSkuSchema.safeParse({
			...validInput,
			compareAtPriceEuros: "",
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.compareAtPriceEuros).toBeUndefined();
		}
	});
});

// ============================================================================
// deleteProductSkuSchema
// ============================================================================

describe("deleteProductSkuSchema", () => {
	it("should accept a valid cuid2 skuId", () => {
		const result = deleteProductSkuSchema.safeParse({ skuId: VALID_CUID });
		expect(result.success).toBe(true);
	});

	it("should reject a non-cuid2 skuId", () => {
		const result = deleteProductSkuSchema.safeParse({ skuId: "not-a-cuid" });
		expect(result.success).toBe(false);
	});

	it("should reject an empty skuId", () => {
		const result = deleteProductSkuSchema.safeParse({ skuId: "" });
		expect(result.success).toBe(false);
	});

	it("should reject when skuId is missing", () => {
		const result = deleteProductSkuSchema.safeParse({});
		expect(result.success).toBe(false);
	});
});

// ============================================================================
// updateProductSkuStatusSchema
// ============================================================================

describe("updateProductSkuStatusSchema", () => {
	it("should accept valid skuId and isActive true", () => {
		const result = updateProductSkuStatusSchema.safeParse({ skuId: VALID_CUID, isActive: true });
		expect(result.success).toBe(true);
	});

	it("should accept valid skuId and isActive false", () => {
		const result = updateProductSkuStatusSchema.safeParse({ skuId: VALID_CUID, isActive: false });
		expect(result.success).toBe(true);
	});

	it("should reject when isActive is missing", () => {
		const result = updateProductSkuStatusSchema.safeParse({ skuId: VALID_CUID });
		expect(result.success).toBe(false);
	});

	it("should reject when skuId is missing", () => {
		const result = updateProductSkuStatusSchema.safeParse({ isActive: true });
		expect(result.success).toBe(false);
	});
});

// ============================================================================
// adjustSkuStockSchema
// ============================================================================

describe("adjustSkuStockSchema", () => {
	it("should accept a positive adjustment", () => {
		const result = adjustSkuStockSchema.safeParse({ skuId: VALID_CUID, adjustment: 10 });
		expect(result.success).toBe(true);
	});

	it("should accept a negative adjustment (stock removal)", () => {
		const result = adjustSkuStockSchema.safeParse({ skuId: VALID_CUID, adjustment: -5 });
		expect(result.success).toBe(true);
	});

	it("should accept a zero adjustment", () => {
		const result = adjustSkuStockSchema.safeParse({ skuId: VALID_CUID, adjustment: 0 });
		expect(result.success).toBe(true);
	});

	it("should accept optional reason when provided", () => {
		const result = adjustSkuStockSchema.safeParse({
			skuId: VALID_CUID,
			adjustment: 5,
			reason: "Restock recu",
		});
		expect(result.success).toBe(true);
	});

	it("should succeed without reason (it is optional)", () => {
		const result = adjustSkuStockSchema.safeParse({ skuId: VALID_CUID, adjustment: 5 });
		expect(result.success).toBe(true);
	});

	it("should reject when skuId is missing", () => {
		const result = adjustSkuStockSchema.safeParse({ adjustment: 5 });
		expect(result.success).toBe(false);
	});

	it("should reject when adjustment is missing", () => {
		const result = adjustSkuStockSchema.safeParse({ skuId: VALID_CUID });
		expect(result.success).toBe(false);
	});

	it("should reject a non-cuid2 skuId", () => {
		const result = adjustSkuStockSchema.safeParse({ skuId: "bad-id", adjustment: 5 });
		expect(result.success).toBe(false);
	});

	it("should reject a non-integer adjustment", () => {
		const result = adjustSkuStockSchema.safeParse({ skuId: VALID_CUID, adjustment: 2.5 });
		expect(result.success).toBe(false);
	});
});

// ============================================================================
// updateSkuPriceSchema
// ============================================================================

describe("updateSkuPriceSchema", () => {
	it("should accept valid price update data", () => {
		const result = updateSkuPriceSchema.safeParse({
			skuId: VALID_CUID,
			priceInclTaxEuros: 49.99,
		});
		expect(result.success).toBe(true);
	});

	it("should coerce string price to number", () => {
		const result = updateSkuPriceSchema.safeParse({
			skuId: VALID_CUID,
			priceInclTaxEuros: "49.99",
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.priceInclTaxEuros).toBe(49.99);
		}
	});

	it("should reject a negative price", () => {
		const result = updateSkuPriceSchema.safeParse({
			skuId: VALID_CUID,
			priceInclTaxEuros: -10,
		});
		expect(result.success).toBe(false);
	});

	it("should reject zero price", () => {
		const result = updateSkuPriceSchema.safeParse({
			skuId: VALID_CUID,
			priceInclTaxEuros: 0,
		});
		expect(result.success).toBe(false);
	});

	it("should accept optional compareAtPriceEuros", () => {
		const result = updateSkuPriceSchema.safeParse({
			skuId: VALID_CUID,
			priceInclTaxEuros: 49.99,
			compareAtPriceEuros: 59.99,
		});
		expect(result.success).toBe(true);
	});

	it("should succeed without compareAtPriceEuros (it is optional)", () => {
		const result = updateSkuPriceSchema.safeParse({
			skuId: VALID_CUID,
			priceInclTaxEuros: 49.99,
		});
		expect(result.success).toBe(true);
	});

	it("should transform empty compareAtPriceEuros string to undefined", () => {
		const result = updateSkuPriceSchema.safeParse({
			skuId: VALID_CUID,
			priceInclTaxEuros: 49.99,
			compareAtPriceEuros: "",
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.compareAtPriceEuros).toBeUndefined();
		}
	});

	it("should reject when priceInclTaxEuros is missing", () => {
		const result = updateSkuPriceSchema.safeParse({ skuId: VALID_CUID });
		expect(result.success).toBe(false);
	});

	it("should reject when skuId is missing", () => {
		const result = updateSkuPriceSchema.safeParse({ priceInclTaxEuros: 49.99 });
		expect(result.success).toBe(false);
	});
});

// ============================================================================
// bulkActivateSkusSchema / bulkDeactivateSkusSchema / bulkDeleteSkusSchema
// ============================================================================

describe("bulkActivateSkusSchema", () => {
	it("should accept a valid JSON array of cuid2 ids", () => {
		const result = bulkActivateSkusSchema.safeParse({ ids: validIdsJson });
		expect(result.success).toBe(true);
	});

	it("should reject invalid JSON", () => {
		const result = bulkActivateSkusSchema.safeParse({ ids: "not-json" });
		expect(result.success).toBe(false);
	});

	it("should reject JSON that is not an array", () => {
		const result = bulkActivateSkusSchema.safeParse({ ids: JSON.stringify({ id: VALID_CUID }) });
		expect(result.success).toBe(false);
	});

	it("should reject array with invalid cuid2 format", () => {
		const result = bulkActivateSkusSchema.safeParse({ ids: JSON.stringify(["not-a-cuid"]) });
		expect(result.success).toBe(false);
	});

	it("should reject when ids is missing", () => {
		const result = bulkActivateSkusSchema.safeParse({});
		expect(result.success).toBe(false);
	});
});

describe("bulkDeactivateSkusSchema", () => {
	it("should accept a valid JSON array of cuid2 ids", () => {
		const result = bulkDeactivateSkusSchema.safeParse({ ids: validIdsJson });
		expect(result.success).toBe(true);
	});

	it("should reject invalid JSON string", () => {
		const result = bulkDeactivateSkusSchema.safeParse({ ids: "{{invalid}}" });
		expect(result.success).toBe(false);
	});
});

describe("bulkDeleteSkusSchema", () => {
	it("should accept a valid JSON array of cuid2 ids", () => {
		const result = bulkDeleteSkusSchema.safeParse({ ids: validIdsJson });
		expect(result.success).toBe(true);
	});
});

// ============================================================================
// bulkAdjustStockSchema
// ============================================================================

describe("bulkAdjustStockSchema", () => {
	it("should accept valid bulk stock adjustment with relative mode", () => {
		const result = bulkAdjustStockSchema.safeParse({
			ids: validIdsJson,
			mode: "relative",
			value: 5,
		});
		expect(result.success).toBe(true);
	});

	it("should accept valid bulk stock adjustment with absolute mode", () => {
		const result = bulkAdjustStockSchema.safeParse({
			ids: validIdsJson,
			mode: "absolute",
			value: 100,
		});
		expect(result.success).toBe(true);
	});

	it("should coerce string value to number", () => {
		const result = bulkAdjustStockSchema.safeParse({
			ids: validIdsJson,
			mode: "relative",
			value: "10",
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.value).toBe(10);
		}
	});

	it("should reject invalid mode", () => {
		const result = bulkAdjustStockSchema.safeParse({
			ids: validIdsJson,
			mode: "unknown",
			value: 5,
		});
		expect(result.success).toBe(false);
	});

	it("should reject when mode is missing", () => {
		const result = bulkAdjustStockSchema.safeParse({ ids: validIdsJson, value: 5 });
		expect(result.success).toBe(false);
	});

	it("should reject when value is missing", () => {
		const result = bulkAdjustStockSchema.safeParse({ ids: validIdsJson, mode: "relative" });
		expect(result.success).toBe(false);
	});
});

// ============================================================================
// bulkUpdatePriceSchema
// ============================================================================

describe("bulkUpdatePriceSchema", () => {
	it("should accept valid bulk price update with percentage mode", () => {
		const result = bulkUpdatePriceSchema.safeParse({
			ids: validIdsJson,
			mode: "percentage",
			value: 10,
		});
		expect(result.success).toBe(true);
	});

	it("should accept valid bulk price update with absolute mode", () => {
		const result = bulkUpdatePriceSchema.safeParse({
			ids: validIdsJson,
			mode: "absolute",
			value: 49.99,
		});
		expect(result.success).toBe(true);
	});

	it("should default updateCompareAtPrice to false", () => {
		const result = bulkUpdatePriceSchema.safeParse({
			ids: validIdsJson,
			mode: "percentage",
			value: 10,
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.updateCompareAtPrice).toBe(false);
		}
	});

	it("should coerce string updateCompareAtPrice to boolean", () => {
		const result = bulkUpdatePriceSchema.safeParse({
			ids: validIdsJson,
			mode: "percentage",
			value: 10,
			updateCompareAtPrice: "true",
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.updateCompareAtPrice).toBe(true);
		}
	});

	it("should reject invalid mode", () => {
		const result = bulkUpdatePriceSchema.safeParse({
			ids: validIdsJson,
			mode: "fixed",
			value: 10,
		});
		expect(result.success).toBe(false);
	});

	it("should reject when ids is missing", () => {
		const result = bulkUpdatePriceSchema.safeParse({ mode: "percentage", value: 10 });
		expect(result.success).toBe(false);
	});
});

// ============================================================================
// updateProductSkuSchema
// ============================================================================

describe("updateProductSkuSchema", () => {
	const validInput = {
		skuId: VALID_CUID,
		priceInclTaxEuros: 79.99,
		primaryImage: validPrimaryImage,
	};

	it("should accept valid update SKU data", () => {
		const result = updateProductSkuSchema.safeParse(validInput);
		expect(result.success).toBe(true);
	});

	it("should reject when skuId is missing", () => {
		const { skuId: _s, ...withoutSkuId } = validInput;
		const result = updateProductSkuSchema.safeParse(withoutSkuId);
		expect(result.success).toBe(false);
	});

	it("should reject when priceInclTaxEuros is missing", () => {
		const { priceInclTaxEuros: _p, ...withoutPrice } = validInput;
		const result = updateProductSkuSchema.safeParse(withoutPrice);
		expect(result.success).toBe(false);
	});

	it("should reject compareAtPrice less than price (cross-field refinement)", () => {
		const result = updateProductSkuSchema.safeParse({
			...validInput,
			priceInclTaxEuros: 100,
			compareAtPriceEuros: 80,
		});
		expect(result.success).toBe(false);
	});

	it("should reject video as primary image (cross-field refinement)", () => {
		const result = updateProductSkuSchema.safeParse({
			...validInput,
			primaryImage: {
				url: "https://utfs.io/f/test.mp4",
				mediaType: "VIDEO",
			},
		});
		expect(result.success).toBe(false);
	});
});
