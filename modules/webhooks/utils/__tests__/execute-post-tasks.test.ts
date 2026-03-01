import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockUpdateTag,
	mockSendOrderConfirmationEmail,
	mockSendAdminNewOrderEmail,
	mockSendRefundConfirmationEmail,
	mockSendPaymentFailedEmail,
	mockSendAdminRefundFailedAlert,
	mockSendAdminDisputeAlert,
	mockSendAdminInvoiceFailedAlert,
	mockSendWebhookFailedAlertEmail,
} = vi.hoisted(() => ({
	mockUpdateTag: vi.fn(),
	mockSendOrderConfirmationEmail: vi.fn(),
	mockSendAdminNewOrderEmail: vi.fn(),
	mockSendRefundConfirmationEmail: vi.fn(),
	mockSendPaymentFailedEmail: vi.fn(),
	mockSendAdminRefundFailedAlert: vi.fn(),
	mockSendAdminDisputeAlert: vi.fn(),
	mockSendAdminInvoiceFailedAlert: vi.fn(),
	mockSendWebhookFailedAlertEmail: vi.fn(),
}));

vi.mock("next/cache", () => ({
	updateTag: mockUpdateTag,
}));
vi.mock("@/modules/emails/services/order-emails", () => ({
	sendOrderConfirmationEmail: mockSendOrderConfirmationEmail,
}));
vi.mock("@/modules/emails/services/admin-emails", () => ({
	sendAdminNewOrderEmail: mockSendAdminNewOrderEmail,
	sendAdminRefundFailedAlert: mockSendAdminRefundFailedAlert,
	sendAdminDisputeAlert: mockSendAdminDisputeAlert,
	sendAdminInvoiceFailedAlert: mockSendAdminInvoiceFailedAlert,
	sendWebhookFailedAlertEmail: mockSendWebhookFailedAlertEmail,
}));
vi.mock("@/modules/emails/services/refund-emails", () => ({
	sendRefundConfirmationEmail: mockSendRefundConfirmationEmail,
}));
vi.mock("@/modules/emails/services/payment-emails", () => ({
	sendPaymentFailedEmail: mockSendPaymentFailedEmail,
}));

import { executePostWebhookTasks } from "../execute-post-tasks";

// ============================================================================
// TESTS
// ============================================================================

