import { describe, it, expect } from "vitest"
import {
	emailSchema,
	emailOptionalSchema,
	EMAIL_ERROR_MESSAGES,
} from "../email.schemas"

describe("emailSchema", () => {
	it("should accept a valid email", () => {
		const result = emailSchema.safeParse("user@example.com")
		expect(result.success).toBe(true)
	})

	it("should lowercase the email", () => {
		const result = emailSchema.safeParse("USER@EXAMPLE.COM")
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data).toBe("user@example.com")
		}
	})

	it("should reject an email with surrounding whitespace (Zod v4 validates before trimming)", () => {
		// In Zod v4, .email() runs before .trim(), so whitespace-padded strings fail validation
		const result = emailSchema.safeParse("  user@example.com  ")
		expect(result.success).toBe(false)
	})

	it("should reject an empty string", () => {
		const result = emailSchema.safeParse("")
		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error.issues[0]?.message).toBe(EMAIL_ERROR_MESSAGES.REQUIRED)
		}
	})

	it("should reject an invalid email format (missing @)", () => {
		const result = emailSchema.safeParse("notanemail")
		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error.issues[0]?.message).toBe(EMAIL_ERROR_MESSAGES.INVALID_FORMAT)
		}
	})

	it("should reject an email missing domain", () => {
		const result = emailSchema.safeParse("user@")
		expect(result.success).toBe(false)
	})

	it("should reject an email missing local part", () => {
		const result = emailSchema.safeParse("@example.com")
		expect(result.success).toBe(false)
	})

	it("should accept an email with subdomains", () => {
		const result = emailSchema.safeParse("user@mail.example.co.uk")
		expect(result.success).toBe(true)
	})

	it("should reject undefined", () => {
		const result = emailSchema.safeParse(undefined)
		expect(result.success).toBe(false)
	})
})

describe("emailOptionalSchema", () => {
	it("should accept a valid email", () => {
		const result = emailOptionalSchema.safeParse("user@example.com")
		expect(result.success).toBe(true)
	})

	it("should accept undefined", () => {
		const result = emailOptionalSchema.safeParse(undefined)
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data).toBeUndefined()
		}
	})

	it("should reject an invalid email format", () => {
		const result = emailOptionalSchema.safeParse("notanemail")
		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error.issues[0]?.message).toBe(EMAIL_ERROR_MESSAGES.INVALID_FORMAT)
		}
	})

	it("should lowercase the email", () => {
		const result = emailOptionalSchema.safeParse("ADMIN@EXAMPLE.COM")
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data).toBe("admin@example.com")
		}
	})
})
