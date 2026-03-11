import { describe, it, expect } from "vitest";
import { addressSchema } from "../address-schema";
import { ADDRESS_ERROR_MESSAGES } from "@/shared/constants/address.constants";

const validAddress = {
	firstName: "Jean",
	lastName: "Dupont",
	address1: "12 rue de la Paix",
	postalCode: "75001",
	city: "Paris",
	country: "FR",
	phone: "+33612345678",
};

describe("addressSchema", () => {
	it("should accept a valid full address", () => {
		const result = addressSchema.safeParse(validAddress);
		expect(result.success).toBe(true);
	});

	it("should default country to FR when not provided", () => {
		const { country: _, ...withoutCountry } = validAddress;
		const result = addressSchema.safeParse(withoutCountry);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.country).toBe("FR");
		}
	});

	it("should accept an address with optional address2", () => {
		const result = addressSchema.safeParse({
			...validAddress,
			address2: "Appartement 3",
		});
		expect(result.success).toBe(true);
	});

	it("should accept null address2", () => {
		const result = addressSchema.safeParse({
			...validAddress,
			address2: null,
		});
		expect(result.success).toBe(true);
	});

	it("should accept undefined address2", () => {
		const result = addressSchema.safeParse({
			...validAddress,
			address2: undefined,
		});
		expect(result.success).toBe(true);
	});

	it("should reject firstName shorter than 2 characters", () => {
		const result = addressSchema.safeParse({ ...validAddress, firstName: "J" });
		expect(result.success).toBe(false);
		if (!result.success) {
			const messages = result.error.issues.map((e) => e.message);
			expect(messages).toContain(ADDRESS_ERROR_MESSAGES.FIRST_NAME_TOO_SHORT);
		}
	});

	it("should reject lastName shorter than 2 characters", () => {
		const result = addressSchema.safeParse({ ...validAddress, lastName: "D" });
		expect(result.success).toBe(false);
		if (!result.success) {
			const messages = result.error.issues.map((e) => e.message);
			expect(messages).toContain(ADDRESS_ERROR_MESSAGES.LAST_NAME_TOO_SHORT);
		}
	});

	it("should reject address1 shorter than 5 characters", () => {
		const result = addressSchema.safeParse({ ...validAddress, address1: "Rue" });
		expect(result.success).toBe(false);
		if (!result.success) {
			const messages = result.error.issues.map((e) => e.message);
			expect(messages).toContain(ADDRESS_ERROR_MESSAGES.ADDRESS_TOO_SHORT);
		}
	});

	it("should accept a 4-digit postal code (BE/AT/DK)", () => {
		const result = addressSchema.safeParse({ ...validAddress, postalCode: "1000" });
		expect(result.success).toBe(true);
	});

	it("should accept a postal code with space (NL format)", () => {
		const result = addressSchema.safeParse({ ...validAddress, postalCode: "1234 AB" });
		expect(result.success).toBe(true);
	});

	it("should reject a single character postal code", () => {
		const result = addressSchema.safeParse({ ...validAddress, postalCode: "7" });
		expect(result.success).toBe(false);
		if (!result.success) {
			const messages = result.error.issues.map((e) => e.message);
			expect(messages).toContain(ADDRESS_ERROR_MESSAGES.INVALID_POSTAL_CODE);
		}
	});

	it("should reject city shorter than 2 characters", () => {
		const result = addressSchema.safeParse({ ...validAddress, city: "P" });
		expect(result.success).toBe(false);
		if (!result.success) {
			const messages = result.error.issues.map((e) => e.message);
			expect(messages).toContain(ADDRESS_ERROR_MESSAGES.CITY_TOO_SHORT);
		}
	});

	it("should reject a non-shipping country", () => {
		const result = addressSchema.safeParse({ ...validAddress, country: "US" });
		expect(result.success).toBe(false);
	});

	it("should accept a valid EU country code", () => {
		const result = addressSchema.safeParse({ ...validAddress, country: "DE" });
		expect(result.success).toBe(true);
	});

	it("should reject an invalid phone number", () => {
		const result = addressSchema.safeParse({ ...validAddress, phone: "123" });
		expect(result.success).toBe(false);
		if (!result.success) {
			const messages = result.error.issues.map((e) => e.message);
			expect(messages).toContain(ADDRESS_ERROR_MESSAGES.INVALID_PHONE);
		}
	});

	it("should reject an empty phone number", () => {
		const result = addressSchema.safeParse({ ...validAddress, phone: "" });
		expect(result.success).toBe(false);
	});
});
