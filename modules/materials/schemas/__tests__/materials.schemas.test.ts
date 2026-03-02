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

vi.mock("../../constants/materials.constants", () => ({
	GET_MATERIALS_DEFAULT_PER_PAGE: 20,
	GET_MATERIALS_DEFAULT_SORT_BY: "name-ascending",
	GET_MATERIALS_MAX_RESULTS_PER_PAGE: 100,
	GET_MATERIALS_SORT_FIELDS: ["name-ascending", "name-descending", "created-descending"],
}));

import {
	materialSlugSchema,
	materialNameSchema,
	materialDescriptionSchema,
	createMaterialSchema,
	updateMaterialSchema,
	deleteMaterialSchema,
	bulkDeleteMaterialsSchema,
	toggleMaterialStatusSchema,
	bulkToggleMaterialStatusSchema,
	duplicateMaterialSchema,
	getMaterialSchema,
} from "../materials.schemas";
import { VALID_CUID } from "@/test/factories";

describe("materialSlugSchema", () => {
	it("should accept valid slug", () => {
		const result = materialSlugSchema.safeParse("argent-925");

		expect(result.success).toBe(true);
	});

	it("should reject uppercase characters", () => {
		const result = materialSlugSchema.safeParse("Argent");

		expect(result.success).toBe(false);
	});

	it("should reject spaces", () => {
		const result = materialSlugSchema.safeParse("argent 925");

		expect(result.success).toBe(false);
	});

	it("should reject empty string", () => {
		const result = materialSlugSchema.safeParse("");

		expect(result.success).toBe(false);
	});

	it("should reject slug exceeding 100 characters", () => {
		const result = materialSlugSchema.safeParse("a".repeat(101));

		expect(result.success).toBe(false);
	});
});

describe("materialNameSchema", () => {
	it("should accept valid name", () => {
		const result = materialNameSchema.safeParse("Argent 925");

		expect(result.success).toBe(true);
	});

	it("should reject empty name", () => {
		const result = materialNameSchema.safeParse("");

		expect(result.success).toBe(false);
	});

	it("should reject name exceeding 100 characters", () => {
		const result = materialNameSchema.safeParse("a".repeat(101));

		expect(result.success).toBe(false);
	});
});

describe("materialDescriptionSchema", () => {
	it("should accept valid description", () => {
		const result = materialDescriptionSchema.safeParse("Un alliage precieux");

		expect(result.success).toBe(true);
	});

	it("should accept undefined (optional)", () => {
		const result = materialDescriptionSchema.safeParse(undefined);

		expect(result.success).toBe(true);
	});

	it("should accept null (nullable)", () => {
		const result = materialDescriptionSchema.safeParse(null);

		expect(result.success).toBe(true);
	});

	it("should reject description exceeding 1000 characters", () => {
		const result = materialDescriptionSchema.safeParse("a".repeat(1001));

		expect(result.success).toBe(false);
	});
});

describe("createMaterialSchema", () => {
	it("should accept valid material creation", () => {
		const result = createMaterialSchema.safeParse({
			name: "Or Rose 18K",
			description: "Un or precieux",
		});

		expect(result.success).toBe(true);
	});

	it("should accept creation without description", () => {
		const result = createMaterialSchema.safeParse({ name: "Or Rose 18K" });

		expect(result.success).toBe(true);
	});

	it("should reject missing name", () => {
		const result = createMaterialSchema.safeParse({
			description: "A material",
		});

		expect(result.success).toBe(false);
	});
});

describe("updateMaterialSchema", () => {
	it("should accept valid update with all fields", () => {
		const result = updateMaterialSchema.safeParse({
			id: VALID_CUID,
			name: "Argent 925",
			description: "Sterling silver",
			isActive: true,
		});

		expect(result.success).toBe(true);
	});

	it("should reject missing isActive", () => {
		const result = updateMaterialSchema.safeParse({
			id: VALID_CUID,
			name: "Argent",
		});

		expect(result.success).toBe(false);
	});

	it("should reject missing id", () => {
		const result = updateMaterialSchema.safeParse({
			name: "Argent",
			isActive: true,
		});

		expect(result.success).toBe(false);
	});
});

describe("deleteMaterialSchema", () => {
	it("should accept valid cuid2", () => {
		const result = deleteMaterialSchema.safeParse({ id: VALID_CUID });

		expect(result.success).toBe(true);
	});
});

describe("bulkDeleteMaterialsSchema", () => {
	it("should accept array of valid ids", () => {
		const result = bulkDeleteMaterialsSchema.safeParse({ ids: [VALID_CUID] });

		expect(result.success).toBe(true);
	});

	it("should reject empty array", () => {
		const result = bulkDeleteMaterialsSchema.safeParse({ ids: [] });

		expect(result.success).toBe(false);
	});

	it("should reject more than 200 ids", () => {
		const ids = Array.from({ length: 201 }, () => VALID_CUID);
		const result = bulkDeleteMaterialsSchema.safeParse({ ids });

		expect(result.success).toBe(false);
	});
});

describe("toggleMaterialStatusSchema", () => {
	it("should accept valid toggle", () => {
		const result = toggleMaterialStatusSchema.safeParse({
			id: VALID_CUID,
			isActive: true,
		});

		expect(result.success).toBe(true);
	});
});

describe("bulkToggleMaterialStatusSchema", () => {
	it("should accept valid bulk toggle", () => {
		const result = bulkToggleMaterialStatusSchema.safeParse({
			ids: [VALID_CUID],
			isActive: true,
		});

		expect(result.success).toBe(true);
	});

	it("should reject empty ids array", () => {
		const result = bulkToggleMaterialStatusSchema.safeParse({
			ids: [],
			isActive: true,
		});

		expect(result.success).toBe(false);
	});

	it("should reject missing isActive", () => {
		const result = bulkToggleMaterialStatusSchema.safeParse({
			ids: [VALID_CUID],
		});

		expect(result.success).toBe(false);
	});

	it("should reject more than 200 ids", () => {
		const ids = Array.from({ length: 201 }, () => VALID_CUID);
		const result = bulkToggleMaterialStatusSchema.safeParse({ ids, isActive: false });

		expect(result.success).toBe(false);
	});
});

describe("duplicateMaterialSchema", () => {
	it("should accept valid material id", () => {
		const result = duplicateMaterialSchema.safeParse({ materialId: VALID_CUID });

		expect(result.success).toBe(true);
	});

	it("should reject invalid id", () => {
		const result = duplicateMaterialSchema.safeParse({ materialId: "not-a-cuid" });

		expect(result.success).toBe(false);
	});

	it("should reject missing materialId", () => {
		const result = duplicateMaterialSchema.safeParse({});

		expect(result.success).toBe(false);
	});
});

describe("getMaterialSchema", () => {
	it("should accept valid slug", () => {
		const result = getMaterialSchema.safeParse({ slug: "argent-925" });

		expect(result.success).toBe(true);
	});

	it("should reject empty slug", () => {
		const result = getMaterialSchema.safeParse({ slug: "" });

		expect(result.success).toBe(false);
	});
});
