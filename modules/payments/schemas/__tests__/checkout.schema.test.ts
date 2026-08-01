import { describe, it, expect } from "vitest";
import { confirmCheckoutSchema } from "@/modules/payments/schemas/checkout.schema";
import { MAX_QUANTITY_PER_ORDER } from "@/modules/cart/constants/cart";

// ============================================================================
// Helpers
// ============================================================================

const validAddress = {
	fullName: "Jane Doe",
	addressLine1: "12 Rue de la Paix",
	city: "Paris",
	postalCode: "75001",
	country: "FR",
	phoneNumber: "+33612345678",
};

// skuId au format cuid réel (F2 audit Zod : cartItemSchema.skuId = z.cuid2())
const SKU_ID_1 = "cm3x7k2ab0001qz8v4h2j9d3e";
const SKU_ID_2 = "cm3x7k2ab0002qz8v6f1k8c2d";

const validCartItem = {
	skuId: SKU_ID_1,
	quantity: 2,
	priceAtAdd: 4999,
};

const validCheckout = {
	cartItems: [validCartItem],
	shippingAddress: validAddress,
	paymentIntentId: "pi_test1234567890",
};

// ============================================================================
// confirmCheckoutSchema
// ============================================================================

describe("confirmCheckoutSchema", () => {
	// Valid data

	it("should accept a minimal valid checkout payload", () => {
		const result = confirmCheckoutSchema.safeParse(validCheckout);
		expect(result.success).toBe(true);
	});

	it("should accept multiple cart items", () => {
		const result = confirmCheckoutSchema.safeParse({
			...validCheckout,
			cartItems: [
				{ skuId: SKU_ID_1, quantity: 1, priceAtAdd: 1000 },
				{ skuId: SKU_ID_2, quantity: 3, priceAtAdd: 2500 },
			],
		});
		expect(result.success).toBe(true);
	});

	it("should accept an optional email field", () => {
		const result = confirmCheckoutSchema.safeParse({
			...validCheckout,
			email: "customer@example.com",
		});
		expect(result.success).toBe(true);
	});

	it("should accept an optional discountCode", () => {
		const result = confirmCheckoutSchema.safeParse({
			...validCheckout,
			discountCode: "PROMO10",
		});
		expect(result.success).toBe(true);
	});

	it("should accept quantity at maximum boundary", () => {
		const result = confirmCheckoutSchema.safeParse({
			...validCheckout,
			cartItems: [{ skuId: SKU_ID_1, quantity: MAX_QUANTITY_PER_ORDER, priceAtAdd: 500 }],
		});
		expect(result.success).toBe(true);
	});

	it("should accept a valid EU country code for shippingAddress", () => {
		const result = confirmCheckoutSchema.safeParse({
			...validCheckout,
			shippingAddress: { ...validAddress, country: "DE" },
		});
		expect(result.success).toBe(true);
	});

	it("should accept an optional addressLine2", () => {
		const result = confirmCheckoutSchema.safeParse({
			...validCheckout,
			shippingAddress: { ...validAddress, addressLine2: "Appartement 3" },
		});
		expect(result.success).toBe(true);
	});

	// Invalid data

	it("should reject an empty cartItems array", () => {
		const result = confirmCheckoutSchema.safeParse({ ...validCheckout, cartItems: [] });
		expect(result.success).toBe(false);
	});

	it("should reject a cart item with quantity 0", () => {
		const result = confirmCheckoutSchema.safeParse({
			...validCheckout,
			cartItems: [{ skuId: SKU_ID_1, quantity: 0, priceAtAdd: 500 }],
		});
		expect(result.success).toBe(false);
	});

	it("should reject a cart item with quantity exceeding maximum", () => {
		const result = confirmCheckoutSchema.safeParse({
			...validCheckout,
			cartItems: [{ skuId: SKU_ID_1, quantity: MAX_QUANTITY_PER_ORDER + 1, priceAtAdd: 500 }],
		});
		expect(result.success).toBe(false);
	});

	it("should reject a cart item with a non-positive priceAtAdd", () => {
		const result = confirmCheckoutSchema.safeParse({
			...validCheckout,
			cartItems: [{ skuId: SKU_ID_1, quantity: 1, priceAtAdd: 0 }],
		});
		expect(result.success).toBe(false);
	});

	it("should reject a fullName shorter than 2 characters", () => {
		const result = confirmCheckoutSchema.safeParse({
			...validCheckout,
			shippingAddress: { ...validAddress, fullName: "J" },
		});
		expect(result.success).toBe(false);
	});

	it("should reject an empty addressLine1", () => {
		const result = confirmCheckoutSchema.safeParse({
			...validCheckout,
			shippingAddress: { ...validAddress, addressLine1: "" },
		});
		expect(result.success).toBe(false);
	});

	it("should reject a country not in SHIPPING_COUNTRIES", () => {
		const result = confirmCheckoutSchema.safeParse({
			...validCheckout,
			shippingAddress: { ...validAddress, country: "US" },
		});
		expect(result.success).toBe(false);
	});

	it("should reject an invalid phone number", () => {
		const result = confirmCheckoutSchema.safeParse({
			...validCheckout,
			shippingAddress: { ...validAddress, phoneNumber: "not-a-phone" },
		});
		expect(result.success).toBe(false);
	});

	it("should reject an invalid email format", () => {
		const result = confirmCheckoutSchema.safeParse({
			...validCheckout,
			email: "not-an-email",
		});
		expect(result.success).toBe(false);
	});

	it("should reject a paymentIntentId not starting with pi_", () => {
		const result = confirmCheckoutSchema.safeParse({
			...validCheckout,
			paymentIntentId: "cs_test1234567890",
		});
		expect(result.success).toBe(false);
	});

	it("should reject a discountCode shorter than 3 characters", () => {
		const result = confirmCheckoutSchema.safeParse({ ...validCheckout, discountCode: "AB" });
		expect(result.success).toBe(false);
	});
});
