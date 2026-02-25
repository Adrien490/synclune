import { describe, it, expect } from "vitest"
import {
	cursorSchema,
	directionSchema,
	CUID_LENGTH,
	PAGINATION_LIMITS,
	PAGINATION_DEFAULTS,
} from "../pagination-schema"

// Valid cursor: exactly 25 characters
const VALID_CURSOR = "a".repeat(CUID_LENGTH)

describe("cursorSchema", () => {
	it("should accept a string of exactly 25 characters", () => {
		const result = cursorSchema.safeParse(VALID_CURSOR)
		expect(result.success).toBe(true)
	})

	it("should accept undefined (schema is optional)", () => {
		const result = cursorSchema.safeParse(undefined)
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data).toBeUndefined()
		}
	})

	it("should reject a string shorter than 25 characters with Cursor invalide message", () => {
		const result = cursorSchema.safeParse("short")
		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error.issues[0]?.message).toBe("Cursor invalide")
		}
	})

	it("should reject a string longer than 25 characters", () => {
		const result = cursorSchema.safeParse("a".repeat(CUID_LENGTH + 1))
		expect(result.success).toBe(false)
	})

	it("should reject an empty string", () => {
		const result = cursorSchema.safeParse("")
		expect(result.success).toBe(false)
	})
})

describe("directionSchema", () => {
	it("should accept 'forward'", () => {
		const result = directionSchema.safeParse("forward")
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data).toBe("forward")
		}
	})

	it("should accept 'backward'", () => {
		const result = directionSchema.safeParse("backward")
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data).toBe("backward")
		}
	})

	it("should default to 'forward' when undefined", () => {
		const result = directionSchema.safeParse(undefined)
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data).toBe("forward")
		}
	})

	it("should reject an unknown direction string", () => {
		const result = directionSchema.safeParse("sideways")
		expect(result.success).toBe(false)
	})

	it("should reject an empty string", () => {
		const result = directionSchema.safeParse("")
		expect(result.success).toBe(false)
	})
})

describe("PAGINATION_LIMITS", () => {
	it("should have MAX_ADMIN set to 200", () => {
		expect(PAGINATION_LIMITS.MAX_ADMIN).toBe(200)
	})

	it("should have MAX_PUBLIC set to 50", () => {
		expect(PAGINATION_LIMITS.MAX_PUBLIC).toBe(50)
	})

	it("should have MAX_USER set to 100", () => {
		expect(PAGINATION_LIMITS.MAX_USER).toBe(100)
	})
})

describe("PAGINATION_DEFAULTS", () => {
	it("should have ADMIN default set to 20", () => {
		expect(PAGINATION_DEFAULTS.ADMIN).toBe(20)
	})

	it("should have COMPACT default set to 5", () => {
		expect(PAGINATION_DEFAULTS.COMPACT).toBe(5)
	})
})
