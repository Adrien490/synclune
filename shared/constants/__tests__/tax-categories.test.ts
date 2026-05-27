import { describe, expect, it } from "vitest";
import { TAX_CATEGORY_CODES, DEFAULT_TAX_CATEGORY } from "../tax-categories";

describe("TAX_CATEGORY_CODES", () => {
	it("contains all required UNTDID 5305 categories", () => {
		expect(TAX_CATEGORY_CODES.STANDARD).toBe("S");
		expect(TAX_CATEGORY_CODES.ZERO).toBe("Z");
		expect(TAX_CATEGORY_CODES.EXEMPT_FRANCHISE).toBe("ZB");
		expect(TAX_CATEGORY_CODES.REVERSE_CHARGE).toBe("AE");
		expect(TAX_CATEGORY_CODES.EXEMPT).toBe("E");
		expect(TAX_CATEGORY_CODES.EXPORT).toBe("G");
		expect(TAX_CATEGORY_CODES.INTRA_COMMUNITY).toBe("K");
	});

	it("DEFAULT_TAX_CATEGORY is ZB (franchise art. 293 B CGI)", () => {
		expect(DEFAULT_TAX_CATEGORY).toBe("ZB");
	});

	it("every code matches the DB CHECK constraint set { S, Z, ZB, AE, E, G, K }", () => {
		const allowed = new Set(["S", "Z", "ZB", "AE", "E", "G", "K"]);
		for (const code of Object.values(TAX_CATEGORY_CODES)) {
			expect(allowed.has(code)).toBe(true);
		}
	});
});
