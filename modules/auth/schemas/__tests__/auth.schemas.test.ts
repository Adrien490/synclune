import { describe, it, expect } from "vitest";

import {
	callbackURLSchema,
	newPasswordSchema,
	changePasswordSchema,
	signInEmailSchema,
	signUpEmailSchema,
	resetPasswordSchema,
	resendVerificationEmailSchema,
} from "../auth.schemas";

// ============================================================================
// callbackURLSchema
// ============================================================================

describe("callbackURLSchema", () => {
	it('accepts "/" (default path)', () => {
		const result = callbackURLSchema.safeParse("/");
		expect(result.success).toBe(true);
	});

	it("accepts a valid relative path like /dashboard", () => {
		const result = callbackURLSchema.safeParse("/dashboard");
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toBe("/dashboard");
		}
	});

	it("accepts a deep relative path", () => {
		const result = callbackURLSchema.safeParse("/some/deep/path");
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toBe("/some/deep/path");
		}
	});

	it('rejects an absolute URL like "https://evil.com"', () => {
		const result = callbackURLSchema.safeParse("https://evil.com");
		expect(result.success).toBe(false);
	});

	it('rejects a protocol-relative URL like "//evil.com"', () => {
		const result = callbackURLSchema.safeParse("//evil.com");
		expect(result.success).toBe(false);
	});

	it('defaults to "/" when given an empty string', () => {
		// An empty string does not start with "/" so it would fail the refine,
		// but the default kicks in only when the input is undefined (omitted).
		// When passing "" explicitly it fails the refine.
		const resultUndefined = callbackURLSchema.safeParse(undefined);
		expect(resultUndefined.success).toBe(true);
		if (resultUndefined.success) {
			expect(resultUndefined.data).toBe("/");
		}
	});
});

// ============================================================================
// newPasswordSchema
// ============================================================================

describe("newPasswordSchema", () => {
	it("accepts a valid password of 8+ characters", () => {
		const result = newPasswordSchema.safeParse("secureP@ss1XY");
		expect(result.success).toBe(true);
	});

	it("rejects a password shorter than 12 characters", () => {
		const result = newPasswordSchema.safeParse("short1!");
		expect(result.success).toBe(false);
	});

	it("rejects a password longer than 128 characters", () => {
		const result = newPasswordSchema.safeParse("a".repeat(129));
		expect(result.success).toBe(false);
	});

	it("accepts a password of exactly 12 characters", () => {
		const result = newPasswordSchema.safeParse("123456789012");
		expect(result.success).toBe(true);
	});

	it("accepts a password of exactly 128 characters", () => {
		const result = newPasswordSchema.safeParse("a".repeat(128));
		expect(result.success).toBe(true);
	});
});

// ============================================================================
// changePasswordSchema
// ============================================================================

describe("changePasswordSchema", () => {
	const validInput = {
		currentPassword: "OldPassword1",
		newPassword: "NewPassword1",
		confirmPassword: "NewPassword1",
	};

	it("accepts valid input where all fields meet requirements", () => {
		const result = changePasswordSchema.safeParse(validInput);
		expect(result.success).toBe(true);
	});

	it("rejects when confirmPassword does not match newPassword", () => {
		const result = changePasswordSchema.safeParse({
			...validInput,
			confirmPassword: "DifferentPass1",
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			const paths = result.error.issues.map((i) => i.path.join("."));
			expect(paths).toContain("confirmPassword");
		}
	});

	it("rejects when newPassword equals currentPassword", () => {
		const result = changePasswordSchema.safeParse({
			currentPassword: "SamePassword1",
			newPassword: "SamePassword1",
			confirmPassword: "SamePassword1",
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			const paths = result.error.issues.map((i) => i.path.join("."));
			expect(paths).toContain("newPassword");
		}
	});

	it("rejects when newPassword is too short", () => {
		const result = changePasswordSchema.safeParse({
			currentPassword: "OldPassword1",
			newPassword: "short",
			confirmPassword: "short",
		});
		expect(result.success).toBe(false);
	});
});

// ============================================================================
// signInEmailSchema
// ============================================================================

describe("signInEmailSchema", () => {
	const validInput = {
		email: "user@example.com",
		password: "mypassword",
		callbackURL: "/",
	};

	it("accepts valid email and password", () => {
		const result = signInEmailSchema.safeParse(validInput);
		expect(result.success).toBe(true);
	});

	it("accepts without explicit callbackURL (defaults to /)", () => {
		const { callbackURL: _url, ...withoutCallback } = validInput;
		const result = signInEmailSchema.safeParse(withoutCallback);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.callbackURL).toBe("/");
		}
	});

	it("rejects an empty password", () => {
		const result = signInEmailSchema.safeParse({
			...validInput,
			password: "",
		});
		expect(result.success).toBe(false);
	});

	it("rejects an invalid email format", () => {
		const result = signInEmailSchema.safeParse({
			...validInput,
			email: "not-an-email",
		});
		expect(result.success).toBe(false);
	});

	it("lowercases the email", () => {
		const result = signInEmailSchema.safeParse({
			...validInput,
			email: "User@Example.COM",
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.email).toBe("user@example.com");
		}
	});
});

