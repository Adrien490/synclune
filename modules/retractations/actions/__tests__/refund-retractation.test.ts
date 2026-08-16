/**
 * @regression retractation-refund-action-sequence
 *
 * « Rembourser » est LE chemin qui touche l'argent. Invariants :
 * - garde d'état AWAITING_RETURN et PaymentIntent ancré AVANT tout appel Stripe ;
 * - `refunds.create` porte l'idempotencyKey `retractation-refund-<id>` ;
 * - reprise sur incident : « charge already refunded » (clé expirée après un
 *   crash entre refund et finalisation) retrouve le refund existant et reprend
 *   la finalisation — jamais de demande coincée en AWAITING_RETURN ;
 * - la branche noop relit le statut RÉEL (un rejet concurrent a pu passer) au
 *   lieu d'affirmer « déjà remboursée » à tort ;
 * - un échec d'email ne défait jamais le remboursement.
 */
import Stripe from "stripe";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { refundRetractation } from "../refund-retractation";

const mocks = vi.hoisted(() => ({
	requireAdmin: vi.fn(),
	findUnique: vi.fn(),
	refundsCreate: vi.fn(),
	refundsList: vi.fn(),
	finalizeRetractationRefund: vi.fn(),
	sendRetractationRefundedEmail: vi.fn(),
	updateTagsAfterMutation: vi.fn(),
}));

vi.mock("@/modules/admin-auth/lib/require-admin", () => ({
	requireAdmin: mocks.requireAdmin,
}));
vi.mock("@/shared/lib/prisma", () => ({
	prisma: { retractationRequest: { findUnique: mocks.findUnique } },
}));
vi.mock("@/shared/lib/stripe", () => ({
	stripe: { refunds: { create: mocks.refundsCreate, list: mocks.refundsList } },
	withStripeCircuitBreaker: (fn: () => Promise<unknown>) => fn(),
}));
vi.mock("../../services/finalize-retractation-refund.service", () => ({
	finalizeRetractationRefund: mocks.finalizeRetractationRefund,
}));
vi.mock("@/modules/emails/services/send-retractation-emails", () => ({
	sendRetractationRefundedEmail: mocks.sendRetractationRefundedEmail,
}));
vi.mock("@/shared/lib/cache", () => ({
	updateTagsAfterMutation: mocks.updateTagsAfterMutation,
}));

const RETRACTATION_ID = "k3x9m2p8q1r5s7t0uvwxyz012345";

const RETRACTATION = {
	status: "AWAITING_RETURN",
	order: {
		id: "order-1",
		invoiceNumber: 12,
		email: "cliente@example.com",
		customerName: "Marie",
		amountTotalCents: 4299,
		stripePaymentIntentId: "pi_123",
	},
};

// Convention du dépôt : une erreur mockée est une VRAIE instance de la classe
// attendue (un `Object.assign(new Error(), { code })` n'est pas `instanceof`).
function chargeAlreadyRefundedError(): Stripe.errors.StripeInvalidRequestError {
	return new Stripe.errors.StripeInvalidRequestError({
		code: "charge_already_refunded",
		type: "invalid_request_error",
		message: "Charge ch_1 has already been refunded.",
	});
}

function makeFormData(entries: Record<string, string>): FormData {
	const formData = new FormData();
	for (const [key, value] of Object.entries(entries)) formData.set(key, value);
	return formData;
}

beforeEach(() => {
	vi.clearAllMocks();
	mocks.requireAdmin.mockResolvedValue({ admin: true });
	mocks.findUnique.mockResolvedValue(RETRACTATION);
	mocks.refundsCreate.mockResolvedValue({ id: "re_123" });
	mocks.finalizeRetractationRefund.mockResolvedValue({
		outcome: "refunded",
		orderId: "order-1",
		creditNoteNumber: 3,
		tags: ["tag-a"],
	});
	mocks.sendRetractationRefundedEmail.mockResolvedValue({ success: true, data: { id: "e" } });
});

