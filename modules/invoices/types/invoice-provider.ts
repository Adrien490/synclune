import type {
	PaymentMethod,
	EReportingTransactionType,
	EReportingOperationCategory,
} from "@/app/generated/prisma/enums";

/**
 * Statut d'une transmission e-reporting (B2C) vers la DGFiP via la Plateforme
 * Agréée (PA).
 */
type EReportingStatus = "PENDING" | "SENT" | "ACCEPTED" | "REJECTED" | "RETRYING" | "ABANDONED";

/**
 * EINV-EREPORT-010 — Ligne de ventilation par taux de TVA transmise dans un batch.
 * `rate` en points de base (2000 = 20 %), montants en centimes signés.
 */
export interface EReportingVatLine {
	rate: number;
	baseExclTax: number;
	taxAmount: number;
}

/**
 * EINV-EREPORT-010 — Agrégat journalier (HT/TTC + nb tx) transmis dans un batch.
 * Le dépôt peut être bimestriel mais le référentiel attend le détail JOURNALIER.
 */
export interface EReportingDailyAggregate {
	/** Jour UTC `YYYY-MM-DD`. */
	day: string;
	transactionCount: number;
	totalAmountIncTax: number;
	totalAmountExclTax: number;
	totalTaxAmount: number;
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
	/**
	 * EINV-EREPORT-010 — Ventilation par taux de TVA du batch. Toujours fournie par
	 * le caller de prod (`submit-ereporting-batch`), MÊME en franchise (ligne unique
	 * taux 0). Optionnelle sur le type pour rétro-compat des fixtures de test ; un
	 * adaptateur PA réel la mappe vers le bloc TVA exigé par l'arrêté.
	 */
	vatBreakdown?: ReadonlyArray<EReportingVatLine>;
	/**
	 * EINV-EREPORT-010 — Agrégats journaliers (HT/TTC + nb tx) du batch. Le dépôt
	 * peut être bimestriel mais le référentiel attend le détail JOURNALIER ; un
	 * adaptateur PA réel les transmet dans le dépôt de période.
	 */
	dailyAggregates?: ReadonlyArray<EReportingDailyAggregate>;
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
		/**
		 * EINV-EREPORT-007/F1+F3 — catégorie d'opération DGFiP (biens/services).
		 * Fournie par le caller de prod (`submit-ereporting-batch`) ; GOODS aujourd'hui
		 * (franchise, 100 % biens), dérivée des lignes à la sortie de franchise.
		 * Optionnelle sur le type pour rétro-compat des fixtures de test.
		 */
		operationCategory?: EReportingOperationCategory;
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
