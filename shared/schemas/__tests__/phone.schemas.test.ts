import { describe, it, expect } from "vitest"
import { phoneSchema, PHONE_ERROR_MESSAGES } from "../phone.schemas"

describe("phoneSchema", () => {
	it("should accept a valid French mobile number in international format", () => {
		const result = phoneSchema.safeParse("+33612345678")
		expect(result.success).toBe(true)
	})

	it("should accept a valid French landline in international format", () => {
		const result = phoneSchema.safeParse("+33123456789")
		expect(result.success).toBe(true)
	})

	it("should accept a valid Belgian number", () => {
		const result = phoneSchema.safeParse("+32470123456")
		expect(result.success).toBe(true)
	})

	it("should accept a valid German number", () => {
		const result = phoneSchema.safeParse("+4915112345678")
		expect(result.success).toBe(true)
	})

	it("should reject an empty string with REQUIRED message", () => {
		const result = phoneSchema.safeParse("")
		expect(result.success).toBe(false)
		if (!result.success) {
			// Empty string triggers min(1) as first issue
			expect(result.error.issues[0]?.message).toBe(PHONE_ERROR_MESSAGES.REQUIRED)
		}
	})

	it("should reject a clearly invalid phone number with INVALID message", () => {
		const result = phoneSchema.safeParse("123")
		expect(result.success).toBe(false)
		if (!result.success) {
			// Passes min(1) but fails refine → single issue
			expect(result.error.issues[0]?.message).toBe(PHONE_ERROR_MESSAGES.INVALID)
		}
	})

	it("should reject random text with INVALID message", () => {
		const result = phoneSchema.safeParse("not-a-phone")
		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error.issues[0]?.message).toBe(PHONE_ERROR_MESSAGES.INVALID)
		}
	})

	it("should reject undefined", () => {
		const result = phoneSchema.safeParse(undefined)
		expect(result.success).toBe(false)
	})
})
