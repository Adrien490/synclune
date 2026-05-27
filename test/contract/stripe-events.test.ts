/**
 * Contract tests Stripe ↔ Synclune.
 *
 * Charge chaque fixture JSON sous `test/fixtures/stripe/` et vérifie :
 * 1. la fixture respecte la structure d'un `Stripe.Event` (id, type, data.object)
 * 2. le `isEventSupported(type)` du registry retourne `true`
 * 3. `dispatchEvent(event)` route vers le handler attendu sans throw inattendu
 *
 * Si Stripe modifie un payload (champ requis ajouté), une fixture devient
 * obsolète et ce test casse. Procédure : regénérer via `stripe trigger <type>
 * --print-json` (cf `test/fixtures/stripe/README.md`).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type Stripe from "stripe";

const {
	mockHandleCheckoutCompleted,
	mockHandleCheckoutExpired,
	mockHandleAsyncSucceeded,
	mockHandleAsyncFailed,
	mockHandleChargeRefunded,
	mockHandleRefundUpdated,
	mockHandleRefundFailed,
	mockHandleDisputeCreated,
	mockHandleDisputeClosed,
	mockHandlePaymentSuccess,
	mockHandlePaymentFailure,
	mockHandlePaymentCanceled,
} = vi.hoisted(() => ({
	mockHandleCheckoutCompleted: vi.fn().mockResolvedValue({ success: true, tasks: [] }),
	mockHandleCheckoutExpired: vi.fn().mockResolvedValue({ success: true, tasks: [] }),
	mockHandleAsyncSucceeded: vi.fn().mockResolvedValue({ success: true, tasks: [] }),
	mockHandleAsyncFailed: vi.fn().mockResolvedValue({ success: true, tasks: [] }),
	mockHandleChargeRefunded: vi.fn().mockResolvedValue({ success: true, tasks: [] }),
	mockHandleRefundUpdated: vi.fn().mockResolvedValue({ success: true, tasks: [] }),
	mockHandleRefundFailed: vi.fn().mockResolvedValue({ success: true, tasks: [] }),
	mockHandleDisputeCreated: vi.fn().mockResolvedValue({ success: true, tasks: [] }),
	mockHandleDisputeClosed: vi.fn().mockResolvedValue({ success: true, tasks: [] }),
	mockHandlePaymentSuccess: vi.fn().mockResolvedValue({ success: true, tasks: [] }),
	mockHandlePaymentFailure: vi.fn().mockResolvedValue({ success: true, tasks: [] }),
	mockHandlePaymentCanceled: vi.fn().mockResolvedValue({ success: true, tasks: [] }),
}));

vi.mock("@/modules/webhooks/handlers/checkout-handlers", () => ({
	handleCheckoutSessionCompleted: mockHandleCheckoutCompleted,
	handleCheckoutSessionExpired: mockHandleCheckoutExpired,
}));
vi.mock("@/modules/webhooks/handlers/async-payment-handlers", () => ({
	handleAsyncPaymentSucceeded: mockHandleAsyncSucceeded,
	handleAsyncPaymentFailed: mockHandleAsyncFailed,
}));
vi.mock("@/modules/webhooks/handlers/refund-handlers", () => ({
	handleChargeRefunded: mockHandleChargeRefunded,
	handleRefundUpdated: mockHandleRefundUpdated,
	handleRefundFailed: mockHandleRefundFailed,
}));
vi.mock("@/modules/webhooks/handlers/dispute-handlers", () => ({
	handleDisputeCreated: mockHandleDisputeCreated,
	handleDisputeClosed: mockHandleDisputeClosed,
}));
vi.mock("@/modules/webhooks/handlers/payment-handlers", () => ({
	handlePaymentSuccess: mockHandlePaymentSuccess,
	handlePaymentFailure: mockHandlePaymentFailure,
	handlePaymentCanceled: mockHandlePaymentCanceled,
	handleInvoicePaymentFailed: vi.fn().mockResolvedValue({ success: true, tasks: [] }),
}));

import { dispatchEvent, isEventSupported } from "@/modules/webhooks/utils/event-registry";

const FIXTURES_DIR = join(__dirname, "..", "fixtures", "stripe");

const EXPECTED_HANDLERS: Record<string, ReturnType<typeof vi.fn>> = {
	"checkout.session.completed": mockHandleCheckoutCompleted,
	"checkout.session.expired": mockHandleCheckoutExpired,
	"checkout.session.async_payment_succeeded": mockHandleAsyncSucceeded,
	"checkout.session.async_payment_failed": mockHandleAsyncFailed,
	"charge.refunded": mockHandleChargeRefunded,
	"refund.created": mockHandleRefundUpdated,
	"refund.updated": mockHandleRefundUpdated,
	"refund.failed": mockHandleRefundFailed,
	"charge.dispute.created": mockHandleDisputeCreated,
	"charge.dispute.closed": mockHandleDisputeClosed,
	"payment_intent.succeeded": mockHandlePaymentSuccess,
	"payment_intent.payment_failed": mockHandlePaymentFailure,
	"payment_intent.canceled": mockHandlePaymentCanceled,
};

function loadFixtures(): Array<{ name: string; event: Stripe.Event }> {
	return readdirSync(FIXTURES_DIR)
		.filter((f) => f.endsWith(".json"))
		.map((file) => ({
			name: file.replace(/\.json$/, ""),
			event: JSON.parse(readFileSync(join(FIXTURES_DIR, file), "utf-8")) as Stripe.Event,
		}));
}

beforeEach(() => {
	vi.clearAllMocks();
	for (const m of Object.values(EXPECTED_HANDLERS)) {
		m.mockResolvedValue({ success: true, tasks: [] });
	}
});

describe("Stripe webhook contract — fixture shape validation", () => {
	const fixtures = loadFixtures();

	it("at least one fixture exists for each supported event type", () => {
		const fixtureTypes = new Set(fixtures.map((f) => f.event.type));
		const expectedTypes = Object.keys(EXPECTED_HANDLERS);
		for (const type of expectedTypes) {
			expect(fixtureTypes, `missing fixture for ${type}`).toContain(type);
		}
	});

	it.each(fixtures)("$name has a valid Stripe.Event envelope", ({ event }) => {
		expect(event.id).toMatch(/^evt_/);
		expect(event.object).toBe("event");
		expect(event.type).toBeTypeOf("string");
		expect(event.data).toBeDefined();
		expect(event.data.object).toBeDefined();
		expect(typeof event.data.object).toBe("object");
		expect(event.created).toBeTypeOf("number");
		expect(event.livemode).toBe(false);
	});
});

describe("Stripe webhook contract — registry routing", () => {
	const fixtures = loadFixtures();

	it.each(fixtures)("$name → isEventSupported() returns true", ({ event }) => {
		expect(isEventSupported(event.type)).toBe(true);
	});

	it.each(fixtures)("$name → dispatchEvent routes to the correct handler", async ({ event }) => {
		const expectedHandler = EXPECTED_HANDLERS[event.type];
		expect(expectedHandler).toBeDefined();

		await dispatchEvent(event);

		expect(expectedHandler).toHaveBeenCalledOnce();
		// The handler receives event.data.object (Session/Charge/Refund/Dispute), not the full event.
		expect(expectedHandler).toHaveBeenCalledWith(event.data.object);

		// No other handler was called.
		for (const [type, fn] of Object.entries(EXPECTED_HANDLERS)) {
			if (type !== event.type && fn !== expectedHandler) {
				expect(fn).not.toHaveBeenCalled();
			}
		}
	});
});

describe("Stripe webhook contract — payload semantics per type", () => {
	const byType = (type: string) => loadFixtures().find((f) => f.event.type === type)!.event;

	it("checkout.session.completed carries metadata.cartId required for Order creation", () => {
		const event = byType("checkout.session.completed");
		const session = event.data.object as Stripe.Checkout.Session;
		expect(session.metadata?.cartId).toBeTruthy();
	});

	it("checkout.session.async_payment_succeeded has payment_status='paid'", () => {
		const event = byType("checkout.session.async_payment_succeeded");
		const session = event.data.object as Stripe.Checkout.Session;
		expect(session.payment_status).toBe("paid");
	});

	it("checkout.session.async_payment_failed has payment_status='unpaid'", () => {
		const event = byType("checkout.session.async_payment_failed");
		const session = event.data.object as Stripe.Checkout.Session;
		expect(session.payment_status).toBe("unpaid");
	});

	it("charge.refunded carries amount_refunded and payment_intent for reconciliation", () => {
		const event = byType("charge.refunded");
		const charge = event.data.object as Stripe.Charge;
		expect(charge.amount_refunded).toBeGreaterThan(0);
		expect(charge.payment_intent).toBeTruthy();
	});

	it("refund.failed carries failure_reason for admin alert UX", () => {
		const event = byType("refund.failed");
		const refund = event.data.object as Stripe.Refund;
		expect(refund.status).toBe("failed");
		expect(refund.failure_reason).toBeTruthy();
	});

	it("charge.dispute.created carries evidence_details.due_by for SLA tracking", () => {
		const event = byType("charge.dispute.created");
		const dispute = event.data.object as Stripe.Dispute;
		expect(dispute.evidence_details.due_by).toBeTypeOf("number");
		expect(dispute.reason).toBeTruthy();
	});

	it("payment_intent.succeeded has status='succeeded' and amount_received>0", () => {
		const event = byType("payment_intent.succeeded");
		const pi = event.data.object as Stripe.PaymentIntent;
		expect(pi.status).toBe("succeeded");
		expect(pi.amount_received).toBeGreaterThan(0);
	});

	it("payment_intent.payment_failed carries last_payment_error.decline_code for admin UX", () => {
		const event = byType("payment_intent.payment_failed");
		const pi = event.data.object as Stripe.PaymentIntent;
		expect(pi.status).toBe("requires_payment_method");
		expect(pi.last_payment_error?.decline_code).toBeTruthy();
		expect(pi.last_payment_error?.code).toBeTruthy();
	});

	it("payment_intent.canceled carries cancellation_reason and canceled_at", () => {
		const event = byType("payment_intent.canceled");
		const pi = event.data.object as Stripe.PaymentIntent;
		expect(pi.status).toBe("canceled");
		expect(pi.cancellation_reason).toBeTruthy();
		expect(pi.canceled_at).toBeTypeOf("number");
	});
});
