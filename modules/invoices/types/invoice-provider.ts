import type { InvoiceData } from "./invoice-data";

/**
 * Statut du cycle de vie d'une facture côté plateforme agréée (PDP/PA).
 * Mappé aux états standards de la réforme 2026-2027 :
 *  - SUBMITTED : déposé sur la plateforme, en attente de routing
 *  - ACCEPTED  : transmis au destinataire, validé
 *  - REJECTED  : refusé (format invalide, destinataire introuvable…)
 *  - CANCELLED : annulé par l'émetteur avant transmission
 */
export type ProviderInvoiceStatus =
	| "PENDING_SUBMISSION"
	| "SUBMITTED"
	| "ACCEPTED"
	| "REJECTED"
	| "CANCELLED";

/**
 * Statut d'une transmission e-reporting (B2C) vers la DGFiP.
 */
export type EReportingStatus =
	| "PENDING"
	| "SENT"
	| "ACCEPTED"
	| "REJECTED"
	| "RETRYING"
	| "ABANDONED";

/**
 * Résultat d'une soumission de facture à la plateforme agréée.
 */
export interface SubmitInvoiceResult {
	providerInvoiceId: string;
	status: ProviderInvoiceStatus;
	submittedAt: Date;
}

/**
 * Snapshot du statut courant d'une facture côté provider.
 */
export interface ProviderInvoiceStatusSnapshot {
	status: ProviderInvoiceStatus;
	rejectionReason: string | null;
	receivedAt: Date | null;
}

/**
 * Webhook entrant émis par la plateforme agréée (statut changé).
 */
export interface ProviderWebhookEvent {
	eventType: string;
	providerInvoiceId: string;
	status: ProviderInvoiceStatus;
	receivedAt: Date;
	rejectionReason: string | null;
}

/**
 * Batch d'e-reporting (B2C) — agrégat de transactions sur une période.
 */
export interface EReportingBatchPayload {
	periodFrom: Date;
	periodTo: Date;
	transactionCount: number;
	totalAmountIncTax: number;
	totalAmountExclTax: number;
	totalTaxAmount: number;
	transactions: ReadonlyArray<{
		occurredAt: Date;
		countryCode: string;
		amountIncTax: number;
		amountExclTax: number;
		taxAmount: number;
	}>;
}

export interface SubmitEReportingBatchResult {
	providerBatchId: string;
	status: EReportingStatus;
	submittedAt: Date;
}

/**
 * Lookup dans l'annuaire DGFiP : on cherche la plateforme de réception
 * et l'adresse électronique de facturation d'un client à partir de son
 * SIREN ou SIRET (Art. 289 bis CGI).
 */
export interface DirectoryLookupInput {
	type: "SIREN" | "SIRET";
	value: string;
}

export interface DirectoryLookupResult {
	found: boolean;
	platformId: string | null;
	routingAddress: string | null;
	raw: unknown;
}

/**
 * Contrat commun à toute plateforme agréée (PDP / PA / local stub).
 *
 * Synclune passe par `getInvoiceProvider()` qui choisit l'implémentation à
 * partir de l'env `INVOICE_PROVIDER`. Tant qu'aucun fournisseur n'est branché,
 * `LocalPdfProvider` répond immédiatement comme si la facture était déjà
 * transmise — c'est le comportement B2C actuel (PDF local archivé).
 */
export interface InvoiceProvider {
	readonly id: string;
	readonly supportedFormats: ReadonlyArray<"PDF" | "FACTURX" | "UBL" | "CII">;
	readonly capabilities: {
		readonly submitInvoice: boolean;
		readonly receiveInvoice: boolean;
		readonly eReporting: boolean;
		readonly directoryLookup: boolean;
	};

	/**
	 * Dépose une facture sur la plateforme (B2B futur). Pour les implémentations
	 * locales, retourne immédiatement {status: SUBMITTED} sans I/O réseau.
	 */
	submitInvoice(input: {
		invoiceData: InvoiceData;
		pdfBuffer: ArrayBuffer | null;
		xmlBuffer: ArrayBuffer | null;
	}): Promise<SubmitInvoiceResult>;

	/**
	 * Récupère le statut courant d'une facture déposée (polling fallback si le
	 * webhook entrant n'a pas été reçu).
	 */
	getInvoiceStatus(providerInvoiceId: string): Promise<ProviderInvoiceStatusSnapshot>;

	/**
	 * Décode un webhook entrant signé. La signature est vérifiée par
	 * l'implémentation provider-specific.
	 */
	handleProviderWebhook(payload: unknown): Promise<ProviderWebhookEvent>;

	/**
	 * Soumet un batch d'e-reporting B2C (Phase 3).
	 */
	submitEReportingBatch(input: {
		batch: EReportingBatchPayload;
	}): Promise<SubmitEReportingBatchResult>;

	/**
	 * Lookup annuaire facturation électronique (Phase 5 B2B).
	 */
	lookupEInvoicingDirectory(input: DirectoryLookupInput): Promise<DirectoryLookupResult>;
}