describe("refundRetractation", () => {
	it("séquence nominale : refund idempotent → finalisation → invalidation → email", async () => {
		const result = await refundRetractation(
			undefined,
			makeFormData({ retractationId: RETRACTATION_ID }),
		);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toContain("avoir n° 3");
		expect(mocks.refundsCreate).toHaveBeenCalledWith(
			{ payment_intent: "pi_123" },
			{ idempotencyKey: `retractation-refund-${RETRACTATION_ID}` },
		);
		expect(mocks.finalizeRetractationRefund).toHaveBeenCalledWith({
			retractationId: RETRACTATION_ID,
			stripeRefundId: "re_123",
			restock: false,
		});
		expect(mocks.updateTagsAfterMutation).toHaveBeenCalledWith(["tag-a"]);
		expect(mocks.sendRetractationRefundedEmail).toHaveBeenCalledWith({
			order: RETRACTATION.order,
			amountRefundedCents: 4299,
			creditNoteNumber: 3,
		});
	});

	it("restock coché : transmis à la finalisation", async () => {
		await refundRetractation(
			undefined,
			makeFormData({ retractationId: RETRACTATION_ID, restock: "on" }),
		);

		expect(mocks.finalizeRetractationRefund).toHaveBeenCalledWith(
			expect.objectContaining({ restock: true }),
		);
	});

	it("statut ≠ AWAITING_RETURN : refus AVANT tout appel Stripe", async () => {
		mocks.findUnique.mockResolvedValue({ ...RETRACTATION, status: "ACKNOWLEDGED" });

		const result = await refundRetractation(
			undefined,
			makeFormData({ retractationId: RETRACTATION_ID }),
		);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mocks.refundsCreate).not.toHaveBeenCalled();
	});

	it("pas de PaymentIntent ancré : refus AVANT tout appel Stripe", async () => {
		mocks.findUnique.mockResolvedValue({
			...RETRACTATION,
			order: { ...RETRACTATION.order, stripePaymentIntentId: null },
		});

		const result = await refundRetractation(
			undefined,
			makeFormData({ retractationId: RETRACTATION_ID }),
		);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mocks.refundsCreate).not.toHaveBeenCalled();
	});

	it("demande introuvable : NOT_FOUND", async () => {
		mocks.findUnique.mockResolvedValue(null);

		const result = await refundRetractation(
			undefined,
			makeFormData({ retractationId: RETRACTATION_ID }),
		);

		expect(result.status).toBe(ActionStatus.NOT_FOUND);
		expect(mocks.refundsCreate).not.toHaveBeenCalled();
	});

	it("valide l'entrée AVANT toute lecture (id malformé)", async () => {
		const result = await refundRetractation(
			undefined,
			makeFormData({ retractationId: "pas-un-cuid" }),
		);

		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
		expect(mocks.findUnique).not.toHaveBeenCalled();
	});

	it("refuse sans session admin", async () => {
		mocks.requireAdmin.mockResolvedValue({
			error: { status: ActionStatus.UNAUTHORIZED, message: "Non autorisé" },
		});

		const result = await refundRetractation(
			undefined,
			makeFormData({ retractationId: RETRACTATION_ID }),
		);

		expect(result.status).toBe(ActionStatus.UNAUTHORIZED);
		expect(mocks.refundsCreate).not.toHaveBeenCalled();
	});

	it("« charge already refunded » (clé expirée) : retrouve le refund existant et FINALISE", async () => {
		mocks.refundsCreate.mockRejectedValue(chargeAlreadyRefundedError());
		mocks.refundsList.mockResolvedValue({ data: [{ id: "re_existing" }] });

		const result = await refundRetractation(
			undefined,
			makeFormData({ retractationId: RETRACTATION_ID }),
		);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mocks.refundsList).toHaveBeenCalledWith({ payment_intent: "pi_123", limit: 1 });
		expect(mocks.finalizeRetractationRefund).toHaveBeenCalledWith(
			expect.objectContaining({ stripeRefundId: "re_existing" }),
		);
	});

	it("« charge already refunded » sans refund listé : l'erreur remonte, AUCUNE finalisation", async () => {
		mocks.refundsCreate.mockRejectedValue(chargeAlreadyRefundedError());
		mocks.refundsList.mockResolvedValue({ data: [] });

		const result = await refundRetractation(
			undefined,
			makeFormData({ retractationId: RETRACTATION_ID }),
		);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mocks.finalizeRetractationRefund).not.toHaveBeenCalled();
	});

	it("autre erreur Stripe : remonte en erreur, AUCUNE finalisation ni email", async () => {
		mocks.refundsCreate.mockRejectedValue(
			new Stripe.errors.StripeAPIError({ type: "api_error", message: "Stripe down" }),
		);

		const result = await refundRetractation(
			undefined,
			makeFormData({ retractationId: RETRACTATION_ID }),
		);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mocks.finalizeRetractationRefund).not.toHaveBeenCalled();
		expect(mocks.sendRetractationRefundedEmail).not.toHaveBeenCalled();
	});

	it("noop avec statut réel REFUNDED : « déjà remboursée », AUCUN email", async () => {
		mocks.finalizeRetractationRefund.mockResolvedValue({
			outcome: "noop",
			orderId: null,
			creditNoteNumber: null,
			tags: [],
		});
		// 1er findUnique : garde d'état ; 2e : relecture du statut réel du noop.
		mocks.findUnique
			.mockResolvedValueOnce(RETRACTATION)
			.mockResolvedValueOnce({ status: "REFUNDED" });

		const result = await refundRetractation(
			undefined,
			makeFormData({ retractationId: RETRACTATION_ID }),
		);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("déjà été remboursée");
		expect(mocks.sendRetractationRefundedEmail).not.toHaveBeenCalled();
	});

	it("noop avec statut réel REJECTED (rejet concurrent) : le message dit le VRAI état et alerte sur Stripe", async () => {
		mocks.finalizeRetractationRefund.mockResolvedValue({
			outcome: "noop",
			orderId: null,
			creditNoteNumber: null,
			tags: [],
		});
		mocks.findUnique
			.mockResolvedValueOnce(RETRACTATION)
			.mockResolvedValueOnce({ status: "REJECTED" });

		const result = await refundRetractation(
			undefined,
			makeFormData({ retractationId: RETRACTATION_ID }),
		);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).not.toContain("déjà été remboursée");
		expect(result.message).toContain("Rejetée");
		expect(result.message).toContain("dashboard");
	});

	it("email en échec : le remboursement reste ACQUIS, le message le dit", async () => {
		mocks.sendRetractationRefundedEmail.mockResolvedValue({
			success: false,
			error: new Error("Resend down"),
		});

		const result = await refundRetractation(
			undefined,
			makeFormData({ retractationId: RETRACTATION_ID }),
		);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toContain("l'email n'est pas parti");
		expect(mocks.updateTagsAfterMutation).toHaveBeenCalledTimes(1);
	});
});
