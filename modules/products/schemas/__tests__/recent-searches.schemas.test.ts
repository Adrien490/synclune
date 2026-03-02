import { describe, it, expect, vi } from "vitest";

vi.mock("@/modules/products/constants/recent-searches", () => ({
	RECENT_SEARCHES_MIN_LENGTH: 2,
}));

import { addRecentSearchSchema, removeRecentSearchSchema } from "../recent-searches.schemas";

// ============================================================================
// addRecentSearchSchema
// ============================================================================

describe("addRecentSearchSchema", () => {
	it("should accept a valid search term", () => {
		const result = addRecentSearchSchema.safeParse({ term: "bague" });

		expect(result.success).toBe(true);
	});

	it("should trim whitespace from the term", () => {
		const result = addRecentSearchSchema.safeParse({ term: "  collier  " });

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.term).toBe("collier");
		}
	});

	it("should lowercase the term", () => {
		const result = addRecentSearchSchema.safeParse({ term: "BAGUE EN OR" });

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.term).toBe("bague en or");
		}
	});

	it("should trim and lowercase combined", () => {
		const result = addRecentSearchSchema.safeParse({ term: "  Bracelet  " });

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.term).toBe("bracelet");
		}
	});

	it("should accept a term at exactly the minimum length (2 chars)", () => {
		const result = addRecentSearchSchema.safeParse({ term: "or" });

		expect(result.success).toBe(true);
	});

	it("should accept a term at exactly 100 characters (max)", () => {
		const result = addRecentSearchSchema.safeParse({ term: "a".repeat(100) });

		expect(result.success).toBe(true);
	});

	it("should reject a term shorter than 2 characters", () => {
		const result = addRecentSearchSchema.safeParse({ term: "a" });

		expect(result.success).toBe(false);
	});

	it("should reject a term exceeding 100 characters", () => {
		const result = addRecentSearchSchema.safeParse({ term: "a".repeat(101) });

		expect(result.success).toBe(false);
	});

	it("should reject an empty term string", () => {
		const result = addRecentSearchSchema.safeParse({ term: "" });

		expect(result.success).toBe(false);
	});

	it("should reject a whitespace-only term (becomes empty after trim)", () => {
		const result = addRecentSearchSchema.safeParse({ term: " " });

		expect(result.success).toBe(false);
	});

	it("should reject when term is missing", () => {
		const result = addRecentSearchSchema.safeParse({});

		expect(result.success).toBe(false);
	});
});

// ============================================================================
// removeRecentSearchSchema
// ============================================================================

describe("removeRecentSearchSchema", () => {
	it("should accept a valid search term", () => {
		const result = removeRecentSearchSchema.safeParse({ term: "bague" });

		expect(result.success).toBe(true);
	});

	it("should trim whitespace from the term", () => {
		const result = removeRecentSearchSchema.safeParse({ term: "  pendentif  " });

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.term).toBe("pendentif");
		}
	});

	it("should lowercase the term", () => {
		const result = removeRecentSearchSchema.safeParse({ term: "COLLIER" });

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.term).toBe("collier");
		}
	});

	it("should trim and lowercase combined", () => {
		const result = removeRecentSearchSchema.safeParse({ term: "  Boucles D'Oreilles  " });

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.term).toBe("boucles d'oreilles");
		}
	});

	it("should accept a single-character term (min 1)", () => {
		const result = removeRecentSearchSchema.safeParse({ term: "a" });

		expect(result.success).toBe(true);
	});

	it("should accept a term at exactly 100 characters (max)", () => {
		const result = removeRecentSearchSchema.safeParse({ term: "a".repeat(100) });

		expect(result.success).toBe(true);
	});

	it("should reject a term exceeding 100 characters", () => {
		const result = removeRecentSearchSchema.safeParse({ term: "a".repeat(101) });

		expect(result.success).toBe(false);
	});

	it("should reject an empty term string", () => {
		const result = removeRecentSearchSchema.safeParse({ term: "" });

		expect(result.success).toBe(false);
	});

	it("should reject a whitespace-only term (becomes empty after trim)", () => {
		const result = removeRecentSearchSchema.safeParse({ term: "   " });

		expect(result.success).toBe(false);
	});

	it("should reject when term is missing", () => {
		const result = removeRecentSearchSchema.safeParse({});

		expect(result.success).toBe(false);
	});
});
