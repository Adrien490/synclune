import { describe, it, expect } from "vitest";

import { generateSkuCode } from "../sku-generation.service";

describe("generateSkuCode", () => {
	it("should return a string matching SKU-{timestamp}-{7chars} format", () => {
		const code = generateSkuCode();

		expect(code).toMatch(/^SKU-\d+-[A-Z0-9]{7}$/);
	});

	it("should include a valid timestamp", () => {
		const before = Date.now();
		const code = generateSkuCode();
		const after = Date.now();

		const timestamp = parseInt(code.split("-")[1], 10);
		expect(timestamp).toBeGreaterThanOrEqual(before);
		expect(timestamp).toBeLessThanOrEqual(after);
	});

	it("should produce uppercase alphanumeric suffix", () => {
		const code = generateSkuCode();
		const suffix = code.split("-")[2];

		expect(suffix).toMatch(/^[A-Z0-9]{7}$/);
	});

	it("should generate unique codes across 100 calls", () => {
		const codes = Array.from({ length: 100 }, () => generateSkuCode());
		const uniqueCodes = new Set(codes);

		expect(uniqueCodes.size).toBe(100);
	});
});
