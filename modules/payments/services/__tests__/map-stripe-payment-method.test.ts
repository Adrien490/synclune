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
	extractPaymentMethodFromPaymentIntent,
	mapPaymentMethodFromCharge,
} from "../map-stripe-payment-method";
import type Stripe from "stripe";

beforeEach(() => {
	vi.clearAllMocks();
});

function makeCharge(type: string, walletType?: string): Stripe.Charge {
	const details: Record<string, unknown> = { type };
	if (type === "card") {
		details.card = walletType ? { wallet: { type: walletType } } : { wallet: null };
	}
	return { payment_method_details: details } as unknown as Stripe.Charge;
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

describe("extractPaymentMethodFromPaymentIntent — webhook entrypoint", () => {
	it("reads expanded latest_charge directly (no API call)", async () => {
		const pi = makePI(makeCharge("card"));
		const result = await extractPaymentMethodFromPaymentIntent(pi);
		expect(result).toBe("CARD");
		expect(mockStripe.charges.retrieve).not.toHaveBeenCalled();
	});

	it("retrieves charge when latest_charge is a string id", async () => {
		mockStripe.charges.retrieve.mockResolvedValue(makeCharge("link"));
		const pi = makePI("ch_test_1");
		const result = await extractPaymentMethodFromPaymentIntent(pi);
		expect(result).toBe("LINK");
		expect(mockStripe.charges.retrieve).toHaveBeenCalledWith("ch_test_1");
	});

	it("returns null when no latest_charge exists (rare PI without capture)", async () => {
		const pi = makePI(null);
		const result = await extractPaymentMethodFromPaymentIntent(pi);
		expect(result).toBeNull();
		expect(mockLogger.warn).toHaveBeenCalled();
	});

	it("returns null when Stripe API fails (best-effort, no throw)", async () => {
		mockStripe.charges.retrieve.mockRejectedValue(new Error("Network error"));
		const pi = makePI("ch_test_1");
		const result = await extractPaymentMethodFromPaymentIntent(pi);
		expect(result).toBeNull();
		expect(mockLogger.error).toHaveBeenCalledWith(
			"extractPaymentMethodFromPaymentIntent failed (Stripe API)",
			expect.any(Error),
			expect.objectContaining({ service: "payments", paymentIntentId: "pi_test_1" }),
		);
	});

	it("Apple Pay flow : retrieves charge with wallet.type → WALLET", async () => {
		mockStripe.charges.retrieve.mockResolvedValue(makeCharge("card", "apple_pay"));
		const pi = makePI("ch_apple_1");
		const result = await extractPaymentMethodFromPaymentIntent(pi);
		expect(result).toBe("WALLET");
	});

	it("moyen retiré de l'enum : retrieves charge with type=bancontact → OTHER", async () => {
		mockStripe.charges.retrieve.mockResolvedValue(makeCharge("bancontact"));
		const pi = makePI("ch_bancontact_1");
		const result = await extractPaymentMethodFromPaymentIntent(pi);
		expect(result).toBe("OTHER");
	});
});
