import type { PaymentMethod, EReportingTransactionType } from "@/app/generated/prisma/enums";

/**
 * Statut d'une transmission e-reporting (B2C) vers la DGFiP via la Plateforme
 * Agréée (PA).
 */
export type EReportingStatus =
	| "PENDING"
	| "SENT"
	| "ACCEPTED"
	| "REJECTED"
	| "RETRYING"
	| "ABANDONED";

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
		/**
		 * Mode de règlement (EINV-EREPORT-002). L'arrêté 2022-1299 §4.3 impose la
		 * transmission du mode de règlement dans le bloc transaction e-reporting :
		 * une implémentation PA DOIT ventiler par `paymentMethod`.
		 */
		paymentMethod: PaymentMethod;
		currency: string;
		/** SALES (montant positif) vs REFUND (montant négatif). */
		type: EReportingTransactionType;
	}>;
}

export interface SubmitEReportingBatchResult {
	providerBatchId: string;
	status: EReportingStatus;
	submittedAt: Date;
	/**
	 * Motif de rejet renvoyé par la PA quand `status === "REJECTED"` (ACK
	 * synchrone vs erreur async). Tronqué à 1000 caractères côté persist pour
	 * rester aligné avec `EReportingBatch.rejectionReason`.
	 */
	rejectionReason?: string;
}

/**
 * Contrat d'une Plateforme Agréée (PA) pour l'e-reporting B2C (réforme
 * 2026-2027). Synclune étant une micro-entreprise en franchise de TVA vendant
 * exclusivement en B2C, la seule obligation structurée à terme est
 * l'e-reporting agrégé des transactions à la DGFiP — pas de transmission de
 * facture B2B/B2G sur une PDP.
 *
 * `getInvoiceProvider()` choisit l'implémentation via l'env `INVOICE_PROVIDER`.
 * Tant qu'aucune PA n'est branchée, `LocalPdfProvider` répond en dry-run
 * (`eReporting: false`) — comportement B2C actuel (PDF local archivé).
 */
export interface InvoiceProvider {
	readonly id: string;
	readonly capabilities: {
		readonly eReporting: boolean;
	};

	/**
	 * Soumet un batch d'e-reporting B2C.
	 *
	 * `idempotencyKey` (= `EReportingBatch.id`, EINV-EREPORT-003) : clé
	 * déterministe que la PA DOIT utiliser pour dédupliquer. Un même batch
	 * re-soumis (crash entre l'appel réseau et l'update DB côté Synclune) ne doit
	 * jamais produire deux transmissions DGFiP.
	 */
	submitEReportingBatch(input: {
		batch: EReportingBatchPayload;
		idempotencyKey: string;
	}): Promise<SubmitEReportingBatchResult>;

	/**
	 * EINV-CRON-003 (stub différé) — interroge le statut DGFiP d'un batch déjà
	 * transmis (`SENT`), pour les PA dont l'acceptation est **asynchrone** (la
	 * soumission renvoie `SENT`, l'ACCEPTED/REJECTED arrive plus tard par
	 * webhook ou polling).
	 *
	 * **Optionnel et NON appelé en l'état** : aucune PA concrète n'est branchée et
	 * `LocalPdfProvider` ne produit jamais de `SENT` (dry-run). Au branchement
	 * d'une PA à acceptation asynchrone, implémenter cette méthode PUIS créer le
	 * cron `reconcile-ereporting-statuses` qui applique `SENT → ACCEPTED/REJECTED`
	 * (en attendant, `alert-stuck-orders` remonte déjà tout batch `SENT` > 48h).
	 * Laissé en stub volontaire (recentrage B2C KISS — pas d'orchestration
	 * spéculative tant que la sémantique d'ACK de la PA n'est pas connue).
	 */
	getEReportingBatchStatus?(providerBatchId: string): Promise<{
		status: EReportingStatus;
		rejectionReason?: string;
	}>;
}
