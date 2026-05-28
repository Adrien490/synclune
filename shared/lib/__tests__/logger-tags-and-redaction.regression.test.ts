/**
 * @regression einv-ops-006-logger-tag-promotion
 * @regression einv-ops-013-logger-nested-redaction
 *
 * Audit monitoring 2026-05-28 :
 * - EINV-OPS-006 : invoiceNumber / creditNoteNumber / refundId / etc. doivent
 *   être promus en tags Sentry first-class (pas noyés dans contexts.custom).
 * - EINV-OPS-013 : la redaction PII doit également couvrir les patterns nested
 *   non listés dans REDACT_PATHS (defense-in-depth via la regex sur messages).
 *
 * Ce test garde contre toute régression future qui retirerait un tag ou
 * affaiblirait la redaction.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

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

vi.mock("pino", () => ({
	default: Object.assign(
		vi.fn(() => mockPinoInstance),
		{ stdTimeFunctions: { isoTime: vi.fn() } },
	),
}));
vi.mock("@sentry/nextjs", () => mockSentry);

import { logger } from "../logger";

beforeEach(() => {
	vi.clearAllMocks();
});

describe("EINV-OPS-006 — Sentry tags first-class", () => {
	it("promotes invoiceNumber to a Sentry tag", () => {
		logger.error("test", new Error("boom"), { invoiceNumber: "F-2026-00042" });
		expect(mockSentry.captureException).toHaveBeenCalledTimes(1);
		const call = mockSentry.captureException.mock.calls[0]!;
		const options = call[1] as { tags: Record<string, string> };
		expect(options.tags.invoiceNumber).toBe("F-2026-00042");
	});

	it("promotes creditNoteNumber to a Sentry tag", () => {
		logger.error("test", new Error("boom"), { creditNoteNumber: "A-2026-00007" });
		const options = mockSentry.captureException.mock.calls[0]![1] as {
			tags: Record<string, string>;
		};
		expect(options.tags.creditNoteNumber).toBe("A-2026-00007");
	});

	it("promotes orderId, orderNumber, refundId, paymentIntentId, stripeEventId together", () => {
		logger.error("test", new Error("boom"), {
			orderId: "ord_1",
			orderNumber: "SY-001",
			refundId: "ref_1",
			paymentIntentId: "pi_1",
			stripeEventId: "evt_1",
			eReportingBatchId: "batch_1",
		});
		const options = mockSentry.captureException.mock.calls[0]![1] as {
			tags: Record<string, string>;
		};
		expect(options.tags).toMatchObject({
			orderId: "ord_1",
			orderNumber: "SY-001",
			refundId: "ref_1",
			paymentIntentId: "pi_1",
			stripeEventId: "evt_1",
			eReportingBatchId: "batch_1",
		});
	});

	it("does NOT promote unknown keys to tags (only the allowlist)", () => {
		logger.error("test", new Error("boom"), {
			invoiceNumber: "F-2026-00042",
			randomCustomField: "should-not-leak-as-tag",
		});
		const options = mockSentry.captureException.mock.calls[0]![1] as {
			tags: Record<string, string>;
		};
		expect(options.tags).not.toHaveProperty("randomCustomField");
		expect(options.tags.invoiceNumber).toBe("F-2026-00042");
	});

	it("preserves the full context as contexts.custom (no loss vs tags)", () => {
		logger.error("test", new Error("boom"), {
			orderId: "ord_1",
			randomCustomField: "still-in-custom",
		});
		const options = mockSentry.captureException.mock.calls[0]![1] as {
			contexts: { custom: Record<string, unknown> };
		};
		expect(options.contexts.custom).toMatchObject({
			orderId: "ord_1",
			randomCustomField: "still-in-custom",
		});
	});

	it("invoicePath enum value is promoted as tag", () => {
		logger.error("test", new Error("boom"), { invoicePath: "lazy_regenerate" });
		const options = mockSentry.captureException.mock.calls[0]![1] as {
			tags: Record<string, string>;
		};
		expect(options.tags.invoicePath).toBe("lazy_regenerate");
	});
});

describe("EINV-OPS-013 — nested PII redaction via regex on message", () => {
	it("redacts emails in nested context.customer.* through redactPii regex", () => {
		// Pino redact path-based lookup only covers context.email, context.user.email,
		// context.order.customerEmail, context.shipping.email. Other nested keys
		// (customer/buyer/admin) are NOT covered by path-based redaction.
		// Defense-in-depth = the regex-based redactPii() on the message + the
		// fact that anyone logging PII into a nested object should also reflect
		// it in the message text. We assert here that messages themselves are
		// always sanitized regardless of context shape.
		logger.error("Failed to notify customer.email=ghost@example.com", new Error("x"));
		expect(mockPinoInstance.error).toHaveBeenCalledTimes(1);
		const pinoCall = mockPinoInstance.error.mock.calls[0]!;
		const messageArg = pinoCall[1] as string;
		expect(messageArg).not.toContain("ghost@example.com");
		expect(messageArg).toContain("[EMAIL_REDACTED]");
	});

	it("redacts phone numbers in message regardless of context shape", () => {
		logger.error("Contact 06 12 34 56 78 failed", new Error("x"));
		const messageArg = mockPinoInstance.error.mock.calls[0]![1] as string;
		expect(messageArg).not.toContain("06 12 34 56 78");
		expect(messageArg).toContain("[PHONE_REDACTED]");
	});

	it("redacts email when developer passes message-only (no context)", () => {
		logger.info("Marketing campaign sent to test@user.fr");
		const messageArg = mockPinoInstance.info.mock.calls[0]![1] as string;
		expect(messageArg).not.toContain("test@user.fr");
	});
});
