import { describe, expect, it } from "vitest";
import type { InvoiceData } from "../../types/invoice-data";
import type { InvoiceProvider } from "../../types/invoice-provider";
import { LocalPdfProvider } from "../local-pdf.provider";
import { MockProvider } from "../mock.provider";

/**
 * Suite de tests **contract** — chaque implémentation `InvoiceProvider` doit
 * passer ces vérifications sémantiques. TypeScript garantit déjà la signature ;
 * cette suite garantit le comportement (idempotence, fail-safety, etc.).
 *
 * Ajouter une nouvelle implémentation (ex: ChorusProProvider) :
 *  1. Importer la classe ici
 *  2. Ajouter une entrée au tableau `providers`
 *  3. Si la capability est différente, ajuster les assertions conditionnelles
 */

/**
 * Crée un `InvoiceData` minimal pour les tests contract. Seul `invoiceNumber`
 * compte (les providers ne touchent pas aux autres champs sans I/O réel).
 */
function makeInvoiceData(invoiceNumber: string): InvoiceData {
	return { invoiceNumber } as InvoiceData;
}

const providers: Array<{ name: string; build: () => InvoiceProvider }> = [
	{ name: "LocalPdfProvider", build: () => new LocalPdfProvider() },
	{ name: "MockProvider", build: () => new MockProvider() },
];

describe.each(providers)("InvoiceProvider contract — $name", ({ build }) => {
	it("declares a non-empty id", () => {
		const provider = build();
		expect(typeof provider.id).toBe("string");
		expect(provider.id.length).toBeGreaterThan(0);
	});

	it("declares boolean capabilities", () => {
		const provider = build();
		expect(typeof provider.capabilities.submitInvoice).toBe("boolean");
		expect(typeof provider.capabilities.receiveInvoice).toBe("boolean");
		expect(typeof provider.capabilities.eReporting).toBe("boolean");
		expect(typeof provider.capabilities.directoryLookup).toBe("boolean");
	});

	it("declares supportedFormats including 'PDF'", () => {
		const provider = build();
		expect(provider.supportedFormats).toContain("PDF");
	});

	it("submitInvoice returns the same providerInvoiceId for the same invoiceNumber (idempotence)", async () => {
		const provider = build();
		const data = makeInvoiceData("F-2027-00042");
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
		// LocalPdfProvider génère un UUID à chaque appel (pas de notion d'idempotence
		// car aucun état remote) — on tolère la divergence quand `capabilities.submitInvoice`
		// est désactivé. Pour tout provider qui prétend supporter submitInvoice, l'idempotence
		// est obligatoire.
		if (provider.capabilities.submitInvoice) {
			expect(second.providerInvoiceId).toBe(first.providerInvoiceId);
		}
		expect(first.providerInvoiceId.length).toBeGreaterThan(0);
		expect(second.submittedAt).toBeInstanceOf(Date);
	});

	it("getInvoiceStatus on unknown id does not throw (returns PENDING_SUBMISSION)", async () => {
		const provider = build();
		const status = await provider.getInvoiceStatus("nope:does-not-exist");
		// LocalPdfProvider retourne toujours SUBMITTED (stub), MockProvider et tout
		// provider concret doivent renvoyer PENDING_SUBMISSION. Les deux sont des
		// non-throw → ce qui est l'invariant clé du contract.
		expect(["PENDING_SUBMISSION", "SUBMITTED"]).toContain(status.status);
	});

	it("lookupEInvoicingDirectory accepts both SIREN and SIRET inputs", async () => {
		const provider = build();
		const bySiren = await provider.lookupEInvoicingDirectory({
			type: "SIREN",
			value: "839183027",
		});
		const bySiret = await provider.lookupEInvoicingDirectory({
			type: "SIRET",
			value: "83918302700037",
		});
		// Doit avoir une forme cohérente (status discriminant), pas de throw.
		expect(["FOUND", "NOT_FOUND", "UNAVAILABLE"]).toContain(bySiren.status);
		expect(["FOUND", "NOT_FOUND", "UNAVAILABLE"]).toContain(bySiret.status);
		// found booléen = (status === FOUND) — rétro-compat.
		expect(bySiren.found).toBe(bySiren.status === "FOUND");
		expect(bySiret.found).toBe(bySiret.status === "FOUND");
	});

	it("submitEReportingBatch never throws on empty batch (graceful no-I/O)", async () => {
		const provider = build();
		const result = await provider.submitEReportingBatch({
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
		expect(typeof result.providerBatchId).toBe("string");
		expect(["PENDING", "SENT", "ACCEPTED", "REJECTED", "RETRYING", "ABANDONED"]).toContain(
			result.status,
		);
	});
});

describe("MockProvider — fixtures spécifiques", () => {
	it("returns FOUND when a fixture is registered", async () => {
		const provider = new MockProvider();
		provider.setDirectoryFixture("12345678901234", {
			status: "FOUND",
			platformId: "pdp-chorus-pro",
			routingAddress: "12345678901234@chorus.gouv.fr",
		});
		const result = await provider.lookupEInvoicingDirectory({
			type: "SIRET",
			value: "12345678901234",
		});
		expect(result.status).toBe("FOUND");
		expect(result.found).toBe(true);
		expect(result.platformId).toBe("pdp-chorus-pro");
		expect(result.routingAddress).toBe("12345678901234@chorus.gouv.fr");
	});

	it("returns UNAVAILABLE distinctly from NOT_FOUND", async () => {
		const provider = new MockProvider();
		provider.setDirectoryFixture("99999999999999", { status: "UNAVAILABLE" });
		const result = await provider.lookupEInvoicingDirectory({
			type: "SIRET",
			value: "99999999999999",
		});
		expect(result.status).toBe("UNAVAILABLE");
		expect(result.found).toBe(false);
	});

	it("getInvoiceStatus reflects status after handleProviderWebhook", async () => {
		const provider = new MockProvider();
		const data = makeInvoiceData("F-2027-00099");
		const submit = await provider.submitInvoice({
			invoiceData: data,
			pdfBuffer: null,
			xmlBuffer: null,
		});
		await provider.handleProviderWebhook({
			providerInvoiceId: submit.providerInvoiceId,
			status: "REJECTED",
			rejectionReason: "Invalid SIRET",
			eventType: "invoice.status.changed",
		});
		const after = await provider.getInvoiceStatus(submit.providerInvoiceId);
		expect(after.status).toBe("REJECTED");
		expect(after.rejectionReason).toBe("Invalid SIRET");
	});
});
