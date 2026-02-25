import { describe, it, expect } from "vitest"
import { getSortDirection } from "../sort-direction"

describe("getSortDirection", () => {
	it("should return 'asc' for a string ending in -ascending", () => {
		expect(getSortDirection("created-ascending")).toBe("asc")
	})

	it("should return 'desc' for a string ending in -descending", () => {
		expect(getSortDirection("total-descending")).toBe("desc")
	})

	it("should return 'desc' as default for an unrecognized string", () => {
		expect(getSortDirection("created")).toBe("desc")
	})

	it("should return 'desc' for an empty string", () => {
		expect(getSortDirection("")).toBe("desc")
	})

	it("should handle multi-word sort field with -ascending", () => {
		expect(getSortDirection("created-at-ascending")).toBe("asc")
	})

	it("should handle multi-word sort field with -descending", () => {
		expect(getSortDirection("order-total-descending")).toBe("desc")
	})
})
