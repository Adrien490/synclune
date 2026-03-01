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

vi.mock("../../constants/color.constants", () => ({
	GET_COLORS_DEFAULT_PER_PAGE: 20,
	GET_COLORS_DEFAULT_SORT_BY: "name-ascending",
	GET_COLORS_MAX_RESULTS_PER_PAGE: 100,
	GET_COLORS_SORT_FIELDS: ["name-ascending", "name-descending", "created-descending"],
}));

vi.mock("../../utils/hex-normalizer", () => ({
	normalizeHex: (hex: string) => {
		let cleaned = hex.trim().replace(/^#/, "");
		if (cleaned.length === 3) {
			cleaned = cleaned
				.split("")
				.map((c: string) => c + c)
				.join("");
		}
		return `#${cleaned.toUpperCase()}`;
	},
}));

import {
	hexColorSchema,
	colorSlugSchema,
	colorNameSchema,
	createColorSchema,
	updateColorSchema,
	deleteColorSchema,
	bulkDeleteColorsSchema,
	toggleColorStatusSchema,
	getColorSchema,
} from "../color.schemas";
import { VALID_CUID } from "@/test/factories";

describe("hexColorSchema", () => {
	it("should accept valid 6-digit hex color", () => {
		const result = hexColorSchema.safeParse("#FF5733");

		expect(result.success).toBe(true);
	});

	it("should accept valid 3-digit hex color", () => {
		const result = hexColorSchema.safeParse("#F57");

		expect(result.success).toBe(true);
	});

	it("should accept hex without # prefix", () => {
		const result = hexColorSchema.safeParse("FF5733");

		expect(result.success).toBe(true);
	});

	it("should reject invalid hex values", () => {
		const result = hexColorSchema.safeParse("#GGHHII");

		expect(result.success).toBe(false);
	});

	it("should reject empty string", () => {
		const result = hexColorSchema.safeParse("");

		expect(result.success).toBe(false);
	});

	it("should reject hex with wrong length (4 or 5 chars)", () => {
		const result = hexColorSchema.safeParse("#FF57");

		expect(result.success).toBe(false);
	});

	it("should normalize to uppercase with # prefix", () => {
		const result = hexColorSchema.safeParse("ff5733");

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toBe("#FF5733");
		}
	});
});

describe("colorSlugSchema", () => {
	it("should accept valid slug", () => {
		const result = colorSlugSchema.safeParse("rouge-fonce");

		expect(result.success).toBe(true);
	});

	it("should reject uppercase characters", () => {
		const result = colorSlugSchema.safeParse("Rouge");

		expect(result.success).toBe(false);
	});

	it("should reject spaces", () => {
		const result = colorSlugSchema.safeParse("rouge fonce");

		expect(result.success).toBe(false);
	});

	it("should reject empty string", () => {
		const result = colorSlugSchema.safeParse("");

		expect(result.success).toBe(false);
	});

	it("should reject slug exceeding 50 characters", () => {
		const result = colorSlugSchema.safeParse("a".repeat(51));

		expect(result.success).toBe(false);
	});
});

describe("colorNameSchema", () => {
	it("should accept valid name", () => {
		const result = colorNameSchema.safeParse("Rouge Foncé");

		expect(result.success).toBe(true);
	});

	it("should reject empty name", () => {
		const result = colorNameSchema.safeParse("");

		expect(result.success).toBe(false);
	});

	it("should reject name exceeding 100 characters", () => {
		const result = colorNameSchema.safeParse("a".repeat(101));

		expect(result.success).toBe(false);
	});

	it("should trim whitespace", () => {
		const result = colorNameSchema.safeParse("  Rouge  ");

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toBe("Rouge");
		}
	});
});

describe("createColorSchema", () => {
	it("should accept valid color creation", () => {
		const result = createColorSchema.safeParse({
			name: "Rouge",
			hex: "#FF0000",
		});

		expect(result.success).toBe(true);
	});

	it("should reject missing name", () => {
		const result = createColorSchema.safeParse({ hex: "#FF0000" });

		expect(result.success).toBe(false);
	});

	it("should reject missing hex", () => {
		const result = createColorSchema.safeParse({ name: "Rouge" });

		expect(result.success).toBe(false);
	});
});

describe("updateColorSchema", () => {
	it("should accept valid update", () => {
		const result = updateColorSchema.safeParse({
			id: VALID_CUID,
			name: "Bleu Marine",
			hex: "#000080",
		});

		expect(result.success).toBe(true);
	});

	it("should reject missing id", () => {
		const result = updateColorSchema.safeParse({
			name: "Rouge",
			hex: "#FF0000",
		});

		expect(result.success).toBe(false);
	});
});

describe("deleteColorSchema", () => {
	it("should accept valid cuid2", () => {
		const result = deleteColorSchema.safeParse({ id: VALID_CUID });

		expect(result.success).toBe(true);
	});
});

describe("bulkDeleteColorsSchema", () => {
	it("should accept array of valid ids", () => {
		const result = bulkDeleteColorsSchema.safeParse({ ids: [VALID_CUID] });

		expect(result.success).toBe(true);
	});

	it("should reject empty array", () => {
		const result = bulkDeleteColorsSchema.safeParse({ ids: [] });

		expect(result.success).toBe(false);
	});

	it("should reject more than 200 ids", () => {
		const ids = Array.from({ length: 201 }, () => VALID_CUID);
		const result = bulkDeleteColorsSchema.safeParse({ ids });

		expect(result.success).toBe(false);
	});
});

describe("toggleColorStatusSchema", () => {
	it("should accept valid toggle", () => {
		const result = toggleColorStatusSchema.safeParse({
			id: VALID_CUID,
			isActive: true,
		});

		expect(result.success).toBe(true);
	});

	it("should require isActive boolean", () => {
		const result = toggleColorStatusSchema.safeParse({ id: VALID_CUID });

		expect(result.success).toBe(false);
	});
});

describe("getColorSchema", () => {
	it("should accept valid slug", () => {
		const result = getColorSchema.safeParse({ slug: "rouge" });

		expect(result.success).toBe(true);
	});

	it("should reject empty slug", () => {
		const result = getColorSchema.safeParse({ slug: "" });

		expect(result.success).toBe(false);
	});

	it("should accept optional includeInactive", () => {
		const result = getColorSchema.safeParse({ slug: "rouge", includeInactive: true });

		expect(result.success).toBe(true);
	});
});
