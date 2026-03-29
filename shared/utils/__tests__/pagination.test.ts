import { describe, it, expect, vi } from "vitest";

vi.mock("@/shared/constants/pagination", () => ({
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
});
