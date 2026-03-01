import { describe, it, expect, vi } from "vitest";

// Mock discount schemas to avoid deep dependency chain
vi.mock("@/modules/discounts/schemas/discount.schemas", () => {
	const { z } = require("zod");
	return {
		discountCodeSchema: z
			.string()
			.trim()
			.min(3)
			.max(30)
			.toUpperCase()
			.regex(/^[A-Z0-9-]+$/),
	};
});

import { createCheckoutSessionSchema } from "../create-checkout-session-schema";

// ============================================================================
// Helpers
// ============================================================================

const validAddress = {
	fullName: "Marie Dupont",
	addressLine1: "12 Rue de la Paix",
	city: "Paris",
	postalCode: "75001",
	country: "FR",
	phoneNumber: "+33612345678",
};

const validCartItem = {
	skuId: "clh1z2x3y4w5v6u7t8s9r0q1p",
	quantity: 2,
	priceAtAdd: 4999,
};

const validInput = {
	cartItems: [validCartItem],
	shippingAddress: validAddress,
};

// ============================================================================
// createCheckoutSessionSchema
// ============================================================================

describe("createCheckoutSessionSchema", () => {
	it("should accept valid checkout session data", () => {
		const result = createCheckoutSessionSchema.safeParse(validInput);
		expect(result.success).toBe(true);
	});

	it("should accept with optional email for guest checkout", () => {
		const result = createCheckoutSessionSchema.safeParse({
			...validInput,
			email: "guest@example.com",
		});
		expect(result.success).toBe(true);
	});

	it("should accept without email (email is optional)", () => {
		const { email: _e, ...withoutEmail } = { ...validInput, email: "test@test.com" };
		const result = createCheckoutSessionSchema.safeParse(withoutEmail);
		expect(result.success).toBe(true);
	});

	it("should accept with optional discountCode", () => {
		const result = createCheckoutSessionSchema.safeParse({
			...validInput,
			discountCode: "PROMO10",
		});
		expect(result.success).toBe(true);
	});

	it("should accept without discountCode (it is optional)", () => {
		const result = createCheckoutSessionSchema.safeParse(validInput);
		expect(result.success).toBe(true);
	});

	it("should reject an empty cartItems array", () => {
		const result = createCheckoutSessionSchema.safeParse({
			...validInput,
			cartItems: [],
		});
		expect(result.success).toBe(false);
	});

	it("should accept multiple cart items", () => {
		const result = createCheckoutSessionSchema.safeParse({
			...validInput,
			cartItems: [
				validCartItem,
				{ ...validCartItem, skuId: "clh2z2x3y4w5v6u7t8s9r0q2q", quantity: 1 },
			],
		});
		expect(result.success).toBe(true);
	});

	it("should reject cart item with quantity of 0", () => {
		const result = createCheckoutSessionSchema.safeParse({
			...validInput,
			cartItems: [{ ...validCartItem, quantity: 0 }],
		});
		expect(result.success).toBe(false);
	});

	it("should reject cart item with quantity exceeding MAX_QUANTITY_PER_ORDER (10)", () => {
		const result = createCheckoutSessionSchema.safeParse({
			...validInput,
			cartItems: [{ ...validCartItem, quantity: 11 }],
		});
		expect(result.success).toBe(false);
	});

	it("should accept cart item with quantity exactly at the limit (10)", () => {
		const result = createCheckoutSessionSchema.safeParse({
			...validInput,
			cartItems: [{ ...validCartItem, quantity: 10 }],
		});
		expect(result.success).toBe(true);
	});

	it("should reject cart item with non-integer quantity", () => {
		const result = createCheckoutSessionSchema.safeParse({
			...validInput,
			cartItems: [{ ...validCartItem, quantity: 1.5 }],
		});
		expect(result.success).toBe(false);
	});

	it("should reject cart item with negative priceAtAdd", () => {
		const result = createCheckoutSessionSchema.safeParse({
			...validInput,
			cartItems: [{ ...validCartItem, priceAtAdd: -100 }],
		});
		expect(result.success).toBe(false);
	});

	it("should reject cart item with zero priceAtAdd", () => {
		const result = createCheckoutSessionSchema.safeParse({
			...validInput,
			cartItems: [{ ...validCartItem, priceAtAdd: 0 }],
		});
		expect(result.success).toBe(false);
	});

	it("should reject when cartItems is missing", () => {
		const { cartItems: _c, ...withoutCart } = validInput;
		const result = createCheckoutSessionSchema.safeParse(withoutCart);
		expect(result.success).toBe(false);
	});
});

// ============================================================================
// addressSchema (tested via createCheckoutSessionSchema)
// ============================================================================