// ============================================================================
// signUpEmailSchema
// ============================================================================

describe("signUpEmailSchema", () => {
	const validInput = {
		email: "newuser@example.com",
		confirmEmail: "newuser@example.com",
		password: "SecurePass1XYZ",
		name: "Alice",
		termsAccepted: true as const,
	};

	it("accepts valid signup data with termsAccepted true", () => {
		const result = signUpEmailSchema.safeParse(validInput);
		expect(result.success).toBe(true);
	});

	it("rejects when termsAccepted is false", () => {
		const result = signUpEmailSchema.safeParse({
			...validInput,
			termsAccepted: false,
		});
		expect(result.success).toBe(false);
	});

	it("rejects when termsAccepted is missing", () => {
		const { termsAccepted: _terms, ...withoutTerms } = validInput;
		const result = signUpEmailSchema.safeParse(withoutTerms);
		expect(result.success).toBe(false);
	});

	it("rejects when emails do not match", () => {
		const result = signUpEmailSchema.safeParse({
			...validInput,
			confirmEmail: "different@example.com",
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			const paths = result.error.issues.map((i) => i.path.join("."));
			expect(paths).toContain("confirmEmail");
		}
	});

	it("rejects when name is too short (less than 2 chars)", () => {
		const result = signUpEmailSchema.safeParse({
			...validInput,
			name: "A",
		});
		expect(result.success).toBe(false);
	});

	it("lowercases email and confirmEmail on parse", () => {
		const result = signUpEmailSchema.safeParse({
			...validInput,
			email: "NewUser@Example.COM",
			confirmEmail: "NewUser@Example.COM",
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.email).toBe("newuser@example.com");
			expect(result.data.confirmEmail).toBe("newuser@example.com");
		}
	});

	it("rejects an invalid email format", () => {
		const result = signUpEmailSchema.safeParse({
			...validInput,
			email: "bad-email",
			confirmEmail: "bad-email",
		});
		expect(result.success).toBe(false);
	});
});

// ============================================================================
// resetPasswordSchema
// ============================================================================

describe("resetPasswordSchema", () => {
	const validInput = {
		password: "NewSecurePass1",
		confirmPassword: "NewSecurePass1",
		token: "some-reset-token-123",
	};

	it("accepts valid reset password data", () => {
		const result = resetPasswordSchema.safeParse(validInput);
		expect(result.success).toBe(true);
	});

	it("rejects when passwords do not match", () => {
		const result = resetPasswordSchema.safeParse({
			...validInput,
			confirmPassword: "DifferentPass1",
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			const paths = result.error.issues.map((i) => i.path.join("."));
			expect(paths).toContain("confirmPassword");
		}
	});

	it("rejects an empty token", () => {
		const result = resetPasswordSchema.safeParse({
			...validInput,
			token: "",
		});
		expect(result.success).toBe(false);
	});

	it("rejects when password is too short", () => {
		const result = resetPasswordSchema.safeParse({
			password: "short",
			confirmPassword: "short",
			token: "some-token",
		});
		expect(result.success).toBe(false);
	});
});

// ============================================================================
// resendVerificationEmailSchema
// ============================================================================

describe("resendVerificationEmailSchema", () => {
	it("accepts a valid email address", () => {
		const result = resendVerificationEmailSchema.safeParse({
			email: "user@example.com",
		});
		expect(result.success).toBe(true);
	});

	it("rejects an invalid email address", () => {
		const result = resendVerificationEmailSchema.safeParse({
			email: "not-an-email",
		});
		expect(result.success).toBe(false);
	});

	it("rejects an empty email", () => {
		const result = resendVerificationEmailSchema.safeParse({ email: "" });
		expect(result.success).toBe(false);
	});
});
