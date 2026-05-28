import type {
	InvoiceProvider,
	SubmitInvoiceResult,
	ProviderInvoiceStatusSnapshot,
	ProviderWebhookEvent,
	SubmitEReportingBatchResult,
	DirectoryLookupInput,
	DirectoryLookupResult,
} from "../types/invoice-provider";

/**
 * Provider par défaut B2C : aucune plateforme agréée n'est branchée, la
 * facture vit en local (PDF archivé UploadThing + SHA-256, Art. L102 B LPF).
 *
 * Les méthodes de cycle de vie (`submitInvoice`, `getInvoiceStatus`, etc.)
 * répondent immédiatement comme si la transmission était finie — ce qui
 * reflète la réalité pour Synclune aujourd'hui :
 *  - B2C : pas de plateforme requise, juste e-reporting (Phase 3+)
 *  - B2B/B2G : non activé tant que LocalPdfProvider est sélectionné
 *
 * Quand Synclune signera avec une PDP/PA, basculer `INVOICE_PROVIDER` vers
 * le provider concret (ex: `chorus-pro`, `pdp-xxx`).
 */
export class LocalPdfProvider implements InvoiceProvider {
	readonly id = "local";
	readonly supportedFormats = ["PDF"] as const;
	readonly capabilities = {
		submitInvoice: false,
		receiveInvoice: false,
		eReporting: false,
		directoryLookup: false,
	} as const;

	async submitInvoice(): Promise<SubmitInvoiceResult> {
		// La facture est déjà archivée localement via archiveInvoicePdf().
		// On retourne SUBMITTED pour signaler "rien d'autre à faire".
		return {
			providerInvoiceId: `local:${crypto.randomUUID()}`,
			status: "SUBMITTED",
			submittedAt: new Date(),
		};
	}

	async getInvoiceStatus(): Promise<ProviderInvoiceStatusSnapshot> {
		return {
			status: "SUBMITTED",
			rejectionReason: null,
			receivedAt: new Date(),
		};
	}

	async handleProviderWebhook(): Promise<ProviderWebhookEvent> {
		throw new Error(
			"LocalPdfProvider ne reçoit pas de webhook plateforme. " +
				"Bascule INVOICE_PROVIDER vers une PDP/PA pour activer la réception.",
		);
	}

	async submitEReportingBatch(): Promise<SubmitEReportingBatchResult> {
		// Dry-run silencieux : la capability `eReporting: false` signale déjà au caller
		// qu'il doit skip. Retourner un PENDING permet à la chaîne d'orchestration
		// (cron transmit-ereporting-batch futur) de tester end-to-end sans crasher
		// la pipeline lors d'une activation accidentelle de INVOICE_ENABLE_EREPORTING
		// avec INVOICE_PROVIDER=local.
		return {
			providerBatchId: `local:dry-run:${crypto.randomUUID()}`,
			status: "PENDING",
			submittedAt: new Date(),
		};
	}

	async lookupEInvoicingDirectory(_input: DirectoryLookupInput): Promise<DirectoryLookupResult> {
		return {
			status: "NOT_FOUND",
			found: false,
			platformId: null,
			routingAddress: null,
			raw: null,
		};
	}
}
