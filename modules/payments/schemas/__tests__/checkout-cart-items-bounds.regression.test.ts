/**
 * @regression checkout-cart-items-bounds
 *
 * Audit « Checkout Stripe Elements » (2026-07-26), findings F3 + F4.
 *
 * Les lignes de commande soumises à `initializePayment` / `confirmCheckout`
 * viennent du CLIENT, jamais du panier serveur. Deux bornes manquaient :
 *
 *  - **Longueur** : `z.array(...).min(1)` sans `.max()` alors que le panier
 *    applique `MAX_CART_ITEMS = 50`. Un tableau arbitrairement long fait N
 *    requêtes DB (`Promise.all` de `getSkuDetails`, cache raté sur des skuId
 *    inexistants) puis N verrous `FOR UPDATE` dans une transaction de 30 s.
 *
 *  - **Unicité des skuId** : la vérification de stock compare `inventory` ligne
 *    par ligne, à la création ET dans le webhook. `[{X,3},{X,3}]` sur un stock
 *    de 5 passe les deux contrôles puis cumule son décrément → violation du
 *    CHECK `ProductSku_inventory_non_negative` DANS la transaction webhook, hors
 *    des chemins typés OversellError/AmountMismatchError : client débité,
 *    commande jamais PAID, retries Stripe en boucle. Empiler des lignes
 *    contournait au passage `MAX_QUANTITY_PER_ORDER`.
 *
 * Les DEUX schémas doivent porter la garde : le PaymentIntent est créé par
 * `initializePayment` avant tout `confirmCheckout`.
 */
import { describe, it, expect } from "vitest";
import { MAX_CART_ITEMS, MAX_QUANTITY_PER_ORDER } from "@/modules/cart/constants/cart";
import { confirmCheckoutSchema, initializePaymentSchema } from "../checkout.schema";

// cuid v1 réels (format @default(cuid()) Prisma), acceptés par la regex cuid2
const SKU_A = "cm3x7k2ab0001qz8v4h2j9d3e";
const SKU_B = "cm3x7k2ab0002qz8v4h2j9d3f";

function item(skuId: string, quantity = 1) {
	return { skuId, quantity, priceAtAdd: 2500 };
}

function distinctItems(count: number) {
	return Array.from({ length: count }, (_, i) =>
		item(`cm3x7k2ab${String(i).padStart(4, "0")}qz8v4h2j9d3e`),
	);
}

const CONFIRM_BASE = {
	shippingAddress: {
		fullName: "Jeanne Dupont",
		addressLine1: "12 rue des Lilas",
		city: "Nantes",
		postalCode: "44000",
		country: "FR" as const,
		phoneNumber: "+33612345678",
	},
	email: "jeanne@example.com",
	paymentIntentId: "pi_test1234567890",
	saveInfo: false,
};

/** Les deux schémas doivent se comporter identiquement sur `cartItems`. */
const SCHEMAS = [
	[
		"confirmCheckoutSchema",
		(cartItems: unknown) => confirmCheckoutSchema.safeParse({ ...CONFIRM_BASE, cartItems }),
	],
	[
		"initializePaymentSchema",
		(cartItems: unknown) => initializePaymentSchema.safeParse({ cartItems }),
	],
] as const;

describe("@regression checkout-cart-items-bounds — longueur du panier (F3)", () => {
	it.each(SCHEMAS)("%s accepte exactement MAX_CART_ITEMS lignes distinctes", (_name, parse) => {
		expect(parse(distinctItems(MAX_CART_ITEMS)).success).toBe(true);
	});

	it.each(SCHEMAS)("%s rejette MAX_CART_ITEMS + 1 lignes", (_name, parse) => {
		const result = parse(distinctItems(MAX_CART_ITEMS + 1));
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues.some((i) => i.message.includes(String(MAX_CART_ITEMS)))).toBe(
				true,
			);
		}
	});

	it.each(SCHEMAS)("%s rejette toujours un panier vide", (_name, parse) => {
		expect(parse([]).success).toBe(false);
	});
});

describe("@regression checkout-cart-items-bounds — unicité des skuId (F4)", () => {
	it.each(SCHEMAS)("%s rejette deux lignes portant le même skuId", (_name, parse) => {
		const result = parse([item(SKU_A, 3), item(SKU_A, 3)]);
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues.some((i) => i.message.includes("double"))).toBe(true);
		}
	});

	it.each(SCHEMAS)(
		"%s rejette l'empilement de lignes contournant MAX_QUANTITY_PER_ORDER",
		(_name, parse) => {
			const stacked = Array.from({ length: 5 }, () => item(SKU_A, MAX_QUANTITY_PER_ORDER));
			expect(parse(stacked).success).toBe(false);
		},
	);

	it.each(SCHEMAS)("%s accepte des skuId distincts", (_name, parse) => {
		expect(parse([item(SKU_A, 2), item(SKU_B, 3)]).success).toBe(true);
	});
});
