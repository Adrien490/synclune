import { describe, it, expect, vi } from "vitest";

// Mock Prisma client enums
vi.mock("@/app/generated/prisma/client", () => ({
	ProductStatus: {
		DRAFT: "DRAFT",
		PUBLIC: "PUBLIC",
		ARCHIVED: "ARCHIVED",
	},
}));

// Mock media validation to control allowed domains in tests
vi.mock("@/shared/lib/media-validation", () => ({
	isAllowedMediaDomain: (url: string) => {
		return url.includes("utfs.io") || url.includes("ufs.sh") || url.includes("synclune.fr");
	},
	ALLOWED_MEDIA_DOMAINS: ["utfs.io", "ufs.sh", "synclune.fr"],
}));

import {
	getProductSchema,
	createProductSchema,
	deleteProductSchema,
	toggleProductStatusSchema,
	productFiltersSchema,
	bulkDeleteProductsSchema,
	bulkArchiveProductsSchema,
} from "../product.schemas";

// A valid cuid2 for test usage
const VALID_CUID = "clh1z2x3y4w5v6u7t8s9r0q1p";

// A valid UploadThing image URL
const VALID_IMAGE_URL = "https://utfs.io/f/test-image.jpg";

// ============================================================================
// getProductSchema
// ============================================================================

describe("getProductSchema", () => {
	it("should accept a valid slug", () => {
		const result = getProductSchema.safeParse({ slug: "bague-or-rose" });
		expect(result.success).toBe(true);
	});

	it("should accept a simple slug without hyphens", () => {
		const result = getProductSchema.safeParse({ slug: "collier" });
		expect(result.success).toBe(true);
	});

	it("should accept alphanumeric slug with hyphens", () => {
		const result = getProductSchema.safeParse({ slug: "bague-or-18k-diamant" });
		expect(result.success).toBe(true);
	});

	it("should reject an empty slug", () => {
		const result = getProductSchema.safeParse({ slug: "" });
		expect(result.success).toBe(false);
	});

	it("should reject a slug with uppercase letters", () => {
		const result = getProductSchema.safeParse({ slug: "Bague-Or" });
		expect(result.success).toBe(false);
	});

	it("should reject a slug with spaces", () => {
		const result = getProductSchema.safeParse({ slug: "bague or rose" });
		expect(result.success).toBe(false);
	});

	it("should reject a slug with special characters", () => {
		const result = getProductSchema.safeParse({ slug: "bague_or" });
		expect(result.success).toBe(false);
	});

	it("should reject a slug with leading hyphen", () => {
		const result = getProductSchema.safeParse({ slug: "-bague" });
		expect(result.success).toBe(false);
	});

	it("should default includeDraft to false when omitted", () => {
		const result = getProductSchema.safeParse({ slug: "collier" });
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.includeDraft).toBe(false);
		}
	});

	it("should accept includeDraft: true explicitly", () => {
		const result = getProductSchema.safeParse({ slug: "collier", includeDraft: true });
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.includeDraft).toBe(true);
		}
	});

	it("should reject when slug is missing", () => {
		const result = getProductSchema.safeParse({});
		expect(result.success).toBe(false);
	});
});

// ============================================================================
// deleteProductSchema
// ============================================================================

describe("deleteProductSchema", () => {
	it("should accept a valid cuid2 productId", () => {
		const result = deleteProductSchema.safeParse({ productId: VALID_CUID });
		expect(result.success).toBe(true);
	});

	it("should reject a non-cuid2 string", () => {
		const result = deleteProductSchema.safeParse({ productId: "not-a-cuid" });
		expect(result.success).toBe(false);
	});

	it("should reject an empty productId", () => {
		const result = deleteProductSchema.safeParse({ productId: "" });
		expect(result.success).toBe(false);
	});

	it("should reject when productId is missing", () => {
		const result = deleteProductSchema.safeParse({});
		expect(result.success).toBe(false);
	});
});

// ============================================================================
// toggleProductStatusSchema
// ============================================================================

describe("toggleProductStatusSchema", () => {
	it("should accept valid productId and currentStatus", () => {
		const result = toggleProductStatusSchema.safeParse({
			productId: VALID_CUID,
			currentStatus: "DRAFT",
		});
		expect(result.success).toBe(true);
	});

	it("should accept all valid currentStatus values", () => {
		for (const status of ["DRAFT", "PUBLIC", "ARCHIVED"] as const) {
			const result = toggleProductStatusSchema.safeParse({
				productId: VALID_CUID,
				currentStatus: status,
			});
			expect(result.success).toBe(true);
		}
	});

	it("should reject an invalid currentStatus", () => {
		const result = toggleProductStatusSchema.safeParse({
			productId: VALID_CUID,
			currentStatus: "INVALID",
		});
		expect(result.success).toBe(false);
	});

	it("should accept optional targetStatus when provided", () => {
		const result = toggleProductStatusSchema.safeParse({
			productId: VALID_CUID,
			currentStatus: "DRAFT",
			targetStatus: "PUBLIC",
		});
		expect(result.success).toBe(true);
	});

	it("should succeed without targetStatus (it is optional)", () => {
		const result = toggleProductStatusSchema.safeParse({
			productId: VALID_CUID,
			currentStatus: "PUBLIC",
		});
		expect(result.success).toBe(true);
	});

	it("should reject when productId is missing", () => {
		const result = toggleProductStatusSchema.safeParse({
			currentStatus: "DRAFT",
		});
		expect(result.success).toBe(false);
	});
});

