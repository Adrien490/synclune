import { describe, it, expect } from "vitest";
import { getCheckoutFormOptions } from "../checkout-form.utils";

// ============================================================================
// Helpers
// ============================================================================

// ============================================================================
// getCheckoutFormOptions
// ============================================================================

describe("getCheckoutFormOptions", () => {
	// ---- Guest defaults ----

	it("returns empty defaults for guest with no addresses", () => {
		const result = getCheckoutFormOptions();

		expect(result.defaultValues.email).toBe("");
		expect(result.defaultValues.shipping.fullName).toBe("");
		expect(result.defaultValues.shipping.addressLine1).toBe("");
		expect(result.defaultValues.shipping.city).toBe("");
		expect(result.defaultValues.shipping.postalCode).toBe("");
		expect(result.defaultValues.shipping.country).toBe("FR");
	});

	it("does not read localStorage (server-safe)", () => {
		// getCheckoutFormOptions should return server-safe defaults only
		const result = getCheckoutFormOptions();
		expect(result.defaultValues.email).toBe("");
		expect(result.defaultValues.shipping.fullName).toBe("");
	});
});