describe("addressSchema (via createCheckoutSessionSchema)", () => {
	it("should accept a valid French address", () => {
		const result = createCheckoutSessionSchema.safeParse(validInput);
		expect(result.success).toBe(true);
	});

	it("should accept a valid Belgian address", () => {
		const result = createCheckoutSessionSchema.safeParse({
			...validInput,
			shippingAddress: { ...validAddress, country: "BE" },
		});
		expect(result.success).toBe(true);
	});

	it("should reject a country not in SHIPPING_COUNTRIES", () => {
		const result = createCheckoutSessionSchema.safeParse({
			...validInput,
			shippingAddress: { ...validAddress, country: "US" },
		});
		expect(result.success).toBe(false);
	});

	it("should reject when country is missing", () => {
		const { country: _c, ...addressWithoutCountry } = validAddress;
		const result = createCheckoutSessionSchema.safeParse({
			...validInput,
			shippingAddress: addressWithoutCountry,
		});
		expect(result.success).toBe(false);
	});

	it("should reject fullName shorter than 2 characters", () => {
		const result = createCheckoutSessionSchema.safeParse({
			...validInput,
			shippingAddress: { ...validAddress, fullName: "A" },
		});
		expect(result.success).toBe(false);
	});

	it("should accept fullName of exactly 2 characters", () => {
		const result = createCheckoutSessionSchema.safeParse({
			...validInput,
			shippingAddress: { ...validAddress, fullName: "Al" },
		});
		expect(result.success).toBe(true);
	});

	it("should reject an empty addressLine1", () => {
		const result = createCheckoutSessionSchema.safeParse({
			...validInput,
			shippingAddress: { ...validAddress, addressLine1: "" },
		});
		expect(result.success).toBe(false);
	});

	it("should accept addressLine2 as optional (omitted)", () => {
		const { addressLine2: _a2, ...addressWithoutLine2 } = {
			...validAddress,
			addressLine2: "Apt 2",
		};
		const result = createCheckoutSessionSchema.safeParse({
			...validInput,
			shippingAddress: addressWithoutLine2,
		});
		expect(result.success).toBe(true);
	});

	it("should reject an empty city", () => {
		const result = createCheckoutSessionSchema.safeParse({
			...validInput,
			shippingAddress: { ...validAddress, city: "" },
		});
		expect(result.success).toBe(false);
	});

	it("should reject an empty postalCode", () => {
		const result = createCheckoutSessionSchema.safeParse({
			...validInput,
			shippingAddress: { ...validAddress, postalCode: "" },
		});
		expect(result.success).toBe(false);
	});

	it("should accept a postalCode of up to 20 characters", () => {
		const result = createCheckoutSessionSchema.safeParse({
			...validInput,
			shippingAddress: { ...validAddress, postalCode: "12345" },
		});
		expect(result.success).toBe(true);
	});

	it("should reject a postalCode exceeding 20 characters", () => {
		const result = createCheckoutSessionSchema.safeParse({
			...validInput,
			shippingAddress: { ...validAddress, postalCode: "1".repeat(21) },
		});
		expect(result.success).toBe(false);
	});

	it("should reject an invalid phone number", () => {
		const result = createCheckoutSessionSchema.safeParse({
			...validInput,
			shippingAddress: { ...validAddress, phoneNumber: "not-a-phone" },
		});
		expect(result.success).toBe(false);
	});

	it("should reject when shippingAddress is missing", () => {
		const { shippingAddress: _sa, ...withoutAddress } = validInput;
		const result = createCheckoutSessionSchema.safeParse(withoutAddress);
		expect(result.success).toBe(false);
	});

	it("should reject an invalid email format", () => {
		const result = createCheckoutSessionSchema.safeParse({
			...validInput,
			email: "not-an-email",
		});
		expect(result.success).toBe(false);
	});
});

// ============================================================================
// discountCode (via createCheckoutSessionSchema)
// ============================================================================

describe("discountCode (via createCheckoutSessionSchema)", () => {
	it("should accept a valid uppercase discount code", () => {
		const result = createCheckoutSessionSchema.safeParse({
			...validInput,
			discountCode: "SUMMER20",
		});
		expect(result.success).toBe(true);
	});

	it("should transform lowercase code to uppercase", () => {
		const result = createCheckoutSessionSchema.safeParse({
			...validInput,
			discountCode: "summer20",
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.discountCode).toBe("SUMMER20");
		}
	});

	it("should reject a discount code shorter than 3 characters", () => {
		const result = createCheckoutSessionSchema.safeParse({
			...validInput,
			discountCode: "AB",
		});
		expect(result.success).toBe(false);
	});

	it("should reject a discount code longer than 30 characters", () => {
		const result = createCheckoutSessionSchema.safeParse({
			...validInput,
			discountCode: "A".repeat(31),
		});
		expect(result.success).toBe(false);
	});

	it("should reject a code with special characters", () => {
		const result = createCheckoutSessionSchema.safeParse({
			...validInput,
			discountCode: "PROMO@2024",
		});
		expect(result.success).toBe(false);
	});

	it("should accept a code with hyphens", () => {
		const result = createCheckoutSessionSchema.safeParse({
			...validInput,
			discountCode: "PROMO-2024",
		});
		expect(result.success).toBe(true);
	});
});
