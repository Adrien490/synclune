import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * @regression idem-refund-001-adopt-on-retry
 *
 * Audit idempotence 2026-07-02 (P0-2) — double remboursement partiel au retry.
 *
 * Scénario verrouillé : `stripe.refunds.create` réussit côté Stripe mais la
 * réponse est perdue (timeout post-commit, retries SDK épuisés) → le Refund est
 * marqué FAILED SANS anchor `stripeRefundId`. `retryFailedRefund` incrémente
 * `attemptCount` → `processRefund` tourne la clé d'idempotence (P0.2, voulue
 * pour purger le cache d'erreur 24h de Stripe) → Stripe crée un 2ᵉ refund réel.
 * Pour un remboursement PARTIEL dont le solde de charge suffit, l'argent sort
 * DEUX FOIS (`charge_already_refunded` ne protège que le remboursement total).
 *
 * Fix : `recoverExistingByMetadata` — sur un retry, pré-lister les refunds du
 * PI et ADOPTER celui dont `metadata.refund_id` matche (statut vivant), au lieu
 * de créer. Fail-closed si la liste Stripe échoue.
 */

const { mockStripe, MockStripeError, mockLogger } = vi.hoisted(() => {
	class MockStripeError extends Error {
		code?: string;
		constructor(message: string) {
			super(message);
			this.name = "StripeError";
		}
	}

	return {
		mockStripe: {
			paymentIntents: {
				retrieve: vi.fn(),
			},
			refunds: {
				create: vi.fn(),
				list: vi.fn(),
				retrieve: vi.fn(),
			},
		},
		MockStripeError,
		mockLogger: {
			info: vi.fn(),
			warn: vi.fn(),
			error: vi.fn(),
			debug: vi.fn(),
		},
	};
});

vi.mock("@/shared/lib/stripe", () => ({
	stripe: mockStripe,
}));

vi.mock("stripe", () => ({
	default: class Stripe {
		static errors = { StripeError: MockStripeError };
	},
}));

vi.mock("@/shared/lib/circuit-breaker", () => ({
	stripeCircuitBreaker: {
		execute: <T>(fn: () => Promise<T>) => fn(),
	},
}));

vi.mock("@/shared/lib/logger", () => ({
	logger: mockLogger,
}));

import { createStripeRefund } from "../stripe-refund";

const RETRY_PARAMS = {
	paymentIntentId: "pi_123",
	amount: 2500, // remboursement PARTIEL — le cas exact du double-débit
	metadata: { refund_id: "refund-db-1" },
	idempotencyKey: "refund_refund-db-1_1", // clé TOURNÉE (attempt 1)
	expectedCurrency: "EUR",
	recoverExistingByMetadata: true,
};

describe("@regression IDEM-REFUND-001 — adoption d'un refund existant au retry", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("ADOPTE le refund succeeded existant (metadata.refund_id) sans appeler create", async () => {
		mockStripe.refunds.list.mockResolvedValue({
			data: [
				{ id: "re_other", status: "succeeded", metadata: { refund_id: "another-refund" } },
				{ id: "re_lost", status: "succeeded", metadata: { refund_id: "refund-db-1" } },
			],
		});

		const result = await createStripeRefund(RETRY_PARAMS);

		// Le refund créé par la tentative dont la réponse a été perdue est adopté :
		// AUCUN 2ᵉ refunds.create (= aucun 2ᵉ mouvement d'argent).
		expect(mockStripe.refunds.create).not.toHaveBeenCalled();
		expect(result).toEqual({
			success: true,
			pending: false,
			refundId: "re_lost",
			status: "succeeded",
		});
	});

	it("adopte aussi un refund pending existant (finalisation via webhook refund.updated)", async () => {
		mockStripe.refunds.list.mockResolvedValue({
			data: [{ id: "re_pending", status: "pending", metadata: { refund_id: "refund-db-1" } }],
		});

		const result = await createStripeRefund(RETRY_PARAMS);

		expect(mockStripe.refunds.create).not.toHaveBeenCalled();
		expect(result).toEqual({
			success: false,
			pending: true,
			refundId: "re_pending",
			status: "pending",
		});
	});

	it("n'adopte PAS un refund failed/canceled — le retry légitime crée un nouveau refund", async () => {
		mockStripe.refunds.list.mockResolvedValue({
			data: [
				{ id: "re_failed", status: "failed", metadata: { refund_id: "refund-db-1" } },
				{ id: "re_canceled", status: "canceled", metadata: { refund_id: "refund-db-1" } },
			],
		});
		mockStripe.refunds.create.mockResolvedValue({ id: "re_new", status: "succeeded" });

		const result = await createStripeRefund(RETRY_PARAMS);

		expect(mockStripe.refunds.create).toHaveBeenCalledTimes(1);
		expect(result.refundId).toBe("re_new");
		expect(result.success).toBe(true);
	});

	it("FAIL-CLOSED : si refunds.list échoue, aucun create (créer = le double-débit qu'on ferme)", async () => {
		mockStripe.refunds.list.mockRejectedValue(new Error("Stripe 502"));

		const result = await createStripeRefund(RETRY_PARAMS);

		expect(mockStripe.refunds.create).not.toHaveBeenCalled();
		expect(result.success).toBe(false);
		expect(result.error).toContain("aucun remboursement créé");
	});

	it("ne pré-liste PAS sur le chemin nominal (recoverExistingByMetadata absent)", async () => {
		mockStripe.refunds.create.mockResolvedValue({ id: "re_first", status: "succeeded" });

		const result = await createStripeRefund({
			paymentIntentId: "pi_123",
			amount: 2500,
			metadata: { refund_id: "refund-db-1" },
			idempotencyKey: "refund_refund-db-1_0",
			expectedCurrency: "EUR",
		});

		expect(mockStripe.refunds.list).not.toHaveBeenCalled();
		expect(result.refundId).toBe("re_first");
	});
});
