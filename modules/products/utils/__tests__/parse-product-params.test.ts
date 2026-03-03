import { describe, it, expect, vi } from "vitest";

vi.mock("@/app/generated/prisma/client", () => ({
	ProductStatus: {
		PUBLIC: "PUBLIC",
		DRAFT: "DRAFT",
		ARCHIVED: "ARCHIVED",
	},
}));

import { parseProductParams } from "../parse-product-params";

// ============================================================================
// parseProductParams
// ============================================================================

describe("parseProductParams", () => {
	// ---- Status ----

	it("defaults status to PUBLIC when not provided", () => {
		const result = parseProductParams({});
		expect(result.status).toBe("PUBLIC");
	});

	it("returns undefined status for 'all'", () => {
		const result = parseProductParams({ status: "all" });
		expect(result.status).toBeUndefined();
	});

	it("accepts valid PUBLIC status", () => {
		const result = parseProductParams({ status: "PUBLIC" });
		expect(result.status).toBe("PUBLIC");
	});

	it("accepts valid DRAFT status", () => {
		const result = parseProductParams({ status: "DRAFT" });
		expect(result.status).toBe("DRAFT");
	});

	it("accepts valid ARCHIVED status", () => {
		const result = parseProductParams({ status: "ARCHIVED" });
		expect(result.status).toBe("ARCHIVED");
	});

	it("falls back to PUBLIC for invalid status", () => {
		const result = parseProductParams({ status: "INVALID" });
		expect(result.status).toBe("PUBLIC");
	});

	it("uses first element when status is an array", () => {
		const result = parseProductParams({ status: ["DRAFT", "PUBLIC"] });
		expect(result.status).toBe("DRAFT");
	});

	// ---- SortBy ----

	it("defaults sortBy to 'created-descending'", () => {
		const result = parseProductParams({});
		expect(result.sortBy).toBe("created-descending");
	});

	it("accepts valid sortBy value", () => {
		const result = parseProductParams({ sortBy: "price-ascending" });
		expect(result.sortBy).toBe("price-ascending");
	});

	it("falls back to default for invalid sortBy", () => {
		const result = parseProductParams({ sortBy: "invalid-sort" });
		expect(result.sortBy).toBe("created-descending");
	});

	// ---- PerPage ----

	it("defaults perPage to 10", () => {
		const result = parseProductParams({});
		expect(result.perPage).toBe(10);
	});

	it("parses custom perPage value", () => {
		const result = parseProductParams({ perPage: "50" });
		expect(result.perPage).toBe(50);
	});

	// ---- Direction ----

	it("defaults direction to 'forward'", () => {
		const result = parseProductParams({});
		expect(result.direction).toBe("forward");
	});

	// ---- Search ----

	it("returns undefined search when not provided", () => {
		const result = parseProductParams({});
		expect(result.search).toBeUndefined();
	});

	it("parses search string", () => {
		const result = parseProductParams({ search: "bague" });
		expect(result.search).toBe("bague");
	});
});
