/**
 * @regression stripe-metadata-boundary
 *
 * La metadata PaymentIntent est une donnée externe (Stripe) relue par le
 * webhook `payment_intent.succeeded` et par les actions d'ownership checkout
 * (`updatePaymentAmount`, `cancelOrphanPaymentIntent`). Avant ce schéma, elle
 * était accédée brute (`metadata.orderId`, `metadata.guestSessionId`…).
 *
 * Verrouille le contrat de `parsePaymentIntentMetadata` :
 * - fail-open PAR CHAMP : un champ malformé est droppé (undefined), les
 *   champs valides et les clés inconnues sont préservés — un webhook ne doit
 *   jamais crasher sur une metadata malformée ;
 * - pour les ownership checks, champ droppé → undefined → deny (sûr).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockLoggerWarn } = vi.hoisted(() => ({ mockLoggerWarn: vi.fn() }));

vi.mock("@/shared/lib/logger", () => ({
	logger: {
		warn: mockLoggerWarn,
		info: vi.fn(),
		error: vi.fn(),
	},
}));

import { paymentIntentMetadataSchema, parsePaymentIntentMetadata } from "../stripe-metadata.schema";

// cuid v1 réel (format @default(cuid()) Prisma, 25 chars préfixe c)
const ORDER_ID = "cm3x7k2ab0001qz8v4h2j9d3e";
const USER_ID = "cm3x7k2ab0002qz8v6f1k8c2d";
const GUEST_SESSION_ID = "550e8400-e29b-41d4-a716-446655440000";

describe("paymentIntentMetadataSchema", () => {
	it("accepte la metadata nominale du nouveau flow (confirm-checkout)", () => {
		const result = paymentIntentMetadataSchema.safeParse({
			orderId: ORDER_ID,
			orderNumber: "SYN-2026-00042",
			userId: USER_ID,
			guestSessionId: GUEST_SESSION_ID,
		});
		expect(result.success).toBe(true);
	});

	it("accepte la metadata legacy Checkout Session (order_id snake_case)", () => {
		const result = paymentIntentMetadataSchema.safeParse({ order_id: ORDER_ID });
		expect(result.success).toBe(true);
		if (result.success) expect(result.data.order_id).toBe(ORDER_ID);
	});

	it('accepte userId: "guest" (flow invité initialize-payment)', () => {
		const result = paymentIntentMetadataSchema.safeParse({
			userId: "guest",
			guestSessionId: GUEST_SESSION_ID,
		});
		expect(result.success).toBe(true);
		if (result.success) expect(result.data.userId).toBe("guest");
	});

	it("préserve les clés inconnues (looseObject — ex. reason d'auto-refund)", () => {
		const result = paymentIntentMetadataSchema.safeParse({
			orderId: ORDER_ID,
			reason: "orphan_charge_no_order",
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect((result.data as Record<string, unknown>).reason).toBe("orphan_charge_no_order");
		}
	});
});

describe("parsePaymentIntentMetadata (fail-open par champ)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("droppe un champ forgé et préserve le reste", () => {
		const parsed = parsePaymentIntentMetadata({
			orderId: "x".repeat(65), // dépasse la borne max(64) → droppé
			userId: USER_ID,
			guestSessionId: GUEST_SESSION_ID,
		});

		expect(parsed.orderId).toBeUndefined();
		expect(parsed.userId).toBe(USER_ID);
		expect(parsed.guestSessionId).toBe(GUEST_SESSION_ID);
		expect(mockLoggerWarn).toHaveBeenCalledOnce();
	});

	it("orderId court non-cuid PRÉSERVÉ (champ de résolution fail-soft, Prisma paramétré)", () => {
		// Un format strict droppérait un id légitime au moindre drift → skip handler.
		// La sûreté vient du lookup paramétré (id inconnu → skip), pas du format.
		const parsed = parsePaymentIntentMetadata({ orderId: "order-1" });
		expect(parsed.orderId).toBe("order-1");
		expect(mockLoggerWarn).not.toHaveBeenCalled();
	});

	it("droppe un guestSessionId non-UUID (ownership → deny)", () => {
		const parsed = parsePaymentIntentMetadata({
			userId: "guest",
			guestSessionId: "not-a-uuid",
		});

		expect(parsed.guestSessionId).toBeUndefined();
		expect(parsed.userId).toBe("guest");
	});

	it("ne crashe jamais : objet vide, null et undefined retournent {}", () => {
		expect(parsePaymentIntentMetadata({})).toEqual({});
		expect(parsePaymentIntentMetadata(null)).toEqual({});
		expect(parsePaymentIntentMetadata(undefined)).toEqual({});
		expect(mockLoggerWarn).not.toHaveBeenCalled();
	});

	it("metadata entièrement valide : aucun warn, passthrough intact", () => {
		const parsed = parsePaymentIntentMetadata({
			orderId: ORDER_ID,
			orderNumber: "SYN-2026-00042",
			userId: USER_ID,
		});

		expect(parsed.orderId).toBe(ORDER_ID);
		expect(parsed.orderNumber).toBe("SYN-2026-00042");
		expect(mockLoggerWarn).not.toHaveBeenCalled();
	});

	it("tous les champs invalides → droppés (clés inconnues préservées) sans throw", () => {
		const parsed = parsePaymentIntentMetadata({
			orderId: "",
			userId: "??",
			guestSessionId: "xx",
			custom: "kept",
		});

		expect(parsed.orderId).toBeUndefined();
		expect(parsed.userId).toBeUndefined();
		expect(parsed.guestSessionId).toBeUndefined();
		expect((parsed as Record<string, unknown>).custom).toBe("kept");
	});
});
