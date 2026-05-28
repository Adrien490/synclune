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
		SEPA_DEBIT: "SEPA_DEBIT",
		KLARNA: "KLARNA",
		LINK: "LINK",
		WALLET: "WALLET",
		BANCONTACT: "BANCONTACT",
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

	it("maps 'sepa_debit' → SEPA_DEBIT", () => {
		expect(mapPaymentMethodFromCharge(makeCharge("sepa_debit"))).toBe("SEPA_DEBIT");
	});

	it("maps 'klarna' → KLARNA", () => {
		expect(mapPaymentMethodFromCharge(makeCharge("klarna"))).toBe("KLARNA");
	});

	it("maps 'link' → LINK", () => {
		expect(mapPaymentMethodFromCharge(makeCharge("link"))).toBe("LINK");
	});

	it("maps 'bancontact' → BANCONTACT", () => {
		expect(mapPaymentMethodFromCharge(makeCharge("bancontact"))).toBe("BANCONTACT");
	});

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
		const pi = makePI(makeCharge("sepa_debit"));
		const result = await extractPaymentMethodFromPaymentIntent(pi);
		expect(result).toBe("SEPA_DEBIT");
		expect(mockStripe.charges.retrieve).not.toHaveBeenCalled();
	});

	it("retrieves charge when latest_charge is a string id", async () => {
		mockStripe.charges.retrieve.mockResolvedValue(makeCharge("klarna"));
		const pi = makePI("ch_test_1");
		const result = await extractPaymentMethodFromPaymentIntent(pi);
		expect(result).toBe("KLARNA");
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

	it("Bancontact flow : retrieves charge with type=bancontact → BANCONTACT", async () => {
		mockStripe.charges.retrieve.mockResolvedValue(makeCharge("bancontact"));
		const pi = makePI("ch_bancontact_1");
		const result = await extractPaymentMethodFromPaymentIntent(pi);
		expect(result).toBe("BANCONTACT");
	});
});
