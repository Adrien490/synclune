import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mocks — must be defined before any module under test is imported.
// ---------------------------------------------------------------------------

const { mockIsValidPhoneNumber } = vi.hoisted(() => ({
	mockIsValidPhoneNumber: vi.fn(),
}));

vi.mock("libphonenumber-js", () => ({
	isValidPhoneNumber: mockIsValidPhoneNumber,
}));

vi.mock("../constants/address.constants", () => ({
	ADDRESS_CONSTANTS: {
		MIN_NAME_LENGTH: 2,
		MAX_NAME_LENGTH: 50,
		MIN_ADDRESS_LENGTH: 5,
		MAX_ADDRESS_LENGTH: 100,
		MIN_CITY_LENGTH: 2,
		MAX_CITY_LENGTH: 50,
		POSTAL_CODE_REGEX: /^[0-9]{5}$/,
		DEFAULT_COUNTRY: "FR",
	},
	ADDRESS_ERROR_MESSAGES: {
		FIRST_NAME_TOO_SHORT: "Le prenom doit contenir au moins 2 caracteres",
		FIRST_NAME_TOO_LONG: "Le prenom ne peut pas depasser 50 caracteres",
		LAST_NAME_TOO_SHORT: "Le nom doit contenir au moins 2 caracteres",
		LAST_NAME_TOO_LONG: "Le nom ne peut pas depasser 50 caracteres",
		ADDRESS_TOO_SHORT: "L'adresse doit contenir au moins 5 caracteres",
		ADDRESS_TOO_LONG: "L'adresse ne peut pas depasser 100 caracteres",
		CITY_TOO_SHORT: "La ville doit contenir au moins 2 caracteres",
		CITY_TOO_LONG: "La ville ne peut pas depasser 50 caracteres",
		INVALID_POSTAL_CODE: "Le code postal doit contenir 5 chiffres",
		PHONE_REQUIRED: "Le numero de telephone est requis",
		INVALID_PHONE: "Le numero de telephone doit etre au format francais valide",
	},
	MAX_ADDRESSES_PER_USER: 10,
	ADDRESS_LIMIT_ERROR: "Vous ne pouvez pas enregistrer plus de 10 adresses",
}));

vi.mock("@/shared/constants/countries", () => ({
	SHIPPING_COUNTRIES: ["FR", "MC", "BE", "DE", "IT", "ES"] as const,
	COUNTRY_ERROR_MESSAGE: "Nous ne livrons actuellement qu'en France et dans l'Union Europeenne.",
}));

import { addressFormSchema } from "../address-form.schema";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALID_ADDRESS = {
	firstName: "Marie",
	lastName: "Dupont",
	address1: "12 Rue de la Paix",
	postalCode: "75001",
	city: "Paris",
	country: "FR" as const,
	phone: "+33612345678",
};

beforeEach(() => {
	// Default: phone is valid
	mockIsValidPhoneNumber.mockReturnValue(true);
});

// ============================================================================
// addressFormSchema
// ============================================================================

