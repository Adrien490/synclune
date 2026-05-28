import type {
	DirectoryLookupInput,
	DirectoryLookupResult,
	EReportingBatchPayload,
	InvoiceProvider,
	ProviderInvoiceStatusSnapshot,
	ProviderWebhookEvent,
	SubmitEReportingBatchResult,
	SubmitInvoiceResult,
} from "../types/invoice-provider";
import type { InvoiceData } from "../types/invoice-data";

/**
 * Provider en mémoire — usage dual :
 *  1. **Tests cross-modules** (orders, refunds, cron) via
 *     `setInvoiceProviderForTests(new MockProvider())`.
 *  2. **Staging / CI E2E** via `INVOICE_PROVIDER=mock` (factory env-driven) pour
 *     valider l'orchestration end-to-end (transmission batch, persistance PDP,
 *     webhook) sans contracter de PDP réelle.
 *
 * **Ne jamais importer directement en code prod** — toujours passer par
 * `getInvoiceProvider()`. Le factory loggue un warning Sentry si `mock` est
 * activé en production (cf. `factory.ts`).
 *
 * Sémantique :
 *  - submitInvoice : génère un `providerInvoiceId` stable basé sur `invoiceNumber`
 *    (rejouable, idempotent — un même invoiceNumber donne toujours le même ID).
 *  - getInvoiceStatus : lit la dernière soumission par providerInvoiceId.
 *  - handleProviderWebhook : décode un payload `{ providerInvoiceId, status, reason }`.
 *  - submitEReportingBatch : retourne un providerBatchId stable et passe à SENT.
 *  - lookupEInvoicingDirectory : retourne un résultat FOUND/NOT_FOUND/UNAVAILABLE
 *    contrôlable via `setDirectoryFixture()`.
 */

type DirectoryFixture =
	| { status: "FOUND"; platformId: string; routingAddress: string }
	| { status: "NOT_FOUND" }
	| { status: "UNAVAILABLE" };

interface SubmissionRecord {
	invoiceData: InvoiceData;
	status: "SUBMITTED" | "ACCEPTED" | "REJECTED" | "CANCELLED" | "PENDING_SUBMISSION";
	rejectionReason: string | null;
	submittedAt: Date;
}

export class MockProvider implements InvoiceProvider {
	readonly id = "mock";
	readonly supportedFormats = ["PDF", "FACTURX", "UBL", "CII"] as const;
	readonly capabilities = {
		submitInvoice: true,
		receiveInvoice: true,
		eReporting: true,
		directoryLookup: true,
	} as const;

	private readonly submissions = new Map<string, SubmissionRecord>();
	private directoryFixtures = new Map<string, DirectoryFixture>();

	setDirectoryFixture(siretOrSiren: string, fixture: DirectoryFixture): void {
		this.directoryFixtures.set(siretOrSiren, fixture);
	}

	resetForTests(): void {
		this.submissions.clear();
		this.directoryFixtures.clear();
	}

	async submitInvoice(input: {
		invoiceData: InvoiceData;
		pdfBuffer: ArrayBuffer | null;
		xmlBuffer: ArrayBuffer | null;
	}): Promise<SubmitInvoiceResult> {
		const invoiceNumber = input.invoiceData.invoiceNumber;
		const providerInvoiceId = `mock:${invoiceNumber}`;
		const submittedAt = new Date();

		// Idempotence : même invoiceNumber → même providerInvoiceId. Si déjà
		// soumis, on conserve le record d'origine.
		const existing = this.submissions.get(providerInvoiceId);
		if (existing) {
			return {
				providerInvoiceId,
				status: existing.status === "PENDING_SUBMISSION" ? "SUBMITTED" : existing.status,
				submittedAt: existing.submittedAt,
			};
		}

		this.submissions.set(providerInvoiceId, {
			invoiceData: input.invoiceData,
			status: "SUBMITTED",
			rejectionReason: null,
			submittedAt,
		});

		return {
			providerInvoiceId,
			status: "SUBMITTED",
			submittedAt,
		};
	}

	async getInvoiceStatus(providerInvoiceId: string): Promise<ProviderInvoiceStatusSnapshot> {
		const record = this.submissions.get(providerInvoiceId);
		if (!record) {
			return { status: "PENDING_SUBMISSION", rejectionReason: null, receivedAt: null };
		}
		return {
			status: record.status,
			rejectionReason: record.rejectionReason,
			receivedAt: record.submittedAt,
		};
	}

	async handleProviderWebhook(payload: unknown): Promise<ProviderWebhookEvent> {
		if (!payload || typeof payload !== "object") {
			throw new Error("MockProvider: payload must be an object");
		}
		const p = payload as Record<string, unknown>;
		const providerInvoiceId = typeof p.providerInvoiceId === "string" ? p.providerInvoiceId : "";
		const eventType = typeof p.eventType === "string" ? p.eventType : "invoice.status.changed";
		const status: ProviderWebhookEvent["status"] =
			typeof p.status === "string" ? (p.status as ProviderWebhookEvent["status"]) : "ACCEPTED";
		const rejectionReason = typeof p.rejectionReason === "string" ? p.rejectionReason : null;

		// Mise à jour interne pour cohérence des polling fallback.
		const record = this.submissions.get(providerInvoiceId);
		if (record) {
			record.status = status;
			record.rejectionReason = rejectionReason;
		}

		return {
			eventType,
			providerInvoiceId,
			status,
			receivedAt: new Date(),
			rejectionReason,
		};
	}

	async submitEReportingBatch(_input: {
		batch: EReportingBatchPayload;
	}): Promise<SubmitEReportingBatchResult> {
		return {
			providerBatchId: `mock:batch:${crypto.randomUUID()}`,
			status: "SENT",
			submittedAt: new Date(),
		};
	}

	async lookupEInvoicingDirectory(input: DirectoryLookupInput): Promise<DirectoryLookupResult> {
		const fixture = this.directoryFixtures.get(input.value);
		if (!fixture) {
			return {
				status: "NOT_FOUND",
				found: false,
				platformId: null,
				routingAddress: null,
				raw: null,
			};
		}
		if (fixture.status === "UNAVAILABLE") {
			return {
				status: "UNAVAILABLE",
				found: false,
				platformId: null,
				routingAddress: null,
				raw: null,
			};
		}
		if (fixture.status === "NOT_FOUND") {
			return {
				status: "NOT_FOUND",
				found: false,
				platformId: null,
				routingAddress: null,
				raw: null,
			};
		}
		return {
			status: "FOUND",
			found: true,
			platformId: fixture.platformId,
			routingAddress: fixture.routingAddress,
			raw: fixture,
		};
	}
}
