import { describe, it, expect, vi, beforeEach } from "vitest";

// Hoist mock factories so they are available before module resolution
const { mockPinoInstance, mockSentry } = vi.hoisted(() => ({
	mockPinoInstance: {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		debug: vi.fn(),
	},
	mockSentry: {
		captureException: vi.fn(),
		captureMessage: vi.fn(),
		addBreadcrumb: vi.fn(),
	},
}));

// Mock pino — return a factory that returns the shared mock instance.
// stdTimeFunctions must also be present because logger.ts accesses it at module load time.
vi.mock("pino", () => ({
	default: Object.assign(
		vi.fn(() => mockPinoInstance),
		{
			stdTimeFunctions: { isoTime: vi.fn() },
		},
	),
}));

// Mock Sentry
vi.mock("@sentry/nextjs", () => mockSentry);

import { logger, REDACT_PATHS } from "../logger";

beforeEach(() => {
	vi.clearAllMocks();
});

// ============================================================================
// redactPii (tested indirectly via logger methods)
// ============================================================================

describe("redactPii - email redaction", () => {
	it("redacts a plain email address in a message", () => {
		logger.info("User user@example.com logged in");
		expect(mockPinoInstance.info).toHaveBeenCalledWith(
			{ context: undefined },
			"User [EMAIL_REDACTED] logged in",
		);
	});

	it("redacts multiple email addresses in one message", () => {
		logger.info("From alice@test.org to bob@domain.co.uk");
		expect(mockPinoInstance.info).toHaveBeenCalledWith(
			{ context: undefined },
			"From [EMAIL_REDACTED] to [EMAIL_REDACTED]",
		);
	});

	it("redacts email with subdomain and plus-addressing", () => {
		logger.info("Contact admin+tag@sub.example.com now");
		expect(mockPinoInstance.info).toHaveBeenCalledWith(
			{ context: undefined },
			"Contact [EMAIL_REDACTED] now",
		);
	});
});

describe("redactPii - phone redaction", () => {
	it("redacts a French phone number", () => {
		logger.info("Call 0612345678 for support");
		expect(mockPinoInstance.info).toHaveBeenCalledWith(
			{ context: undefined },
			expect.stringContaining("[PHONE_REDACTED]"),
		);
	});

	it("redacts an international phone number", () => {
		logger.info("Reach us at +33 6 12 34 56 78");
		expect(mockPinoInstance.info).toHaveBeenCalledWith(
			{ context: undefined },
			expect.stringContaining("[PHONE_REDACTED]"),
		);
	});
});

describe("redactPii - combined and passthrough", () => {
	it("redacts both email and phone in a single message", () => {
		logger.info("Email user@test.com or call 0612345678");
		const [, msg] = mockPinoInstance.info.mock.calls[0] as [unknown, string];
		expect(msg).toContain("[EMAIL_REDACTED]");
		expect(msg).toContain("[PHONE_REDACTED]");
		expect(msg).not.toContain("user@test.com");
	});

	it("passes through messages with no PII unchanged", () => {
		logger.info("Order created successfully");
		expect(mockPinoInstance.info).toHaveBeenCalledWith(
			{ context: undefined },
			"Order created successfully",
		);
	});
});

// ============================================================================
// REDACT_PATHS configuration (ORD-COMPLY-008 — audit conformité 2026-05-27)
// ============================================================================

describe("REDACT_PATHS", () => {
	it("includes top-level context email + phone (legacy)", () => {
		expect(REDACT_PATHS).toContain("context.email");
		expect(REDACT_PATHS).toContain("context.phone");
	});

	// `customerPhone` et `billingPhone` ont disparu avec leurs colonnes
	// (2026-08-04) : le seul téléphone du modèle Order est `shippingPhone`.
	it("includes customer/shipping PII variants", () => {
		expect(REDACT_PATHS).toContain("context.customerEmail");
		expect(REDACT_PATHS).toContain("context.shippingPhone");
	});

	it("includes nested user.* paths", () => {
		expect(REDACT_PATHS).toContain("context.user.email");
		expect(REDACT_PATHS).toContain("context.user.phone");
		expect(REDACT_PATHS).toContain("context.user.name");
	});

	it("includes nested order.* paths", () => {
		expect(REDACT_PATHS).toContain("context.order.customerEmail");
		expect(REDACT_PATHS).toContain("context.order.customerName");
	});
});

