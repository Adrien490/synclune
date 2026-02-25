import { describe, it, expect } from "vitest"
import { cuidSchema, userIdSchema, optionalUserIdSchema } from "../identifiers.schema"

// Valid CUID2: 25-character lowercase alphanumeric string starting with a letter
const VALID_CUID = "clh3z5k0n0000qwer1234abcd"

describe("cuidSchema", () => {
	it("should accept a valid CUID2", () => {
		const result = cuidSchema.safeParse(VALID_CUID)
		expect(result.success).toBe(true)
	})

	it("should reject a random short string that is not a CUID2", () => {
		const result = cuidSchema.safeParse("not-a-cuid")
		expect(result.success).toBe(false)
	})

	it("should reject an empty string", () => {
		const result = cuidSchema.safeParse("")
		expect(result.success).toBe(false)
	})

	it("should reject a UUID (wrong format for CUID2)", () => {
		const result = cuidSchema.safeParse("550e8400-e29b-41d4-a716-446655440000")
		expect(result.success).toBe(false)
	})

	it("should reject undefined", () => {
		const result = cuidSchema.safeParse(undefined)
		expect(result.success).toBe(false)
	})

	it("should reject a string with uppercase letters", () => {
		// CUID2 requires lowercase
		const result = cuidSchema.safeParse("CLH3Z5K0N0000QWER1234ABCD")
		expect(result.success).toBe(false)
	})
})

describe("userIdSchema", () => {
	it("should accept a non-empty string", () => {
		const result = userIdSchema.safeParse("user_abc123")
		expect(result.success).toBe(true)
	})

	it("should accept a valid CUID2 as user id", () => {
		const result = userIdSchema.safeParse(VALID_CUID)
		expect(result.success).toBe(true)
	})

	it("should trim whitespace", () => {
		const result = userIdSchema.safeParse("  user123  ")
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data).toBe("user123")
		}
	})

	it("should reject an empty string", () => {
		const result = userIdSchema.safeParse("")
		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error.issues[0]?.message).toBe("ID utilisateur requis")
		}
	})

	it("should reject a whitespace-only string", () => {
		const result = userIdSchema.safeParse("   ")
		expect(result.success).toBe(false)
	})

	it("should reject undefined", () => {
		const result = userIdSchema.safeParse(undefined)
		expect(result.success).toBe(false)
	})
})

describe("optionalUserIdSchema", () => {
	it("should accept a valid user id", () => {
		const result = optionalUserIdSchema.safeParse("user_abc123")
		expect(result.success).toBe(true)
	})

	it("should accept undefined", () => {
		const result = optionalUserIdSchema.safeParse(undefined)
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data).toBeUndefined()
		}
	})

	it("should reject an empty string", () => {
		const result = optionalUserIdSchema.safeParse("")
		expect(result.success).toBe(false)
	})
})
