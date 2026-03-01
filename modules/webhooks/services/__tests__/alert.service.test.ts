import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockSendWebhookFailedAlertEmail } = vi.hoisted(() => ({
	mockSendWebhookFailedAlertEmail: vi.fn(),
}));

vi.mock("@/modules/emails/services/admin-emails", () => ({
	sendWebhookFailedAlertEmail: mockSendWebhookFailedAlertEmail,
}));

import { sendWebhookFailedAlert } from "../alert.service";

describe("sendWebhookFailedAlert", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	const defaultParams = {
		eventId: "we_abc123",
		eventType: "checkout.session.completed",
		attempts: 3,
		error: "Timeout processing webhook",
	};

	it("should pass all parameters to the email service", async () => {
		mockSendWebhookFailedAlertEmail.mockResolvedValue({ success: true });

		await sendWebhookFailedAlert(defaultParams);

		expect(mockSendWebhookFailedAlertEmail).toHaveBeenCalledWith({
			eventId: "we_abc123",
			eventType: "checkout.session.completed",
			attempts: 3,
			error: "Timeout processing webhook",
		});
	});

	it("should return success result when email sends successfully", async () => {
		mockSendWebhookFailedAlertEmail.mockResolvedValue({ success: true });

		const result = await sendWebhookFailedAlert(defaultParams);

		expect(result).toEqual({ success: true });
	});

	it("should return failure result and log error when email fails", async () => {
		const emailError = new Error("SMTP connection failed");
		mockSendWebhookFailedAlertEmail.mockResolvedValue({
			success: false,
			error: emailError,
		});
		const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

		const result = await sendWebhookFailedAlert(defaultParams);

		expect(result.success).toBe(false);
		expect(consoleSpy).toHaveBeenCalledWith("[WEBHOOK_ALERT] Erreur envoi alerte:", emailError);
	});

	it("should not log when email succeeds", async () => {
		mockSendWebhookFailedAlertEmail.mockResolvedValue({ success: true });
		const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

		await sendWebhookFailedAlert(defaultParams);

		expect(consoleSpy).not.toHaveBeenCalled();
	});
});