describe("executePostWebhookTasks", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mockSendOrderConfirmationEmail.mockResolvedValue({ success: true });
		mockSendAdminNewOrderEmail.mockResolvedValue({ success: true });
		mockSendRefundConfirmationEmail.mockResolvedValue({ success: true });
		mockSendPaymentFailedEmail.mockResolvedValue({ success: true });
		mockSendAdminRefundFailedAlert.mockResolvedValue({ success: true });
		mockSendAdminDisputeAlert.mockResolvedValue({ success: true });
		mockSendAdminInvoiceFailedAlert.mockResolvedValue({ success: true });
		mockSendWebhookFailedAlertEmail.mockResolvedValue({ success: true });
	});

	it("returns zero counts for empty task list", async () => {
		const result = await executePostWebhookTasks([]);

		expect(result).toEqual({
			successful: 0,
			failed: 0,
			errors: [],
		});
	});

	it("executes all tasks in parallel via Promise.allSettled", async () => {
		const tasks = [
			{ type: "ORDER_CONFIRMATION_EMAIL" as const, data: { to: "a@test.com" } },
			{ type: "ADMIN_NEW_ORDER_EMAIL" as const, data: { orderNumber: "SYN-001" } },
		];

		const result = await executePostWebhookTasks(tasks);

		expect(mockSendOrderConfirmationEmail).toHaveBeenCalledWith({ to: "a@test.com" });
		expect(mockSendAdminNewOrderEmail).toHaveBeenCalledWith({ orderNumber: "SYN-001" });
		expect(result.successful).toBe(2);
		expect(result.failed).toBe(0);
	});

	it("dispatches each email task type to the correct service", async () => {
		const tasks = [
			{ type: "ORDER_CONFIRMATION_EMAIL" as const, data: { d: 1 } },
			{ type: "ADMIN_NEW_ORDER_EMAIL" as const, data: { d: 2 } },
			{ type: "REFUND_CONFIRMATION_EMAIL" as const, data: { d: 3 } },
			{ type: "PAYMENT_FAILED_EMAIL" as const, data: { d: 4 } },
			{ type: "ADMIN_REFUND_FAILED_ALERT" as const, data: { d: 5 } },
			{ type: "ADMIN_DISPUTE_ALERT" as const, data: { d: 6 } },
			{ type: "ADMIN_INVOICE_FAILED_ALERT" as const, data: { d: 7 } },
		];

		const result = await executePostWebhookTasks(tasks);

		expect(mockSendOrderConfirmationEmail).toHaveBeenCalledWith({ d: 1 });
		expect(mockSendAdminNewOrderEmail).toHaveBeenCalledWith({ d: 2 });
		expect(mockSendRefundConfirmationEmail).toHaveBeenCalledWith({ d: 3 });
		expect(mockSendPaymentFailedEmail).toHaveBeenCalledWith({ d: 4 });
		expect(mockSendAdminRefundFailedAlert).toHaveBeenCalledWith({ d: 5 });
		expect(mockSendAdminDisputeAlert).toHaveBeenCalledWith({ d: 6 });
		expect(mockSendAdminInvoiceFailedAlert).toHaveBeenCalledWith({ d: 7 });
		expect(result.successful).toBe(7);
	});

	it("invalidates each cache tag via updateTag", async () => {
		const tasks = [
			{ type: "INVALIDATE_CACHE" as const, tags: ["orders-list", "cart-user-1", "products"] },
		];

		const result = await executePostWebhookTasks(tasks);

		expect(mockUpdateTag).toHaveBeenCalledWith("orders-list");
		expect(mockUpdateTag).toHaveBeenCalledWith("cart-user-1");
		expect(mockUpdateTag).toHaveBeenCalledWith("products");
		expect(result.successful).toBe(1);
	});

	it("counts failures without blocking other tasks", async () => {
		mockSendOrderConfirmationEmail.mockRejectedValue(new Error("SMTP down"));
		mockSendAdminNewOrderEmail.mockResolvedValue({ success: true });

		const tasks = [
			{ type: "ORDER_CONFIRMATION_EMAIL" as const, data: {} },
			{ type: "ADMIN_NEW_ORDER_EMAIL" as const, data: {} },
		];

		const result = await executePostWebhookTasks(tasks);

		expect(result.successful).toBe(1);
		expect(result.failed).toBe(1);
		expect(result.errors).toHaveLength(1);
		expect(result.errors[0]).toEqual({
			type: "ORDER_CONFIRMATION_EMAIL",
			error: "SMTP down",
		});
	});

	it("sends admin alert when critical customer-facing email fails", async () => {
		mockSendOrderConfirmationEmail.mockRejectedValue(new Error("SMTP error"));

		const tasks = [{ type: "ORDER_CONFIRMATION_EMAIL" as const, data: {} }];

		await executePostWebhookTasks(tasks);

		expect(mockSendWebhookFailedAlertEmail).toHaveBeenCalledWith(
			expect.objectContaining({
				eventId: "post-task-email-failure",
				eventType: "ORDER_CONFIRMATION_EMAIL",
				attempts: 1,
				error: expect.stringContaining("SMTP error"),
			}),
		);
	});

	it("does NOT send admin alert for non-critical task failures", async () => {
		mockSendAdminDisputeAlert.mockRejectedValue(new Error("Fail"));

		const tasks = [{ type: "ADMIN_DISPUTE_ALERT" as const, data: {} }];

		await executePostWebhookTasks(tasks);

		expect(mockSendWebhookFailedAlertEmail).not.toHaveBeenCalled();
	});

	it("sends admin alert with aggregated critical failures", async () => {
		mockSendOrderConfirmationEmail.mockRejectedValue(new Error("SMTP error"));
		mockSendRefundConfirmationEmail.mockRejectedValue(new Error("Template error"));

		const tasks = [
			{ type: "ORDER_CONFIRMATION_EMAIL" as const, data: {} },
			{ type: "REFUND_CONFIRMATION_EMAIL" as const, data: {} },
		];

		await executePostWebhookTasks(tasks);

		expect(mockSendWebhookFailedAlertEmail).toHaveBeenCalledWith(
			expect.objectContaining({
				eventType: expect.stringContaining("ORDER_CONFIRMATION_EMAIL"),
				error: expect.stringContaining("SMTP error"),
			}),
		);
		expect(mockSendWebhookFailedAlertEmail).toHaveBeenCalledWith(
			expect.objectContaining({
				eventType: expect.stringContaining("REFUND_CONFIRMATION_EMAIL"),
				error: expect.stringContaining("Template error"),
			}),
		);
	});

	it("does not throw when admin alert email itself fails", async () => {
		mockSendOrderConfirmationEmail.mockRejectedValue(new Error("SMTP error"));
		mockSendWebhookFailedAlertEmail.mockRejectedValue(new Error("Alert also failed"));

		const tasks = [{ type: "ORDER_CONFIRMATION_EMAIL" as const, data: {} }];

		// Should not throw
		const result = await executePostWebhookTasks(tasks);

		expect(result.failed).toBe(1);
	});

	it("converts non-Error rejection reasons to string", async () => {
		mockSendPaymentFailedEmail.mockRejectedValue("string error reason");

		const tasks = [{ type: "PAYMENT_FAILED_EMAIL" as const, data: {} }];

		const result = await executePostWebhookTasks(tasks);

		expect(result.errors[0]!.error).toBe("string error reason");
	});
});
