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

	/**
	 * ⚠️ Les trois bornes ci-dessous sont posées par des `.refine()`, donc **invisibles**
	 * au contrat `test/contract/zod-prisma-length-parity.contract.test.ts` : il introspecte
	 * les `.max()` déclarés, et une fonction de refine est opaque. Ces trois assertions
	 * sont le SEUL filet sur ce trio — sans elles, rien ne vérifie que
	 * `Order.shippingFirstName`/`shippingLastName` (`VarChar(50)`) et
	 * `Order.customerName` (`VarChar(100)`) sont tenus.
	 *
	 * Le mode d'échec est un `22001` Postgres DANS la transaction de paiement, rendu à la
	 * cliente en « Une erreur est survenue », sans indication du champ à corriger.
	 */
	it("rejette un prénom de plus de 50 caractères (colonne shippingFirstName)", () => {
		const result = confirmCheckoutSchema.safeParse({
			...validCheckout,
			shippingAddress: { ...validAddress, fullName: `${"A".repeat(51)} Doe` },
		});
		expect(result.success).toBe(false);
	});

	it("rejette un nom de plus de 50 caractères (colonne shippingLastName)", () => {
		const result = confirmCheckoutSchema.safeParse({
			...validCheckout,
			shippingAddress: { ...validAddress, fullName: `Jane ${"B".repeat(51)}` },
		});
		expect(result.success).toBe(false);
	});

	it("accepte exactement 50 + 50 caractères — la borne du nom complet est 100, pas 101", () => {
		// `MAX_FULL_NAME_LENGTH` vaut 100 : « prénom(50) + espace + nom(50) » = 101 doit
		// donc être REFUSÉ ici, par la borne du nom recomposé et non par le refine des
		// parties. C'est la borne de la colonne `Order.customerName` qui prime.
		const result = confirmCheckoutSchema.safeParse({
			...validCheckout,
			shippingAddress: { ...validAddress, fullName: `${"A".repeat(50)} ${"B".repeat(50)}` },
		});
		expect(result.success).toBe(false);
	});

	it("rejette un fullName sans espace — shippingLastName ne doit jamais être vide", () => {
		// `parseFullName("Leane")` rend `lastName: ""`, qui partirait figé dix ans dans le
		// snapshot et s'imprimerait tel quel sur la facture (Art. 286 CGI).
		const result = confirmCheckoutSchema.safeParse({
			...validCheckout,
			shippingAddress: { ...validAddress, fullName: "Leane" },
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
});
