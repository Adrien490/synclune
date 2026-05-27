import { describe, expect, it } from "vitest";
import { LocalPdfProvider } from "../local-pdf.provider";

describe("LocalPdfProvider", () => {
	it("declares 'local' as id and PDF as only supported format", () => {
		const provider = new LocalPdfProvider();
		expect(provider.id).toBe("local");
		expect(provider.supportedFormats).toEqual(["PDF"]);
	});

	it("disables all platform capabilities (B2C-only stub)", () => {
		const provider = new LocalPdfProvider();
		expect(provider.capabilities.submitInvoice).toBe(false);
		expect(provider.capabilities.receiveInvoice).toBe(false);
		expect(provider.capabilities.eReporting).toBe(false);
		expect(provider.capabilities.directoryLookup).toBe(false);
	});

	it("submitInvoice returns SUBMITTED immediately (local archive only)", async () => {
		const provider = new LocalPdfProvider();
		const result = await provider.submitInvoice();
		expect(result.status).toBe("SUBMITTED");
		expect(result.providerInvoiceId).toMatch(/^local:/);
		expect(result.submittedAt).toBeInstanceOf(Date);
	});

	it("getInvoiceStatus mirrors SUBMITTED with no rejection reason", async () => {
		const provider = new LocalPdfProvider();
		const status = await provider.getInvoiceStatus();
		expect(status.status).toBe("SUBMITTED");
		expect(status.rejectionReason).toBeNull();
	});

	it("handleProviderWebhook throws — local provider does not receive webhooks", async () => {
		const provider = new LocalPdfProvider();
		await expect(provider.handleProviderWebhook()).rejects.toThrow(/webhook plateforme/);
	});

	it("submitEReportingBatch throws — not active until Phase 3", async () => {
		const provider = new LocalPdfProvider();
		await expect(provider.submitEReportingBatch()).rejects.toThrow(/e-reporting/);
	});

	it("lookupEInvoicingDirectory returns found:false (no annuaire yet)", async () => {
		const provider = new LocalPdfProvider();
		const result = await provider.lookupEInvoicingDirectory({
			type: "SIREN",
			value: "839183027",
		});
		expect(result).toEqual({
			found: false,
			platformId: null,
			routingAddress: null,
			raw: null,
		});
	});
});