describe("addressFormSchema", () => {
	it("accepts a valid French address", () => {
		const result = addressFormSchema.safeParse(VALID_ADDRESS);
		expect(result.success).toBe(true);
	});

	describe("firstName field", () => {
		it("rejects firstName shorter than 2 characters", () => {
			const result = addressFormSchema.safeParse({
				...VALID_ADDRESS,
				firstName: "A",
			});
			expect(result.success).toBe(false);
			if (!result.success) {
				const paths = result.error.issues.map((i) => i.path.join("."));
				expect(paths).toContain("firstName");
			}
		});

		it("accepts firstName at exactly 2 characters", () => {
			const result = addressFormSchema.safeParse({
				...VALID_ADDRESS,
				firstName: "Al",
			});
			expect(result.success).toBe(true);
		});

		it("accepts firstName at exactly 50 characters", () => {
			const result = addressFormSchema.safeParse({
				...VALID_ADDRESS,
				firstName: "a".repeat(50),
			});
			expect(result.success).toBe(true);
		});

		it("rejects firstName longer than 50 characters", () => {
			const result = addressFormSchema.safeParse({
				...VALID_ADDRESS,
				firstName: "a".repeat(51),
			});
			expect(result.success).toBe(false);
		});

		it("trims firstName whitespace", () => {
			const result = addressFormSchema.safeParse({
				...VALID_ADDRESS,
				firstName: "  Marie  ",
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.firstName).toBe("Marie");
			}
		});
	});

	describe("lastName field", () => {
		it("rejects lastName longer than 50 characters", () => {
			const result = addressFormSchema.safeParse({
				...VALID_ADDRESS,
				lastName: "a".repeat(51),
			});
			expect(result.success).toBe(false);
			if (!result.success) {
				const paths = result.error.issues.map((i) => i.path.join("."));
				expect(paths).toContain("lastName");
			}
		});

		it("accepts lastName at exactly 50 characters", () => {
			const result = addressFormSchema.safeParse({
				...VALID_ADDRESS,
				lastName: "a".repeat(50),
			});
			expect(result.success).toBe(true);
		});

		it("rejects lastName shorter than 2 characters", () => {
			const result = addressFormSchema.safeParse({
				...VALID_ADDRESS,
				lastName: "D",
			});
			expect(result.success).toBe(false);
		});
	});

	describe("postalCode field", () => {
		it("accepts a valid 5-digit postal code (FR)", () => {
			const result = addressFormSchema.safeParse({
				...VALID_ADDRESS,
				postalCode: "06000",
			});
			expect(result.success).toBe(true);
		});

		it("accepts a 4-digit postal code (BE/AT/DK)", () => {
			const result = addressFormSchema.safeParse({
				...VALID_ADDRESS,
				postalCode: "1000",
			});
			expect(result.success).toBe(true);
		});

		it("accepts a postal code with space (NL format)", () => {
			const result = addressFormSchema.safeParse({
				...VALID_ADDRESS,
				postalCode: "1234 AB",
			});
			expect(result.success).toBe(true);
		});

		it("rejects a single character postal code", () => {
			const result = addressFormSchema.safeParse({
				...VALID_ADDRESS,
				postalCode: "7",
			});
			expect(result.success).toBe(false);
		});

		it("rejects an empty postal code", () => {
			const result = addressFormSchema.safeParse({
				...VALID_ADDRESS,
				postalCode: "",
			});
			expect(result.success).toBe(false);
		});
	});

	describe("country field", () => {
		it('rejects "US" as country (not in shipping countries)', () => {
			const result = addressFormSchema.safeParse({
				...VALID_ADDRESS,
				country: "US",
			});
			expect(result.success).toBe(false);
			if (!result.success) {
				const paths = result.error.issues.map((i) => i.path.join("."));
				expect(paths).toContain("country");
			}
		});

		it('accepts "FR" as country', () => {
			const result = addressFormSchema.safeParse({
				...VALID_ADDRESS,
				country: "FR",
			});
			expect(result.success).toBe(true);
		});

		it('accepts "BE" as country', () => {
			const result = addressFormSchema.safeParse({
				...VALID_ADDRESS,
				country: "BE",
			});
			expect(result.success).toBe(true);
		});

		it('accepts "DE" as country', () => {
			const result = addressFormSchema.safeParse({
				...VALID_ADDRESS,
				country: "DE",
			});
			expect(result.success).toBe(true);
		});
	});

	describe("phone field", () => {
		it("rejects an invalid phone number (mock returns false)", () => {
			mockIsValidPhoneNumber.mockReturnValue(false);
			const result = addressFormSchema.safeParse({
				...VALID_ADDRESS,
				phone: "0000000000",
			});
			expect(result.success).toBe(false);
			if (!result.success) {
				const paths = result.error.issues.map((i) => i.path.join("."));
				expect(paths).toContain("phone");
			}
		});

		it("accepts a valid phone number (mock returns true)", () => {
			mockIsValidPhoneNumber.mockReturnValue(true);
			const result = addressFormSchema.safeParse({
				...VALID_ADDRESS,
				phone: "+33612345678",
			});
			expect(result.success).toBe(true);
		});

		it("rejects an empty phone string", () => {
			const result = addressFormSchema.safeParse({
				...VALID_ADDRESS,
				phone: "",
			});
			expect(result.success).toBe(false);
		});
	});

	describe("address1 field", () => {
		it("rejects address1 shorter than 5 characters", () => {
			const result = addressFormSchema.safeParse({
				...VALID_ADDRESS,
				address1: "Rue",
			});
			expect(result.success).toBe(false);
			if (!result.success) {
				const paths = result.error.issues.map((i) => i.path.join("."));
				expect(paths).toContain("address1");
			}
		});

		it("accepts address1 at exactly 5 characters", () => {
			const result = addressFormSchema.safeParse({
				...VALID_ADDRESS,
				address1: "12 Av",
			});
			expect(result.success).toBe(true);
		});

		it("accepts address1 at exactly 100 characters", () => {
			const result = addressFormSchema.safeParse({
				...VALID_ADDRESS,
				address1: "a".repeat(100),
			});
			expect(result.success).toBe(true);
		});

		it("rejects address1 longer than 100 characters", () => {
			const result = addressFormSchema.safeParse({
				...VALID_ADDRESS,
				address1: "a".repeat(101),
			});
			expect(result.success).toBe(false);
		});
	});

	describe("city field", () => {
		it("rejects city longer than 50 characters", () => {
			const result = addressFormSchema.safeParse({
				...VALID_ADDRESS,
				city: "a".repeat(51),
			});
			expect(result.success).toBe(false);
			if (!result.success) {
				const paths = result.error.issues.map((i) => i.path.join("."));
				expect(paths).toContain("city");
			}
		});

		it("accepts city at exactly 50 characters", () => {
			const result = addressFormSchema.safeParse({
				...VALID_ADDRESS,
				city: "a".repeat(50),
			});
			expect(result.success).toBe(true);
		});

		it("rejects city shorter than 2 characters", () => {
			const result = addressFormSchema.safeParse({
				...VALID_ADDRESS,
				city: "P",
			});
			expect(result.success).toBe(false);
		});
	});

	describe("address2 field", () => {
		it("accepts address2 as optional (omitted)", () => {
			const { address2: _a2, ...withoutAddress2 } = {
				...VALID_ADDRESS,
				address2: "Apt 2",
			};
			const result = addressFormSchema.safeParse(withoutAddress2);
			expect(result.success).toBe(true);
		});

		it("accepts a valid address2 value", () => {
			const result = addressFormSchema.safeParse({
				...VALID_ADDRESS,
				address2: "Appartement 4B",
			});
			expect(result.success).toBe(true);
		});
	});
});