// ============================================================================
// createProductSchema
// ============================================================================

describe("createProductSchema", () => {
	const validInput = {
		title: "Bague en or rose",
		description: "Une magnifique bague",
		status: "DRAFT",
		initialSku: {
			priceInclTaxEuros: 99.99,
			inventory: 10,
			isActive: true,
			media: [
				{
					url: VALID_IMAGE_URL,
					mediaType: "IMAGE",
				},
			],
		},
	};

	it("should accept valid product creation data", () => {
		const result = createProductSchema.safeParse(validInput);
		expect(result.success).toBe(true);
	});

	it("should default status to DRAFT when not provided", () => {
		const { status: _s, ...withoutStatus } = validInput;
		const result = createProductSchema.safeParse(withoutStatus);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.status).toBe("DRAFT");
		}
	});

	it("should accept all valid status values", () => {
		for (const status of ["DRAFT", "PUBLIC", "ARCHIVED"] as const) {
			const result = createProductSchema.safeParse({ ...validInput, status });
			expect(result.success).toBe(true);
		}
	});

	it("should reject when title is missing", () => {
		const { title: _t, ...withoutTitle } = validInput;
		const result = createProductSchema.safeParse(withoutTitle);
		expect(result.success).toBe(false);
	});

	it("should reject a title shorter than 2 characters", () => {
		const result = createProductSchema.safeParse({ ...validInput, title: "A" });
		expect(result.success).toBe(false);
	});

	it("should reject a title longer than 200 characters", () => {
		const result = createProductSchema.safeParse({
			...validInput,
			title: "A".repeat(201),
		});
		expect(result.success).toBe(false);
	});

	it("should accept a title of exactly 2 characters", () => {
		const result = createProductSchema.safeParse({ ...validInput, title: "AB" });
		expect(result.success).toBe(true);
	});

	it("should accept description as optional (omitted)", () => {
		const { description: _d, ...withoutDesc } = validInput;
		const result = createProductSchema.safeParse(withoutDesc);
		expect(result.success).toBe(true);
	});

	it("should accept description as empty string", () => {
		const result = createProductSchema.safeParse({ ...validInput, description: "" });
		expect(result.success).toBe(true);
	});

	it("should reject description longer than 500 characters", () => {
		const result = createProductSchema.safeParse({
			...validInput,
			description: "A".repeat(501),
		});
		expect(result.success).toBe(false);
	});

	it("should coerce string price to number in initialSku", () => {
		const result = createProductSchema.safeParse({
			...validInput,
			initialSku: {
				...validInput.initialSku,
				priceInclTaxEuros: "49.99",
			},
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.initialSku.priceInclTaxEuros).toBe(49.99);
		}
	});

	it("should reject negative price in initialSku", () => {
		const result = createProductSchema.safeParse({
			...validInput,
			initialSku: {
				...validInput.initialSku,
				priceInclTaxEuros: -10,
			},
		});
		expect(result.success).toBe(false);
	});

	it("should reject zero price in initialSku", () => {
		const result = createProductSchema.safeParse({
			...validInput,
			initialSku: {
				...validInput.initialSku,
				priceInclTaxEuros: 0,
			},
		});
		expect(result.success).toBe(false);
	});

	it("should reject when initialSku media is empty (cross-field refinement)", () => {
		const result = createProductSchema.safeParse({
			...validInput,
			initialSku: {
				...validInput.initialSku,
				media: [],
			},
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			const paths = result.error.issues.map((i) => i.path.join("."));
			expect(paths.some((p) => p.includes("media"))).toBe(true);
		}
	});

	it("should reject when first media is a video (cross-field refinement)", () => {
		const result = createProductSchema.safeParse({
			...validInput,
			initialSku: {
				...validInput.initialSku,
				media: [
					{
						url: "https://utfs.io/f/test-video.mp4",
						mediaType: "VIDEO",
					},
				],
			},
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			const paths = result.error.issues.map((i) => i.path.join("."));
			expect(paths.some((p) => p.includes("media"))).toBe(true);
		}
	});

	it("should reject when compareAtPrice is less than price (cross-field refinement)", () => {
		const result = createProductSchema.safeParse({
			...validInput,
			initialSku: {
				...validInput.initialSku,
				priceInclTaxEuros: 100,
				compareAtPriceEuros: 50,
			},
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			const paths = result.error.issues.map((i) => i.path.join("."));
			expect(paths.some((p) => p.includes("compareAtPriceEuros"))).toBe(true);
		}
	});

	it("should accept when compareAtPrice equals price", () => {
		const result = createProductSchema.safeParse({
			...validInput,
			initialSku: {
				...validInput.initialSku,
				priceInclTaxEuros: 100,
				compareAtPriceEuros: 100,
			},
		});
		expect(result.success).toBe(true);
	});

	it("should reject media URL from unauthorized domain", () => {
		const result = createProductSchema.safeParse({
			...validInput,
			initialSku: {
				...validInput.initialSku,
				media: [
					{
						url: "https://evil.com/image.jpg",
						mediaType: "IMAGE",
					},
				],
			},
		});
		expect(result.success).toBe(false);
	});

	it("should default inventory to 0 when not provided", () => {
		const result = createProductSchema.safeParse({
			...validInput,
			initialSku: {
				priceInclTaxEuros: 49.99,
				media: [{ url: VALID_IMAGE_URL, mediaType: "IMAGE" }],
			},
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.initialSku.inventory).toBe(0);
		}
	});

	it("should transform empty typeId to undefined", () => {
		const result = createProductSchema.safeParse({ ...validInput, typeId: "" });
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.typeId).toBeUndefined();
		}
	});

	it("should default collectionIds to empty array when not provided", () => {
		const result = createProductSchema.safeParse(validInput);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.collectionIds).toEqual([]);
		}
	});
});

