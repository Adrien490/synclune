import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as Sentry from "@sentry/nextjs";
import { getInvoiceProvider, resetInvoiceProviderForTests } from "../factory";
import { LocalPdfProvider } from "../local-pdf.provider";
import { MockProvider } from "../mock.provider";

vi.mock("@sentry/nextjs", () => ({
	captureMessage: vi.fn(),
	captureException: vi.fn(),
	addBreadcrumb: vi.fn(),
}));

vi.mock("@/shared/lib/logger", () => ({
	logger: {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	},
}));

describe("getInvoiceProvider", () => {
	const ORIGINAL_PROVIDER = process.env.INVOICE_PROVIDER;

	beforeEach(() => {
		resetInvoiceProviderForTests();
		vi.clearAllMocks();
	});

	afterEach(() => {
		if (ORIGINAL_PROVIDER === undefined) {
			delete process.env.INVOICE_PROVIDER;
		} else {
			process.env.INVOICE_PROVIDER = ORIGINAL_PROVIDER;
		}
		vi.unstubAllEnvs();
		resetInvoiceProviderForTests();
	});

	it("defaults to LocalPdfProvider when INVOICE_PROVIDER is unset", () => {
		delete process.env.INVOICE_PROVIDER;
		const provider = getInvoiceProvider();
		expect(provider).toBeInstanceOf(LocalPdfProvider);
	});

	it("returns LocalPdfProvider when INVOICE_PROVIDER=local", () => {
		process.env.INVOICE_PROVIDER = "local";
		const provider = getInvoiceProvider();
		expect(provider).toBeInstanceOf(LocalPdfProvider);
	});

	it("returns MockProvider when INVOICE_PROVIDER=mock", () => {
		process.env.INVOICE_PROVIDER = "mock";
		const provider = getInvoiceProvider();
		expect(provider).toBeInstanceOf(MockProvider);
	});

	it("caches the instance (singleton)", () => {
		process.env.INVOICE_PROVIDER = "local";
		const first = getInvoiceProvider();
		const second = getInvoiceProvider();
		expect(first).toBe(second);
	});

	it("throws on unknown provider id", () => {
		process.env.INVOICE_PROVIDER = "unknown-provider-xyz";
		expect(() => getInvoiceProvider()).toThrow(/Unknown INVOICE_PROVIDER/);
	});

	it("throws on chorus-pro (reserved, not implemented)", () => {
		process.env.INVOICE_PROVIDER = "chorus-pro";
		expect(() => getInvoiceProvider()).toThrow(/reserved but not implemented/);
	});

	it("resetInvoiceProviderForTests breaks the cache (different instance after env change)", () => {
		process.env.INVOICE_PROVIDER = "local";
		const first = getInvoiceProvider();
		resetInvoiceProviderForTests();
		const second = getInvoiceProvider();
		expect(first).not.toBe(second);
		expect(second).toBeInstanceOf(LocalPdfProvider);
	});

	it("logs a Sentry warning when INVOICE_PROVIDER=mock in production", () => {
		process.env.INVOICE_PROVIDER = "mock";
		vi.stubEnv("NODE_ENV", "production");
		const provider = getInvoiceProvider();
		expect(provider).toBeInstanceOf(MockProvider);
		expect(Sentry.captureMessage).toHaveBeenCalledWith(
			expect.stringContaining("MockProvider does not transmit"),
			{ level: "warning" },
		);
	});

	it("does NOT log Sentry warning when INVOICE_PROVIDER=mock in non-production", () => {
		process.env.INVOICE_PROVIDER = "mock";
		vi.stubEnv("NODE_ENV", "test");
		getInvoiceProvider();
		expect(Sentry.captureMessage).not.toHaveBeenCalled();
	});
});
