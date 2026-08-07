import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * @regression email-audit-101
 *
 * Verrouille la source unique de routing task → service d'envoi
 * (`dispatchEmailTask`). Avant EMAIL-AUDIT-101, ce switch était dupliqué entre
 * le path vivant (post-webhook-tasks.service) et un path mort (execute-post-tasks)
 * qui avait divergé : refund non-atomique + case ADMIN_DASHBOARD_REFUND_ALERT absent.
 * Ces tests garantissent que CHAQUE task type non-cache est routé, et que le refund
 * passe par la garde atomique dès qu'un refundId est présent.
 */

const {
	mockSendOrderConfirmationEmail,
	mockSendRefundConfirmationEmail,
	mockSendRefundConfirmationOnce,
	mockSendAdminRefundFailedAlert,
	mockSendAdminDisputeAlert,
	mockSendAdminOrderProcessingFailedAlert,
	mockSendAdminDashboardRefundAttentionAlert,
} = vi.hoisted(() => ({
	mockSendOrderConfirmationEmail: vi.fn(),
	mockSendRefundConfirmationEmail: vi.fn(),
	mockSendRefundConfirmationOnce: vi.fn(),
	mockSendAdminRefundFailedAlert: vi.fn(),
	mockSendAdminDisputeAlert: vi.fn(),
	mockSendAdminOrderProcessingFailedAlert: vi.fn(),
	mockSendAdminDashboardRefundAttentionAlert: vi.fn(),
}));

vi.mock("@/modules/emails/services/order-emails", () => ({
	sendOrderConfirmationEmail: mockSendOrderConfirmationEmail,
}));
vi.mock("@/modules/emails/services/admin-emails", () => ({
	sendAdminRefundFailedAlert: mockSendAdminRefundFailedAlert,
	sendAdminDisputeAlert: mockSendAdminDisputeAlert,
	sendAdminOrderProcessingFailedAlert: mockSendAdminOrderProcessingFailedAlert,
	sendAdminDashboardRefundAttentionAlert: mockSendAdminDashboardRefundAttentionAlert,
}));
vi.mock("@/modules/emails/services/refund-emails", () => ({
	sendRefundConfirmationEmail: mockSendRefundConfirmationEmail,
}));
vi.mock("@/modules/refunds/services/send-refund-confirmation.service", () => ({
	sendRefundConfirmationOnce: mockSendRefundConfirmationOnce,
}));

import { dispatchEmailTask, CRITICAL_EMAIL_TASKS } from "../dispatch-email-task";
import type { PostWebhookTask } from "../../types/webhook.types";

