import { describe, it, expect, vi } from "vitest";
import { z } from "zod";

vi.mock("@/shared/constants/pagination", () => ({
	cursorSchema: z.string().optional(),
	directionSchema: z.enum(["forward", "backward"]).default("forward"),
}));

vi.mock("@/shared/utils/pagination", () => ({
	createPerPageSchema: (defaultVal: number, max: number) =>
		z.coerce.number().int().min(1).max(max).default(defaultVal),
}));

vi.mock("../../constants/product-type.constants", () => ({
	GET_PRODUCT_TYPES_DEFAULT_PER_PAGE: 20,
	GET_PRODUCT_TYPES_DEFAULT_SORT_BY: "label-ascending",
	GET_PRODUCT_TYPES_MAX_RESULTS_PER_PAGE: 100,
	GET_PRODUCT_TYPES_SORT_FIELDS: ["label-ascending", "label-descending", "created-descending"],
}));

import {
	productTypeLabelSchema,
	productTypeDescriptionSchema,
	productTypeSlugSchema,
	createProductTypeSchema,
	updateProductTypeSchema,
	deleteProductTypeSchema,
	toggleProductTypeStatusSchema,
	bulkActivateProductTypesSchema,
	bulkDeleteProductTypesSchema,
	productTypeFiltersSchema,
	getProductTypeSchema,
	productTypeSortBySchema,
} from "../product-type.schemas";
import { VALID_CUID } from "@/test/factories";

describe("productTypeLabelSchema", () => {
	it("should accept valid label", () => {
		const result = productTypeLabelSchema.safeParse("Bague");

		expect(result.success).toBe(true);
	});

	it("should reject empty label", () => {
		const result = productTypeLabelSchema.safeParse("");

		expect(result.success).toBe(false);
	});

	it("should reject label exceeding 50 characters", () => {
		const result = productTypeLabelSchema.safeParse("a".repeat(51));

		expect(result.success).toBe(false);
	});

	it("should trim whitespace", () => {
		const result = productTypeLabelSchema.safeParse("  Bague  ");

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toBe("Bague");
		}
	});
});

describe("productTypeDescriptionSchema", () => {
	it("should accept valid description", () => {
		const result = productTypeDescriptionSchema.safeParse("Bijoux portes au doigt");

		expect(result.success).toBe(true);
	});

	it("should accept undefined (optional)", () => {
		const result = productTypeDescriptionSchema.safeParse(undefined);

		expect(result.success).toBe(true);
	});

	it("should reject description exceeding 500 characters", () => {
		const result = productTypeDescriptionSchema.safeParse("a".repeat(501));

		expect(result.success).toBe(false);
	});
});

describe("productTypeSlugSchema", () => {
	it("should accept valid slug", () => {
		const result = productTypeSlugSchema.safeParse("bagues");

		expect(result.success).toBe(true);
	});

	it("should reject uppercase", () => {
		const result = productTypeSlugSchema.safeParse("Bagues");

		expect(result.success).toBe(false);
	});

	it("should reject spaces", () => {
		const result = productTypeSlugSchema.safeParse("bagues et colliers");

		expect(result.success).toBe(false);
	});

	it("should reject empty string", () => {
		const result = productTypeSlugSchema.safeParse("");

		expect(result.success).toBe(false);
	});

	it("should reject slug exceeding 50 characters", () => {
		const result = productTypeSlugSchema.safeParse("a".repeat(51));

		expect(result.success).toBe(false);
	});
});

describe("createProductTypeSchema", () => {
	it("should accept valid creation", () => {
		const result = createProductTypeSchema.safeParse({
			label: "Bague",
			description: "Bijoux portes au doigt",
		});

		expect(result.success).toBe(true);
	});

	it("should accept creation without description", () => {
		const result = createProductTypeSchema.safeParse({ label: "Bague" });

		expect(result.success).toBe(true);
	});

	it("should reject missing label", () => {
		const result = createProductTypeSchema.safeParse({
			description: "Test",
		});

		expect(result.success).toBe(false);
	});
});

describe("updateProductTypeSchema", () => {
	it("should accept valid update", () => {
		const result = updateProductTypeSchema.safeParse({
			id: VALID_CUID,
			label: "Collier",
			description: "Bijoux de cou",
		});

		expect(result.success).toBe(true);
	});

	it("should reject missing id", () => {
		const result = updateProductTypeSchema.safeParse({
			label: "Collier",
		});

		expect(result.success).toBe(false);
	});
});

describe("deleteProductTypeSchema", () => {
	it("should accept valid cuid2 productTypeId", () => {
		const result = deleteProductTypeSchema.safeParse({
			productTypeId: VALID_CUID,
		});

		expect(result.success).toBe(true);
	});
});

describe("toggleProductTypeStatusSchema", () => {
	it("should accept valid toggle", () => {
		const result = toggleProductTypeStatusSchema.safeParse({
			productTypeId: VALID_CUID,
			isActive: false,
		});

		expect(result.success).toBe(true);
	});

	it("should require isActive boolean", () => {
		const result = toggleProductTypeStatusSchema.safeParse({
			productTypeId: VALID_CUID,
		});

		expect(result.success).toBe(false);
	});
});

describe("bulkActivateProductTypesSchema", () => {
	it("should accept JSON-stringified array of ids", () => {
		const result = bulkActivateProductTypesSchema.safeParse({
			ids: JSON.stringify([VALID_CUID]),
		});

		expect(result.success).toBe(true);
	});

	it("should reject empty array", () => {
		const result = bulkActivateProductTypesSchema.safeParse({
			ids: JSON.stringify([]),
		});

		expect(result.success).toBe(false);
	});

	it("should reject invalid JSON", () => {
		const result = bulkActivateProductTypesSchema.safeParse({
			ids: "not-json",
		});

		expect(result.success).toBe(false);
	});
});

describe("bulkDeleteProductTypesSchema", () => {
	it("should accept JSON-stringified array of ids", () => {
		const result = bulkDeleteProductTypesSchema.safeParse({
			ids: JSON.stringify([VALID_CUID]),
		});

		expect(result.success).toBe(true);
	});

	it("should reject more than 100 ids", () => {
		const ids = Array.from({ length: 101 }, () => VALID_CUID);
		const result = bulkDeleteProductTypesSchema.safeParse({
			ids: JSON.stringify(ids),
		});

		expect(result.success).toBe(false);
	});
});

describe("productTypeFiltersSchema", () => {
	it("should accept all filter options", () => {
		const result = productTypeFiltersSchema.safeParse({
			isActive: true,
			isSystem: false,
			hasProducts: true,
		});

		expect(result.success).toBe(true);
	});

	it("should accept empty filters", () => {
		const result = productTypeFiltersSchema.safeParse({});

		expect(result.success).toBe(true);
	});
});

describe("getProductTypeSchema", () => {
	it("should accept valid slug", () => {
		const result = getProductTypeSchema.safeParse({ slug: "bagues" });

		expect(result.success).toBe(true);
	});

	it("should reject empty slug", () => {
		const result = getProductTypeSchema.safeParse({ slug: "" });

		expect(result.success).toBe(false);
	});
});

describe("productTypeSortBySchema", () => {
	it("should accept valid sort field", () => {
		const result = productTypeSortBySchema.safeParse("label-ascending");

		expect(result.success).toBe(true);
	});

	it("should fallback to default for invalid sort field", () => {
		const result = productTypeSortBySchema.safeParse("invalid-sort");

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toBe("label-ascending");
		}
	});
});
