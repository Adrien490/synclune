import { describe, it, expect, vi, beforeEach } from "vitest"

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockResendEmailsSend, mockRender } = vi.hoisted(() => ({
	mockResendEmailsSend: vi.fn(),
	mockRender: vi.fn(),
}))

vi.mock("resend", () => ({
	Resend: class MockResend {
		emails = { send: mockResendEmailsSend }
		constructor(_apiKey: string | undefined) {}
	},
}))

vi.mock("@react-email/components", () => ({
	render: mockRender,
}))

vi.mock("@/shared/lib/email-config", () => ({
	EMAIL_FROM: "Synclune <contact@synclune.fr>",
}))

import { sendEmail, renderAndSend } from "../send-email"

// ============================================================================
// sendEmail
// ============================================================================

describe("sendEmail", () => {
	beforeEach(() => {
		vi.resetAllMocks()
		vi.spyOn(console, "error").mockImplementation(() => {})
		vi.spyOn(console, "log").mockImplementation(() => {})
	})

	it("should return error for missing recipient (empty string)", async () => {
		const result = await sendEmail({
			to: "",
			subject: "Test",
			html: "<p>Hello</p>",
		})

		expect(result).toEqual({ success: false, error: "Missing recipient" })
		expect(mockResendEmailsSend).not.toHaveBeenCalled()
	})

	it("should return error for empty array recipient", async () => {
		const result = await sendEmail({
			to: [],
			subject: "Test",
			html: "<p>Hello</p>",
		})

		expect(result).toEqual({ success: false, error: "Missing recipient" })
		expect(mockResendEmailsSend).not.toHaveBeenCalled()
	})

	it("should log error when recipient is missing", async () => {
		const consoleSpy = vi.spyOn(console, "error")

		await sendEmail({ to: "", subject: "Test", html: "<p>Hello</p>" })

		expect(consoleSpy).toHaveBeenCalledWith("[EMAIL] Missing recipient")
	})

	it("should call resend.emails.send with EMAIL_FROM and all provided params", async () => {
		mockResendEmailsSend.mockResolvedValue({ data: { id: "msg_123" }, error: null })

		await sendEmail({
			to: "user@example.com",
			subject: "Order Confirmation",
			html: "<p>Your order is confirmed</p>",
			text: "Your order is confirmed",
			replyTo: "support@synclune.fr",
			headers: { "X-Custom": "value" },
			tags: [{ name: "category", value: "order" }],
		})

		expect(mockResendEmailsSend).toHaveBeenCalledWith({
			from: "Synclune <contact@synclune.fr>",
			to: "user@example.com",
			subject: "Order Confirmation",
			html: "<p>Your order is confirmed</p>",
			text: "Your order is confirmed",
			replyTo: "support@synclune.fr",
			headers: { "X-Custom": "value" },
			tags: [{ name: "category", value: "order" }],
		})
	})

	it("should return success with data on successful send", async () => {
		mockResendEmailsSend.mockResolvedValue({ data: { id: "msg_abc" }, error: null })

		const result = await sendEmail({
			to: "user@example.com",
			subject: "Welcome",
			html: "<p>Welcome!</p>",
		})

		expect(result).toEqual({ success: true, data: { id: "msg_abc" } })
	})

	it("should log success message on successful send", async () => {
		mockResendEmailsSend.mockResolvedValue({ data: { id: "msg_abc" }, error: null })
		const consoleSpy = vi.spyOn(console, "log")

		await sendEmail({
			to: "user@example.com",
			subject: "Welcome",
			html: "<p>Welcome!</p>",
		})

		expect(consoleSpy).toHaveBeenCalledWith('[EMAIL] Sent "Welcome" to user@example.com')
	})

	it("should return error when Resend returns an error object", async () => {
		const resendError = { message: "Invalid API key", name: "validation_error" }
		mockResendEmailsSend.mockResolvedValue({ data: null, error: resendError })

		const result = await sendEmail({
			to: "user@example.com",
			subject: "Test",
			html: "<p>Test</p>",
		})

		expect(result).toEqual({ success: false, error: resendError })
	})

	it("should log error when Resend returns an error object", async () => {
		const resendError = { message: "Invalid API key", name: "validation_error" }
		mockResendEmailsSend.mockResolvedValue({ data: null, error: resendError })
		const consoleSpy = vi.spyOn(console, "error")

		await sendEmail({
			to: "user@example.com",
			subject: "Test",
			html: "<p>Test</p>",
		})

		expect(consoleSpy).toHaveBeenCalledWith(
			'[EMAIL] Failed to send "Test" to user@example.com:',
			resendError,
		)
	})

	it("should return error when Resend throws an exception", async () => {
		const thrownError = new Error("Network timeout")
		mockResendEmailsSend.mockRejectedValue(thrownError)

		const result = await sendEmail({
			to: "user@example.com",
			subject: "Test",
			html: "<p>Test</p>",
		})

		expect(result).toEqual({ success: false, error: thrownError })
	})

	it("should log error when Resend throws an exception", async () => {
		const thrownError = new Error("Network timeout")
		mockResendEmailsSend.mockRejectedValue(thrownError)
		const consoleSpy = vi.spyOn(console, "error")

		await sendEmail({
			to: "user@example.com",
			subject: "Failing email",
			html: "<p>Test</p>",
		})

		expect(consoleSpy).toHaveBeenCalledWith(
			'[EMAIL] Failed to send "Failing email" to user@example.com:',
			thrownError,
		)
	})

	it("should join array recipients with ', ' in log messages", async () => {
		const thrownError = new Error("Network error")
		mockResendEmailsSend.mockRejectedValue(thrownError)
		const consoleSpy = vi.spyOn(console, "error")

		await sendEmail({
			to: ["alice@example.com", "bob@example.com"],
			subject: "Batch email",
			html: "<p>Hello everyone</p>",
		})

		expect(consoleSpy).toHaveBeenCalledWith(
			'[EMAIL] Failed to send "Batch email" to alice@example.com, bob@example.com:',
			thrownError,
		)
	})

	it("should pass array recipients directly to resend.emails.send", async () => {
		mockResendEmailsSend.mockResolvedValue({ data: { id: "msg_multi" }, error: null })

		await sendEmail({
			to: ["alice@example.com", "bob@example.com"],
			subject: "Batch email",
			html: "<p>Hello everyone</p>",
		})

		expect(mockResendEmailsSend).toHaveBeenCalledWith(
			expect.objectContaining({
				to: ["alice@example.com", "bob@example.com"],
			}),
		)
	})

	it("should return success for a single array recipient", async () => {
		mockResendEmailsSend.mockResolvedValue({ data: { id: "msg_single_arr" }, error: null })

		const result = await sendEmail({
			to: ["only@example.com"],
			subject: "Single array",
			html: "<p>Hi</p>",
		})

		expect(result).toEqual({ success: true, data: { id: "msg_single_arr" } })
	})
})

