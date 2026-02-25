import { describe, it, expect } from "vitest"
import { stringOrDateSchema } from "../date.schemas"

describe("stringOrDateSchema", () => {
	it("should accept a valid ISO date string and transform it to a Date", () => {
		const result = stringOrDateSchema.safeParse("2024-06-15T10:00:00.000Z")
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data).toBeInstanceOf(Date)
			expect(result.data?.toISOString()).toBe("2024-06-15T10:00:00.000Z")
		}
	})

	it("should accept a Date object and return it as-is", () => {
		const date = new Date("2024-01-01")
		const result = stringOrDateSchema.safeParse(date)
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data).toBeInstanceOf(Date)
			expect(result.data?.getTime()).toBe(date.getTime())
		}
	})

	it("should accept undefined (schema is optional)", () => {
		const result = stringOrDateSchema.safeParse(undefined)
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data).toBeUndefined()
		}
	})

	it("should return undefined for an invalid date string", () => {
		const result = stringOrDateSchema.safeParse("not-a-date")
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data).toBeUndefined()
		}
	})

	it("should accept a simple date string (YYYY-MM-DD) and transform to Date", () => {
		const result = stringOrDateSchema.safeParse("2024-12-25")
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data).toBeInstanceOf(Date)
		}
	})

	it("should reject a number (not a string or Date)", () => {
		const result = stringOrDateSchema.safeParse(1234567890)
		expect(result.success).toBe(false)
	})

	it("should reject null", () => {
		const result = stringOrDateSchema.safeParse(null)
		expect(result.success).toBe(false)
	})
})
