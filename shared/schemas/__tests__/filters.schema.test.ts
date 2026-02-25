import { describe, it, expect } from "vitest"
import {
	stringOrStringArraySchema,
	optionalStringOrStringArraySchema,
} from "../filters.schema"

describe("stringOrStringArraySchema", () => {
	it("should accept a valid single string", () => {
		const result = stringOrStringArraySchema.safeParse("collection-abc")
		expect(result.success).toBe(true)
	})

	it("should accept an array of strings", () => {
		const result = stringOrStringArraySchema.safeParse(["red", "blue", "green"])
		expect(result.success).toBe(true)
	})

	it("should accept an array with a single string", () => {
		const result = stringOrStringArraySchema.safeParse(["gold"])
		expect(result.success).toBe(true)
	})

	it("should reject an empty string", () => {
		const result = stringOrStringArraySchema.safeParse("")
		expect(result.success).toBe(false)
	})

	it("should reject an array containing an empty string", () => {
		const result = stringOrStringArraySchema.safeParse(["valid", ""])
		expect(result.success).toBe(false)
	})

	it("should reject a number", () => {
		const result = stringOrStringArraySchema.safeParse(42)
		expect(result.success).toBe(false)
	})

	it("should reject undefined", () => {
		const result = stringOrStringArraySchema.safeParse(undefined)
		expect(result.success).toBe(false)
	})

	it("should reject a string exceeding the max length (100 chars)", () => {
		const tooLong = "a".repeat(101)
		const result = stringOrStringArraySchema.safeParse(tooLong)
		expect(result.success).toBe(false)
	})
})

describe("optionalStringOrStringArraySchema", () => {
	it("should accept a valid string", () => {
		const result = optionalStringOrStringArraySchema.safeParse("filter-value")
		expect(result.success).toBe(true)
	})

	it("should accept an array of strings", () => {
		const result = optionalStringOrStringArraySchema.safeParse(["a", "b"])
		expect(result.success).toBe(true)
	})

	it("should accept undefined", () => {
		const result = optionalStringOrStringArraySchema.safeParse(undefined)
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data).toBeUndefined()
		}
	})

	it("should reject an empty string", () => {
		const result = optionalStringOrStringArraySchema.safeParse("")
		expect(result.success).toBe(false)
	})
})
