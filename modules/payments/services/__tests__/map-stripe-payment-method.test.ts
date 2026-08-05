import { describe, expect, it, vi, beforeEach } from "vitest";

const { mockStripe, mockLogger } = vi.hoisted(() => ({
	mockStripe: {
		charges: { retrieve: vi.fn() },
	},
	mockLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("@/shared/lib/stripe", () => ({ stripe: mockStripe }));
vi.mock("@/shared/lib/logger", () => ({ logger: mockLogger }));

vi.mock("@/app/generated/prisma/enums", () => ({
	PaymentMethod: {
		CARD: "CARD",
		LINK: "LINK",
		WALLET: "WALLET",
		OTHER: "OTHER",
	},
}));

import {
	extractPaymentDetailsFromPaymentIntent,
	mapPaymentMethodFromCharge,
} from "../map-stripe-payment-method";
import type Stripe from "stripe";

beforeEach(() => {
	vi.clearAllMocks();
});

/** Unix SECONDES — c'est l'unité de `Charge.created` côté Stripe. */
const CAPTURED_AT_UNIX = 1_767_225_599; // 2025-12-31T23:59:59Z

function makeCharge(type: string, walletType?: string, created = CAPTURED_AT_UNIX): Stripe.Charge {
	const details: Record<string, unknown> = { type };
	if (type === "card") {
		details.card = walletType ? { wallet: { type: walletType } } : { wallet: null };
	}
	return { created, payment_method_details: details } as unknown as Stripe.Charge;
}

function makePI(latestCharge: string | Stripe.Charge | null): Stripe.PaymentIntent {
	return {
		id: "pi_test_1",
		latest_charge: latestCharge,
	} as unknown as Stripe.PaymentIntent;
}

describe("mapPaymentMethodFromCharge — Stripe → PaymentMethod enum", () => {
	it("maps 'card' (no wallet) → CARD", () => {
		expect(mapPaymentMethodFromCharge(makeCharge("card"))).toBe("CARD");
	});

	it("maps 'link' → LINK", () => {
		expect(mapPaymentMethodFromCharge(makeCharge("link"))).toBe("LINK");
	});

	// Les trois valeurs SEPA_DEBIT / KLARNA / BANCONTACT ont été retirées de l'enum
	// (audit V2, Lot 1) : le checkout est card-only, Stripe ne peut pas produire ces
	// types. La garde ici est qu'ils tombent en OTHER SANS throw — si un jour
	// `payment_method_types` est élargi sans rouvrir l'enum, la commande passe et le
	// moyen est simplement mal typé, plutôt que le webhook n'échoue.
	it.each(["sepa_debit", "klarna", "bancontact"])(
		"maps '%s' (moyen retiré de l'enum) → OTHER sans throw",
		(type) => {
			expect(mapPaymentMethodFromCharge(makeCharge(type))).toBe("OTHER");
		},
	);

	it("maps 'card' with wallet.type=apple_pay → WALLET", () => {
		expect(mapPaymentMethodFromCharge(makeCharge("card", "apple_pay"))).toBe("WALLET");
	});

	it("maps 'card' with wallet.type=google_pay → WALLET", () => {
		expect(mapPaymentMethodFromCharge(makeCharge("card", "google_pay"))).toBe("WALLET");
	});

	it("maps 'card' with wallet.type=link → LINK (specific carve-out)", () => {
		expect(mapPaymentMethodFromCharge(makeCharge("card", "link"))).toBe("LINK");
	});

	it("maps unknown type 'pix' → OTHER (no throw)", () => {
		expect(mapPaymentMethodFromCharge(makeCharge("pix"))).toBe("OTHER");
	});

	it("returns OTHER when charge or details is missing", () => {
		expect(mapPaymentMethodFromCharge(null)).toBe("OTHER");
		expect(
			mapPaymentMethodFromCharge({ payment_method_details: null } as unknown as Stripe.Charge),
		).toBe("OTHER");
	});
});

describe("extractPaymentDetailsFromPaymentIntent — webhook entrypoint", () => {
	it("reads expanded latest_charge directly (no API call)", async () => {
		const pi = makePI(makeCharge("card"));
		const result = await extractPaymentDetailsFromPaymentIntent(pi);
		expect(result.method).toBe("CARD");
		expect(mockStripe.charges.retrieve).not.toHaveBeenCalled();
	});

	it("retrieves charge when latest_charge is a string id", async () => {
		mockStripe.charges.retrieve.mockResolvedValue(makeCharge("link"));
		const pi = makePI("ch_test_1");
		const result = await extractPaymentDetailsFromPaymentIntent(pi);
		expect(result.method).toBe("LINK");
		expect(mockStripe.charges.retrieve).toHaveBeenCalledWith("ch_test_1");
	});

	it("returns nulls when no latest_charge exists (rare PI without capture)", async () => {
		const pi = makePI(null);
		const result = await extractPaymentDetailsFromPaymentIntent(pi);
		expect(result).toEqual({ method: null, capturedAt: null });
		expect(mockLogger.warn).toHaveBeenCalled();
	});

	it("returns nulls when Stripe API fails (best-effort, no throw)", async () => {
		mockStripe.charges.retrieve.mockRejectedValue(new Error("Network error"));
		const pi = makePI("ch_test_1");
		const result = await extractPaymentDetailsFromPaymentIntent(pi);
		expect(result).toEqual({ method: null, capturedAt: null });
		expect(mockLogger.error).toHaveBeenCalledWith(
			"extractPaymentDetailsFromPaymentIntent failed (Stripe API)",
			expect.any(Error),
			expect.objectContaining({ service: "payments", paymentIntentId: "pi_test_1" }),
		);
	});

	it("Apple Pay flow : retrieves charge with wallet.type → WALLET", async () => {
		mockStripe.charges.retrieve.mockResolvedValue(makeCharge("card", "apple_pay"));
		const pi = makePI("ch_apple_1");
		const result = await extractPaymentDetailsFromPaymentIntent(pi);
		expect(result.method).toBe("WALLET");
	});

	it("moyen retiré de l'enum : retrieves charge with type=bancontact → OTHER", async () => {
		mockStripe.charges.retrieve.mockResolvedValue(makeCharge("bancontact"));
		const pi = makePI("ch_bancontact_1");
		const result = await extractPaymentDetailsFromPaymentIntent(pi);
		expect(result.method).toBe("OTHER");
	});
});

/**
 * @regression paid-at-from-stripe-capture-2026-08-05
 *
 * `Charge.created` doit remonter jusqu'à l'appelant : c'est lui qui devient
 * `Order.paidAt`, donc la date du livre de recettes (Art. 50-0 CGI), la borne de
 * la fenêtre annuelle du seuil de franchise TVA et la ligne « Payé le : … » du
 * PDF de facture scellé dix ans sous SHA-256.
 *
 * Le défaut d'origine : la fonction ne rendait QUE le `PaymentMethod` et jetait
 * la charge — l'appelant retombait sur `new Date()`, l'horloge du TRAITEMENT.
 * L'écart est nul en nominal et devient réel dès qu'un webhook est redélivré
 * (Stripe retente 3 jours) ou que le rattrapage MANUEL `sync-async-payments`
 * s'en charge.
 */
describe("extractPaymentDetailsFromPaymentIntent — capturedAt (@regression)", () => {
	it("converts Charge.created (Unix SECONDES) into a Date", async () => {
		mockStripe.charges.retrieve.mockResolvedValue(makeCharge("card"));
		const result = await extractPaymentDetailsFromPaymentIntent(makePI("ch_test_1"));

		// Le piège que cette assertion verrouille : traiter `created` comme des
		// millisecondes rendrait le 21 janvier 1970.
		expect(result.capturedAt).toEqual(new Date(CAPTURED_AT_UNIX * 1000));
		expect(result.capturedAt?.getUTCFullYear()).toBe(2025);
	});

	it("reads capturedAt from an already-expanded latest_charge too", async () => {
		const result = await extractPaymentDetailsFromPaymentIntent(makePI(makeCharge("card")));
		expect(result.capturedAt).toEqual(new Date(CAPTURED_AT_UNIX * 1000));
		expect(mockStripe.charges.retrieve).not.toHaveBeenCalled();
	});

	it("yields null (never a bogus epoch date) when the charge carries no created", async () => {
		mockStripe.charges.retrieve.mockResolvedValue({
			payment_method_details: { type: "card", card: { wallet: null } },
		});
		const result = await extractPaymentDetailsFromPaymentIntent(makePI("ch_test_1"));

		// `null` laisse l'appelant retomber sur `new Date()`, ce qui garde le CHECK
		// `Order_paid_requires_paidAt` satisfait. Un `new Date(0)` écrirait 1970 sur
		// une facture.
		expect(result.capturedAt).toBeNull();
		expect(result.method).toBe("CARD");
	});
});
