import { describe, it, expect } from "vitest";
import { parseOrderParams } from "../parse-order-params";

// ============================================================================
// parseOrderParams
// ============================================================================

describe("parseOrderParams", () => {
	it("returns defaults for empty params", () => {
		const result = parseOrderParams({});

		expect(result.direction).toBe("forward");
		expect(result.perPage).toBe(10);
		expect(result.sortBy).toBe("created-descending");
		expect(result.search).toBeUndefined();
		expect(result.cursor).toBeUndefined();
	});

	it("parses custom perPage", () => {
		const result = parseOrderParams({ perPage: "50" });
		expect(result.perPage).toBe(50);
	});

	it("accepts valid sortBy value", () => {
		const result = parseOrderParams({ sortBy: "total-descending" });
		expect(result.sortBy).toBe("total-descending");
	});

	it("falls back to default for invalid sortBy", () => {
		const result = parseOrderParams({ sortBy: "invalid" });
		expect(result.sortBy).toBe("created-descending");
	});

	it("parses search string", () => {
		const result = parseOrderParams({ search: "SYN-001" });
		expect(result.search).toBe("SYN-001");
	});

	it("parses cursor (must be 25-char CUID)", () => {
		const cuid = "clabcdefghijklmnopqrstuvw";
		const result = parseOrderParams({ cursor: cuid });
		expect(result.cursor).toBe(cuid);
	});

	it("returns undefined for invalid cursor", () => {
		const result = parseOrderParams({ cursor: "too-short" });
		expect(result.cursor).toBeUndefined();
	});

	it("parses backward direction", () => {
		const result = parseOrderParams({ direction: "backward" });
		expect(result.direction).toBe("backward");
	});
});
