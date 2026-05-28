import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockResendEmailsSend, mockRender, mockLogger } = vi.hoisted(() => ({
	mockResendEmailsSend: vi.fn(),
	mockRender: vi.fn(),
	mockLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock("@/shared/lib/logger", () => ({ logger: mockLogger }));

vi.mock("resend", () => ({
	Resend: class MockResend {
		emails = { send: mockResendEmailsSend };
		constructor(_apiKey: string | undefined) {}
	},
}));

vi.mock("react-email", () => ({
	render: mockRender,
}));

vi.mock("@/shared/lib/email-config", () => ({
	EMAIL_FROM: "Synclune <contact@synclune.fr>",
	EMAIL_CONTACT: "contact@synclune.fr",
	EMAIL_ADMIN: "contact@synclune.fr",
	EMAIL_ADMIN_BCC: "ops-fallback@synclune.fr",
}));

vi.mock("@/shared/utils/with-retry", () => ({
	withRetry: async (fn: () => Promise<unknown>) => fn(),
}));

vi.mock("@/shared/lib/circuit-breaker", () => ({
	resendCircuitBreaker: {
		execute: async (fn: () => Promise<unknown>) => fn(),
	},
	CircuitBreakerError: class CircuitBreakerError extends Error {
		constructor(name: string) {
			super(`Circuit breaker OPEN for ${name}`);
			this.name = "CircuitBreakerError";
		}
	},
}));

import { sendEmail, renderAndSend } from "../send-email";

// ============================================================================
// sendEmail
// ============================================================================

describe("sendEmail", () => {
	beforeEach(async () => {
		vi.resetAllMocks();
		vi.stubEnv("RESEND_API_KEY", "re_test_123");
		const { __resetEmailDedupCacheForTests } = await import("../send-email");
		__resetEmailDedupCacheForTests();
	});

	it("should return error for missing recipient (empty string)", async () => {
		const result = await sendEmail({
			to: "",
			subject: "Test",
			html: "<p>Hello</p>",
		});

		expect(result).toEqual({ success: false, error: "Missing recipient" });
		expect(mockResendEmailsSend).not.toHaveBeenCalled();
	});

	it("should return error for empty array recipient", async () => {
		const result = await sendEmail({
			to: [],
			subject: "Test",
			html: "<p>Hello</p>",
		});

		expect(result).toEqual({ success: false, error: "Missing recipient" });
		expect(mockResendEmailsSend).not.toHaveBeenCalled();
	});

	it("should log error when recipient is missing", async () => {
		await sendEmail({ to: "", subject: "Test", html: "<p>Hello</p>" });

		expect(mockLogger.error).toHaveBeenCalledWith("Missing recipient", undefined, {
			service: "send-email",
		});
	});

	it("should call resend.emails.send with EMAIL_FROM and all provided params", async () => {
		mockResendEmailsSend.mockResolvedValue({ data: { id: "msg_123" }, error: null });

		await sendEmail({
			to: "user@example.com",
			subject: "Order Confirmation",
			html: "<p>Your order is confirmed</p>",
			text: "Your order is confirmed",
			replyTo: "support@synclune.fr",
			headers: { "X-Custom": "value" },
			tags: [{ name: "category", value: "order" }],
		});

		expect(mockResendEmailsSend).toHaveBeenCalledWith(
			{
				from: "Synclune <contact@synclune.fr>",
				to: "user@example.com",
				subject: "Order Confirmation",
				html: "<p>Your order is confirmed</p>",
				text: "Your order is confirmed",
				replyTo: "support@synclune.fr",
				headers: { "X-Custom": "value" },
				tags: [{ name: "category", value: "order" }],
			},
			undefined,
		);
	});

	it("should return success with data on successful send", async () => {
		mockResendEmailsSend.mockResolvedValue({ data: { id: "msg_abc" }, error: null });

		const result = await sendEmail({
			to: "user@example.com",
			subject: "Welcome",
			html: "<p>Welcome!</p>",
		});

		expect(result).toEqual({ success: true, data: { id: "msg_abc" } });
	});

	it("should log success message on successful send", async () => {
		mockResendEmailsSend.mockResolvedValue({ data: { id: "msg_abc" }, error: null });

		await sendEmail({
			to: "user@example.com",
			subject: "Welcome",
			html: "<p>Welcome!</p>",
		});

		expect(mockLogger.info).toHaveBeenCalledWith("Email sent successfully", {
			service: "send-email",
			subject: "Welcome",
		});
	});

	it("should return error when Resend returns an error object", async () => {
		const resendError = { message: "Invalid API key", name: "validation_error" };
		mockResendEmailsSend.mockResolvedValue({ data: null, error: resendError });

		const result = await sendEmail({
			to: "user@example.com",
			subject: "Test",
			html: "<p>Test</p>",
		});

		expect(result).toEqual({ success: false, error: resendError });
	});

	it("should log error when Resend returns an error object", async () => {
		const resendError = { message: "Invalid API key", name: "validation_error" };
		mockResendEmailsSend.mockResolvedValue({ data: null, error: resendError });

		await sendEmail({
			to: "user@example.com",
			subject: "Test",
			html: "<p>Test</p>",
		});

		expect(mockLogger.error).toHaveBeenCalledWith("Failed to send email", resendError, {
			service: "send-email",
			subject: "Test",
		});
	});

	it("should return error when Resend throws an exception", async () => {
		const thrownError = new Error("Network timeout");
		mockResendEmailsSend.mockRejectedValue(thrownError);

		const result = await sendEmail({
			to: "user@example.com",
			subject: "Test",
			html: "<p>Test</p>",
		});

		expect(result).toEqual({ success: false, error: thrownError });
	});

	it("should log error when Resend throws an exception", async () => {
		const thrownError = new Error("Network timeout");
		mockResendEmailsSend.mockRejectedValue(thrownError);

		await sendEmail({
			to: "user@example.com",
			subject: "Failing email",
			html: "<p>Test</p>",
		});

		expect(mockLogger.error).toHaveBeenCalledWith("Failed to send email", thrownError, {
			service: "send-email",
			subject: "Failing email",
		});
	});

	it("should log error with subject for array recipients", async () => {
		const thrownError = new Error("Network error");
		mockResendEmailsSend.mockRejectedValue(thrownError);

		await sendEmail({
			to: ["alice@example.com", "bob@example.com"],
			subject: "Batch email",
			html: "<p>Hello everyone</p>",
		});

		expect(mockLogger.error).toHaveBeenCalledWith("Failed to send email", thrownError, {
			service: "send-email",
			subject: "Batch email",
		});
	});

	it("should pass array recipients directly to resend.emails.send", async () => {
		mockResendEmailsSend.mockResolvedValue({ data: { id: "msg_multi" }, error: null });

		await sendEmail({
			to: ["alice@example.com", "bob@example.com"],
			subject: "Batch email",
			html: "<p>Hello everyone</p>",
		});

		expect(mockResendEmailsSend).toHaveBeenCalledWith(
			expect.objectContaining({
				to: ["alice@example.com", "bob@example.com"],
			}),
			undefined,
		);
	});

	it("should return success for a single array recipient", async () => {
		mockResendEmailsSend.mockResolvedValue({ data: { id: "msg_single_arr" }, error: null });

		const result = await sendEmail({
			to: ["only@example.com"],
			subject: "Single array",
			html: "<p>Hi</p>",
		});

		expect(result).toEqual({ success: true, data: { id: "msg_single_arr" } });
	});

	it("should return error when RESEND_API_KEY is not configured", async () => {
		vi.stubEnv("RESEND_API_KEY", "");

		const result = await sendEmail({
			to: "user@example.com",
			subject: "Test",
			html: "<p>Test</p>",
		});

		expect(result).toEqual({ success: false, error: "RESEND_API_KEY not configured" });
		expect(mockResendEmailsSend).not.toHaveBeenCalled();
	});

	describe("EMAIL_ADMIN_BCC auto-injection", () => {
		it("adds bcc when to === EMAIL_ADMIN and EMAIL_ADMIN_BCC is set", async () => {
			mockResendEmailsSend.mockResolvedValue({ data: { id: "evt_1" }, error: null });

			await sendEmail({
				to: "contact@synclune.fr",
				subject: "Admin alert",
				html: "<p>X</p>",
			});

			expect(mockResendEmailsSend).toHaveBeenCalledWith(
				expect.objectContaining({ bcc: "ops-fallback@synclune.fr" }),
				undefined,
			);
		});

		it("does NOT add bcc on non-admin recipient", async () => {
			mockResendEmailsSend.mockResolvedValue({ data: { id: "evt_2" }, error: null });

			await sendEmail({
				to: "customer@example.com",
				subject: "Order confirmation",
				html: "<p>X</p>",
			});

			expect(mockResendEmailsSend).toHaveBeenCalledWith(
				expect.not.objectContaining({ bcc: expect.anything() }),
				undefined,
			);
		});

		it("preserves caller-provided bcc instead of auto-injecting", async () => {
			mockResendEmailsSend.mockResolvedValue({ data: { id: "evt_3" }, error: null });

			await sendEmail({
				to: "contact@synclune.fr",
				bcc: "custom@example.com",
				subject: "Admin alert",
				html: "<p>X</p>",
			});

			expect(mockResendEmailsSend).toHaveBeenCalledWith(
				expect.objectContaining({ bcc: "custom@example.com" }),
				undefined,
			);
		});
	});
});

// ============================================================================
// renderAndSend
// ============================================================================

describe("renderAndSend", () => {
	const mockComponent = { type: "div", props: {}, key: null } as unknown as React.ReactElement;

	beforeEach(async () => {
		vi.resetAllMocks();
		vi.stubEnv("RESEND_API_KEY", "re_test_123");
		const { __resetEmailDedupCacheForTests } = await import("../send-email");
		__resetEmailDedupCacheForTests();
	});

	it("should return error for missing recipient without calling render", async () => {
		const result = await renderAndSend(mockComponent, {
			to: "",
			subject: "Test",
		});

		expect(result).toEqual({ success: false, error: "Missing recipient" });
		expect(mockRender).not.toHaveBeenCalled();
	});

	it("should return error for empty array recipient without calling render", async () => {
		const result = await renderAndSend(mockComponent, {
			to: [],
			subject: "Test",
		});

		expect(result).toEqual({ success: false, error: "Missing recipient" });
		expect(mockRender).not.toHaveBeenCalled();
	});

	it("should log error when recipient is missing before rendering", async () => {
		await renderAndSend(mockComponent, { to: "", subject: "Test" });

		expect(mockLogger.error).toHaveBeenCalledWith("Missing recipient", undefined, {
			service: "send-email",
		});
	});

	it("should render component to HTML and plain text then call sendEmail", async () => {
		mockRender.mockResolvedValueOnce("<p>Hello</p>").mockResolvedValueOnce("Hello");
		mockResendEmailsSend.mockResolvedValue({ data: { id: "msg_render" }, error: null });

		await renderAndSend(mockComponent, {
			to: "user@example.com",
			subject: "Rendered email",
		});

		expect(mockRender).toHaveBeenCalledTimes(2);
		expect(mockRender).toHaveBeenNthCalledWith(1, mockComponent);
		expect(mockRender).toHaveBeenNthCalledWith(2, mockComponent, { plainText: true });
	});

	it("should pass rendered HTML and text to resend.emails.send", async () => {
		mockRender
			.mockResolvedValueOnce("<h1>Order confirmed</h1>")
			.mockResolvedValueOnce("Order confirmed");
		mockResendEmailsSend.mockResolvedValue({ data: { id: "msg_render" }, error: null });

		await renderAndSend(mockComponent, {
			to: "user@example.com",
			subject: "Order Confirmation",
		});

		expect(mockResendEmailsSend).toHaveBeenCalledWith(
			expect.objectContaining({
				html: "<h1>Order confirmed</h1>",
				text: "Order confirmed",
				to: "user@example.com",
				subject: "Order Confirmation",
			}),
			undefined,
		);
	});

	it("should return success result from sendEmail on successful render and send", async () => {
		mockRender.mockResolvedValueOnce("<p>Hello</p>").mockResolvedValueOnce("Hello");
		mockResendEmailsSend.mockResolvedValue({ data: { id: "msg_ok" }, error: null });

		const result = await renderAndSend(mockComponent, {
			to: "user@example.com",
			subject: "Welcome",
		});

		expect(result).toEqual({ success: true, data: { id: "msg_ok" } });
	});

	it("should return error when render throws", async () => {
		const renderError = new Error("JSX rendering failed");
		mockRender.mockRejectedValue(renderError);

		const result = await renderAndSend(mockComponent, {
			to: "user@example.com",
			subject: "Broken template",
		});

		expect(result).toEqual({ success: false, error: renderError });
		expect(mockResendEmailsSend).not.toHaveBeenCalled();
	});

	it("should log error with subject and recipient when render throws", async () => {
		const renderError = new Error("JSX rendering failed");
		mockRender.mockRejectedValue(renderError);

		await renderAndSend(mockComponent, {
			to: "user@example.com",
			subject: "Broken template",
		});

		expect(mockLogger.error).toHaveBeenCalledWith("Failed to render email template", renderError, {
			service: "send-email",
			subject: "Broken template",
		});
	});

	it("should log render error with subject when to is an array", async () => {
		const renderError = new Error("Template crash");
		mockRender.mockRejectedValue(renderError);

		await renderAndSend(mockComponent, {
			to: ["alice@example.com", "bob@example.com"],
			subject: "Array recipient template",
		});

		expect(mockLogger.error).toHaveBeenCalledWith("Failed to render email template", renderError, {
			service: "send-email",
			subject: "Array recipient template",
		});
	});

	it("should pass through replyTo, headers and tags to resend.emails.send", async () => {
		mockRender.mockResolvedValueOnce("<p>Content</p>").mockResolvedValueOnce("Content");
		mockResendEmailsSend.mockResolvedValue({ data: { id: "msg_params" }, error: null });

		await renderAndSend(mockComponent, {
			to: "user@example.com",
			subject: "Full params",
			replyTo: "support@synclune.fr",
			headers: { "X-Order-Id": "order_123" },
			tags: [{ name: "type", value: "transactional" }],
		});

		expect(mockResendEmailsSend).toHaveBeenCalledWith(
			expect.objectContaining({
				from: "Synclune <contact@synclune.fr>",
				to: "user@example.com",
				subject: "Full params",
				replyTo: "support@synclune.fr",
				headers: { "X-Order-Id": "order_123" },
				tags: [{ name: "type", value: "transactional" }],
				html: "<p>Content</p>",
				text: "Content",
			}),
			undefined,
		);
	});
});

// ============================================================================
// ORD-TEST-016 — In-process email dedup (1× max for identical content)
//
// Le pattern critique : `processRefund` envoie l'email de confirmation au client
// ; quelques secondes plus tard le webhook `charge.refunded` arrive et tente
// d'envoyer un second email. Le cache de dedup doit court-circuiter le second
// envoi pour éviter le doublon dans la boîte du client.
// ============================================================================

describe("sendEmail — in-process dedup", () => {
	beforeEach(async () => {
		vi.resetAllMocks();
		vi.stubEnv("RESEND_API_KEY", "re_test_123");
		const { __resetEmailDedupCacheForTests } = await import("../send-email");
		__resetEmailDedupCacheForTests();
	});

	it("should skip the second call for identical (recipient, subject, html)", async () => {
		mockResendEmailsSend.mockResolvedValue({ data: { id: "msg_first" }, error: null });

		const params = {
			to: "client@example.com",
			subject: "Votre remboursement a été effectué - Synclune",
			html: "<p>Refund of 49.99€ for order SYN-2026-0042</p>",
		};

		const first = await sendEmail(params);
		const second = await sendEmail(params);

		expect(mockResendEmailsSend).toHaveBeenCalledTimes(1);
		expect(first.success).toBe(true);
		// Second call returns success with the original resendId (idempotent shape).
		expect(second.success).toBe(true);
	});

	it("should log 'Email skipped' on the second identical call", async () => {
		mockResendEmailsSend.mockResolvedValue({ data: { id: "msg_first" }, error: null });

		const params = {
			to: "client@example.com",
			subject: "Refund confirmation",
			html: "<p>Same content</p>",
		};

		await sendEmail(params);
		await sendEmail(params);

		expect(mockLogger.info).toHaveBeenCalledWith(
			expect.stringContaining("Email skipped"),
			expect.any(Object),
		);
	});

	it("should send twice for different recipients (same subject + html)", async () => {
		mockResendEmailsSend.mockResolvedValue({ data: { id: "msg" }, error: null });

		const html = "<p>Same content</p>";
		await sendEmail({ to: "alice@example.com", subject: "Refund", html });
		await sendEmail({ to: "bob@example.com", subject: "Refund", html });

		expect(mockResendEmailsSend).toHaveBeenCalledTimes(2);
	});

	it("should send twice for different subjects (same recipient + html)", async () => {
		mockResendEmailsSend.mockResolvedValue({ data: { id: "msg" }, error: null });

		const html = "<p>Same body</p>";
		await sendEmail({ to: "client@example.com", subject: "Refund A", html });
		await sendEmail({ to: "client@example.com", subject: "Refund B", html });

		expect(mockResendEmailsSend).toHaveBeenCalledTimes(2);
	});

	it("should send twice when skipIdempotence=true (broadcast escape hatch)", async () => {
		mockResendEmailsSend.mockResolvedValue({ data: { id: "msg" }, error: null });

		const params = {
			to: "client@example.com",
			subject: "Marketing",
			html: "<p>Newsletter</p>",
			skipIdempotence: true,
		};

		await sendEmail(params);
		await sendEmail(params);

		expect(mockResendEmailsSend).toHaveBeenCalledTimes(2);
	});

	it("should not consume the dedup slot when the first send fails", async () => {
		mockResendEmailsSend.mockResolvedValueOnce({
			data: null,
			error: { message: "rate_limit_exceeded" },
		});

		const params = {
			to: "client@example.com",
			subject: "Refund",
			html: "<p>Failed attempt</p>",
		};

		const first = await sendEmail(params);
		// Allow a successful retry
		mockResendEmailsSend.mockResolvedValueOnce({ data: { id: "msg_retry" }, error: null });
		const second = await sendEmail(params);

		expect(first.success).toBe(false);
		expect(second.success).toBe(true);
		expect(mockResendEmailsSend).toHaveBeenCalledTimes(2);
	});
});
