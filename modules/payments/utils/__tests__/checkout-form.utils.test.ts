import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/shared/constants/storage-keys", () => ({
	STORAGE_KEYS: {
		CHECKOUT_FORM_DRAFT: "checkout-form-draft",
	},
}));

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

// Create a simple localStorage mock
const store: Record<string, string> = {};
const mockLocalStorage = {
	getItem: vi.fn((key: string) => store[key] ?? null),
	setItem: vi.fn((key: string, value: string) => {
		store[key] = value;
	}),
	removeItem: vi.fn((key: string) => {
		delete store[key];
	}),
	clear: vi.fn(() => {
		for (const key of Object.keys(store)) {
			delete store[key];
		}
	}),
	get length() {
		return Object.keys(store).length;
	},
	key: vi.fn((_index: number) => null),
};

function setDraft(draft: Record<string, unknown>) {
	store["checkout-form-draft"] = JSON.stringify(draft);
}

// ============================================================================
// getCheckoutFormOptions
// ============================================================================

describe("getCheckoutFormOptions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		for (const key of Object.keys(store)) {
			delete store[key];
		}
		vi.stubGlobal("localStorage", mockLocalStorage);
	});

	// ---- Guest defaults ----

	it("returns empty defaults for guest with no draft and no addresses", () => {
		const result = getCheckoutFormOptions(null, null);

		expect(result.defaultValues.email).toBe("");
		expect(result.defaultValues.shipping.fullName).toBe("");
		expect(result.defaultValues.shipping.addressLine1).toBe("");
		expect(result.defaultValues.shipping.city).toBe("");
		expect(result.defaultValues.shipping.postalCode).toBe("");
		expect(result.defaultValues.shipping.country).toBe("FR");
		expect(result.defaultValues.termsAccepted).toBe(false);
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

	// ---- Saved draft (localStorage) ----

	it("uses saved draft over address data", () => {
		const now = Date.now();
		setDraft({
			timestamp: now,
			email: "draft@example.com",
			shipping: {
				fullName: "Draft User",
				addressLine1: "42 avenue Draft",
				city: "Lyon",
				postalCode: "69001",
				country: "FR",
			},
		});

		const addr = makeAddress();
		const result = getCheckoutFormOptions(makeSession(), [addr] as never);

		expect(result.defaultValues.email).toBe("draft@example.com");
		expect(result.defaultValues.shipping.fullName).toBe("Draft User");
		expect(result.defaultValues.shipping.addressLine1).toBe("42 avenue Draft");
	});

	it("discards draft older than 1 hour", () => {
		const oneHourAgo = Date.now() - 61 * 60 * 1000;
		setDraft({
			timestamp: oneHourAgo,
			shipping: { fullName: "Old Draft" },
		});

		const result = getCheckoutFormOptions(null, null);

		expect(result.defaultValues.shipping.fullName).toBe("");
		expect(mockLocalStorage.removeItem).toHaveBeenCalledWith("checkout-form-draft");
	});

	it("keeps draft within 1 hour", () => {
		const thirtyMinAgo = Date.now() - 30 * 60 * 1000;
		setDraft({
			timestamp: thirtyMinAgo,
			shipping: { fullName: "Fresh Draft" },
		});

		const result = getCheckoutFormOptions(null, null);
		expect(result.defaultValues.shipping.fullName).toBe("Fresh Draft");
	});

	it("constructs fullName from old format firstName/lastName in draft", () => {
		setDraft({
			timestamp: Date.now(),
			shipping: { firstName: "Jean", lastName: "Martin" },
		});

		const result = getCheckoutFormOptions(null, null);
		expect(result.defaultValues.shipping.fullName).toBe("Jean Martin");
	});

	it("prefers fullName over firstName/lastName in draft", () => {
		setDraft({
			timestamp: Date.now(),
			shipping: {
				fullName: "Full Name",
				firstName: "First",
				lastName: "Last",
			},
		});

		const result = getCheckoutFormOptions(null, null);
		expect(result.defaultValues.shipping.fullName).toBe("Full Name");
	});

	// ---- Error handling ----

	it("handles invalid JSON in localStorage gracefully", () => {
		store["checkout-form-draft"] = "not-json{";
		const result = getCheckoutFormOptions(null, null);

		expect(result.defaultValues.shipping.fullName).toBe("");
		expect(mockLocalStorage.removeItem).toHaveBeenCalledWith("checkout-form-draft");
	});

	// ---- termsAccepted ----

	it("always sets termsAccepted to false", () => {
		setDraft({ timestamp: Date.now(), termsAccepted: true });
		const result = getCheckoutFormOptions(makeSession(), null);
		expect(result.defaultValues.termsAccepted).toBe(false);
	});
});