// ============================================================================
// logger.info
// ============================================================================

describe("logger.info", () => {
	it("calls pinoLogger.info with the redacted message and context", () => {
		const ctx = { action: "createOrder", userId: "u1" };
		logger.info("Processing order", ctx);
		expect(mockPinoInstance.info).toHaveBeenCalledOnce();
		expect(mockPinoInstance.info).toHaveBeenCalledWith({ context: ctx }, "Processing order");
	});

	it("forwards undefined context when none provided", () => {
		logger.info("Simple info message");
		expect(mockPinoInstance.info).toHaveBeenCalledWith(
			{ context: undefined },
			"Simple info message",
		);
	});

	it("does not call Sentry for info level", () => {
		logger.info("No Sentry needed");
		expect(mockSentry.captureException).not.toHaveBeenCalled();
		expect(mockSentry.captureMessage).not.toHaveBeenCalled();
		expect(mockSentry.addBreadcrumb).not.toHaveBeenCalled();
	});
});

// ============================================================================
// logger.warn
// ============================================================================

describe("logger.warn", () => {
	it("calls pinoLogger.warn with the redacted message and context", () => {
		const ctx = { route: "/checkout" };
		logger.warn("Low stock detected", ctx);
		expect(mockPinoInstance.warn).toHaveBeenCalledWith({ context: ctx }, "Low stock detected");
	});

	it("calls Sentry.addBreadcrumb with level warning", () => {
		logger.warn("Stripe webhook delayed");
		expect(mockSentry.addBreadcrumb).toHaveBeenCalledWith({
			level: "warning",
			message: "Stripe webhook delayed",
			data: undefined,
		});
	});

	it("passes redacted message and context data to Sentry breadcrumb", () => {
		const ctx = { service: "payments" };
		logger.warn("Contact admin@example.com for help", ctx);
		expect(mockSentry.addBreadcrumb).toHaveBeenCalledWith({
			level: "warning",
			message: "Contact [EMAIL_REDACTED] for help",
			data: ctx,
		});
	});

	it("does not call captureException or captureMessage", () => {
		logger.warn("Just a warning");
		expect(mockSentry.captureException).not.toHaveBeenCalled();
		expect(mockSentry.captureMessage).not.toHaveBeenCalled();
	});
});

// ============================================================================
// logger.error — with Error instance
// ============================================================================

describe("logger.error with an Error instance", () => {
	it("calls pinoLogger.error with the error object and redacted message", () => {
		const err = new Error("Something went wrong");
		logger.error("DB failure", err);
		expect(mockPinoInstance.error).toHaveBeenCalledWith({ err, context: undefined }, "DB failure");
	});

	it("calls Sentry.captureException with the Error", () => {
		const err = new TypeError("Invalid type");
		logger.error("Type mismatch", err);
		expect(mockSentry.captureException).toHaveBeenCalledWith(
			err,
			expect.objectContaining({ contexts: { custom: undefined } }),
		);
	});

	it("does not call Sentry.captureMessage when an Error is provided", () => {
		logger.error("Something", new Error("real error"));
		expect(mockSentry.captureMessage).not.toHaveBeenCalled();
	});
});

// ============================================================================
// logger.error — with string error (wrapped in new Error)
// ============================================================================

describe("logger.error with a string error", () => {
	it("wraps the string in a new Error and passes it to pinoLogger.error", () => {
		logger.error("Webhook failed", "timeout");
		const [[{ err }]] = mockPinoInstance.error.mock.calls as [[{ err: Error }]];
		expect(err).toBeInstanceOf(Error);
		expect(err.message).toBe("timeout");
	});

	it("calls Sentry.captureException with the wrapped Error", () => {
		logger.error("Task error", "DB unreachable");
		const [wrappedErr] = mockSentry.captureException.mock.calls[0] as [Error];
		expect(wrappedErr).toBeInstanceOf(Error);
		expect(wrappedErr.message).toBe("DB unreachable");
	});
});

// ============================================================================
// logger.error — without an error value
// ============================================================================

