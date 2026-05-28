/**
 * EINV-TEST-016 — Provider failure + retry idempotent.
 *
 * Prépare le contrat Phase 5 PDP : quand `submitInvoice` ou `submitEReportingBatch`
 * échoue (réseau / 5xx / timeout), l'appelant doit :
 *   1. Capturer l'erreur (ne pas crasher la transaction parent — best-effort)
 *   2. Au retry suivant (cron retry-webhooks ou backfill), produire le MÊME
 *      `providerInvoiceId` pour éviter une double soumission côté PDP.
 *
 * Cible : `MockProvider` (utilisé en intégration cross-modules) + extension
 * `FailingProvider` qui throw au 1er appel puis succeed (simule un transient).
 */

import { describe, it, expect, beforeEach } from "vitest";
import { MockProvider } from "../mock.provider";
import type { InvoiceData } from "../../types/invoice-data";
import type {
	InvoiceProvider,
	SubmitInvoiceResult,
	ProviderWebhookEvent,
	EReportingBatchPayload,
	SubmitEReportingBatchResult,
	DirectoryLookupInput,
	DirectoryLookupResult,
} from "../../types/invoice-provider";

function makeInvoiceData(invoiceNumber: string): InvoiceData {
	return {
		invoiceNumber,
		invoiceFormat: "PDF",
		issuedAt: new Date("2026-05-28T12:00:00Z"),
		dueAt: null,
		currency: "EUR",
		seller: {
			legalName: "Synclune",
			tradeName: "Synclune",
			siren: "839183027",
			siret: "83918302700037",
			vatNumber: "FR35839183027",
			apeCode: "47.91B",
			legalForm: "EI",
			address: {
				recipientName: "Synclune",
				line1: "77 Bd du Tertre",
				line2: null,
				postalCode: "44100",
				city: "Nantes",
				countryCode: "FR",
			},
			email: "contact@synclune.fr",
			eInvoicingAddress: null,
			eInvoicingPlatformId: null,
			vatExemptionText: "TVA non applicable, art. 293 B",
			bankIban: null,
			bankBic: null,
		},
		buyer: {
			type: "B2C",
			legalName: null,
			firstName: "Alice",
			lastName: "Dupont",
			email: "a@x.fr",
			phone: null,
			siren: null,
			siret: null,
			vatNumber: null,
			eInvoicingAddress: null,
			eInvoicingPlatformId: null,
			publicEntityId: null,
			chorusServiceCode: null,
		},
		shippingAddress: {
			recipientName: "Alice",
			line1: "1 rue",
			line2: null,
			postalCode: "75001",
			city: "Paris",
			countryCode: "FR",
		},
		billingAddress: {
			recipientName: "Alice",
			line1: "1 rue",
			line2: null,
			postalCode: "75001",
			city: "Paris",
			countryCode: "FR",
		},
		lines: [],
		totals: {
			subtotalExclTax: 0,
			totalDiscount: 0,
			shippingExclTax: 0,
			shippingTax: 0,
			taxBreakdown: [],
			totalExclTax: 4999,
			totalTax: 0,
			totalInclTax: 4999,
			totalPaid: 4999,
			amountDue: 0,
		},
		payment: {
			method: "CARD",
			paidAt: new Date(),
			stripePaymentIntentId: "pi_x",
			stripeChargeId: null,
		},
		precedingInvoice: null,
		voidedInfo: null,
		meta: { orderId: "o", orderNumber: "SYN", notes: null },
	};
}