// ============================================================================
// renderAndSend
// ============================================================================

describe("renderAndSend", () => {
	const mockComponent = { type: "div", props: {}, key: null } as unknown as React.ReactElement

	beforeEach(() => {
		vi.resetAllMocks()
		vi.spyOn(console, "error").mockImplementation(() => {})
		vi.spyOn(console, "log").mockImplementation(() => {})
	})

	it("should return error for missing recipient without calling render", async () => {
		const result = await renderAndSend(mockComponent, {
			to: "",
			subject: "Test",
		})

		expect(result).toEqual({ success: false, error: "Missing recipient" })
		expect(mockRender).not.toHaveBeenCalled()
	})

	it("should return error for empty array recipient without calling render", async () => {
		const result = await renderAndSend(mockComponent, {
			to: [],
			subject: "Test",
		})

		expect(result).toEqual({ success: false, error: "Missing recipient" })
		expect(mockRender).not.toHaveBeenCalled()
	})

	it("should log error when recipient is missing before rendering", async () => {
		const consoleSpy = vi.spyOn(console, "error")

		await renderAndSend(mockComponent, { to: "", subject: "Test" })

		expect(consoleSpy).toHaveBeenCalledWith("[EMAIL] Missing recipient")
	})

	it("should render component to HTML and plain text then call sendEmail", async () => {
		mockRender
			.mockResolvedValueOnce("<p>Hello</p>")
			.mockResolvedValueOnce("Hello")
		mockResendEmailsSend.mockResolvedValue({ data: { id: "msg_render" }, error: null })

		await renderAndSend(mockComponent, {
			to: "user@example.com",
			subject: "Rendered email",
		})

		expect(mockRender).toHaveBeenCalledTimes(2)
		expect(mockRender).toHaveBeenNthCalledWith(1, mockComponent)
		expect(mockRender).toHaveBeenNthCalledWith(2, mockComponent, { plainText: true })
	})

	it("should pass rendered HTML and text to resend.emails.send", async () => {
		mockRender
			.mockResolvedValueOnce("<h1>Order confirmed</h1>")
			.mockResolvedValueOnce("Order confirmed")
		mockResendEmailsSend.mockResolvedValue({ data: { id: "msg_render" }, error: null })

		await renderAndSend(mockComponent, {
			to: "user@example.com",
			subject: "Order Confirmation",
		})

		expect(mockResendEmailsSend).toHaveBeenCalledWith(
			expect.objectContaining({
				html: "<h1>Order confirmed</h1>",
				text: "Order confirmed",
				to: "user@example.com",
				subject: "Order Confirmation",
			}),
		)
	})

	it("should return success result from sendEmail on successful render and send", async () => {
		mockRender
			.mockResolvedValueOnce("<p>Hello</p>")
			.mockResolvedValueOnce("Hello")
		mockResendEmailsSend.mockResolvedValue({ data: { id: "msg_ok" }, error: null })

		const result = await renderAndSend(mockComponent, {
			to: "user@example.com",
			subject: "Welcome",
		})

		expect(result).toEqual({ success: true, data: { id: "msg_ok" } })
	})

	it("should return error when render throws", async () => {
		const renderError = new Error("JSX rendering failed")
		mockRender.mockRejectedValue(renderError)

		const result = await renderAndSend(mockComponent, {
			to: "user@example.com",
			subject: "Broken template",
		})

		expect(result).toEqual({ success: false, error: renderError })
		expect(mockResendEmailsSend).not.toHaveBeenCalled()
	})

	it("should log error with subject and recipient when render throws", async () => {
		const renderError = new Error("JSX rendering failed")
		mockRender.mockRejectedValue(renderError)
		const consoleSpy = vi.spyOn(console, "error")

		await renderAndSend(mockComponent, {
			to: "user@example.com",
			subject: "Broken template",
		})

		expect(consoleSpy).toHaveBeenCalledWith(
			'[EMAIL] Failed to render template for "Broken template" to user@example.com:',
			renderError,
		)
	})

	it("should log render error with joined recipients when to is an array", async () => {
		const renderError = new Error("Template crash")
		mockRender.mockRejectedValue(renderError)
		const consoleSpy = vi.spyOn(console, "error")

		await renderAndSend(mockComponent, {
			to: ["alice@example.com", "bob@example.com"],
			subject: "Array recipient template",
		})

		expect(consoleSpy).toHaveBeenCalledWith(
			'[EMAIL] Failed to render template for "Array recipient template" to alice@example.com, bob@example.com:',
			renderError,
		)
	})

	it("should pass through replyTo, headers and tags to resend.emails.send", async () => {
		mockRender
			.mockResolvedValueOnce("<p>Content</p>")
			.mockResolvedValueOnce("Content")
		mockResendEmailsSend.mockResolvedValue({ data: { id: "msg_params" }, error: null })

		await renderAndSend(mockComponent, {
			to: "user@example.com",
			subject: "Full params",
			replyTo: "support@synclune.fr",
			headers: { "X-Order-Id": "order_123" },
			tags: [{ name: "type", value: "transactional" }],
		})

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
		)
	})
})
