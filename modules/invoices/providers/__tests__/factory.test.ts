import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getInvoiceProvider, resetInvoiceProviderForTests } from "../factory";
import { LocalPdfProvider } from "../local-pdf.provider";

describe("getInvoiceProvider", () => {
	const ORIGINAL_PROVIDER = process.env.INVOICE_PROVIDER;

	beforeEach(() => {
		resetInvoiceProviderForTests();
	});

	afterEach(() => {
		if (ORIGINAL_PROVIDER === undefined) {
			delete process.env.INVOICE_PROVIDER;
		} else {
			process.env.INVOICE_PROVIDER = ORIGINAL_PROVIDER;
		}
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

	it("resetInvoiceProviderForTests breaks the cache (different instance after env change)", () => {
		process.env.INVOICE_PROVIDER = "local";
		const first = getInvoiceProvider();
		resetInvoiceProviderForTests();
		const second = getInvoiceProvider();
		expect(first).not.toBe(second);
		expect(second).toBeInstanceOf(LocalPdfProvider);
	});
});