describe("dispatchEmailTask", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mockSendOrderConfirmationEmail.mockResolvedValue({ success: true });
		mockSendRefundConfirmationEmail.mockResolvedValue({ success: true });
		mockSendRefundConfirmationOnce.mockResolvedValue({ success: true });
		mockSendAdminRefundFailedAlert.mockResolvedValue({ success: true });
		mockSendAdminDisputeAlert.mockResolvedValue({ success: true });
		mockSendAdminOrderProcessingFailedAlert.mockResolvedValue({ success: true });
		mockSendAdminDashboardRefundAttentionAlert.mockResolvedValue({ success: true });
	});

	it("routes each email task type to the correct service (incl. dashboard refund alert)", async () => {
		const cases: Array<[PostWebhookTask, () => unknown]> = [
			[
				{ type: "ORDER_CONFIRMATION_EMAIL", data: { d: 1 } } as unknown as PostWebhookTask,
				() => expect(mockSendOrderConfirmationEmail).toHaveBeenCalledWith({ d: 1 }),
			],
			[
				{ type: "ADMIN_REFUND_FAILED_ALERT", data: { d: 5 } } as unknown as PostWebhookTask,
				() => expect(mockSendAdminRefundFailedAlert).toHaveBeenCalledWith({ d: 5 }),
			],
			[
				{ type: "ADMIN_DISPUTE_ALERT", data: { d: 6 } } as unknown as PostWebhookTask,
				() => expect(mockSendAdminDisputeAlert).toHaveBeenCalledWith({ d: 6 }),
			],
			[
				{
					type: "ADMIN_ORDER_PROCESSING_FAILED_ALERT",
					data: { d: 8 },
				} as unknown as PostWebhookTask,
				() => expect(mockSendAdminOrderProcessingFailedAlert).toHaveBeenCalledWith({ d: 8 }),
			],
			[
				{ type: "ADMIN_DASHBOARD_REFUND_ALERT", data: { d: 9 } } as unknown as PostWebhookTask,
				() => expect(mockSendAdminDashboardRefundAttentionAlert).toHaveBeenCalledWith({ d: 9 }),
			],
		];

		for (const [task, assertion] of cases) {
			await dispatchEmailTask(task as Exclude<PostWebhookTask, { type: "INVALIDATE_CACHE" }>);
			assertion();
		}
	});

	it("routes refund WITHOUT refundId to the plain (non-atomic) sender", async () => {
		await dispatchEmailTask({
			type: "REFUND_CONFIRMATION_EMAIL",
			data: { to: "c@test.com", orderNumber: "SYN-1" },
		} as unknown as Exclude<PostWebhookTask, { type: "INVALIDATE_CACHE" }>);

		expect(mockSendRefundConfirmationEmail).toHaveBeenCalledTimes(1);
		expect(mockSendRefundConfirmationOnce).not.toHaveBeenCalled();
	});

	it("routes refund WITH refundId through the atomic guard (ORD-STRIPE-005)", async () => {
		await dispatchEmailTask({
			type: "REFUND_CONFIRMATION_EMAIL",
			data: {
				refundId: "rf_123",
				to: "c@test.com",
				orderNumber: "SYN-1",
				customerName: "Client",
				refundAmount: 1000,
				reason: "CUSTOMER_REQUEST",
				orderDetailsUrl: "https://x/orders",
			},
		} as unknown as Exclude<PostWebhookTask, { type: "INVALIDATE_CACHE" }>);

		expect(mockSendRefundConfirmationOnce).toHaveBeenCalledTimes(1);
		expect(mockSendRefundConfirmationOnce).toHaveBeenCalledWith(
			expect.objectContaining({ refundId: "rf_123", invoiceNumber: null, creditNoteNumber: null }),
		);
		expect(mockSendRefundConfirmationEmail).not.toHaveBeenCalled();
	});

	it("throws when the atomic sender reports send_failed so the task is retried", async () => {
		// Le service avale l'erreur Resend (et reset son claim) — le dispatcher
		// doit throw pour que la PostWebhookTask reparte en FAILED → retry cron.
		mockSendRefundConfirmationOnce.mockResolvedValue({
			sent: false,
			skipped: false,
			reason: "send_failed",
		});

		await expect(
			dispatchEmailTask({
				type: "REFUND_CONFIRMATION_EMAIL",
				data: {
					refundId: "rf_123",
					to: "c@test.com",
					orderNumber: "SYN-1",
					customerName: "Client",
					refundAmount: 1000,
					reason: "CUSTOMER_REQUEST",
					orderDetailsUrl: "https://x/orders",
				},
			} as unknown as Exclude<PostWebhookTask, { type: "INVALIDATE_CACHE" }>),
		).rejects.toThrow(/send_failed|failed for refund rf_123/);
	});

	it("CRITICAL_EMAIL_TASKS lists the customer-facing/revenue tasks", () => {
		expect(CRITICAL_EMAIL_TASKS.has("ORDER_CONFIRMATION_EMAIL")).toBe(true);
		expect(CRITICAL_EMAIL_TASKS.has("REFUND_CONFIRMATION_EMAIL")).toBe(true);
		expect(CRITICAL_EMAIL_TASKS.has("ADMIN_DISPUTE_ALERT")).toBe(false);
	});
});