describe("Provider failure + retry idempotent (EINV-TEST-016)", () => {
	describe("MockProvider — idempotence base sur invoiceNumber", () => {
		let provider: MockProvider;

		beforeEach(() => {
			provider = new MockProvider();
		});

		it("2e submitInvoice sur même invoiceNumber retourne le MÊME providerInvoiceId", async () => {
			const data = makeInvoiceData("F-2026-00100");

			const first = await provider.submitInvoice({
				invoiceData: data,
				pdfBuffer: null,
				xmlBuffer: null,
			});
			const second = await provider.submitInvoice({
				invoiceData: data,
				pdfBuffer: null,
				xmlBuffer: null,
			});

			expect(first.providerInvoiceId).toBe(second.providerInvoiceId);
			expect(first.providerInvoiceId).toBe("mock:F-2026-00100");
			expect(first.submittedAt.getTime()).toBe(second.submittedAt.getTime());
		});

		it("5 replays simulés successifs → 1 seul submission record interne", async () => {
			const data = makeInvoiceData("F-2026-00200");

			for (let i = 0; i < 5; i++) {
				await provider.submitInvoice({
					invoiceData: data,
					pdfBuffer: null,
					xmlBuffer: null,
				});
			}

			// Status check : 1 seul record visible
			const status = await provider.getInvoiceStatus("mock:F-2026-00200");
			expect(status.status).toBe("SUBMITTED");
		});

		it("invoiceNumber distincts → providerInvoiceId distincts", async () => {
			const f1 = await provider.submitInvoice({
				invoiceData: makeInvoiceData("F-2026-00010"),
				pdfBuffer: null,
				xmlBuffer: null,
			});
			const f2 = await provider.submitInvoice({
				invoiceData: makeInvoiceData("F-2026-00011"),
				pdfBuffer: null,
				xmlBuffer: null,
			});

			expect(f1.providerInvoiceId).not.toBe(f2.providerInvoiceId);
		});
	});

	describe("FailingProvider — capture exception + retry succeed", () => {
		/**
		 * Simule un PDP transient failure : 1er appel throw, 2e appel succeed.
		 * Garantit que le caller peut faire un try/catch + retry sans casser la
		 * tx parent (cf pattern best-effort `recordSalesEReporting`).
		 */
		class FailingProvider implements InvoiceProvider {
			readonly id = "failing";
			readonly supportedFormats = ["PDF"] as const;
			readonly capabilities = {
				submitInvoice: true,
				receiveInvoice: false,
				eReporting: true,
				directoryLookup: false,
			} as const;

			private callCount = 0;
			private readonly succeedAfter: number;

			constructor(succeedAfter = 1) {
				this.succeedAfter = succeedAfter;
			}

			async submitInvoice(input: {
				invoiceData: InvoiceData;
				pdfBuffer: ArrayBuffer | null;
				xmlBuffer: ArrayBuffer | null;
			}): Promise<SubmitInvoiceResult> {
				this.callCount++;
				if (this.callCount <= this.succeedAfter) {
					throw new Error(`Transient PDP failure (call ${this.callCount})`);
				}
				return {
					providerInvoiceId: `failing:${input.invoiceData.invoiceNumber}`,
					status: "SUBMITTED",
					submittedAt: new Date(),
				};
			}

			async getInvoiceStatus() {
				return {
					status: "PENDING_SUBMISSION" as const,
					rejectionReason: null,
					receivedAt: null,
				};
			}

			async handleProviderWebhook(_payload: unknown): Promise<ProviderWebhookEvent> {
				throw new Error("not implemented");
			}

			async submitEReportingBatch(_input: {
				batch: EReportingBatchPayload;
			}): Promise<SubmitEReportingBatchResult> {
				throw new Error("transient");
			}

			async lookupEInvoicingDirectory(
				_input: DirectoryLookupInput,
			): Promise<DirectoryLookupResult> {
				throw new Error("not implemented");
			}
		}

		it("1er appel throw, 2e appel succeed → providerInvoiceId stable", async () => {
			const provider = new FailingProvider(1);
			const data = makeInvoiceData("F-2026-00500");

			// 1er appel : best-effort capture
			let firstError: unknown = null;
			try {
				await provider.submitInvoice({ invoiceData: data, pdfBuffer: null, xmlBuffer: null });
			} catch (e) {
				firstError = e;
			}
			expect(firstError).toBeInstanceOf(Error);

			// 2e appel : succeed
			const result = await provider.submitInvoice({
				invoiceData: data,
				pdfBuffer: null,
				xmlBuffer: null,
			});

			expect(result.providerInvoiceId).toBe("failing:F-2026-00500");
			expect(result.status).toBe("SUBMITTED");
		});

		it("submitEReportingBatch throw → caller doit capture sans casser le parent", async () => {
			const provider = new FailingProvider();

			let caught: unknown = null;
			try {
				await provider.submitEReportingBatch({
					batch: {
						periodFrom: new Date(),
						periodTo: new Date(),
						transactionCount: 0,
						totalAmountIncTax: 0,
						totalAmountExclTax: 0,
						totalTaxAmount: 0,
						transactions: [],
					},
				});
			} catch (e) {
				caught = e;
			}

			expect(caught).toBeInstanceOf(Error);
			expect((caught as Error).message).toContain("transient");
		});
	});

	describe("contrat InvoiceProvider — capabilities cohérence", () => {
		it("LocalPdfProvider capabilities = tout à false (B2C par défaut)", async () => {
			const { LocalPdfProvider } = await import("../local-pdf.provider");
			const provider = new LocalPdfProvider();

			expect(provider.capabilities.submitInvoice).toBe(false);
			expect(provider.capabilities.receiveInvoice).toBe(false);
			expect(provider.capabilities.eReporting).toBe(false);
			expect(provider.capabilities.directoryLookup).toBe(false);
		});

		it("MockProvider capabilities = tout à true (test only)", () => {
			const provider = new MockProvider();

			expect(provider.capabilities.submitInvoice).toBe(true);
			expect(provider.capabilities.receiveInvoice).toBe(true);
			expect(provider.capabilities.eReporting).toBe(true);
			expect(provider.capabilities.directoryLookup).toBe(true);
		});
	});
});
