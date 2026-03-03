import { describe, it, expect } from "vitest";
import { parseProductSkuParams } from "../parse-sku-params";

// ============================================================================
// parseProductSkuParams
// ============================================================================

describe("parseProductSkuParams", () => {
	it("returns defaults for empty params", () => {
		const result = parseProductSkuParams({});

		expect(result.direction).toBe("forward");
		expect(result.perPage).toBe(20); // different from orders (10)
		expect(result.sortBy).toBe("created-descending");
		expect(result.search).toBeUndefined();
		expect(result.cursor).toBeUndefined();
	});

	it("parses custom perPage (max 200)", () => {
		const result = parseProductSkuParams({ perPage: "100" });
		expect(result.perPage).toBe(100);
	});

	it("accepts valid sortBy values", () => {
		expect(parseProductSkuParams({ sortBy: "price-ascending" }).sortBy).toBe("price-ascending");
		expect(parseProductSkuParams({ sortBy: "stock-descending" }).sortBy).toBe("stock-descending");
		expect(parseProductSkuParams({ sortBy: "sku-ascending" }).sortBy).toBe("sku-ascending");
	});

	it("falls back to default for invalid sortBy", () => {
		const result = parseProductSkuParams({ sortBy: "invalid" });
		expect(result.sortBy).toBe("created-descending");
	});

	it("parses search and cursor", () => {
		const cuid = "clabcdefghijklmnopqrstuvw";
		const result = parseProductSkuParams({ search: "SKU-001", cursor: cuid });
		expect(result.search).toBe("SKU-001");
		expect(result.cursor).toBe(cuid);
	});
});
