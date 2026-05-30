/**
 * @regression refund-confirmation-single-emitter
 *
 * Garde-fou ORD-STRIPE-005 : `sendRefundConfirmationOnce` est l'émetteur UNIQUE
 * de l'email de confirmation de remboursement. Trois chemins peuvent l'appeler
 * en parallèle (SAGA admin `processRefund`, webhook `charge.refunded`, cron
 * `reconcile-refunds`). Le claim atomique
 * `refund.updateMany({ where:{ confirmationEmailSentAt: null } })` doit garantir
 * qu'un SEUL envoie l'email, même si les appels se chevauchent.
 *
 * Sans ce verrou, un client recevrait 2-3 emails de confirmation pour un seul
 * remboursement (chaque chemin avait sa propre idempotencyKey Resend disjointe).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPrisma, mockSendRefundConfirmationEmail } = vi.hoisted(() => ({
	mockPrisma: {
		refund: { updateMany: vi.fn() },
	},
	mockSendRefundConfirmationEmail: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));

vi.mock("@/modules/emails/services/refund-emails", () => ({
	sendRefundConfirmationEmail: mockSendRefundConfirmationEmail,
}));

vi.mock("@/shared/lib/logger", () => ({
	logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

import { sendRefundConfirmationOnce } from "../send-refund-confirmation.service";

const baseArgs = {
	refundId: "refund-1",
	to: "client@example.com",
	orderNumber: "SYN-001",
	customerName: "Marie Dupont",
	refundAmount: 2_500,
	reason: "CUSTOMER_REQUEST" as const,
	orderDetailsUrl: "https://synclune.test/compte/commandes/SYN-001",
	invoiceNumber: "F-2026-00001",
	creditNoteNumber: "A-2026-00001",
};

describe("sendRefundConfirmationOnce", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSendRefundConfirmationEmail.mockResolvedValue(undefined);
	});

	it("claims the right to send (count=1) then sends the email exactly once", async () => {
		mockPrisma.refund.updateMany.mockResolvedValue({ count: 1 });

		const result = await sendRefundConfirmationOnce(baseArgs);

		expect(result).toEqual({ sent: true, skipped: false });
		// Claim atomique avec le guard confirmationEmailSentAt: null.
		expect(mockPrisma.refund.updateMany).toHaveBeenCalledWith({
			where: { id: "refund-1", confirmationEmailSentAt: null },
			data: { confirmationEmailSentAt: expect.any(Date) },
		});
		expect(mockSendRefundConfirmationEmail).toHaveBeenCalledTimes(1);
		expect(mockSendRefundConfirmationEmail).toHaveBeenCalledWith(
			expect.objectContaining({ idempotencyKey: "refund-confirm-refund-1" }),
		);
	});

	it("skips sending when another process already claimed (count=0)", async () => {
		mockPrisma.refund.updateMany.mockResolvedValue({ count: 0 });

		const result = await sendRefundConfirmationOnce(baseArgs);

		expect(result).toEqual({ sent: false, skipped: true, reason: "already_sent" });
		expect(mockSendRefundConfirmationEmail).not.toHaveBeenCalled();
	});

	it("sends exactly one email across two concurrent calls (only the claim winner emits)", async () => {
		// Simule la course : le 1er claim gagne (count=1), le 2nd perd (count=0).
		mockPrisma.refund.updateMany
			.mockResolvedValueOnce({ count: 1 })
			.mockResolvedValueOnce({ count: 0 });

		const [a, b] = await Promise.all([
			sendRefundConfirmationOnce(baseArgs),
			sendRefundConfirmationOnce(baseArgs),
		]);

		const sentCount = [a, b].filter((r) => r.sent).length;
		const skippedCount = [a, b].filter((r) => r.skipped).length;
		expect(sentCount).toBe(1);
		expect(skippedCount).toBe(1);
		// L'invariant clé : un seul email pour un seul remboursement.
		expect(mockSendRefundConfirmationEmail).toHaveBeenCalledTimes(1);
	});

	it("returns send_failed (no throw) when the email provider errors after the claim", async () => {
		mockPrisma.refund.updateMany.mockResolvedValue({ count: 1 });
		mockSendRefundConfirmationEmail.mockRejectedValue(new Error("Resend down"));

		const result = await sendRefundConfirmationOnce(baseArgs);

		expect(result).toEqual({ sent: false, skipped: false, reason: "send_failed" });
	});
});