// ============================================================================
// productFiltersSchema
// ============================================================================

describe("productFiltersSchema", () => {
	it("should accept an empty object (all filters optional)", () => {
		const result = productFiltersSchema.safeParse({});
		expect(result.success).toBe(true);
	});

	it("should accept valid stockStatus", () => {
		const result = productFiltersSchema.safeParse({ stockStatus: "in_stock" });
		expect(result.success).toBe(true);
	});

	it("should reject invalid stockStatus", () => {
		const result = productFiltersSchema.safeParse({ stockStatus: "unknown" });
		expect(result.success).toBe(false);
	});

	it("should accept valid ratingMin within 1-5", () => {
		const result = productFiltersSchema.safeParse({ ratingMin: 3 });
		expect(result.success).toBe(true);
	});

	it("should reject ratingMin above 5", () => {
		const result = productFiltersSchema.safeParse({ ratingMin: 6 });
		expect(result.success).toBe(false);
	});

	it("should reject ratingMin below 1", () => {
		const result = productFiltersSchema.safeParse({ ratingMin: 0 });
		expect(result.success).toBe(false);
	});

	it("should reject priceMin greater than priceMax (cross-field refinement)", () => {
		const result = productFiltersSchema.safeParse({ priceMin: 5000, priceMax: 1000 });
		expect(result.success).toBe(false);
	});

	it("should accept priceMin equal to priceMax", () => {
		const result = productFiltersSchema.safeParse({ priceMin: 1000, priceMax: 1000 });
		expect(result.success).toBe(true);
	});

	it("should accept slugs as array of strings", () => {
		const result = productFiltersSchema.safeParse({ slugs: ["bague-or", "collier-argent"] });
		expect(result.success).toBe(true);
	});

	it("should reject slugs array exceeding 20 items", () => {
		const slugs = Array.from({ length: 21 }, (_, i) => `slug-${i}`);
		const result = productFiltersSchema.safeParse({ slugs });
		expect(result.success).toBe(false);
	});
});

// ============================================================================
// bulkDeleteProductsSchema
// ============================================================================

describe("bulkDeleteProductsSchema", () => {
	it("should accept an array with at least one valid cuid2", () => {
		const result = bulkDeleteProductsSchema.safeParse({ productIds: [VALID_CUID] });
		expect(result.success).toBe(true);
	});

	it("should reject an empty array", () => {
		const result = bulkDeleteProductsSchema.safeParse({ productIds: [] });
		expect(result.success).toBe(false);
	});

	it("should reject when productIds contains invalid cuid2", () => {
		const result = bulkDeleteProductsSchema.safeParse({ productIds: ["not-a-cuid"] });
		expect(result.success).toBe(false);
	});

	it("should reject when productIds is missing", () => {
		const result = bulkDeleteProductsSchema.safeParse({});
		expect(result.success).toBe(false);
	});
});

// ============================================================================
// bulkArchiveProductsSchema
// ============================================================================

describe("bulkArchiveProductsSchema", () => {
	it("should accept valid data with ARCHIVED target status", () => {
		const result = bulkArchiveProductsSchema.safeParse({
			productIds: [VALID_CUID],
			targetStatus: "ARCHIVED",
		});
		expect(result.success).toBe(true);
	});

	it("should default targetStatus to ARCHIVED when not provided", () => {
		const result = bulkArchiveProductsSchema.safeParse({ productIds: [VALID_CUID] });
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.targetStatus).toBe("ARCHIVED");
		}
	});

	it("should accept PUBLIC as targetStatus", () => {
		const result = bulkArchiveProductsSchema.safeParse({
			productIds: [VALID_CUID],
			targetStatus: "PUBLIC",
		});
		expect(result.success).toBe(true);
	});

	it("should reject DRAFT as targetStatus", () => {
		const result = bulkArchiveProductsSchema.safeParse({
			productIds: [VALID_CUID],
			targetStatus: "DRAFT",
		});
		expect(result.success).toBe(false);
	});
});
