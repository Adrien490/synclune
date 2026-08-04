/**
 * @regression stripe-idempotency-key-bounds
 *
 * `docs.stripe.com/api/idempotent_requests` : « Idempotency keys are up to 255
 * characters long. Avoid using sensitive data (for example, email addresses or
 * personal identifiers) as idempotency keys. »
 *
 * Les deux clés du tunnel violaient chacune une moitié de cette phrase :
 *
 *  · `pi-init-${ownerKey}-${customerKey}-${total}-${cartHash}` grandissait avec le
 *    panier (~32 c. par ligne sur un préfixe de ~70 c.) et franchissait 255 c. dès
 *    **6 SKU distincts** — alors que `MAX_CART_ITEMS` en autorise 50. Rien ne le
 *    signalait : la clé part dans un en-tête, `tsc` ne la mesure pas, et aucun test
 *    ne montait un panier de plus de trois lignes.
 *  · `customer-create-${email}` mettait l'adresse e-mail en clair dans cet en-tête.
 *
 * Ce test tient la borne au pire cas réel (`MAX_CART_ITEMS` lignes) et non sur un
 * panier de démonstration — c'est précisément l'écart entre les deux qui avait
 * laissé passer le défaut.
 */
import { describe, expect, it } from "vitest";
import {
	buildIdempotencyKey,
	STRIPE_IDEMPOTENCY_KEY_MAX_LENGTH,
} from "@/shared/lib/stripe-idempotency";
import { MAX_CART_ITEMS } from "@/modules/cart/constants/cart";

/** Reproduit la forme exacte des composantes de `initialize-payment.ts`. */
function piInitKeyForCartOf(lines: number): string {
	const cartHash = Array.from(
		{ length: lines },
		(_, i) => `clx${String(i).padStart(21, "0")}:3:12900`,
	)
		.sort()
		.join("|");

	return buildIdempotencyKey("pi-init", [
		crypto.randomUUID(), // ownerKey : session invité
		"cus_ABCDEFGHIJKLMN", // customerKey
		"249900", // total
		cartHash,
	]);
}

describe("clés d'idempotence Stripe (@regression stripe-idempotency-key-bounds)", () => {
	it("reste sous 255 caractères sur un panier PLEIN (MAX_CART_ITEMS)", () => {
		const key = piInitKeyForCartOf(MAX_CART_ITEMS);
		expect(key.length).toBeLessThanOrEqual(STRIPE_IDEMPOTENCY_KEY_MAX_LENGTH);
	});

	it("a une longueur INDÉPENDANTE de la taille du panier", () => {
		// Le vrai invariant : ce n'est pas « ça tient à 50 », c'est « ça ne grandit
		// pas ». Une clé qui grandit finit toujours par franchir la borne.
		expect(piInitKeyForCartOf(1).length).toBe(piInitKeyForCartOf(MAX_CART_ITEMS).length);
	});

	it("ne laisse fuir aucune donnée personnelle", () => {
		const email = "leane.cliente@example.com";
		const key = buildIdempotencyKey("customer-create", [email]);

		expect(key).not.toContain(email);
		expect(key).not.toContain("example.com");
		expect(key).toMatch(/^customer-create-[0-9a-f]{64}$/);
	});

	it("est déterministe — mêmes composantes, même clé", () => {
		const parts = ["owner", "cus_1", "1000", "sku:1:500"];
		expect(buildIdempotencyKey("pi-init", parts)).toBe(buildIdempotencyKey("pi-init", parts));
	});

	it("sépare les composantes sans ambiguïté", () => {
		// Sans séparateur, ["a","bc"] et ["ab","c"] se concaténeraient en "abc" :
		// deux paniers différents partageraient une clé, donc un PaymentIntent.
		expect(buildIdempotencyKey("k", ["a", "bc"])).not.toBe(buildIdempotencyKey("k", ["ab", "c"]));
	});
});
