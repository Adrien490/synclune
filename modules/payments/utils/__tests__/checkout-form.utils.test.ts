import { describe, it, expect } from "vitest";
import { getCheckoutFormOptions } from "../checkout-form.utils";

// ============================================================================
// Helpers
// ============================================================================

function makeSession(overrides: Record<string, unknown> = {}) {
	return {
		user: {
			email: "user@example.com",
			...overrides,
		},
	} as never;
}

function makeAddress(overrides: Record<string, unknown> = {}) {
	return {
		firstName: "Jean",
		lastName: "Dupont",
		address1: "10 rue de la Paix",
		address2: "",
		city: "Paris",
		postalCode: "75002",
		country: "FR",
		phone: "+33612345678",
		...overrides,
	} as never;
}

// ============================================================================
// getCheckoutFormOptions
// ============================================================================

describe("getCheckoutFormOptions", () => {
	// ---- Guest defaults ----

	it("returns empty defaults for guest with no addresses", () => {
		const result = getCheckoutFormOptions(null);

		expect(result.defaultValues.email).toBe("");
		expect(result.defaultValues.shipping.fullName).toBe("");
		expect(result.defaultValues.shipping.addressLine1).toBe("");
		expect(result.defaultValues.shipping.city).toBe("");
		expect(result.defaultValues.shipping.postalCode).toBe("");
		expect(result.defaultValues.shipping.country).toBe("FR");
	});

	// ---- Logged-in user ----

	it("pre-fills email from session for logged-in user", () => {
		const result = getCheckoutFormOptions(makeSession());
		expect(result.defaultValues.email).toBe("user@example.com");
	});

	it("does not read localStorage (server-safe)", () => {
		// getCheckoutFormOptions should return server-safe defaults only
		const result = getCheckoutFormOptions(null);
		expect(result.defaultValues.email).toBe("");
		expect(result.defaultValues.shipping.fullName).toBe("");
	});
});
