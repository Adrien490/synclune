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
	mockHandleChargeRefunded,
	mockHandleRefundUpdated,
	mockHandleRefundFailed,
	mockHandleDisputeCreated,
	mockHandleDisputeUpdated,
	mockHandleDisputeClosed,
	mockHandleDisputeFundsWithdrawn,
	mockHandleDisputeFundsReinstated,
	mockHandlePaymentSuccess,
	mockHandlePaymentFailure,
	mockHandlePaymentCanceled,
	mockHandlePaymentProcessing,
	mockHandleInvoicePaymentFailed,
} = vi.hoisted(() => ({
	mockHandleChargeRefunded: vi.fn().mockResolvedValue({ success: true, tasks: [] }),
	mockHandleRefundUpdated: vi.fn().mockResolvedValue({ success: true, tasks: [] }),
	mockHandleRefundFailed: vi.fn().mockResolvedValue({ success: true, tasks: [] }),
	mockHandleDisputeCreated: vi.fn().mockResolvedValue({ success: true, tasks: [] }),
	mockHandleDisputeUpdated: vi.fn().mockResolvedValue({ success: true, tasks: [] }),
	mockHandleDisputeClosed: vi.fn().mockResolvedValue({ success: true, tasks: [] }),
	mockHandleDisputeFundsWithdrawn: vi.fn().mockResolvedValue({ success: true, tasks: [] }),
	mockHandleDisputeFundsReinstated: vi.fn().mockResolvedValue({ success: true, tasks: [] }),
	mockHandlePaymentSuccess: vi.fn().mockResolvedValue({ success: true, tasks: [] }),
	mockHandlePaymentFailure: vi.fn().mockResolvedValue({ success: true, tasks: [] }),
	mockHandlePaymentCanceled: vi.fn().mockResolvedValue({ success: true, tasks: [] }),
	mockHandlePaymentProcessing: vi.fn().mockResolvedValue({ success: true, skipped: true }),
	mockHandleInvoicePaymentFailed: vi.fn().mockResolvedValue({ success: true, tasks: [] }),
}));

vi.mock("@/modules/webhooks/handlers/refund-handlers", () => ({
	handleChargeRefunded: mockHandleChargeRefunded,
	handleRefundUpdated: mockHandleRefundUpdated,
	handleRefundFailed: mockHandleRefundFailed,
}));
vi.mock("@/modules/webhooks/handlers/dispute-handlers", () => ({
	handleDisputeCreated: mockHandleDisputeCreated,
	handleDisputeUpdated: mockHandleDisputeUpdated,
	handleDisputeClosed: mockHandleDisputeClosed,
	handleDisputeFundsWithdrawn: mockHandleDisputeFundsWithdrawn,
	handleDisputeFundsReinstated: mockHandleDisputeFundsReinstated,
}));
vi.mock("@/modules/webhooks/handlers/payment-handlers", () => ({
	handlePaymentSuccess: mockHandlePaymentSuccess,
	handlePaymentFailure: mockHandlePaymentFailure,
	handlePaymentCanceled: mockHandlePaymentCanceled,
	handlePaymentProcessing: mockHandlePaymentProcessing,
	handleInvoicePaymentFailed: mockHandleInvoicePaymentFailed,
}));

import {
	dispatchEvent,
	isEventSupported,
	getRegisteredEventTypes,
} from "@/modules/webhooks/utils/event-registry";

const FIXTURES_DIR = join(__dirname, "..", "fixtures", "stripe");

const EXPECTED_HANDLERS: Record<string, ReturnType<typeof vi.fn>> = {
	"charge.refunded": mockHandleChargeRefunded,
	"refund.created": mockHandleRefundUpdated,
	"refund.updated": mockHandleRefundUpdated,
	"charge.refund.updated": mockHandleRefundUpdated,
	"refund.failed": mockHandleRefundFailed,
	"charge.dispute.created": mockHandleDisputeCreated,
	"charge.dispute.updated": mockHandleDisputeUpdated,
	"charge.dispute.closed": mockHandleDisputeClosed,
	"charge.dispute.funds_withdrawn": mockHandleDisputeFundsWithdrawn,
	"charge.dispute.funds_reinstated": mockHandleDisputeFundsReinstated,
	"payment_intent.succeeded": mockHandlePaymentSuccess,
	"payment_intent.payment_failed": mockHandlePaymentFailure,
	"payment_intent.canceled": mockHandlePaymentCanceled,
	"payment_intent.processing": mockHandlePaymentProcessing,
	"invoice.payment_failed": mockHandleInvoicePaymentFailed,
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

	// Garde de complétude (audit webhooks 2026-05-29) : tout type RÉELLEMENT
	// dispatché par le registry doit être couvert ici (fixture + handler attendu).
	// Sans cette garde, ajouter un handler au registry sans fixture laisse le
	// contract test vert → régression de routage silencieuse en prod.
	it("every event type dispatched by the registry is covered by a fixture + expected handler", () => {
		const registered = getRegisteredEventTypes().sort();
		const expected = Object.keys(EXPECTED_HANDLERS).sort();
		expect(expected).toEqual(registered);

		const fixtureTypes = new Set(fixtures.map((f) => f.event.type));
		for (const type of registered) {
			expect(fixtureTypes, `registry dispatches "${type}" but no fixture exists`).toContain(type);
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
