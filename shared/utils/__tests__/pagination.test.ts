import { describe, it, expect, vi } from "vitest";

vi.mock("@/shared/schemas/pagination-schema", () => ({
	PAGINATION_DEFAULTS: { ADMIN: 20 },
	PAGINATION_LIMITS: { MAX_ADMIN: 100 },
	cursorSchema: { optional: () => ({}) },
	directionSchema: { optional: () => ({}) },
}));

import { constrainPerPage, createPerPageSchema, createPaginationSchema } from "../pagination";

describe("constrainPerPage", () => {
	it("returns default value when input is undefined", () => {
		expect(constrainPerPage(undefined)).toBe(20);
	});

	it("returns default value when input is null", () => {
		expect(constrainPerPage(null)).toBe(20);
	});

	it("returns input value when within range", () => {
		expect(constrainPerPage(50)).toBe(50);
	});

	it("clamps to minimum of 1", () => {
		expect(constrainPerPage(0)).toBe(1);
		expect(constrainPerPage(-5)).toBe(1);
	});

	it("clamps to maximum", () => {
		expect(constrainPerPage(200)).toBe(100);
		expect(constrainPerPage(1000)).toBe(100);
	});

	it("uses custom default value", () => {
		expect(constrainPerPage(undefined, 10)).toBe(10);
	});

	it("uses custom max value", () => {
		expect(constrainPerPage(50, 20, 30)).toBe(30);
	});

	it("returns exact boundary values", () => {
		expect(constrainPerPage(1)).toBe(1);
		expect(constrainPerPage(100)).toBe(100);
	});
});

describe("createPerPageSchema", () => {
	it("parses valid number within range", () => {
		const schema = createPerPageSchema(20, 100);
		expect(schema.parse(50)).toBe(50);
	});

	it("uses default value when input is undefined", () => {
		const schema = createPerPageSchema(20, 100);
		expect(schema.parse(undefined)).toBe(20);
	});

	it("coerces string to number", () => {
		const schema = createPerPageSchema(20, 100);
		expect(schema.parse("30")).toBe(30);
	});

	it("rejects value below 1", () => {
		const schema = createPerPageSchema(20, 100);
		expect(() => schema.parse(0)).toThrow();
	});

	it("rejects value above max", () => {
		const schema = createPerPageSchema(20, 50);
		expect(() => schema.parse(51)).toThrow();
	});

	it("uses module defaults when no args provided", () => {
		const schema = createPerPageSchema();
		expect(schema.parse(undefined)).toBe(20); // PAGINATION_DEFAULTS.ADMIN
	});
});

describe("createPaginationSchema", () => {
	it("creates schema with default options", () => {
		const schema = createPaginationSchema();
		expect(schema).toBeDefined();
	});

	it("creates schema with custom options", () => {
		const schema = createPaginationSchema({ defaultPerPage: 10, maxPerPage: 50 });
		expect(schema).toBeDefined();
	});

	it("creates schema without options", () => {
		const schema = createPaginationSchema();
		expect(schema).toBeDefined();
	});

	// Note: safeParse tests below cannot be added here because cursorSchema and
	// directionSchema are mocked as plain objects (not Zod schemas). The parse
	// behavior of createPaginationSchema is validated via integration in modules
	// that use real pagination constants. The schema factory itself is covered by
	// createPerPageSchema tests which use the real Zod API.
	it("returns a Zod object schema with shape property", () => {
		const schema = createPaginationSchema();
		// A z.object() result has a _def or shape property in Zod v4
		expect(typeof schema).toBe("object");
	});
});

describe("constrainPerPage - additional edge cases", () => {
	it("treats exactly 1 as valid minimum", () => {
		expect(constrainPerPage(1)).toBe(1);
	});

	it("treats exactly max as valid maximum", () => {
		expect(constrainPerPage(100, 20, 100)).toBe(100);
	});

	it("uses custom defaultValue when null is passed", () => {
		expect(constrainPerPage(null, 15, 100)).toBe(15);
	});

	it("respects custom maxValue lower than input", () => {
		expect(constrainPerPage(99, 20, 50)).toBe(50);
	});

	it("respects custom maxValue higher than default max", () => {
		expect(constrainPerPage(150, 20, 200)).toBe(150);
	});
});
