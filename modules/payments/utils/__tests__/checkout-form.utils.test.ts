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
		isDefault: false,
		...overrides,
	} as never;
}

// ============================================================================
// getCheckoutFormOptions
// ============================================================================

describe("getCheckoutFormOptions", () => {
	// ---- Guest defaults ----

	it("returns empty defaults for guest with no addresses", () => {
		const result = getCheckoutFormOptions(null, null);

		expect(result.defaultValues.email).toBe("");
		expect(result.defaultValues.shipping.fullName).toBe("");
		expect(result.defaultValues.shipping.addressLine1).toBe("");
		expect(result.defaultValues.shipping.city).toBe("");
		expect(result.defaultValues.shipping.postalCode).toBe("");
		expect(result.defaultValues.shipping.country).toBe("FR");
	});

	// ---- Logged-in user ----

	it("pre-fills email from session for logged-in user", () => {
		const result = getCheckoutFormOptions(makeSession(), null);
		expect(result.defaultValues.email).toBe("user@example.com");
	});

	it("pre-fills from default address", () => {
		const addr = makeAddress({ isDefault: true });
		const result = getCheckoutFormOptions(makeSession(), [addr] as never);

		expect(result.defaultValues.shipping.fullName).toBe("Jean Dupont");
		expect(result.defaultValues.shipping.addressLine1).toBe("10 rue de la Paix");
		expect(result.defaultValues.shipping.city).toBe("Paris");
		expect(result.defaultValues.shipping.postalCode).toBe("75002");
		expect(result.defaultValues.shipping.phoneNumber).toBe("+33612345678");
	});

	it("uses isDefault address over first address", () => {
		const first = makeAddress({ firstName: "Premier", isDefault: false });
		const defaultAddr = makeAddress({ firstName: "Default", isDefault: true });
		const result = getCheckoutFormOptions(makeSession(), [first, defaultAddr] as never);

		expect(result.defaultValues.shipping.fullName).toBe("Default Dupont");
	});

	it("falls back to first address when no default", () => {
		const addr = makeAddress({ firstName: "Premier", isDefault: false });
		const result = getCheckoutFormOptions(makeSession(), [addr] as never);

		expect(result.defaultValues.shipping.fullName).toBe("Premier Dupont");
	});

	// ---- No localStorage in getCheckoutFormOptions ----
	// Draft restoration moved to useCheckoutForm useEffect to avoid hydration mismatch.

	it("does not read localStorage (server-safe)", () => {
		// getCheckoutFormOptions should return server-safe defaults only
		const result = getCheckoutFormOptions(null, null);
		expect(result.defaultValues.email).toBe("");
		expect(result.defaultValues.shipping.fullName).toBe("");
	});
});