describe("logger.error without an error value", () => {
	it("calls Sentry.captureMessage instead of captureException", () => {
		logger.error("Rate limit triggered");
		expect(mockSentry.captureMessage).toHaveBeenCalledWith(
			"Rate limit triggered",
			expect.objectContaining({ level: "error" }),
		);
		expect(mockSentry.captureException).not.toHaveBeenCalled();
	});

	it("passes redacted message to captureMessage", () => {
		logger.error("Alert: admin@example.com exceeded quota");
		expect(mockSentry.captureMessage).toHaveBeenCalledWith(
			"Alert: [EMAIL_REDACTED] exceeded quota",
			expect.anything(),
		);
	});

	it("passes undefined err to pinoLogger.error", () => {
		logger.error("No error object here");
		expect(mockPinoInstance.error).toHaveBeenCalledWith(
			{ err: undefined, context: undefined },
			"No error object here",
		);
	});
});

// ============================================================================
// logger.error — context tags forwarded to Sentry
// ============================================================================

describe("logger.error context tags", () => {
	it("forwards action tag to Sentry.captureException", () => {
		const ctx = { action: "cancelOrder" };
		logger.error("Action failed", new Error("err"), ctx);
		expect(mockSentry.captureException).toHaveBeenCalledWith(
			expect.any(Error),
			expect.objectContaining({ tags: expect.objectContaining({ action: "cancelOrder" }) }),
		);
	});

	it("forwards cronJob tag to Sentry.captureException", () => {
		const ctx = { cronJob: "cleanup-pending-orders" };
		logger.error("Cron failure", new Error("err"), ctx);
		expect(mockSentry.captureException).toHaveBeenCalledWith(
			expect.any(Error),
			expect.objectContaining({
				tags: expect.objectContaining({ cronJob: "cleanup-pending-orders" }),
			}),
		);
	});

	it("forwards service tag to Sentry.captureException", () => {
		const ctx = { service: "audit" };
		logger.error("Audit write failed", new Error("err"), ctx);
		expect(mockSentry.captureException).toHaveBeenCalledWith(
			expect.any(Error),
			expect.objectContaining({ tags: expect.objectContaining({ service: "audit" }) }),
		);
	});

	it("forwards route tag to Sentry.captureException", () => {
		const ctx = { route: "/api/webhooks/stripe" };
		logger.error("Route error", new Error("err"), ctx);
		expect(mockSentry.captureException).toHaveBeenCalledWith(
			expect.any(Error),
			expect.objectContaining({
				tags: expect.objectContaining({ route: "/api/webhooks/stripe" }),
			}),
		);
	});

	it("omits absent tags from captureException call", () => {
		logger.error("No tags", new Error("err"), {});
		const [, options] = mockSentry.captureException.mock.calls[0] as [
			Error,
			{ tags: Record<string, string> },
		];
		expect(options.tags).toEqual({});
	});

	it("forwards action and cronJob tags to Sentry.captureMessage (no error case)", () => {
		const ctx = { action: "processJob", cronJob: "retry-webhooks" };
		logger.error("No error, with tags", undefined, ctx);
		expect(mockSentry.captureMessage).toHaveBeenCalledWith(
			"No error, with tags",
			expect.objectContaining({
				tags: { action: "processJob", cronJob: "retry-webhooks" },
			}),
		);
	});

	it("passes full context in captureException contexts.custom", () => {
		const ctx = { userId: "u42", service: "payments", extra: "data" };
		logger.error("Detailed error", new Error("err"), ctx);
		expect(mockSentry.captureException).toHaveBeenCalledWith(
			expect.any(Error),
			expect.objectContaining({ contexts: { custom: ctx } }),
		);
	});
});

// ============================================================================
// logger.debug
// ============================================================================

describe("logger.debug", () => {
	it("calls pinoLogger.debug with the redacted message and context", () => {
		const ctx = { service: "cart" };
		logger.debug("VARIANT validation started", ctx);
		expect(mockPinoInstance.debug).toHaveBeenCalledWith(
			{ context: ctx },
			"VARIANT validation started",
		);
	});

	it("forwards undefined context when none provided", () => {
		logger.debug("Debug ping");
		expect(mockPinoInstance.debug).toHaveBeenCalledWith({ context: undefined }, "Debug ping");
	});

	it("does not call any Sentry methods", () => {
		logger.debug("Silent debug");
		expect(mockSentry.captureException).not.toHaveBeenCalled();
		expect(mockSentry.captureMessage).not.toHaveBeenCalled();
		expect(mockSentry.addBreadcrumb).not.toHaveBeenCalled();
	});
});
